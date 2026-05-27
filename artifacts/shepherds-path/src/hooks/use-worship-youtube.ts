import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getWorshipYoutubeMix } from "@/lib/worshipYouTubeMixes";
import { youtubeWorshipEmbedUrl } from "@/lib/youtubeWorshipEmbed";

/**
 * Worship YouTube via plain iframe embed (no YT.Player API).
 * Iframe mounts only after the user taps Play — avoids WebView reload overlays
 * and autoplay races on iOS.
 */
export function useWorshipYoutube(
  enabled: boolean,
  mixId: string | null,
  _volume: number,
) {
  const [started, setStarted] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mix = useMemo(() => getWorshipYoutubeMix(mixId), [mixId]);

  useEffect(() => {
    if (!enabled) setStarted(false);
  }, [enabled]);

  useEffect(() => {
    setStarted(false);
  }, [mix.videoId]);

  const embedUrl =
    enabled && started ? youtubeWorshipEmbedUrl(mix.videoId, true) : null;

  const playNow = useCallback(() => {
    if (!mountedRef.current) return;
    setStarted(true);
  }, []);

  const needsTap = enabled && !started;
  const isPlaying = enabled && started;

  return {
    embedUrl,
    playerReady: enabled,
    loadError: false,
    needsTap,
    isPlaying,
    playNow,
  };
}
