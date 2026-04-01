import { useState, useRef, useCallback, useEffect } from "react";
import { getUserVoice } from "@/lib/userName";

let _instanceCounter = 0;

/**
 * Fire-and-forget: warms the server-side TTS disk cache for a given text+voice
 * so the FIRST listen is served from cache (near-instant) instead of calling OpenAI.
 * Safe to call speculatively — server will deduplicate using its own cache key.
 */
export function prewarmTTS(text: string, voice?: string): void {
  if (!text?.trim()) return;
  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 4096), voice: voice ?? getUserVoice() }),
  })
    .then(r => r.blob())
    .catch(() => {});
}

export function useTTS() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const preloadingRef = useRef(false);
  const chainCancelRef = useRef(false);
  const instanceId = useRef(`tts-${++_instanceCounter}`);

  const cleanup = useCallback(() => {
    chainCancelRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setPlaying(false);
    setLoading(false);
    setError(false);
    setProgress(0);
  }, [cleanup]);

  // Global coordination: when any instance starts, all others stop immediately.
  // This prevents multiple audio streams playing simultaneously across the app.
  useEffect(() => {
    const handle = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id && id !== instanceId.current) {
        cleanup();
        setPlaying(false);
        setLoading(false);
        setProgress(0);
      }
    };
    window.addEventListener("sp-audio-start", handle);
    return () => window.removeEventListener("sp-audio-start", handle);
  }, [cleanup]);

  const notifyStart = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("sp-audio-start", { detail: { id: instanceId.current } }),
    );
  }, []);

  const preload = useCallback(async (text: string, voice?: string) => {
    if (blobUrlRef.current || preloadingRef.current) return;
    preloadingRef.current = true;
    const selectedVoice = voice ?? getUserVoice();
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });
      if (!response.ok) return;
      const blob = await response.blob();
      blobUrlRef.current = URL.createObjectURL(blob);
    } catch {
      // silently ignore — user can still tap Listen and it'll fetch fresh
    } finally {
      preloadingRef.current = false;
    }
  }, []);

  const play = useCallback(async (text: string, voice?: string) => {
    const selectedVoice = voice ?? getUserVoice();
    notifyStart();

    // Fast path: use preloaded blob if available (sub-100ms start)
    if (blobUrlRef.current) {
      const url = blobUrlRef.current;
      blobUrlRef.current = null;
      const audio = new Audio(url);
      audioRef.current = audio;
      setLoading(false);
      setPlaying(true);
      setError(false);
      setProgress(0);
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(Math.round((audio.currentTime / audio.duration) * 100));
      };
      audio.onended = () => { setPlaying(false); setProgress(100); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlaying(false); setError(true); };
      await audio.play().catch(() => setError(true));
      return;
    }

    // Slow path: fetch from server (disk cache if prewarmed, otherwise OpenAI)
    cleanup();
    chainCancelRef.current = false;
    setProgress(0);
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.oncanplay = () => { setLoading(false); setPlaying(true); };
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(Math.round((audio.currentTime / audio.duration) * 100));
      };
      audio.onended = () => {
        setPlaying(false);
        setProgress(100);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => { setPlaying(false); setLoading(false); setError(true); };
      await audio.play().catch(() => { setLoading(false); setError(true); });
    } catch {
      setLoading(false);
      setPlaying(false);
      setError(true);
    }
  }, [cleanup, notifyStart]);

  const toggle = useCallback(
    (text: string, voice?: string) => {
      if (playing) { stop(); } else { play(text, voice); }
    },
    [playing, play, stop],
  );

  /**
   * playChain — plays an ordered list of text sections with pipeline prefetching.
   * While section N plays, section N+1 is fetched in the background so transitions
   * are seamless. The server disk cache means subsequent plays of the same content
   * are near-instant.
   */
  const playChain = useCallback(async (
    sections: Array<{ text: string; voice?: string; key?: string }>,
    onSectionStart?: (index: number, key?: string) => void,
    onComplete?: () => void,
  ) => {
    if (sections.length === 0) return;
    notifyStart();
    cleanup();
    chainCancelRef.current = false;
    setProgress(0);
    setLoading(true);
    setError(false);

    let prefetchedUrl: string | null = null;

    for (let i = 0; i < sections.length; i++) {
      if (chainCancelRef.current) break;

      const { text, voice: sectionVoice, key } = sections[i];
      const selectedVoice = sectionVoice ?? getUserVoice();

      onSectionStart?.(i, key);

      // Use prefetched blob from previous iteration, or fetch fresh
      let blobUrl: string | null = prefetchedUrl;
      prefetchedUrl = null;

      if (!blobUrl) {
        try {
          const response = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text.slice(0, 4096), voice: selectedVoice }),
          });
          if (!response.ok || chainCancelRef.current) break;
          const blob = await response.blob();
          blobUrl = URL.createObjectURL(blob);
        } catch { break; }
      }

      if (!blobUrl || chainCancelRef.current) break;

      setLoading(false);
      setPlaying(true);

      // Pipeline: start fetching the next section while this one plays
      const nextSection = sections[i + 1];
      let prefetchPromise: Promise<string | null> | null = null;
      if (nextSection) {
        const nextVoice = nextSection.voice ?? getUserVoice();
        prefetchPromise = fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nextSection.text.slice(0, 4096), voice: nextVoice }),
        })
          .then(r => r.ok ? r.blob() : null)
          .then(blob => blob ? URL.createObjectURL(blob) : null)
          .catch(() => null);
      }

      const urlToPlay = blobUrl;
      const segStart = (i / sections.length) * 100;
      const segEnd = ((i + 1) / sections.length) * 100;

      await new Promise<void>((resolve) => {
        const audio = new Audio(urlToPlay);
        audioRef.current = audio;
        audio.ontimeupdate = () => {
          if (audio.duration) {
            setProgress(Math.round(segStart + (audio.currentTime / audio.duration) * (segEnd - segStart)));
          }
        };
        audio.onended = () => { URL.revokeObjectURL(urlToPlay); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(urlToPlay); resolve(); };
        if (chainCancelRef.current) { URL.revokeObjectURL(urlToPlay); resolve(); return; }
        audio.play().catch(() => resolve());
      });

      if (prefetchPromise) {
        prefetchedUrl = await prefetchPromise;
      }
    }

    if (prefetchedUrl) URL.revokeObjectURL(prefetchedUrl);

    setPlaying(false);
    audioRef.current = null;

    if (!chainCancelRef.current) {
      setProgress(100);
      onComplete?.();
    } else {
      setProgress(0);
    }
  }, [cleanup, notifyStart]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { play, stop, toggle, preload, playChain, playing, loading, error, progress };
}
