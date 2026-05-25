import { useCallback, useEffect, useRef, useState } from "react";
import { getWorshipTrack, type WorshipTrackId } from "@/lib/worshipTracks";

type GeneratedPad = { stop: () => void };

function startGeneratedStillness(volume: number): GeneratedPad {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = Math.min(0.12, volume * 0.25);
  master.connect(ctx.destination);

  [110, 164.81, 220].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.33;
    o.connect(g);
    g.connect(master);
    o.start();
  });

  return {
    stop: () => {
      void ctx.close();
    },
  };
}

export function useWorshipBed(
  enabled: boolean,
  trackId: string | null,
  volume: number,
  /** When true, skip MP3/stillness — YouTube player handles audio */
  youtubeActive = false,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generatedRef = useRef<GeneratedPad | null>(null);
  const [usingGenerated, setUsingGenerated] = useState(false);

  const stopAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    generatedRef.current?.stop();
    generatedRef.current = null;
    setUsingGenerated(false);
  }, []);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (!enabled || youtubeActive) {
      stopAll();
      return;
    }

    stopAll();
    const track = getWorshipTrack(trackId as WorshipTrackId);
    const audio = new Audio(track.src);
    audio.loop = true;
    audio.volume = Math.min(1, Math.max(0, volumeRef.current));
    audioRef.current = audio;

    const tryPlayFile = () => {
      setUsingGenerated(false);
      void audio.play().catch(() => {
        generatedRef.current?.stop();
        generatedRef.current = startGeneratedStillness(volumeRef.current);
        setUsingGenerated(true);
      });
    };

    const onMissingFile = () => {
      generatedRef.current?.stop();
      generatedRef.current = startGeneratedStillness(volumeRef.current);
      setUsingGenerated(true);
    };

    audio.addEventListener("canplaythrough", tryPlayFile, { once: true });
    audio.addEventListener("error", onMissingFile, { once: true });
    audio.load();

    const t = window.setTimeout(() => {
      if (audioRef.current === audio && audio.paused && audio.readyState < 3) {
        onMissingFile();
      }
    }, 2800);

    return () => {
      window.clearTimeout(t);
      stopAll();
    };
  }, [enabled, trackId, stopAll, youtubeActive]);

  useEffect(() => {
    if (!enabled || youtubeActive) return;
    if (audioRef.current && !usingGenerated) {
      audioRef.current.volume = Math.min(1, Math.max(0, volume));
    }
    if (usingGenerated) {
      generatedRef.current?.stop();
      generatedRef.current = startGeneratedStillness(volume);
    }
  }, [volume, enabled, usingGenerated, youtubeActive]);

  return { usingGenerated };
}
