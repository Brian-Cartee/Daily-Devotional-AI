import { useState, useRef, useCallback, useEffect } from "react";
import { getUserVoice } from "@/lib/userName";

export function useTTS() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const preloadingRef = useRef(false);
  const chainCancelRef = useRef(false);

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
    setProgress(0);
  }, [cleanup]);

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
      // silently ignore preload errors
    } finally {
      preloadingRef.current = false;
    }
  }, []);

  const play = useCallback(async (text: string, voice?: string) => {
    const selectedVoice = voice ?? getUserVoice();

    if (blobUrlRef.current) {
      const url = blobUrlRef.current;
      blobUrlRef.current = null;
      const audio = new Audio(url);
      audioRef.current = audio;
      setLoading(false);
      setPlaying(true);
      setProgress(0);
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(Math.round((audio.currentTime / audio.duration) * 100));
      };
      audio.onended = () => { setPlaying(false); setProgress(100); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlaying(false); };
      await audio.play();
      return;
    }

    cleanup();
    chainCancelRef.current = false;
    setProgress(0);
    setLoading(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.oncanplay = () => { setLoading(false); setPlaying(true); };
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(Math.round((audio.currentTime / audio.duration) * 100));
      };
      audio.onended = () => {
        setPlaying(false); setProgress(100);
        if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
      };
      audio.onerror = () => { setPlaying(false); setLoading(false); };
      await audio.play();
    } catch {
      setLoading(false);
      setPlaying(false);
    }
  }, [cleanup]);

  const toggle = useCallback(
    (text: string, voice?: string) => {
      if (playing) { stop(); } else { play(text, voice); }
    },
    [playing, play, stop]
  );

  /**
   * playChain — plays an ordered list of text sections with pipeline prefetching.
   * While section N is playing, section N+1 is already being fetched in the
   * background, so transitions between sections are seamless with no loading gap.
   */
  const playChain = useCallback(async (
    sections: Array<{ text: string; voice?: string; key?: string }>,
    onSectionStart?: (index: number, key?: string) => void,
    onComplete?: () => void,
  ) => {
    if (sections.length === 0) return;
    cleanup();
    chainCancelRef.current = false;
    setProgress(0);
    setLoading(true);

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

      // Pipeline: immediately start fetching next section in background while this one plays
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

      // Play this section to completion
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

      // Collect the prefetched next-section blob — it's ready or nearly ready now
      if (prefetchPromise) {
        prefetchedUrl = await prefetchPromise;
      }
    }

    // Discard any unused prefetch
    if (prefetchedUrl) URL.revokeObjectURL(prefetchedUrl);

    setPlaying(false);
    audioRef.current = null;

    if (!chainCancelRef.current) {
      setProgress(100);
      onComplete?.();
    } else {
      setProgress(0);
    }
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { play, stop, toggle, preload, playChain, playing, loading, progress };
}
