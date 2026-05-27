import { useCallback, useEffect, useRef, useState } from "react";
import { getWorshipTrack, type WorshipTrackId } from "@/lib/worshipTracks";

type GeneratedPad = {
  stop: () => void;
  resume: () => Promise<void>;
};

function startGeneratedStillness(volume: number): GeneratedPad {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = Math.min(0.2, volume * 0.45);
  master.connect(ctx.destination);

  const oscillators: OscillatorNode[] = [];
  [110, 164.81, 220].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.33;
    o.connect(g);
    g.connect(master);
    o.start();
    oscillators.push(o);
  });

  return {
    resume: async () => {
      if (ctx.state === "suspended") await ctx.resume();
    },
    stop: () => {
      oscillators.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* noop */
        }
      });
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
  const [needsTap, setNeedsTap] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const stopAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    generatedRef.current?.stop();
    generatedRef.current = null;
    setUsingGenerated(false);
    setNeedsTap(false);
    setIsPlaying(false);
  }, []);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const playNow = useCallback(async () => {
    if (audioRef.current) {
      try {
        audioRef.current.volume = Math.min(1, Math.max(0, volumeRef.current));
        await audioRef.current.play();
        setUsingGenerated(false);
        setIsPlaying(true);
        setNeedsTap(false);
        return;
      } catch {
        /* fall through to generated */
      }
    }
    if (generatedRef.current) {
      await generatedRef.current.resume();
      setUsingGenerated(true);
      setIsPlaying(true);
      setNeedsTap(false);
      return;
    }
    setNeedsTap(true);
  }, []);

  useEffect(() => {
    if (!enabled || youtubeActive) {
      stopAll();
      return;
    }

    stopAll();
    const track = getWorshipTrack(trackId as WorshipTrackId);
    const audio = new Audio(track.src);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = Math.min(1, Math.max(0, volumeRef.current));
    audioRef.current = audio;

    const tryPlayFile = () => {
      setUsingGenerated(false);
      void audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setNeedsTap(false);
        })
        .catch(() => {
          setNeedsTap(true);
          setIsPlaying(false);
        });
    };

    const onMissingFile = () => {
      generatedRef.current?.stop();
      generatedRef.current = startGeneratedStillness(volumeRef.current);
      setUsingGenerated(true);
      setNeedsTap(true);
      setIsPlaying(false);
    };

    audio.addEventListener("canplaythrough", tryPlayFile, { once: true });
    audio.addEventListener("error", onMissingFile, { once: true });
    audio.load();

    const t = window.setTimeout(() => {
      if (audioRef.current === audio && audio.paused && audio.readyState < 3) {
        onMissingFile();
      }
    }, 5000);

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
    if (usingGenerated && generatedRef.current) {
      generatedRef.current.stop();
      generatedRef.current = startGeneratedStillness(volume);
      setNeedsTap(true);
      setIsPlaying(false);
    }
  }, [volume, enabled, usingGenerated, youtubeActive]);

  return { usingGenerated, needsTap, isPlaying, playNow };
}
