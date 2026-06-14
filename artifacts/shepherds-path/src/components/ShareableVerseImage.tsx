import { useState } from "react";
import { Image, Loader2 } from "lucide-react";

const CANVAS_SIZE = 1080;
const HORIZONTAL_PADDING = 80;
const MAX_TEXT_WIDTH = CANVAS_SIZE - HORIZONTAL_PADDING * 2;
const MAX_VERSE_LINES = 4;

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
  const clean = text.trim().replace(/^["'""]+|["'""]+$/g, "");
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
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("canvas unavailable"));
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
    gradient.addColorStop(0, "#0f0a1e");
    gradient.addColorStop(1, "#1a0f35");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = '400 40px Georgia, "Times New Roman", serif';
    ctx.fillText("✝", CANVAS_SIZE / 2, 110);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    if ("letterSpacing" in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0.22em";
    }
    ctx.fillText("SHEPHERD'S PATH", CANVAS_SIZE / 2, 155);
    if ("letterSpacing" in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
    }

    const { lines, fontSize } = fitVerseLines(ctx, verseText);
    ctx.font = `italic ${fontSize}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 3;

    const lineHeight = fontSize * 1.38;
    const blockHeight = lines.length * lineHeight;
    let y = CANVAS_SIZE / 2 - blockHeight / 2 + fontSize * 0.35;

    for (const line of lines) {
      ctx.fillText(`"${line}"`, CANVAS_SIZE / 2, y);
      y += lineHeight;
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const refY = CANVAS_SIZE - 130;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(HORIZONTAL_PADDING + 40, refY - 28);
    ctx.lineTo(CANVAS_SIZE - HORIZONTAL_PADDING - 40, refY - 28);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = '700 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`— ${verseReference.trim()}`, CANVAS_SIZE / 2, refY);

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText("shepherdspathai.com", CANVAS_SIZE / 2, CANVAS_SIZE - 48);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("blob failed"));
      },
      "image/png",
      1,
    );
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

export async function shareVerseAsImage(verseText: string, verseReference: string): Promise<void> {
  if (!verseText?.trim() || !verseReference?.trim()) return;

  try {
    const blob = await renderVerseImageBlob(verseText, verseReference);
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

interface ShareVerseImageButtonProps {
  verseText: string;
  verseReference: string;
  className?: string;
  vertical?: boolean;
  testId?: string;
}

export function ShareVerseImageButton({
  verseText,
  verseReference,
  className = "",
  vertical = false,
  testId = "button-share-verse-image",
}: ShareVerseImageButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await shareVerseAsImage(verseText, verseReference);
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
        Share Image
      </span>
    </button>
  );
}
