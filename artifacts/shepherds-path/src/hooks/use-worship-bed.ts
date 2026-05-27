import { useCallback, useEffect, useRef, useState } from "react";
import { getWorshipTrack, type WorshipTrackId } from "@/lib/worshipTracks";

type GeneratedPad = {
  stop: () => void;
  resume: () => Promise<void>;
  setVolume: (volume: number) => void;
};

function startGeneratedStillness(volume: number): GeneratedPad | null {
  try {
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
      setVolume: (v: number) => {
        master.gain.value = Math.min(0.2, v * 0.45);
      },
    };
  } catch {
    return null;
  }
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
  const fileMissingRef = useRef(false);
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
    fileMissingRef.current = false;
    setUsingGenerated(false);
    setNeedsTap(false);
    setIsPlaying(false);
  }, []);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const startGenerated = useCallback(() => {
    generatedRef.current?.stop();
    const pad = startGeneratedStillness(volumeRef.current);
    generatedRef.current = pad;
    setUsingGenerated(!!pad);
    return pad;
  }, []);

  const playNow = useCallback(async () => {
    if (audioRef.current && !fileMissingRef.current) {
      try {
        audioRef.current.volume = Math.min(1, Math.max(0, volumeRef.current));
        await audioRef.current.play();
        setUsingGenerated(false);
        setIsPlaying(true);
        setNeedsTap(false);
        return;
      } catch {
        /* fall through */
      }
    }

    const pad = generatedRef.current ?? startGenerated();
    if (!pad) {
      setNeedsTap(true);
      setIsPlaying(false);
      return;
    }
    try {
      await pad.resume();
      setUsingGenerated(true);
      setIsPlaying(true);
      setNeedsTap(false);
    } catch {
      setNeedsTap(true);
      setIsPlaying(false);
    }
  }, [startGenerated]);

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

    const onMissingFile = () => {
      fileMissingRef.current = true;
      setNeedsTap(true);
      setIsPlaying(false);
      setUsingGenerated(false);
    };

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
      generatedRef.current.setVolume(volume);
    }
  }, [volume, enabled, usingGenerated, youtubeActive]);

  return { usingGenerated, needsTap, isPlaying, playNow };
}
