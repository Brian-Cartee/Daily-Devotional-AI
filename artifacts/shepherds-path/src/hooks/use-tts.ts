import { useState, useRef, useCallback, useEffect } from "react";
import { getUserVoice } from "@/lib/userName";
import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { canPrewarmListen, type ListenScope } from "@/lib/listenPolicy";

export type { ListenScope };

let _instanceCounter = 0;

const TTS_FETCH_TIMEOUT_MS = 25_000;
const TTS_SLOW_WARNING_MS = 3_000;

export type ListenLimitCode =
  | "devotional_chain_limit"
  | "pro_required"
  | "listen_daily_cap"
  | "verse_too_long"
  | "session_required";

export type FetchTTSOptions = {
  scope?: ListenScope;
  chainStart?: boolean;
};

function ttsPayload(text: string, voice: string, opts?: FetchTTSOptions) {
  return {
    text: text.slice(0, 4096),
    voice,
    scope: opts?.scope ?? "snippet",
    chainStart: opts?.chainStart === true,
    sessionId: getSessionId(),
    isPro: isProVerifiedLocally(),
  };
}

/**
 * Pro-only speculative cache warm (Policy 2 — no prewarm for free users).
 */
export function prewarmTTS(text: string, voice?: string, scope: ListenScope = "snippet"): void {
  if (!text?.trim() || !canPrewarmListen()) return;
  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ttsPayload(text, voice ?? getUserVoice(), { scope })),
  })
    .then(r => r.blob())
    .catch(() => {});
}

type FetchTTSResult =
  | { ok: true; url: string }
  | { ok: false; code?: ListenLimitCode; message?: string };

async function fetchTTS(
  text: string,
  voice: string,
  cancelRef: React.MutableRefObject<boolean>,
  opts?: FetchTTSOptions,
): Promise<FetchTTSResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ttsPayload(text, voice, opts)),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (cancelRef.current) return { ok: false };
    if (!response.ok) {
      if (response.status === 403 || response.status === 400) {
        try {
          const data = await response.json();
          return { ok: false, code: data.code as ListenLimitCode, message: data.message };
        } catch {
          return { ok: false };
        }
      }
      return { ok: false };
    }
    const blob = await response.blob();
    if (cancelRef.current) return { ok: false };
    return { ok: true, url: URL.createObjectURL(blob) };
  } catch {
    clearTimeout(timer);
    return { ok: false };
  }
}

export function useTTS() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLong, setLoadingLong] = useState(false);
  const [error, setError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [listenLimitCode, setListenLimitCode] = useState<ListenLimitCode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const blobTextRef = useRef<string | null>(null);
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
    blobTextRef.current = null;
  }, [clearSlowTimer]);

  const stop = useCallback(() => {
    cleanup();
    setPlaying(false);
    setLoading(false);
    setError(false);
    setBlocked(false);
    setProgress(0);
  }, [cleanup]);

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

  const preload = useCallback(async (text: string, voice?: string, opts?: FetchTTSOptions) => {
    if (blobUrlRef.current || preloadingRef.current) return;
    preloadingRef.current = true;
    const selectedVoice = voice ?? getUserVoice();
    try {
      const result = await fetchTTS(text, selectedVoice, chainCancelRef, opts);
      if (result.ok) {
        blobUrlRef.current = result.url;
        blobTextRef.current = text;
      }
    } catch {
      /* noop */
    } finally {
      preloadingRef.current = false;
    }
  }, []);

  const attemptPlay = useCallback(async (audio: HTMLAudioElement, blobUrl: string, sourceText: string) => {
    try {
      await audio.play();
      setBlocked(false);
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError") {
        blobUrlRef.current = blobUrl;
        blobTextRef.current = sourceText;
        setBlocked(true);
        setLoading(false);
        setPlaying(false);
      } else {
        setError(true);
        setLoading(false);
      }
    }
  }, []);

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

  const play = useCallback(async (text: string, voice?: string, opts?: FetchTTSOptions) => {
    const selectedVoice = voice ?? getUserVoice();
    notifyStart();
    setListenLimitCode(null);

    if (blobUrlRef.current && blobTextRef.current === text) {
      const url = blobUrlRef.current;
      blobUrlRef.current = null;
      blobTextRef.current = null;
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
      await attemptPlay(audio, url, text);
      return;
    }

    cleanup();
    chainCancelRef.current = false;
    setProgress(0);
    setLoading(true);
    setError(false);
    setBlocked(false);
    startSlowTimer();

    try {
      const result = await fetchTTS(text, selectedVoice, chainCancelRef, opts);
      clearSlowTimer();

      if (!result.ok) {
        setLoading(false);
        if (result.code) {
          setListenLimitCode(result.code);
          window.dispatchEvent(new CustomEvent("sp-listen-limit", { detail: { code: result.code } }));
        } else if (!chainCancelRef.current) {
          setError(true);
        }
        return;
      }

      if (chainCancelRef.current) {
        setLoading(false);
        return;
      }

      const audio = new Audio(result.url);
      audioRef.current = audio;
      audio.oncanplay = () => { setLoading(false); setPlaying(true); };
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(Math.round((audio.currentTime / audio.duration) * 100));
      };
      audio.onended = () => {
        setPlaying(false);
        setProgress(100);
        URL.revokeObjectURL(result.url);
      };
      audio.onerror = () => { setPlaying(false); setError(true); };
      await attemptPlay(audio, result.url, text);
    } catch {
      clearSlowTimer();
      setLoading(false);
      setPlaying(false);
      setError(true);
    }
  }, [cleanup, notifyStart, startSlowTimer, clearSlowTimer, attemptPlay]);

  const toggle = useCallback(
    (text: string, voice?: string, opts?: FetchTTSOptions) => {
      if (playing) { stop(); } else { void play(text, voice, opts); }
    },
    [playing, play, stop],
  );

  const playChain = useCallback(async (
    sections: Array<{ text: string; voice?: string; key?: string }>,
    onSectionStart?: (index: number, key?: string) => void,
    onComplete?: () => void,
    chainOpts?: { chainScope: "devotional" | "guidance"; onLimit?: (code: ListenLimitCode) => void },
  ) => {
    if (sections.length === 0) return;
    notifyStart();
    setListenLimitCode(null);
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
      const fetchOpts: FetchTTSOptions | undefined = chainOpts
        ? {
            scope: chainOpts.chainScope,
            chainStart: i === 0,
          }
        : undefined;

      onSectionStart?.(i, key);

      let blobUrl: string | null = prefetchedUrl;
      prefetchedUrl = null;

      if (!blobUrl) {
        const result = await fetchTTS(text, selectedVoice, chainCancelRef, fetchOpts);
        clearSlowTimer();
        if (chainCancelRef.current) break;
        if (!result.ok) {
          if (result.code) {
            setListenLimitCode(result.code);
            chainOpts?.onLimit?.(result.code);
            window.dispatchEvent(new CustomEvent("sp-listen-limit", { detail: { code: result.code } }));
          }
          break;
        }
        blobUrl = result.url;
      } else {
        clearSlowTimer();
      }

      if (!blobUrl || chainCancelRef.current) break;

      setLoading(false);
      setPlaying(true);

      const nextSection = sections[i + 1];
      let prefetchPromise: Promise<FetchTTSResult> | null = null;
      if (nextSection) {
        const nextVoice = nextSection.voice ?? getUserVoice();
        const nextOpts: FetchTTSOptions | undefined = chainOpts
          ? { scope: chainOpts.chainScope, chainStart: false }
          : undefined;
        prefetchPromise = fetchTTS(nextSection.text, nextVoice, chainCancelRef, nextOpts);
      }

      const segStart = (i / sections.length) * 100;
      const segEnd = ((i + 1) / sections.length) * 100;

      const tryPlay = (urlToPlay: string): Promise<boolean> =>
        new Promise<boolean>((resolve) => {
          let settled = false;
          const done = (val: boolean) => {
            if (settled) return;
            settled = true;
            resolve(val);
          };

          const audio = new Audio(urlToPlay);
          audioRef.current = audio;

          let durationTimeout: ReturnType<typeof setTimeout> | null = null;
          audio.onloadedmetadata = () => {
            if (audio.duration && isFinite(audio.duration)) {
              durationTimeout = setTimeout(() => {
                URL.revokeObjectURL(urlToPlay);
                done(true);
              }, (audio.duration + 15) * 1000);
            }
          };

          audio.ontimeupdate = () => {
            if (audio.duration) {
              const segProgress = audio.currentTime / audio.duration;
              setProgress(Math.round(segStart + segProgress * (segEnd - segStart)));
            }
          };
          audio.onended = () => {
            if (durationTimeout) clearTimeout(durationTimeout);
            URL.revokeObjectURL(urlToPlay);
            done(true);
          };
          audio.onerror = () => {
            if (durationTimeout) clearTimeout(durationTimeout);
            URL.revokeObjectURL(urlToPlay);
            done(false);
          };

          audio.play().catch(() => done(false));
        });

      const played = await tryPlay(blobUrl);
      if (!played) {
        setPlaying(false);
        setError(true);
        break;
      }

      if (prefetchPromise) {
        const nextResult = await prefetchPromise;
        if (nextResult.ok) prefetchedUrl = nextResult.url;
      }
    }

    setLoading(false);
    setPlaying(false);
    setProgress(0);
    if (!chainCancelRef.current) onComplete?.();
  }, [cleanup, notifyStart, startSlowTimer, clearSlowTimer]);

  return {
    playing,
    loading,
    loadingLong,
    error,
    blocked,
    progress,
    listenLimitCode,
    toggle,
    play,
    stop,
    preload,
    resumeAfterBlock,
    playChain,
  };
}
