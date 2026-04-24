import { useState, useRef, useCallback, useEffect } from "react";
import { getUserVoice } from "@/lib/userName";

let _instanceCounter = 0;

const TTS_FETCH_TIMEOUT_MS = 25_000;
const TTS_SLOW_WARNING_MS = 3_000;

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

/** Fetch TTS audio with a hard 10-second timeout. Returns a blob URL or null. */
async function fetchTTS(
  text: string,
  voice: string,
  cancelRef: React.MutableRefObject<boolean>,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 4096), voice }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok || cancelRef.current) return null;
    const blob = await response.blob();
    if (cancelRef.current) return null;
    return URL.createObjectURL(blob);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export function useTTS() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLong, setLoadingLong] = useState(false); // true after 3s — "still on its way..."
  const [error, setError] = useState(false);
  const [blocked, setBlocked] = useState(false);          // iOS autoplay blocked
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const preloadingRef = useRef(false);
  const chainCancelRef = useRef(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceId = useRef(`tts-${++_instanceCounter}`);

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    setLoadingLong(false);
  }, []);

  const startSlowTimer = useCallback(() => {
    clearSlowTimer();
    slowTimerRef.current = setTimeout(() => setLoadingLong(true), TTS_SLOW_WARNING_MS);
  }, [clearSlowTimer]);

  const cleanup = useCallback(() => {
    chainCancelRef.current = true;
    clearSlowTimer();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, [clearSlowTimer]);

  const stop = useCallback(() => {
    cleanup();
    setPlaying(false);
    setLoading(false);
    setError(false);
    setBlocked(false);
    setProgress(0);
  }, [cleanup]);

  // Global coordination: when any instance starts, all others stop immediately.
  useEffect(() => {
    const handle = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id && id !== instanceId.current) {
        cleanup();
        setPlaying(false);
        setLoading(false);
        setBlocked(false);
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
      const url = await fetchTTS(text, selectedVoice, chainCancelRef);
      if (url) blobUrlRef.current = url;
    } catch {
      // silently ignore — user can still tap Listen and it'll fetch fresh
    } finally {
      preloadingRef.current = false;
    }
  }, []);

  /** Attempt to play an audio element, handling iOS autoplay block gracefully. */
  const attemptPlay = useCallback(async (audio: HTMLAudioElement, blobUrl: string) => {
    try {
      await audio.play();
      setBlocked(false);
    } catch (err: unknown) {
      const name = (err instanceof Error) ? err.name : "";
      if (name === "NotAllowedError") {
        // iOS / browser autoplay policy blocked playback — store the URL so
        // the UI can show a "tap to play" button and resume.
        blobUrlRef.current = blobUrl;
        setBlocked(true);
        setLoading(false);
        setPlaying(false);
      } else {
        setError(true);
        setLoading(false);
      }
    }
  }, []);

  /** Resume playback after user taps "Tap to play" (iOS autoplay recovery). */
  const resumeAfterBlock = useCallback(() => {
    const url = blobUrlRef.current;
    if (!url) return;
    blobUrlRef.current = null;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.ontimeupdate = () => {
      if (audio.duration) setProgress(Math.round((audio.currentTime / audio.duration) * 100));
    };
    audio.onended = () => { setPlaying(false); setProgress(100); URL.revokeObjectURL(url); };
    audio.onerror = () => { setPlaying(false); setError(true); };
    audio.play()
      .then(() => { setBlocked(false); setPlaying(true); })
      .catch(() => setError(true));
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
      setBlocked(false);
      setProgress(0);
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(Math.round((audio.currentTime / audio.duration) * 100));
      };
      audio.onended = () => { setPlaying(false); setProgress(100); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlaying(false); setError(true); };
      await attemptPlay(audio, url);
      return;
    }

    // Slow path: fetch from server (disk cache if prewarmed, otherwise OpenAI)
    cleanup();
    chainCancelRef.current = false;
    setProgress(0);
    setLoading(true);
    setError(false);
    setBlocked(false);
    startSlowTimer();

    try {
      const url = await fetchTTS(text, selectedVoice, chainCancelRef);
      clearSlowTimer();

      if (!url || chainCancelRef.current) {
        setLoading(false);
        if (!chainCancelRef.current) setError(true);
        return;
      }

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
      await attemptPlay(audio, url);
    } catch {
      clearSlowTimer();
      setLoading(false);
      setPlaying(false);
      setError(true);
    }
  }, [cleanup, notifyStart, startSlowTimer, clearSlowTimer, attemptPlay]);

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
    setBlocked(false);
    startSlowTimer();

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
        blobUrl = await fetchTTS(text, selectedVoice, chainCancelRef);
        clearSlowTimer();
        if (!blobUrl || chainCancelRef.current) {
          if (!chainCancelRef.current) setError(true);
          break;
        }
      } else {
        clearSlowTimer();
      }

      if (!blobUrl || chainCancelRef.current) break;

      setLoading(false);
      setPlaying(true);

      // Pipeline: start fetching the next section while this one plays
      const nextSection = sections[i + 1];
      let prefetchPromise: Promise<string | null> | null = null;
      if (nextSection) {
        const nextVoice = nextSection.voice ?? getUserVoice();
        prefetchPromise = fetchTTS(nextSection.text, nextVoice, chainCancelRef);
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
        audio.play().catch(() => {
          URL.revokeObjectURL(urlToPlay);
          resolve();
        });
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
  }, [cleanup, notifyStart, startSlowTimer, clearSlowTimer]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { play, stop, toggle, preload, playChain, resumeAfterBlock, playing, loading, loadingLong, error, blocked, progress };
}
