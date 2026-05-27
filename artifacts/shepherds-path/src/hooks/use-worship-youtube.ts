import { useCallback, useEffect, useRef, useState } from "react";
import { getWorshipYoutubeMix } from "@/lib/worshipYouTubeMixes";
import { isMobileTouchDevice } from "@/lib/device";
import { loadYouTubeIframeApi, type YtPlayerInstance } from "@/lib/youtubeIframeApi";

type YTPlayerOptions = {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YtPlayerInstance }) => void;
    onError?: () => void;
    onStateChange?: (event: { data: number }) => void;
  };
};

/** YT.PlayerState */
const YT_PLAYING = 1;

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: YTPlayerOptions,
      ) => YtPlayerInstance;
      PlayerState?: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function useWorshipYoutube(
  enabled: boolean,
  mixId: string | null,
  volume: number,
  containerId: string,
) {
  const playerRef = useRef<YtPlayerInstance | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const destroyPlayer = useCallback(() => {
    try {
      playerRef.current?.destroy();
    } catch {
      /* already torn down */
    }
    playerRef.current = null;
    setPlayerReady(false);
    setIsPlaying(false);
    setNeedsTap(false);
  }, []);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const applyVolume = useCallback((player: YtPlayerInstance) => {
    const vol = Math.round(Math.min(100, Math.max(0, volumeRef.current * 100)));
    try {
      player.setVolume(vol);
      if (vol > 0) player.unMute();
      else player.mute();
    } catch {
      /* some mobile embeds reject setVolume until play */
    }
  }, []);

  const playNow = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      applyVolume(player);
      player.unMute();
      player.playVideo();
      setNeedsTap(false);
    } catch {
      setNeedsTap(true);
    }
  }, [applyVolume]);

  useEffect(() => {
    if (!enabled) {
      destroyPlayer();
      setLoadError(false);
      return;
    }

    const mix = getWorshipYoutubeMix(mixId);
    let cancelled = false;
    setPlayerReady(false);
    setLoadError(false);
    setIsPlaying(false);

    void (async () => {
      try {
        await loadYouTubeIframeApi();
        if (cancelled || !window.YT?.Player) return;

        const host = document.getElementById(containerId);
        if (!host) {
          if (!cancelled) setLoadError(true);
          return;
        }
        host.innerHTML = "";

        destroyPlayer();

        const player = new window.YT.Player(containerId, {
          videoId: mix.videoId,
          playerVars: {
            autoplay: isMobileTouchDevice() ? 0 : 1,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
            controls: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              applyVolume(event.target);
              if (isMobileTouchDevice()) {
                setNeedsTap(true);
                setPlayerReady(true);
                setLoadError(false);
                return;
              }
              try {
                event.target.playVideo();
              } catch {
                setNeedsTap(true);
              }
              setPlayerReady(true);
              setLoadError(false);
            },
            onError: () => {
              if (!cancelled) {
                setLoadError(true);
                setNeedsTap(false);
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === YT_PLAYING) {
                setIsPlaying(true);
                setNeedsTap(false);
              }
            },
          },
        });
        void player;
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
      destroyPlayer();
    };
  }, [enabled, mixId, containerId, destroyPlayer, applyVolume]);

  useEffect(() => {
    if (!enabled || !playerReady || !playerRef.current) return;
    applyVolume(playerRef.current);
  }, [volume, enabled, playerReady, applyVolume]);

  return { playerReady, loadError, needsTap, isPlaying, playNow };
}
