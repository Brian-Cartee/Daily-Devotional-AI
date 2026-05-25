import { useState, useEffect, useRef, useCallback } from "react";
import { dailyArtImageSrc } from "@/lib/preloadImage";

export interface DailyArtData {
  imageUrl: string | null;
  scripture: string;
  reference: string;
  reflection: string;
}

const POLL_MS = 4_000;
const MAX_POLLS = 30;

/**
 * Fetches /api/daily-art. When the API reports an image, expose a cache-busted URL
 * immediately and let the <img> onLoad/onError handle readiness (probe/preload was
 * failing in Safari when an earlier 404 was cached).
 */
export function useDailyArt(onImageUrl?: (url: string) => void) {
  const [art, setArt] = useState<DailyArtData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onImageRef = useRef(onImageUrl);
  onImageRef.current = onImageUrl;

  const applyImageUrl = useCallback((base?: string | null) => {
    if (!base) return;
    const src = dailyArtImageSrc(base.replace(/\?.*$/, ""));
    setImageUrl(src);
    setArt((prev) => (prev ? { ...prev, imageUrl: src } : prev));
    onImageRef.current?.(src);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const finishLoading = () => {
      if (!cancelled) setLoading(false);
    };

    const load = async () => {
      try {
        const res = await fetch("/api/daily-art", { cache: "no-store" });
        const data = (await res.json()) as DailyArtData;
        if (cancelled) return;
        setArt(data);

        if (data.imageUrl) {
          applyImageUrl(data.imageUrl);
          finishLoading();
          return;
        }

        finishLoading();

        timer = setInterval(async () => {
          if (cancelled || polls >= MAX_POLLS) {
            if (timer) clearInterval(timer);
            return;
          }
          polls += 1;
          try {
            const r = await fetch("/api/daily-art", { cache: "no-store" });
            const next = (await r.json()) as DailyArtData;
            if (cancelled) return;
            if (next.imageUrl) {
              setArt(next);
              applyImageUrl(next.imageUrl);
              if (timer) clearInterval(timer);
            }
          } catch {
            /* keep polling */
          }
        }, POLL_MS);
      } catch {
        finishLoading();
      }
    };

    load();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [applyImageUrl]);

  return { art, imageUrl, loading, setArt };
}
