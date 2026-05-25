import { useState, useEffect, useRef, useCallback } from "react";
import { dailyArtImageSrc, preloadImage, probeImageUrl } from "@/lib/preloadImage";

export interface DailyArtData {
  imageUrl: string | null;
  scripture: string;
  reference: string;
  reflection: string;
}

const POLL_MS = 5_000;
const MAX_POLLS = 24;

/**
 * Fetches /api/daily-art and ensures the image is loadable before exposing the URL.
 */
export function useDailyArt(onImageUrl?: (url: string) => void) {
  const [art, setArt] = useState<DailyArtData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onImageRef = useRef(onImageUrl);
  onImageRef.current = onImageUrl;

  const applyImageUrl = useCallback(async (baseUrl?: string) => {
    const src = dailyArtImageSrc(baseUrl ?? "/api/daily-art/image");
    const ready = await probeImageUrl(src);
    if (!ready) return false;
    const ok = await preloadImage(src);
    if (!ok) return false;
    setImageUrl(src);
    setArt((prev) => (prev ? { ...prev, imageUrl: src } : prev));
    onImageRef.current?.(src);
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const finishLoading = () => {
      if (!cancelled) setLoading(false);
    };

    const tryAttachImage = async (): Promise<boolean> => {
      if (cancelled) return false;
      return applyImageUrl();
    };

    const load = async () => {
      try {
        const res = await fetch("/api/daily-art", { cache: "no-store" });
        const data = (await res.json()) as DailyArtData;
        if (cancelled) return;
        setArt(data);

        if (data.imageUrl) {
          if (await tryAttachImage()) {
            finishLoading();
            return;
          }
        }

        finishLoading();

        timer = setInterval(async () => {
          if (cancelled || polls >= MAX_POLLS) {
            if (timer) clearInterval(timer);
            return;
          }
          polls += 1;
          if (await tryAttachImage()) {
            if (timer) clearInterval(timer);
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
