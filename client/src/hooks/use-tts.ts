import { useState, useRef, useCallback, useEffect } from "react";
import { getUserVoice } from "@/lib/userName";

export function useTTS() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const preloadingRef = useRef(false);

  const cleanup = useCallback(() => {
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
    setProgress(0);
  }, [cleanup]);

  // Pre-fetch audio in the background so it's ready when play is called.
  // If the blob is already cached nothing happens.
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

    // If preloaded blob is ready, use it immediately — no loading wait
    if (blobUrlRef.current) {
      const url = blobUrlRef.current;
      blobUrlRef.current = null; // will be re-set after we detach it from the ref
      const audio = new Audio(url);
      audioRef.current = audio;
      setLoading(false);
      setPlaying(true);
      setProgress(0);

      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(Math.round((audio.currentTime / audio.duration) * 100));
      };
      audio.onended = () => {
        setPlaying(false);
        setProgress(100);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlaying(false);
      };
      await audio.play();
      return;
    }

    // No preloaded blob — fetch fresh
    cleanup();
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

      audio.oncanplay = () => {
        setLoading(false);
        setPlaying(true);
      };
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(Math.round((audio.currentTime / audio.duration) * 100));
      };
      audio.onended = () => {
        setPlaying(false);
        setProgress(100);
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };
      audio.onerror = () => {
        setPlaying(false);
        setLoading(false);
      };

      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      setLoading(false);
      setPlaying(false);
    }
  }, [cleanup]);

  const toggle = useCallback(
    (text: string, voice?: string) => {
      if (playing) {
        stop();
      } else {
        play(text, voice);
      }
    },
    [playing, play, stop]
  );

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return { play, stop, toggle, preload, playing, loading, progress };
}
