import { dailyArtImageSrc } from "@/lib/preloadImage";

export function easternTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

export function dailyArtFallbackUrls(primaryBase?: string | null): string[] {
  const day = easternTodayKey();
  const bases = new Set<string>();
  if (primaryBase) {
    bases.add(dailyArtImageSrc(primaryBase.replace(/\?.*$/, "")));
  }
  bases.add(dailyArtImageSrc(`/api/daily-art/image/${day}`));
  bases.add(dailyArtImageSrc("/api/daily-art/image"));
  bases.add(`/daily-art/natural-mountain.jpg?t=${Date.now()}`);
  bases.add(`/daily-art/natural-sunset.jpg?t=${Date.now()}`);
  return [...bases];
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
export async function loadDailyArtImage(primaryBase?: string | null): Promise<string | null> {
  for (const url of dailyArtFallbackUrls(primaryBase)) {
    const blob = await fetchDailyArtBlobUrl(url);
    if (blob) return blob;
  }
  return null;
}
