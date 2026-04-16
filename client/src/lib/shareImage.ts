import { getRelationshipAge } from "./relationship";

// Curated pool of soul-connecting photos — nature, light, babies, pets, beauty
const PHOTO_POOL = [
  // Golden sunrise / dawn light
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1080&q=85&auto=format&fit=crop",
  // Forest with God-rays of light
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&q=85&auto=format&fit=crop",
  // Mountain lake reflection
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1080&q=85&auto=format&fit=crop",
  // Peaceful field at sunrise
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1080&q=85&auto=format&fit=crop",
  // Ocean sunset
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=85&auto=format&fit=crop",
  // Cherry blossoms
  "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1080&q=85&auto=format&fit=crop",
  // Misty valley morning
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=85&auto=format&fit=crop",
  // Wildflower meadow
  "https://images.unsplash.com/photo-1490750967868-88df5691cc35?w=1080&q=85&auto=format&fit=crop",
  // Autumn forest path
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&q=85&auto=format&fit=crop",
  // Baby's tiny hand
  "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1080&q=85&auto=format&fit=crop",
  // Baby sleeping peacefully
  "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1080&q=85&auto=format&fit=crop",
  // Golden retriever in sunlight
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1080&q=85&auto=format&fit=crop",
  // Dog looking up with love
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1080&q=85&auto=format&fit=crop",
  // Cat in warm window light
  "https://images.unsplash.com/photo-1518715308788-3005759c61d3?w=1080&q=85&auto=format&fit=crop",
  // Lighthouse on cliff
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1080&q=85&auto=format&fit=crop",
  // Starry night sky
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=85&auto=format&fit=crop",
  // Rolling green hills
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=85&auto=format&fit=crop",
  // Hands cupping a tiny flower
  "https://images.unsplash.com/photo-1490750967868-88df5691cc35?w=1080&q=85&auto=format&fit=crop",
];

// ── Hero pool — PRIMARY (days 0–89) ──────────────────────────────────────────
// Only the most dramatic, cinematic shots. Every photo must feel like a
// "wow" moment — rich light, high contrast, deeply atmospheric. These are
// what new and early users see every single day. No soft, plain, or muted
// landscapes — those are reserved for the extended pool below.
const PRIMARY_HERO_POOL = [
  // Golden dawn light breaking over mountain horizon
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1080&q=85&auto=format&fit=crop",
  // Cathedral forest — God-rays pouring through ancient trees
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&q=85&auto=format&fit=crop",
  // Still mountain lake mirror reflection at dusk — electric sky
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1080&q=85&auto=format&fit=crop",
  // Ocean sunset — deep amber, rose, and violet
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=85&auto=format&fit=crop",
  // Autumn forest path — blazing golden canopy overhead
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&q=85&auto=format&fit=crop",
  // Milky Way arc over a dark mountain valley
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=85&auto=format&fit=crop",
  // Lighthouse on dramatic sea cliffs with crashing surf
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1080&q=85&auto=format&fit=crop",
  // Twilight warmth — sunlight through forest canopy
  "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1080&q=85&auto=format&fit=crop",
  // Sun breaking through mountain peaks in shafts of light
  "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1080&q=85&auto=format&fit=crop",
  // Dramatic stormy seascape — power of the deep
  "https://images.unsplash.com/photo-1519922639192-e73293ca430e?w=1080&q=85&auto=format&fit=crop",
  // Jagged snow-capped mountain peaks — majestic scale
  "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1080&q=85&auto=format&fit=crop",
  // Mountain valley at blue-hour twilight — deep indigo sky
  "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=1080&q=85&auto=format&fit=crop",
  // Aurora borealis — curtains of green over mountains
  "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1080&q=85&auto=format&fit=crop",
  // Powerful waterfall through ancient forest
  "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1080&q=85&auto=format&fit=crop",
  // Forest interior — beams of golden light through tall pines
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1080&q=85&auto=format&fit=crop",
];

// ── Hero pool — EXTENDED (days 90+) ──────────────────────────────────────────
// Softer, quieter landscapes — still beautiful, but more restful. Fine for
// users who've been walking with the app for 3+ months and have deep familiarity
// with the dramatic primary pool. Added into rotation after 90 days.
const EXTENDED_HERO_POOL = [
  // Misty valley morning — peaceful and still
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=85&auto=format&fit=crop",
  // Sweeping green hills at golden hour — gentle and pastoral
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=85&auto=format&fit=crop",
  // Warm sunrise over a still meadow — soft and hopeful
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1080&q=85&auto=format&fit=crop",
];

export function getDailyVersePhoto(): string {
  const daysWithApp: number = getRelationshipAge();
  const pool = daysWithApp >= 90
    ? [...PRIMARY_HERO_POOL, ...EXTENDED_HERO_POOL]
    : PRIMARY_HERO_POOL;
  const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - startOfYear) / 86_400_000);
  return pool[dayOfYear % pool.length];
}

// Returns a different photo from the same dramatic pool for the page hero banner
// offset by 7 so it never duplicates the verse card photo
export function getDevotionalHeroPhoto(): string {
  const daysWithApp: number = getRelationshipAge();
  const pool = daysWithApp >= 90
    ? [...PRIMARY_HERO_POOL, ...EXTENDED_HERO_POOL]
    : PRIMARY_HERO_POOL;
  const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - startOfYear) / 86_400_000);
  return pool[(dayOfYear + 7) % pool.length];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number
) {
  const scale = Math.max(canvasW / img.width, canvasH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (canvasW - w) / 2;
  const y = (canvasH - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

function horizontalGlowLine(
  ctx: CanvasRenderingContext2D,
  y: number,
  color: string,
  size = 1080
) {
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.25, color);
  grad.addColorStop(0.75, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, size, 1.5);
}

function drawFallbackGradient(
  ctx: CanvasRenderingContext2D,
  S: number,
  palette: "dawn" | "midnight" | "ember"
) {
  const stops: [number, string][] =
    palette === "dawn"
      ? [[0, "#12043a"], [0.45, "#2d1460"], [0.75, "#6b2c10"], [1, "#1a0508"]]
      : palette === "midnight"
      ? [[0, "#04060e"], [0.5, "#080d1a"], [1, "#050814"]]
      : [[0, "#1a0200"], [0.4, "#3d0c02"], [0.75, "#5c1a0a"], [1, "#0f0502"]];
  const bg = ctx.createLinearGradient(0, 0, S * 0.6, S);
  stops.forEach(([s, c]) => bg.addColorStop(s, c));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // warm glow
  const glow = ctx.createRadialGradient(S / 2, S * 0.75, 0, S / 2, S * 0.75, S * 0.6);
  glow.addColorStop(
    0,
    palette === "midnight"
      ? "rgba(80,30,180,0.28)"
      : palette === "ember"
      ? "rgba(220,100,10,0.3)"
      : "rgba(255,145,30,0.35)"
  );
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);
}

// ── Tailwind gradient class → hex ─────────────────────────────────────────
const TW_HEX: Record<string, string> = {
  "from-amber-500": "#f59e0b",
  "to-orange-500":  "#f97316",
  "from-amber-400": "#fbbf24",
  "to-red-400":     "#f87171",
  "from-yellow-400":"#facc15",
  "to-amber-500":   "#f59e0b",
  "from-sky-400":   "#38bdf8",
  "to-blue-500":    "#3b82f6",
  "from-violet-500":"#8b5cf6",
  "to-purple-600":  "#9333ea",
  "from-rose-400":  "#fb7185",
  "to-pink-600":    "#db2777",
};

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawAchievementGradient(
  ctx: CanvasRenderingContext2D,
  S: number,
  colorFrom: string,
  colorTo: string
) {
  const from = TW_HEX[colorFrom] ?? "#6b21a8";
  const to   = TW_HEX[colorTo]   ?? "#9333ea";
  const bg = ctx.createLinearGradient(0, 0, S * 0.7, S);
  bg.addColorStop(0, from);
  bg.addColorStop(1, to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);
  // Soft center glow
  const glow = ctx.createRadialGradient(S / 2, S * 0.45, 0, S / 2, S * 0.45, S * 0.55);
  glow.addColorStop(0, "rgba(255,255,255,0.14)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);
}

export async function createAchievementShareImage(achievement: {
  emoji: string;
  title: string;
  subtitle: string;
  photo?: string;
  colorFrom: string;
  colorTo: string;
}): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // ── Background ──────────────────────────────────────────────
  if (achievement.photo) {
    try {
      const img = await loadImage(achievement.photo);
      drawImageCover(ctx, img, S, S);
    } catch {
      drawAchievementGradient(ctx, S, achievement.colorFrom, achievement.colorTo);
    }
  } else {
    drawAchievementGradient(ctx, S, achievement.colorFrom, achievement.colorTo);
  }

  // ── Veils ───────────────────────────────────────────────────
  // Uniform mid-tone
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(0, 0, S, S);
  // Top darkening for brand header
  const topVeil = ctx.createLinearGradient(0, 0, 0, S * 0.28);
  topVeil.addColorStop(0, "rgba(0,0,0,0.68)");
  topVeil.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topVeil;
  ctx.fillRect(0, 0, S, S);
  // Bottom darkening for footer
  const btmVeil = ctx.createLinearGradient(0, S * 0.66, 0, S);
  btmVeil.addColorStop(0, "rgba(0,0,0,0)");
  btmVeil.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = btmVeil;
  ctx.fillRect(0, 0, S, S);

  // ── Brand header ────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 26px Georgia, serif";
  ctx.fillText("SHEPHERD'S PATH", S / 2, 88);
  horizontalGlowLine(ctx, 106, "rgba(255,255,255,0.22)");

  // ── "Achievement Unlocked" pill ──────────────────────────────
  ctx.font = "bold 22px Arial, sans-serif";
  const badgeText = "ACHIEVEMENT UNLOCKED";
  const badgeW = ctx.measureText(badgeText).width + 52;
  const badgeH = 50;
  const badgeX = (S - badgeW) / 2;
  const badgeY = 186;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.90)";
  ctx.textAlign = "center";
  ctx.fillText(badgeText, S / 2, badgeY + 33);

  // ── Large emoji ──────────────────────────────────────────────
  ctx.font = "148px serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 24;
  ctx.fillText(achievement.emoji, S / 2, 450);
  ctx.shadowBlur = 0;

  // ── Title ────────────────────────────────────────────────────
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 22;
  const titleFontSize = achievement.title.length > 22 ? 58 : 72;
  ctx.font = `bold ${titleFontSize}px Georgia, serif`;
  ctx.textAlign = "center";
  wrapText(ctx, achievement.title, S / 2, 560, 940, titleFontSize * 1.3);
  ctx.shadowBlur = 0;

  // ── Subtitle ─────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "40px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(achievement.subtitle, S / 2, 680);

  // ── Divider ──────────────────────────────────────────────────
  horizontalGlowLine(ctx, 722, "rgba(255,255,255,0.28)");

  // ── Footer ───────────────────────────────────────────────────
  horizontalGlowLine(ctx, S - 72, "rgba(255,255,255,0.14)");
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.font = "24px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("shepherdspathai.com", S / 2, S - 36);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

export async function createTriviaScoreCardImage(opts: {
  score: number;
  total: number;
  label: string;
  categoryEmoji: string;
  categoryLabel: string;
  verse: string;
  verseRef: string;
}): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // -- Background: brand purple gradient
  const bg = ctx.createLinearGradient(0, 0, S * 0.65, S);
  bg.addColorStop(0, "#5a3d96");
  bg.addColorStop(0.45, "#3d2468");
  bg.addColorStop(1, "#1a0d3e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // -- Radial shimmer at top center
  const radial = ctx.createRadialGradient(S / 2, 60, 0, S / 2, 60, 620);
  radial.addColorStop(0, "rgba(255,255,255,0.11)");
  radial.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, S, S);

  // -- Golden top accent line
  horizontalGlowLine(ctx, 0, "rgba(251,191,36,0.85)");
  horizontalGlowLine(ctx, 2, "rgba(255,255,255,0.5)");

  // -- Brand header
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "600 27px Georgia, serif";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 8;
  ctx.fillText("SHEPHERD'S PATH", S / 2, 88);
  ctx.shadowBlur = 0;
  horizontalGlowLine(ctx, 106, "rgba(255,255,255,0.15)");

  // -- Category badge (pill)
  const catText = `${opts.categoryEmoji}  ${opts.categoryLabel.toUpperCase()}`;
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, Arial, sans-serif";
  const catW = ctx.measureText(catText).width + 56;
  const catH = 58;
  const catX = (S - catW) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  drawRoundRect(ctx, catX, 132, catW, catH, catH / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  drawRoundRect(ctx, catX, 132, catW, catH, catH / 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.textAlign = "center";
  ctx.fillText(catText, S / 2, 169);

  // -- Score (big mixed-size)
  const numStr = String(opts.score);
  const denStr = `/${opts.total}`;

  ctx.font = `bold 280px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  const numW = ctx.measureText(numStr).width;
  ctx.font = `bold 120px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  const denW = ctx.measureText(denStr).width;

  const scoreBlockW = numW + denW;
  const scoreX = (S - scoreBlockW) / 2;

  ctx.textAlign = "left";
  ctx.font = `bold 280px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 30;
  ctx.fillText(numStr, scoreX, 470);

  ctx.font = `bold 120px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fillText(denStr, scoreX + numW, 470);
  ctx.shadowBlur = 0;

  // -- Performance label
  ctx.textAlign = "center";
  ctx.fillStyle = "#fbbf24";
  ctx.font = `bold 58px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 16;
  ctx.fillText(opts.label, S / 2, 558);
  ctx.shadowBlur = 0;

  // -- Divider
  horizontalGlowLine(ctx, 594, "rgba(255,255,255,0.18)");

  // -- Verse quote
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `italic 38px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 12;
  const verseEndY = wrapText(ctx, `\u201C${opts.verse}\u201D`, S / 2, 664, 870, 58);
  ctx.shadowBlur = 0;

  // -- Verse reference
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = `32px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText(`\u2014 ${opts.verseRef}`, S / 2, verseEndY + 52);

  // -- Bottom CTA strip
  const stripY = S - 110;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(0, stripY, S, 110);
  horizontalGlowLine(ctx, stripY, "rgba(255,255,255,0.12)");

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = `bold 34px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Can you beat my score?", S / 2, stripY + 46);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = `24px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.fillText("Shepherd's Path — free on the App Store", S / 2, stripY + 80);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

export async function createShareImage(
  verseText: string,
  reference: string,
  verseArtUrl?: string | null
): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // Color palette for text/accents
  const palettes = ["warm", "cool", "gold"] as const;
  const palette = palettes[Math.floor(Math.random() * palettes.length)];

  const accentColor =
    palette === "cool"
      ? "rgba(160,140,255,0.75)"
      : palette === "gold"
      ? "rgba(255,200,80,0.75)"
      : "rgba(255,165,80,0.75)";

  const refColor =
    palette === "cool" ? "#d0c4ff" : palette === "gold" ? "#ffe099" : "#ffcc88";

  // ── Draw background — prefer AI verse art, fall back to photo pool ─────────
  const backgroundUrl = verseArtUrl || PHOTO_POOL[Math.floor(Math.random() * PHOTO_POOL.length)];
  try {
    const img = await loadImage(backgroundUrl);
    drawImageCover(ctx, img, S, S);
  } catch {
    try {
      // If verse art failed, try a random pool photo
      if (verseArtUrl) {
        const fallbackUrl = PHOTO_POOL[Math.floor(Math.random() * PHOTO_POOL.length)];
        const fallbackImg = await loadImage(fallbackUrl);
        drawImageCover(ctx, fallbackImg, S, S);
      } else {
        const fb = ["dawn", "midnight", "ember"] as const;
        drawFallbackGradient(ctx, S, fb[Math.floor(Math.random() * fb.length)]);
      }
    } catch {
      const fb = ["dawn", "midnight", "ember"] as const;
      drawFallbackGradient(ctx, S, fb[Math.floor(Math.random() * fb.length)]);
    }
  }

  // ── Dark veil overlay (3-zone) ────────────────────────────
  // Top zone — for brand header
  const topVeil = ctx.createLinearGradient(0, 0, 0, S * 0.3);
  topVeil.addColorStop(0, "rgba(0,0,0,0.72)");
  topVeil.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topVeil;
  ctx.fillRect(0, 0, S, S);

  // Middle zone — light wash so photo shows through but text reads
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fillRect(0, 0, S, S);

  // Bottom zone — for reference and footer
  const bottomVeil = ctx.createLinearGradient(0, S * 0.62, 0, S);
  bottomVeil.addColorStop(0, "rgba(0,0,0,0)");
  bottomVeil.addColorStop(1, "rgba(0,0,0,0.80)");
  ctx.fillStyle = bottomVeil;
  ctx.fillRect(0, 0, S, S);

  // ── Brand header — logo mark + name ──────────────────────
  const LOGO_SIZE = 64;
  const LOGO_X = 48;
  const LOGO_Y = 48;
  const TEXT_X = LOGO_X + LOGO_SIZE + 18;
  const TEXT_Y_NAME = LOGO_Y + 28;
  const TEXT_Y_TAG = LOGO_Y + 54;

  let logoDrawn = false;
  try {
    const logo = await loadImage("/logo-mark-white.png");
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(logo, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
    ctx.restore();
    logoDrawn = true;
  } catch {
    try {
      const logo2 = await loadImage("/sp-logo-mark.png");
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.drawImage(logo2, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
      ctx.restore();
      logoDrawn = true;
    } catch { logoDrawn = false; }
  }

  if (logoDrawn) {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 28px 'Georgia', serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10;
    ctx.fillText("Shepherd's Path", TEXT_X, TEXT_Y_NAME);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "18px 'Georgia', serif";
    ctx.fillText("Open your Bible. We'll open the conversation.", TEXT_X, TEXT_Y_TAG);
    ctx.shadowBlur = 0;
    horizontalGlowLine(ctx, LOGO_Y + LOGO_SIZE + 24, accentColor);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.52)";
    ctx.font = "600 25px 'Georgia', serif";
    ctx.fillText("SHEPHERD'S PATH", S / 2, 96);
    horizontalGlowLine(ctx, 115, accentColor);
  }

  // ── Large decorative opening quote ───────────────────────
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 220px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("\u201C", 36, 350);
  ctx.restore();

  // ── Verse text ────────────────────────────────────────────
  const maxChars = 230;
  const short =
    verseText.length > maxChars
      ? verseText.substring(0, maxChars - 1) + "\u2026"
      : verseText;

  // Five-tier font scale — smaller text for longer verses so the reference
  // and footer always land above the canvas bottom (need ≤ ~870px for finalVerseY)
  const fontSize =
    short.length < 55  ? 60 :
    short.length < 90  ? 54 :
    short.length < 140 ? 46 :
    short.length < 190 ? 40 :
    36;

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic ${fontSize}px 'Georgia', serif`;
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 28;

  const rawVerseY = wrapText(
    ctx,
    `\u201C${short}\u201D`,
    S / 2,
    210,
    920,
    fontSize * 1.52
  );
  ctx.shadowBlur = 0;

  // Guard: if the verse overflows the safe zone, clamp so reference fits
  const MAX_VERSE_Y = S - 230; // leaves 230px for divider + reference + footer
  const finalVerseY = Math.min(rawVerseY, MAX_VERSE_Y);

  // ── Accent divider ────────────────────────────────────────
  horizontalGlowLine(ctx, finalVerseY + 46, accentColor);

  // ── Reference ─────────────────────────────────────────────
  ctx.fillStyle = refColor;
  ctx.font = "bold 38px 'Georgia', serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 16;
  ctx.fillText(`\u2014 ${reference}`, S / 2, finalVerseY + 102);
  ctx.shadowBlur = 0;

  // ── Footer — soft invite, not an ad ──────────────────────
  const footerY = S - 88;
  const footerGrad = ctx.createLinearGradient(0, footerY, 0, S);
  footerGrad.addColorStop(0, "rgba(0,0,0,0)");
  footerGrad.addColorStop(1, "rgba(0,0,0,0.60)");
  ctx.fillStyle = footerGrad;
  ctx.fillRect(0, footerY, S, S - footerY);

  horizontalGlowLine(ctx, footerY + 4, "rgba(255,255,255,0.14)");

  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 8;

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "bold 26px 'Georgia', serif";
  ctx.fillText("Start your own daily devotional →", S / 2, footerY + 38);

  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.font = "20px 'Georgia', serif";
  ctx.fillText("Shepherd's Path  ·  shepherdspathai.com", S / 2, footerY + 66);
  ctx.shadowBlur = 0;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

// ── Purple brand share card ───────────────────────────────────────────────────
// Uses the app's exact dark-purple palette instead of a photo background.
export async function createPurpleShareImage(
  verseText: string,
  reference: string
): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // ── Background gradient — deep app purple ────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, S * 0.7, S);
  bg.addColorStop(0, "#0d0a1a");
  bg.addColorStop(0.45, "#1a0f35");
  bg.addColorStop(0.8, "#2a1255");
  bg.addColorStop(1, "#0d0a1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // ── Radial violet glow (bottom-centre) ───────────────────────────────────
  const glow = ctx.createRadialGradient(S / 2, S * 0.72, 0, S / 2, S * 0.72, S * 0.68);
  glow.addColorStop(0, "rgba(122,1,141,0.38)");
  glow.addColorStop(0.55, "rgba(68,47,116,0.18)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Subtle top glow
  const topGlow = ctx.createRadialGradient(S * 0.5, 0, 0, S * 0.5, 0, S * 0.55);
  topGlow.addColorStop(0, "rgba(122,1,141,0.15)");
  topGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, S, S);

  const accentColor = "rgba(180,120,255,0.7)";
  const refColor = "#c8a0e0";

  // ── Brand header ─────────────────────────────────────────────────────────
  const LOGO_SIZE = 64;
  const LOGO_X = 48;
  const LOGO_Y = 48;
  const TEXT_X = LOGO_X + LOGO_SIZE + 18;
  const TEXT_Y_NAME = LOGO_Y + 28;
  const TEXT_Y_TAG = LOGO_Y + 54;

  let logoDrawn = false;
  try {
    const logo = await loadImage("/logo-mark-white.png");
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(logo, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
    ctx.restore();
    logoDrawn = true;
  } catch {
    try {
      const logo2 = await loadImage("/sp-logo-mark.png");
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.drawImage(logo2, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
      ctx.restore();
      logoDrawn = true;
    } catch { logoDrawn = false; }
  }

  if (logoDrawn) {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 28px 'Georgia', serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10;
    ctx.fillText("Shepherd's Path", TEXT_X, TEXT_Y_NAME);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "18px 'Georgia', serif";
    ctx.fillText("Open your Bible. We'll open the conversation.", TEXT_X, TEXT_Y_TAG);
    ctx.shadowBlur = 0;
    horizontalGlowLine(ctx, LOGO_Y + LOGO_SIZE + 24, accentColor);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.52)";
    ctx.font = "600 25px 'Georgia', serif";
    ctx.fillText("SHEPHERD'S PATH", S / 2, 96);
    horizontalGlowLine(ctx, 115, accentColor);
  }

  // ── Decorative opening quote ──────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#c8a0e0";
  ctx.font = "italic 220px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("\u201C", 36, 350);
  ctx.restore();

  // ── Verse text ────────────────────────────────────────────────────────────
  const maxChars = 230;
  const short =
    verseText.length > maxChars
      ? verseText.substring(0, maxChars - 1) + "\u2026"
      : verseText;

  const fontSize =
    short.length < 55  ? 60 :
    short.length < 90  ? 54 :
    short.length < 140 ? 46 :
    short.length < 190 ? 40 :
    36;

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic ${fontSize}px 'Georgia', serif`;
  ctx.shadowColor = "rgba(122,1,141,0.5)";
  ctx.shadowBlur = 24;

  const rawVerseY2 = wrapText(
    ctx,
    `\u201C${short}\u201D`,
    S / 2,
    210,
    920,
    fontSize * 1.52
  );
  ctx.shadowBlur = 0;

  const MAX_VERSE_Y2 = S - 230;
  const finalVerseY = Math.min(rawVerseY2, MAX_VERSE_Y2);

  // ── Accent divider ────────────────────────────────────────────────────────
  horizontalGlowLine(ctx, finalVerseY + 46, accentColor);

  // ── Reference ─────────────────────────────────────────────────────────────
  ctx.fillStyle = refColor;
  ctx.font = "bold 38px 'Georgia', serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 14;
  ctx.fillText(`\u2014 ${reference}`, S / 2, finalVerseY + 102);
  ctx.shadowBlur = 0;

  // ── Footer ────────────────────────────────────────────────────────────────
  horizontalGlowLine(ctx, S - 70, "rgba(180,120,255,0.22)");
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = "22px 'Georgia', serif";
  ctx.fillText("shepherdspathai.com", S / 2, S - 38);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}
