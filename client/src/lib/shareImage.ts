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

// ── Hero pool — dramatic landscapes ONLY for the verse card background ───────
// These are moody, atmospheric, high-contrast shots that look cinematic at
// full-bleed. No babies, pets, or light florals — those belong in PHOTO_POOL
// for the 1080×1080 shareable cards where they work beautifully at scale.
const HERO_PHOTO_POOL = [
  // Golden dawn light over mountains
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1080&q=85&auto=format&fit=crop",
  // Cathedral forest — God-rays through trees
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&q=85&auto=format&fit=crop",
  // Still mountain lake at dusk
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1080&q=85&auto=format&fit=crop",
  // Ocean sunset — deep amber and violet
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=85&auto=format&fit=crop",
  // Misty valley morning
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=85&auto=format&fit=crop",
  // Autumn forest path — golden canopy
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&q=85&auto=format&fit=crop",
  // Starry night sky — Milky Way arc
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=85&auto=format&fit=crop",
  // Sweeping green hills at golden hour
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=85&auto=format&fit=crop",
  // Lighthouse on dramatic cliffs
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1080&q=85&auto=format&fit=crop",
  // Warm sunrise over a still meadow
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1080&q=85&auto=format&fit=crop",
  // Twilight warmth — amber last light
  "https://images.unsplash.com/photo-1418050327236-8de8ba25f5a1?w=1080&q=85&auto=format&fit=crop",
  // Sun breaking through mountain peaks
  "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1080&q=85&auto=format&fit=crop",
];

export function getDailyVersePhoto(): string {
  const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - startOfYear) / 86_400_000);
  return HERO_PHOTO_POOL[dayOfYear % HERO_PHOTO_POOL.length];
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

export async function createShareImage(
  verseText: string,
  reference: string
): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // Pick a random photo
  const photoUrl = PHOTO_POOL[Math.floor(Math.random() * PHOTO_POOL.length)];

  // Color palette for text/accents (cycles with photo index)
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

  // ── Draw photo background ──────────────────────────────────
  try {
    const img = await loadImage(photoUrl);
    drawImageCover(ctx, img, S, S);
  } catch {
    // Fallback to gradient if photo fails
    const fb = ["dawn", "midnight", "ember"] as const;
    drawFallbackGradient(ctx, S, fb[Math.floor(Math.random() * fb.length)]);
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

  // ── Brand header ──────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.52)";
  ctx.font = "600 25px 'Georgia', serif";
  ctx.fillText("SHEPHERD'S PATH", S / 2, 96);
  horizontalGlowLine(ctx, 115, accentColor);

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

  const fontSize = short.length < 90 ? 60 : short.length < 150 ? 52 : 44;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic ${fontSize}px 'Georgia', serif`;
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 28;

  const finalVerseY = wrapText(
    ctx,
    `\u201C${short}\u201D`,
    S / 2,
    210,
    920,
    fontSize * 1.52
  );
  ctx.shadowBlur = 0;

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

  // ── Footer ────────────────────────────────────────────────
  horizontalGlowLine(ctx, S - 70, "rgba(255,255,255,0.18)");
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = "22px 'Georgia', serif";
  ctx.fillText("shepherdspathai.com", S / 2, S - 38);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}
