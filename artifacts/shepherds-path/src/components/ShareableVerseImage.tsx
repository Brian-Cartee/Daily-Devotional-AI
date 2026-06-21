import { useState } from "react";
import { Image, Loader2 } from "lucide-react";
import { createStoryShareImage } from "@/lib/shareImage";

import { stripWrappingQuotes } from "@/lib/verseText";

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const CANVAS_SIZE = CANVAS_W; // keep compat
const HORIZONTAL_PADDING = 80;
const MAX_TEXT_WIDTH = CANVAS_W - HORIZONTAL_PADDING * 2;
const MAX_VERSE_LINES = 5;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().replace(/\s+/g, " ").split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitVerseLines(
  ctx: CanvasRenderingContext2D,
  text: string,
): { lines: string[]; fontSize: number } {
  const clean = stripWrappingQuotes(text);
  let fontSize =
    clean.length > 180 ? 44 :
    clean.length > 130 ? 52 :
    clean.length > 90 ? 60 :
    clean.length > 65 ? 68 :
    76;

  const minFontSize = 36;

  while (fontSize >= minFontSize) {
    ctx.font = `italic ${fontSize}px Georgia, "Times New Roman", serif`;
    const lines = wrapText(ctx, clean, MAX_TEXT_WIDTH);
    if (lines.length <= MAX_VERSE_LINES) {
      return { lines, fontSize };
    }
    fontSize -= 4;
  }

  ctx.font = `italic ${minFontSize}px Georgia, "Times New Roman", serif`;
  return { lines: wrapText(ctx, clean, MAX_TEXT_WIDTH).slice(0, MAX_VERSE_LINES), fontSize: minFontSize };
}

function renderVerseImageBlob(verseText: string, verseReference: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) { reject(new Error("canvas unavailable")); return; }

    // Background — deep purple gradient (9:16 story format)
    const gradient = ctx.createLinearGradient(0, CANVAS_H * 0.1, CANVAS_W * 0.8, CANVAS_H);
    gradient.addColorStop(0, "#08051a");
    gradient.addColorStop(0.25, "#160a38");
    gradient.addColorStop(0.55, "#2e1160");
    gradient.addColorStop(0.80, "#1c0942");
    gradient.addColorStop(1, "#07040f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Violet glow
    const glow = ctx.createRadialGradient(CANVAS_W * 0.65, CANVAS_H * 0.55, 0, CANVAS_W * 0.65, CANVAS_H * 0.55, CANVAS_H * 0.55);
    glow.addColorStop(0, "rgba(130,10,170,0.40)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Top gold accent line
    const goldLine = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
    goldLine.addColorStop(0, "rgba(0,0,0,0)"); goldLine.addColorStop(0.25, "rgba(210,160,60,0.75)");
    goldLine.addColorStop(0.75, "rgba(210,160,60,0.75)"); goldLine.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = goldLine; ctx.fillRect(0, 0, CANVAS_W, 2);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Brand header — icon + name (safe zone: y=130+ clears platform UI)
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = '400 56px Georgia, "Times New Roman", serif';
    ctx.fillText("✝", CANVAS_W / 2, 200);

    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.font = 'bold 38px Georgia, "Times New Roman", serif';
    ctx.fillText("Shepherd's Path", CANVAS_W / 2, 270);

    // Divider below header
    const div1 = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
    div1.addColorStop(0, "rgba(0,0,0,0)"); div1.addColorStop(0.25, "rgba(190,130,255,0.50)");
    div1.addColorStop(0.75, "rgba(190,130,255,0.50)"); div1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = div1; ctx.fillRect(0, 294, CANVAS_W, 1.5);

    // Verse text — centred vertically in remaining space
    const { lines, fontSize } = fitVerseLines(ctx, verseText);
    ctx.font = `italic ${fontSize}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.shadowColor = "rgba(100,0,140,0.65)";
    ctx.shadowBlur = 24;

    const lineHeight = fontSize * 1.52;
    const blockH = lines.length * lineHeight;
    let y = CANVAS_H / 2 - blockH / 2 + fontSize * 0.35;
    // Open quote before first line, close after last
    for (let i = 0; i < lines.length; i++) {
      const prefix = i === 0 ? "“" : "";
      const suffix = i === lines.length - 1 ? "”" : "";
      ctx.fillText(`${prefix}${lines[i]}${suffix}`, CANVAS_W / 2, y);
      y += lineHeight;
    }
    ctx.shadowBlur = 0;

    // Accent divider
    const div2 = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
    div2.addColorStop(0, "rgba(0,0,0,0)"); div2.addColorStop(0.25, "rgba(210,160,80,0.65)");
    div2.addColorStop(0.75, "rgba(210,160,80,0.65)"); div2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = div2; ctx.fillRect(0, y + 30, CANVAS_W, 1.5);

    // Reference
    ctx.fillStyle = "#e8c87a";
    ctx.font = 'bold 44px Georgia, "Times New Roman", serif';
    ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 18;
    ctx.fillText(`— ${verseReference.trim()}`, CANVAS_W / 2, y + 94);
    ctx.shadowBlur = 0;

    // Footer — safe zone H-300 clears TikTok/Reels UI
    const footerY = CANVAS_H - 300;
    const footerGrad = ctx.createLinearGradient(0, footerY - 20, 0, CANVAS_H);
    footerGrad.addColorStop(0, "rgba(0,0,0,0)"); footerGrad.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = footerGrad; ctx.fillRect(0, footerY - 20, CANVAS_W, CANVAS_H - footerY + 20);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.font = 'bold 34px Georgia, "Times New Roman", serif';
    ctx.fillText("Start your own daily devotional →", CANVAS_W / 2, footerY + 52);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = 'bold 26px Georgia, "Times New Roman", serif';
    ctx.fillText("Shepherd’s Path", CANVAS_W / 2, footerY + 94);

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("blob failed"));
    }, "image/png", 1);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFilename(reference: string) {
  return `${reference.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") || "verse"}.png`;
}

export async function shareVerseAsImage(verseText: string, verseReference: string, imageBgUrl?: string | null): Promise<void> {
  if (!verseText?.trim() || !verseReference?.trim()) return;

  try {
    let blob: Blob;
    if (imageBgUrl) {
      try {
        blob = await createStoryShareImage(verseText, verseReference, imageBgUrl);
      } catch {
        blob = await renderVerseImageBlob(verseText, verseReference);
      }
    } else {
      blob = await renderVerseImageBlob(verseText, verseReference);
    }
    const file = new File([blob], safeFilename(verseReference), { type: "image/png" });

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const shareData = { files: [file], title: verseReference.trim() };
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    }

    downloadBlob(blob, safeFilename(verseReference));
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
    try {
      const blob = await renderVerseImageBlob(verseText, verseReference);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank");
      if (!opened) downloadBlob(blob, safeFilename(verseReference));
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      // fail silently
    }
  }
}

export { shareVerseAsImage as saveVerseCardToPhotos };

interface ShareVerseImageButtonProps {
  verseText: string;
  verseReference: string;
  imageBgUrl?: string | null;
  className?: string;
  vertical?: boolean;
  testId?: string;
  label?: string;
}

export function ShareVerseImageButton({
  verseText,
  verseReference,
  imageBgUrl,
  className = "",
  vertical = false,
  testId = "button-share-verse-image",
  label = "Save card",
}: ShareVerseImageButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await shareVerseAsImage(verseText, verseReference, imageBgUrl);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const baseClass = vertical
    ? "flex flex-col items-center gap-1.5 text-foreground/55 hover:text-primary transition-colors disabled:opacity-50"
    : "inline-flex items-center gap-1.5 transition-colors disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      data-testid={testId}
      className={`${baseClass} ${className}`.trim()}
    >
      {loading ? (
        <Loader2 className={vertical ? "w-5 h-5 animate-spin" : "w-4 h-4 animate-spin"} />
      ) : (
        <Image className={vertical ? "w-5 h-5" : "w-4 h-4"} />
      )}
      <span className={vertical ? "text-[12px] font-semibold leading-none" : undefined}>
        {label}
      </span>
    </button>
  );
}
