import { useState, useRef, useCallback } from "react";
import { getUserVoice } from "@/lib/userName";

export function useTTS() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

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

  const play = useCallback(async (text: string, voice?: string) => {
    cleanup();
    setProgress(0);
    setLoading(true);

    const selectedVoice = voice ?? getUserVoice();

    try {
      // POST the full text in the request body — no URL length limits.
      // Wait for the full audio blob before playing so nothing gets cut off.
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
        if (audio.duration) {
          setProgress(Math.round((audio.currentTime / audio.duration) * 100));
        }
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

  return { play, stop, toggle, playing, loading, progress };
}
