import { useState, useRef, useCallback } from "react";

const audioCache = new Map<string, string>();

export function useTTS() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
  }, []);

  const play = useCallback(async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setProgress(0);
    setLoading(true);

    try {
      let blobUrl = audioCache.get(text);

      if (!blobUrl) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("TTS request failed");
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        audioCache.set(text, blobUrl);
      }

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setProgress(Math.round((audio.currentTime / audio.duration) * 100));
        }
      };
      audio.onended = () => {
        setPlaying(false);
        setProgress(100);
      };
      audio.onerror = () => {
        setPlaying(false);
        setLoading(false);
      };

      setLoading(false);
      setPlaying(true);
      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      setLoading(false);
      setPlaying(false);
    }
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (playing) {
        stop();
      } else {
        play(text);
      }
    },
    [playing, play, stop]
  );

  return { play, stop, toggle, playing, loading, progress };
}
