import { useState, useRef, useCallback } from "react";

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
    setProgress(0);
  }, []);

  const play = useCallback(async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setProgress(0);
    setLoading(true);

    try {
      // Point the audio element directly at the streaming GET endpoint.
      // The browser starts buffering and fires `canplay` as soon as the
      // first chunks arrive — no need to wait for the full file.
      const url = `/api/tts?text=${encodeURIComponent(text.slice(0, 4000))}`;
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
