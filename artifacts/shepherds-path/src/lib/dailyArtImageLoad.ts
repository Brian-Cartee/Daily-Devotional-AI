import { dailyArtImageSrc } from "@/lib/preloadImage";

export function easternTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function hashDay(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function dailyArtFallbackUrls(
  primaryBase?: string | null,
  options?: { allowBundledPlaceholder?: boolean },
): string[] {
  const day = easternTodayKey();
  const bases: string[] = [];
  const bust = `refresh=${Date.now()}`;
  if (primaryBase) {
    bases.push(dailyArtImageSrc(`${primaryBase.replace(/\?.*$/, "")}?${bust}`));
  }
  bases.push(dailyArtImageSrc(`/api/daily-art/image/${day}?${bust}`));
  bases.push(dailyArtImageSrc(`/api/daily-art/image?${bust}`));

  if (options?.allowBundledPlaceholder !== false) {
    const statics =
      hashDay(day) % 2 === 0
        ? ["/daily-art/natural-sunset.jpg", "/daily-art/natural-mountain.jpg"]
        : ["/daily-art/natural-mountain.jpg", "/daily-art/natural-sunset.jpg"];
    for (const s of statics) {
      bases.push(`${s}?t=${Date.now()}`);
    }
  }
  return bases;
}

export async function fetchDailyArtBlobUrl(src: string, timeoutMs = 14_000): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(src, { cache: "no-store", signal: ctrl.signal, credentials: "same-origin" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("image") && !ct.includes("octet-stream")) return null;
    const blob = await res.blob();
    if (blob.size < 500) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch via blob URL — avoids Safari caching a prior 404 on <img src>. */
export async function loadDailyArtImage(
  primaryBase?: string | null,
  options?: { allowBundledPlaceholder?: boolean },
): Promise<string | null> {
  for (const url of dailyArtFallbackUrls(primaryBase, options)) {
    const blob = await fetchDailyArtBlobUrl(url);
    if (blob) return blob;
  }
  return null;
}
