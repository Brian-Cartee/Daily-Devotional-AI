import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { generateImageBuffer } from "./replit_integrations/image/client";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/** US Eastern calendar date — matches client todayKey() */
export function getEasternDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

/** Prefer dir with fallback art + existing JPEGs (api-server empty dir must not win over shepherds-path). */
export function resolveDailyArtDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "client/public/daily-art"),
    path.resolve(process.cwd(), "../shepherds-path/public/daily-art"),
    path.resolve(MODULE_DIR, "../client/public/daily-art"),
    path.resolve(MODULE_DIR, "../../shepherds-path/public/daily-art"),
  ];
  let best = candidates[0];
  let bestScore = -1;
  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    let score = 0;
    if (fs.existsSync(path.join(dir, "natural-mountain.jpg"))) score += 100;
    try {
      score += fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).length;
    } catch {
      /* ignore */
    }
    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  fs.mkdirSync(best, { recursive: true });
  return best;
}

export type DailyArtSource = "unsplash" | "pexels" | "ai" | "fallback";

const STATIC_FALLBACK_FILES = ["natural-sunset.jpg", "natural-mountain.jpg"] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Rotate which stock JPG is used so failures don't always show the same mountain. */
export function pickStaticFallbackFilename(seed: string): string {
  const idx = hashSeed(seed || "default") % STATIC_FALLBACK_FILES.length;
  return STATIC_FALLBACK_FILES[idx]!;
}

export function stockQueryForVerse(
  scripture: string,
  reference: string,
  dayOfYear: number,
  pool: { reference: string; query: string }[],
): string {
  const norm = (r: string) => r.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = pool.find((p) => norm(p.reference) === norm(reference));
  if (match) return match.query;

  const poolQuery = pool[dayOfYear % pool.length]?.query;
  if (poolQuery) return poolQuery;

  const words = scripture
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 4);
  return `${words.join(" ")} sacred landscape cinematic golden light contemplative`;
}

export function buildDailyArtPrompt(scripture: string, reference: string, visualTheme: string): string {
  return [
    `Breathtaking devotional artwork: ${visualTheme}.`,
    `Inspired by the scripture "${scripture}" (${reference}).`,
    `Style: cinematic oil painting meets fine art photography — luminous, painterly brushwork with photorealistic detail.`,
    `Lighting: warm divine golden light, god rays, ethereal glow that suggests transcendence and peace.`,
    `Mood: deeply contemplative, sacred, emotionally moving.`,
    `Composition: wide landscape format, rule-of-thirds, leading lines toward the light.`,
    `No people, no text, no watermarks, no logos, no borders.`,
    `Museum quality. 16:9 aspect ratio.`,
  ].join(" ");
}

async function fetchUnsplashPhoto(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${key}` } },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[daily-art] Unsplash ${res.status} for query "${query}":`, body.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as { urls?: { regular?: string } };
    return data.urls?.regular ?? null;
  } catch (err) {
    console.warn("[daily-art] Unsplash fetch error:", err);
    return null;
  }
}

/** Download a landscape stock photo for verse art / other features. */
export async function fetchStockImageBuffer(query: string): Promise<Buffer | null> {
  let photoUrl = await fetchUnsplashPhoto(query);
  if (!photoUrl) photoUrl = await fetchPexelsPhoto(query);
  if (!photoUrl) return null;
  try {
    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) return null;
    return Buffer.from(await imgRes.arrayBuffer());
  } catch {
    return null;
  }
}

async function fetchPexelsPhoto(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return null;
  try {
    const page = Math.floor(Math.random() * 4) + 1;
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${page}&orientation=landscape`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[daily-art] Pexels ${res.status} for query "${query}":`, body.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as { photos?: { src?: { large2x?: string; large?: string } }[] };
    const photos = data.photos ?? [];
    if (!photos.length) return null;
    const photo = photos[Math.floor(Math.random() * photos.length)];
    return photo.src?.large2x ?? photo.src?.large ?? null;
  } catch {
    return null;
  }
}

export function readStaticFallback(dir: string, seed?: string): Buffer | null {
  const start = pickStaticFallbackFilename(seed || "");
  const startIdx = STATIC_FALLBACK_FILES.indexOf(start as (typeof STATIC_FALLBACK_FILES)[number]);
  const order =
    startIdx >= 0
      ? [...STATIC_FALLBACK_FILES.slice(startIdx), ...STATIC_FALLBACK_FILES.slice(0, startIdx)]
      : [...STATIC_FALLBACK_FILES];

  const dirs = [
    dir,
    path.resolve(MODULE_DIR, "../../shepherds-path/public/daily-art"),
    path.resolve(process.cwd(), "../shepherds-path/public/daily-art"),
  ];

  for (const name of order) {
    for (const d of dirs) {
      const p = path.join(d, name);
      if (!fs.existsSync(p)) continue;
      try {
        return fs.readFileSync(p);
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

/**
 * Write today's JPEG — stock photo first (fast/reliable), then static fallback, then AI.
 */
export async function writeDailyArtImageFile(
  imgFile: string,
  query: string,
  scripture: string,
  reference: string,
): Promise<{ ok: boolean; source: DailyArtSource | null }> {
  let imgBuffer: Buffer | null = null;
  let source: DailyArtSource | null = null;
  const dir = path.dirname(imgFile);
  const seed = path.basename(imgFile, ".jpg");

  let photoUrl = await fetchUnsplashPhoto(query);
  if (photoUrl) {
    try {
      const imgRes = await fetch(photoUrl);
      if (imgRes.ok) {
        imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        source = "unsplash";
      }
    } catch {
      imgBuffer = null;
    }
  }

  if (!imgBuffer) {
    photoUrl = await fetchPexelsPhoto(query);
    if (photoUrl) {
      try {
        const imgRes = await fetch(photoUrl);
        if (imgRes.ok) {
          imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          source = "pexels";
        }
      } catch {
        imgBuffer = null;
      }
    }
  }

  if (!imgBuffer) {
    try {
      const aiPrompt = buildDailyArtPrompt(scripture, reference, query);
      console.log("[daily-art] Generating AI image with gpt-image-1...");
      imgBuffer = await generateImageBuffer(aiPrompt, "1536x1024", "high");
      source = "ai";
      console.log("[daily-art] AI image generated successfully.");
    } catch (aiErr) {
      console.warn("[daily-art] AI generation failed:", aiErr);
    }
  }

  if (!imgBuffer) {
    imgBuffer = readStaticFallback(dir, seed);
    if (imgBuffer) source = "fallback";
  }

  if (!imgBuffer) return { ok: false, source: null };

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(imgFile, imgBuffer);
  try {
    execSync(`magick "${imgFile}" -resize 1536x -quality 85 -strip "${imgFile}"`, { timeout: 20000 });
  } catch {
    /* keep original */
  }
  return { ok: true, source };
}

export type DailyArtMeta = {
  artSource?: DailyArtSource | "cached";
  isPlaceholder?: boolean;
};

/** Replace placeholder JPEGs when stock keys exist (incl. legacy files without artSource). */
export function needsDailyArtRefresh(
  imgFile: string,
  metaFile: string,
  dir: string,
  hasStockKeys: boolean,
): boolean {
  if (!hasStockKeys) return !fs.existsSync(imgFile);
  if (!fs.existsSync(imgFile)) return true;

  let meta: DailyArtMeta = {};
  if (fs.existsSync(metaFile)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaFile, "utf-8")) as DailyArtMeta;
    } catch {
      /* treat as stale */
    }
  }

  const source = meta.artSource;
  if (source === "unsplash" || source === "pexels" || source === "ai") return false;
  if (source === "fallback" || meta.isPlaceholder === true) return true;
  if (imageMatchesStaticFallback(imgFile, dir)) return true;
  if (!source || source === "cached") return true;
  return false;
}

/** True when today's JPEG is byte-identical to a bundled static fallback (mountain/sunset). */
export function imageMatchesStaticFallback(imgFile: string, dir: string): boolean {
  if (!fs.existsSync(imgFile)) return false;
  let imgBuf: Buffer;
  try {
    imgBuf = fs.readFileSync(imgFile);
  } catch {
    return false;
  }
  for (const name of STATIC_FALLBACK_FILES) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    try {
      if (fs.readFileSync(p).equals(imgBuf)) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

/** Guarantees imgFile exists (copies rotated static fallback if generation failed). */
export function ensureDailyArtImageFile(imgFile: string, dir: string): { ok: boolean; source: DailyArtSource | null } {
  if (fs.existsSync(imgFile)) return { ok: true, source: null };
  const hasStockKeys = !!(process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.PEXELS_API_KEY?.trim());
  if (hasStockKeys) return { ok: false, source: null };
  const seed = path.basename(imgFile, ".jpg");
  const fallback = readStaticFallback(dir, seed);
  if (!fallback) return { ok: false, source: null };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(imgFile, fallback);
  return { ok: true, source: "fallback" };
}

export async function refreshDailyArtImage(
  imgFile: string,
  metaFile: string,
  dir: string,
  query: string,
  scripture: string,
  reference: string,
): Promise<DailyArtSource | null> {
  const hasStockKeys = !!(process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.PEXELS_API_KEY?.trim());
  if (!needsDailyArtRefresh(imgFile, metaFile, dir, hasStockKeys)) return null;

  if (fs.existsSync(imgFile)) {
    try {
      fs.unlinkSync(imgFile);
    } catch {
      /* continue */
    }
  }

  const result = await writeDailyArtImageFile(imgFile, query, scripture, reference);
  if (!result.ok) {
    const ensured = ensureDailyArtImageFile(imgFile, dir);
    return ensured.source;
  }
  return result.source;
}
