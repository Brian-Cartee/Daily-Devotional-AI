import { useCallback, useEffect, useRef, useState } from "react";
import { getWorshipYoutubeMix } from "@/lib/worshipYouTubeMixes";
import { loadYouTubeIframeApi, type YtPlayerInstance } from "@/lib/youtubeIframeApi";

type YTPlayerOptions = {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YtPlayerInstance }) => void;
    onError?: () => void;
  };
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: YTPlayerOptions,
      ) => YtPlayerInstance;
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

  const destroyPlayer = useCallback(() => {
    try {
      playerRef.current?.destroy();
    } catch {
      /* already torn down */
    }
    playerRef.current = null;
    setPlayerReady(false);
  }, []);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (!enabled) {
      destroyPlayer();
      setLoadError(false);
      return;
    }

    const mix = getWorshipYoutubeMix(mixId);
    let cancelled = false;

    void (async () => {
      try {
        await loadYouTubeIframeApi();
        if (cancelled || !window.YT?.Player) return;

        destroyPlayer();
        const origin =
          typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";

        const player = new window.YT.Player(containerId, {
          videoId: mix.videoId,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
            controls: 1,
            ...(origin ? { origin: window.location.origin } : {}),
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              const vol = Math.round(Math.min(100, Math.max(0, volumeRef.current * 100)));
              event.target.setVolume(vol);
              event.target.unMute();
              try {
                event.target.playVideo();
              } catch {
                /* mobile may require tap inside player */
              }
              setPlayerReady(true);
              setLoadError(false);
            },
            onError: () => {
              if (!cancelled) setLoadError(true);
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
  }, [enabled, mixId, containerId, destroyPlayer]);

  useEffect(() => {
    if (!enabled || !playerReady || !playerRef.current) return;
    const vol = Math.round(Math.min(100, Math.max(0, volume * 100)));
    playerRef.current.setVolume(vol);
    if (vol === 0) playerRef.current.mute();
    else playerRef.current.unMute();
  }, [volume, enabled, playerReady]);

  return { playerReady, loadError };
}
