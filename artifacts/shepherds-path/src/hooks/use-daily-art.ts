import { useState, useEffect, useRef, useCallback } from "react";

export interface DailyArtData {
  imageUrl: string | null;
  scripture: string;
  reference: string;
  reflection: string;
}

const POLL_MS = 8_000;
const MAX_POLLS = 20;

function easternDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

/** Check if today's JPEG exists on the server (background gpt-image-1 may still be running). */
async function probeDailyArtImage(): Promise<boolean> {
  try {
    const res = await fetch("/api/daily-art/image", { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches /api/daily-art and polls until the background image is ready.
 */
export function useDailyArt(onImageUrl?: (url: string) => void) {
  const [art, setArt] = useState<DailyArtData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onImageRef = useRef(onImageUrl);
  onImageRef.current = onImageUrl;

  const applyImageUrl = useCallback((url: string) => {
    setImageUrl(url);
    setArt(prev => (prev ? { ...prev, imageUrl: url } : prev));
    onImageRef.current?.(url);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const res = await fetch("/api/daily-art", { cache: "no-store" });
        const data = (await res.json()) as DailyArtData;
        if (cancelled) return;
        setArt(data);

        if (data.imageUrl) {
          const bust =
            data.imageUrl.includes("?") ? data.imageUrl : `${data.imageUrl}?d=${easternDateKey()}`;
          applyImageUrl(bust);
          setLoading(false);
          return;
        }

        if (await probeDailyArtImage()) {
          applyImageUrl("/api/daily-art/image");
          setLoading(false);
          return;
        }

        setLoading(false);

        timer = setInterval(async () => {
          if (cancelled || polls >= MAX_POLLS) {
            if (timer) clearInterval(timer);
            return;
          }
          polls += 1;
          if (await probeDailyArtImage()) {
            applyImageUrl("/api/daily-art/image");
            if (timer) clearInterval(timer);
          }
        }, POLL_MS);
      } catch {
        if (!cancelled) setLoading(false);
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
