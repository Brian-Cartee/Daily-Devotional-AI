/** Preload an image URL; resolves false on error or timeout (avoids stuck spinners). */
export function preloadImage(src: string, timeoutMs = 22_000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    img.onload = () => done(img.naturalWidth > 0);
    img.onerror = () => done(false);
    img.src = src;
    if (img.complete && img.naturalWidth > 0) done(true);
  });
}

export async function probeImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const ct = res.headers.get("content-type") ?? "";
    return res.ok && ct.includes("image");
  } catch {
    return false;
  }
}

export function dailyArtImageSrc(base = "/api/daily-art/image"): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  return `${base}?d=${day}&t=${Date.now()}`;
}
