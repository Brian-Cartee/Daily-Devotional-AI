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

function drawStars(ctx: CanvasRenderingContext2D, count: number, maxY: number, size = 1080) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * maxY;
    const r = Math.random() * 1.4 + 0.2;
    const alpha = Math.random() * 0.6 + 0.2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLightRays(ctx: CanvasRenderingContext2D, cx: number, cy: number, count: number, size = 1080) {
  ctx.save();
  ctx.globalAlpha = 0.045;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
    grad.addColorStop(0, "#ffcc66");
    grad.addColorStop(1, "rgba(255,200,80,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 36;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * size * 1.5, cy + Math.sin(angle) * size * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrossWatermark(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#ffffff";
  const w = h * 0.38;
  const armW = h * 0.14;
  const armY = h * 0.3;
  ctx.beginPath();
  ctx.rect(x - armW / 2, y, armW, h);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x - w / 2, y + armY, w, armW);
  ctx.fill();
  ctx.restore();
}

function horizontalGlowLine(ctx: CanvasRenderingContext2D, y: number, color: string, size = 1080) {
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.3, color);
  grad.addColorStop(0.7, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, size, 1.5);
}

export async function createShareImage(verseText: string, reference: string): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  const themes = ["dawn", "midnight", "ember"] as const;
  const theme = themes[Math.floor(Math.random() * themes.length)];

  if (theme === "dawn") {
    // ── Background ──────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, S * 0.6, S);
    bg.addColorStop(0, "#12043a");
    bg.addColorStop(0.45, "#2d1460");
    bg.addColorStop(0.75, "#6b2c10");
    bg.addColorStop(1, "#1a0508");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // Sunrise glow (bottom)
    const sunGlow = ctx.createRadialGradient(S / 2, S * 0.78, 0, S / 2, S * 0.78, S * 0.65);
    sunGlow.addColorStop(0, "rgba(255, 145, 30, 0.42)");
    sunGlow.addColorStop(0.4, "rgba(210, 80, 10, 0.18)");
    sunGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, S, S);

    // Crown glow (top)
    const topGlow = ctx.createRadialGradient(S / 2, 0, 0, S / 2, 0, S * 0.45);
    topGlow.addColorStop(0, "rgba(100, 50, 200, 0.22)");
    topGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, S, S);

    drawLightRays(ctx, S / 2, S * 0.78, 18);
    drawStars(ctx, 80, S * 0.55);
    drawCrossWatermark(ctx, S * 0.85, S * 0.62, S * 0.22);

    // Brand header
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.font = "600 26px 'Georgia', serif";
    ctx.fillText("SHEPHERD'S PATH", S / 2, 100);
    horizontalGlowLine(ctx, 120, "rgba(255,183,77,0.5)");

    // Quote marks (decorative)
    ctx.font = "italic 180px Georgia, serif";
    ctx.fillStyle = "rgba(255,183,77,0.08)";
    ctx.textAlign = "left";
    ctx.fillText("\u201C", 48, 320);
    ctx.textAlign = "right";
    ctx.fillText("\u201D", S - 48, S - 200);

    // Verse text
    const maxChars = 230;
    const short = verseText.length > maxChars ? verseText.substring(0, maxChars - 1) + "\u2026" : verseText;
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 24;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    const fontSize = short.length < 100 ? 58 : short.length < 160 ? 50 : 43;
    ctx.font = `italic ${fontSize}px 'Georgia', serif`;
    const finalVerseY = wrapText(ctx, `\u201C${short}\u201D`, S / 2, 220, 930, fontSize * 1.48);
    ctx.shadowBlur = 0;

    // Gold divider
    horizontalGlowLine(ctx, finalVerseY + 44, "rgba(255,183,77,0.65)");

    // Reference
    ctx.fillStyle = "#ffcc66";
    ctx.font = "bold 38px 'Georgia', serif";
    ctx.textAlign = "center";
    ctx.fillText(`\u2014 ${reference}`, S / 2, finalVerseY + 100);

    // Footer
    horizontalGlowLine(ctx, S - 68, "rgba(255,183,77,0.2)");
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "24px 'Georgia', serif";
    ctx.fillText("shepherdspathai.com", S / 2, S - 36);

  } else if (theme === "midnight") {
    // ── Background ──────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, "#04060e");
    bg.addColorStop(0.5, "#080d1a");
    bg.addColorStop(1, "#050814");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // Aurora glow (top left)
    const aurora = ctx.createRadialGradient(S * 0.15, S * 0.1, 0, S * 0.15, S * 0.1, S * 0.6);
    aurora.addColorStop(0, "rgba(80, 30, 180, 0.28)");
    aurora.addColorStop(0.5, "rgba(40, 10, 100, 0.12)");
    aurora.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, S, S);

    // Warm glow (bottom right)
    const warmGlow = ctx.createRadialGradient(S * 0.85, S * 0.9, 0, S * 0.85, S * 0.9, S * 0.5);
    warmGlow.addColorStop(0, "rgba(180, 80, 20, 0.2)");
    warmGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = warmGlow;
    ctx.fillRect(0, 0, S, S);

    drawStars(ctx, 140, S * 0.7, S);
    // Bright star clusters
    for (let i = 0; i < 8; i++) {
      const sx = Math.random() * S;
      const sy = Math.random() * S * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Glow around bright star
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8);
      sg.addColorStop(0, "rgba(255,255,255,0.3)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = sg;
      ctx.fillRect(sx - 8, sy - 8, 16, 16);
      ctx.restore();
    }

    drawCrossWatermark(ctx, S * 0.88, S * 0.2, S * 0.25);

    // Brand header
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(160,140,220,0.5)";
    ctx.font = "600 26px 'Georgia', serif";
    ctx.fillText("SHEPHERD'S PATH", S / 2, 100);
    horizontalGlowLine(ctx, 122, "rgba(140,100,255,0.4)");

    // Decorative large quote marks
    ctx.font = "italic 200px Georgia, serif";
    ctx.fillStyle = "rgba(140,100,255,0.07)";
    ctx.textAlign = "left";
    ctx.fillText("\u201C", 40, 340);

    // Verse text
    const maxChars = 230;
    const short = verseText.length > maxChars ? verseText.substring(0, maxChars - 1) + "\u2026" : verseText;
    ctx.shadowColor = "rgba(80,40,180,0.6)";
    ctx.shadowBlur = 30;
    ctx.textAlign = "center";
    ctx.fillStyle = "#f0eaff";
    const fontSize = short.length < 100 ? 58 : short.length < 160 ? 50 : 43;
    ctx.font = `italic ${fontSize}px 'Georgia', serif`;
    const finalVerseY = wrapText(ctx, `\u201C${short}\u201D`, S / 2, 220, 930, fontSize * 1.48);
    ctx.shadowBlur = 0;

    // Divider
    horizontalGlowLine(ctx, finalVerseY + 44, "rgba(140,100,255,0.55)");

    // Reference
    ctx.fillStyle = "#c4b0ff";
    ctx.font = "bold 38px 'Georgia', serif";
    ctx.textAlign = "center";
    ctx.fillText(`\u2014 ${reference}`, S / 2, finalVerseY + 100);

    // Footer
    horizontalGlowLine(ctx, S - 68, "rgba(140,100,255,0.18)");
    ctx.fillStyle = "rgba(180,160,255,0.22)";
    ctx.font = "24px 'Georgia', serif";
    ctx.fillText("shepherdspathai.com", S / 2, S - 36);

  } else {
    // ember theme ─────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, "#1a0200");
    bg.addColorStop(0.4, "#3d0c02");
    bg.addColorStop(0.75, "#5c1a0a");
    bg.addColorStop(1, "#0f0502");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // Ember glow (center)
    const emberGlow = ctx.createRadialGradient(S / 2, S * 0.55, 0, S / 2, S * 0.55, S * 0.6);
    emberGlow.addColorStop(0, "rgba(220, 100, 10, 0.32)");
    emberGlow.addColorStop(0.4, "rgba(160, 50, 5, 0.14)");
    emberGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = emberGlow;
    ctx.fillRect(0, 0, S, S);

    drawLightRays(ctx, S / 2, S / 2, 12);
    drawStars(ctx, 50, S * 0.4);
    drawCrossWatermark(ctx, S * 0.84, S * 0.64, S * 0.2);

    // Brand header
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,200,120,0.4)";
    ctx.font = "600 26px 'Georgia', serif";
    ctx.fillText("SHEPHERD'S PATH", S / 2, 100);
    horizontalGlowLine(ctx, 122, "rgba(255,140,50,0.5)");

    // Decorative quote marks
    ctx.font = "italic 200px Georgia, serif";
    ctx.fillStyle = "rgba(220,80,10,0.08)";
    ctx.textAlign = "left";
    ctx.fillText("\u201C", 40, 340);

    // Verse text
    const maxChars = 230;
    const short = verseText.length > maxChars ? verseText.substring(0, maxChars - 1) + "\u2026" : verseText;
    ctx.shadowColor = "rgba(180,60,0,0.5)";
    ctx.shadowBlur = 28;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff5e8";
    const fontSize = short.length < 100 ? 58 : short.length < 160 ? 50 : 43;
    ctx.font = `italic ${fontSize}px 'Georgia', serif`;
    const finalVerseY = wrapText(ctx, `\u201C${short}\u201D`, S / 2, 220, 930, fontSize * 1.48);
    ctx.shadowBlur = 0;

    // Divider
    horizontalGlowLine(ctx, finalVerseY + 44, "rgba(255,140,50,0.6)");

    // Reference
    ctx.fillStyle = "#ffb866";
    ctx.font = "bold 38px 'Georgia', serif";
    ctx.textAlign = "center";
    ctx.fillText(`\u2014 ${reference}`, S / 2, finalVerseY + 100);

    // Footer
    horizontalGlowLine(ctx, S - 68, "rgba(255,140,50,0.2)");
    ctx.fillStyle = "rgba(255,200,100,0.22)";
    ctx.font = "24px 'Georgia', serif";
    ctx.fillText("shepherdspathai.com", S / 2, S - 36);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}
