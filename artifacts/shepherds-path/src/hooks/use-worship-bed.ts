import { useCallback, useEffect, useRef, useState } from "react";
import { getWorshipTrack, type WorshipTrackId } from "@/lib/worshipTracks";

type GeneratedPad = {
  stop: () => void;
  setVolume: (volume: number) => void;
};

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null;
}

/** iOS: create context and start oscillators inside the user tap handler. */
async function createGeneratedPad(volume: number): Promise<GeneratedPad | null> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;

  try {
    const ctx = new Ctor();
    if (ctx.state === "suspended") await ctx.resume();

    const master = ctx.createGain();
    master.gain.value = Math.min(0.42, volume * 0.75);
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
        master.gain.value = Math.min(0.42, v * 0.75);
      },
    };
  } catch {
    return null;
  }
}

function configureAudioElement(audio: HTMLAudioElement) {
  audio.loop = true;
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
}

export function useWorshipBed(
  enabled: boolean,
  trackId: string | null,
  volume: number,
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
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
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

  const playGenerated = useCallback(async () => {
    generatedRef.current?.stop();
    const pad = await createGeneratedPad(volumeRef.current);
    if (!pad) return false;
    generatedRef.current = pad;
    setUsingGenerated(true);
    setIsPlaying(true);
    setNeedsTap(false);
    return true;
  }, []);

  const playNow = useCallback(async () => {
    if (!fileMissingRef.current && audioRef.current) {
      try {
        configureAudioElement(audioRef.current);
        audioRef.current.volume = Math.min(1, Math.max(0, volumeRef.current));
        await audioRef.current.play();
        setUsingGenerated(false);
        setIsPlaying(true);
        setNeedsTap(false);
        return;
      } catch {
        fileMissingRef.current = true;
      }
    }

    const ok = await playGenerated();
    if (!ok) {
      setNeedsTap(true);
      setIsPlaying(false);
    }
  }, [playGenerated]);

  useEffect(() => {
    if (!enabled || youtubeActive) {
      stopAll();
      return;
    }

    stopAll();
    const track = getWorshipTrack(trackId as WorshipTrackId);
    const audio = new Audio();
    configureAudioElement(audio);
    audio.volume = Math.min(1, Math.max(0, volumeRef.current));
    audioRef.current = audio;

    const markMissing = () => {
      fileMissingRef.current = true;
      setNeedsTap(true);
      setIsPlaying(false);
      setUsingGenerated(false);
    };

    const onCanPlay = () => {
      if (audioRef.current !== audio) return;
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        markMissing();
        return;
      }
      fileMissingRef.current = false;
      setNeedsTap(true);
    };

    audio.addEventListener("canplaythrough", onCanPlay, { once: true });
    audio.addEventListener("error", markMissing, { once: true });
    audio.src = track.src;
    audio.load();

    void fetch(track.src, { method: "HEAD" })
      .then((res) => {
        const ct = res.headers.get("content-type") ?? "";
        if (!res.ok || ct.includes("text/html") || (ct && !ct.includes("audio"))) {
          markMissing();
        }
      })
      .catch(() => markMissing());

    const t = window.setTimeout(() => {
      if (audioRef.current === audio && audio.readyState < 2) markMissing();
    }, 4000);

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
