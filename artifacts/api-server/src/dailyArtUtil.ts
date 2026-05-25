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
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&client_id=${key}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { urls?: { regular?: string } };
    return data.urls?.regular ?? null;
  } catch {
    return null;
  }
}

async function fetchPexelsPhoto(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const page = Math.floor(Math.random() * 4) + 1;
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${page}&orientation=landscape`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { photos?: { src?: { large2x?: string; large?: string } }[] };
    const photos = data.photos ?? [];
    if (!photos.length) return null;
    const photo = photos[Math.floor(Math.random() * photos.length)];
    return photo.src?.large2x ?? photo.src?.large ?? null;
  } catch {
    return null;
  }
}

function readStaticFallback(dir: string): Buffer | null {
  for (const name of ["natural-mountain.jpg", "natural-sunset.jpg"]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p);
      } catch {
        /* try next */
      }
    }
  }
  const altDir = path.resolve(MODULE_DIR, "../../shepherds-path/public/daily-art");
  for (const name of ["natural-mountain.jpg", "natural-sunset.jpg"]) {
    const p = path.join(altDir, name);
    if (fs.existsSync(p)) {
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
): Promise<boolean> {
  let imgBuffer: Buffer | null = null;
  const dir = path.dirname(imgFile);

  let photoUrl = await fetchUnsplashPhoto(query);
  if (!photoUrl) photoUrl = await fetchPexelsPhoto(query);
  if (photoUrl) {
    try {
      const imgRes = await fetch(photoUrl);
      if (imgRes.ok) imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    } catch {
      imgBuffer = null;
    }
  }

  if (!imgBuffer) imgBuffer = readStaticFallback(dir);

  if (!imgBuffer) {
    try {
      const aiPrompt = buildDailyArtPrompt(scripture, reference, query);
      console.log("[daily-art] Generating AI image with gpt-image-1...");
      imgBuffer = await generateImageBuffer(aiPrompt, "1536x1024", "high");
      console.log("[daily-art] AI image generated successfully.");
    } catch (aiErr) {
      console.warn("[daily-art] AI generation failed:", aiErr);
    }
  }

  if (!imgBuffer) return false;

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(imgFile, imgBuffer);
  try {
    execSync(`magick "${imgFile}" -resize 1536x -quality 85 -strip "${imgFile}"`, { timeout: 20000 });
  } catch {
    /* keep original */
  }
  return true;
}
