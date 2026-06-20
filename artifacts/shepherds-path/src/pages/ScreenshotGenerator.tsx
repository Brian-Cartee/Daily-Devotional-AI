import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Loader2 } from "lucide-react";

import img5755 from "@assets/IMG_5755_1775236238074.png";
import img5757 from "@assets/IMG_5757_1775236238074.png";
import img5758 from "@assets/IMG_5758_1775236238074.png";
import img5759 from "@assets/IMG_5759_1775236238074.png";
import img5760 from "@assets/IMG_5760_1775236238074.png";
import img5762 from "@assets/IMG_5762_1775236238074.png";
import img5763 from "@assets/IMG_5763_1775236238074.png";
import img5764 from "@assets/IMG_5764_1775236238074.png";
import img5820 from "@assets/IMG_5820_1775236373461.png";

/** App Store Connect — 6.7" iPhone portrait */
const CANVAS_W = 1290;
const CANVAS_H = 2796;
const HEADER_H = 520;
const PURPLE_TOP = "#5c1e98";
const PURPLE_BOTTOM = "#2a1356";

type ShotSpec = {
  headline: string;
  subheadline: string;
  phoneSrc: string;
  bgSrc: string;
  filename: string;
};

const SHOTS: ShotSpec[] = [
  {
    headline: "Find your way back to God.",
    subheadline: "Scripture, prayer, and guidance for real life moments.",
    phoneSrc: img5755,
    bgSrc: "/hero-landing.jpg",
    filename: "ss-01-find-your-way",
  },
  {
    headline: "You don't have to carry it alone.",
    subheadline: "Share what's on your heart and receive Scripture-grounded guidance.",
    phoneSrc: img5758,
    bgSrc: "/hero-guidance.jpg",
    filename: "ss-02-carry-alone",
  },
  {
    headline: "Get Scripture that speaks to your season.",
    subheadline: "Find Biblical encouragement for anxiety, grief, doubt, loneliness, and more.",
    phoneSrc: img5758,
    bgSrc: "/hero-understand-2.webp",
    filename: "ss-03-your-season",
  },
  {
    headline: "Understand Scripture without feeling overwhelmed.",
    subheadline: "Read the Bible with insight, clarity, and calm guidance.",
    phoneSrc: img5760,
    bgSrc: "/hero-read-2.webp",
    filename: "ss-04-understand-scripture",
  },
  {
    headline: "Real guidance for hard seasons.",
    subheadline: "Walk through grief, anxiety, healing, and growth — one day at a time.",
    phoneSrc: img5759,
    bgSrc: "/hero-understand-3.webp",
    filename: "ss-05-hard-seasons",
  },
  {
    headline: "Beginning with Jesus starts right where you are.",
    subheadline: "No pressure. No pretending. Just an honest path toward God.",
    phoneSrc: img5764,
    bgSrc: "/hero-salvation.jpg",
    filename: "ss-06-beginning-jesus",
  },
  {
    headline: "Pray with people who truly care.",
    subheadline: "Share burdens, encourage others, and stay rooted in prayer together.",
    phoneSrc: img5762,
    bgSrc: "/hero-prayer-wall-lake.jpg",
    filename: "ss-07-prayer-community",
  },
  {
    headline: "Start every day grounded in God's Word.",
    subheadline: "Daily Scripture and reflections designed to steady your heart.",
    phoneSrc: img5757,
    bgSrc: "/hero-devotional-still.webp",
    filename: "ss-08-daily-word",
  },
  {
    headline: "Stay connected to people walking the same path.",
    subheadline: "Grow alongside believers seeking wisdom, encouragement, and accountability.",
    phoneSrc: img5763,
    bgSrc: "/hero-iron-circle.jpg",
    filename: "ss-09-same-path",
  },
  {
    headline: "More than a Bible app.",
    subheadline: "A Christ-centered space for prayer, growth, reflection, and discipleship.",
    phoneSrc: img5820,
    bgSrc: "/hero-landing.webp",
    filename: "ss-10-more-than-bible",
  },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function generateBlob(shot: ShotSpec): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const [bg, phone] = await Promise.all([
    loadImage(shot.bgSrc).catch(() => loadImage(shot.phoneSrc)),
    loadImage(shot.phoneSrc),
  ]);

  // Scenic background (full canvas)
  const bgScale = Math.max(CANVAS_W / bg.width, CANVAS_H / bg.height);
  const bgW = bg.width * bgScale;
  const bgH = bg.height * bgScale;
  ctx.drawImage(bg, (CANVAS_W - bgW) / 2, (CANVAS_H - bgH) / 2, bgW, bgH);

  // Darken lower area for phone contrast
  const lowerGrad = ctx.createLinearGradient(0, HEADER_H * 0.6, 0, CANVAS_H);
  lowerGrad.addColorStop(0, "rgba(10, 5, 25, 0.15)");
  lowerGrad.addColorStop(0.35, "rgba(10, 5, 25, 0.55)");
  lowerGrad.addColorStop(1, "rgba(10, 5, 25, 0.72)");
  ctx.fillStyle = lowerGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Header band
  const headerGrad = ctx.createLinearGradient(0, 0, 0, HEADER_H);
  headerGrad.addColorStop(0, PURPLE_TOP);
  headerGrad.addColorStop(1, PURPLE_BOTTOM);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, CANVAS_W, HEADER_H);

  const padX = 72;
  const maxW = CANVAS_W - padX * 2;

  // Headline
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = '700 92px Georgia, "Playfair Display", "Times New Roman", serif';
  const headlineLines = wrapText(ctx, shot.headline, maxW);
  const headlineLineH = 108;
  let y = 168;
  for (const line of headlineLines) {
    ctx.fillText(line, CANVAS_W / 2, y);
    y += headlineLineH;
  }

  // Subheadline
  ctx.font = '500 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const subLines = wrapText(ctx, shot.subheadline, maxW);
  const subLineH = 54;
  y += 24;
  for (const line of subLines) {
    ctx.fillText(line, CANVAS_W / 2, y);
    y += subLineH;
  }

  // Phone frame
  const phonePadX = 118;
  const phoneW = CANVAS_W - phonePadX * 2;
  const phoneScale = phoneW / phone.width;
  const phoneH = phone.height * phoneScale;
  const phoneX = phonePadX;
  const phoneY = Math.min(HEADER_H + 48, CANVAS_H - phoneH - 80);
  const radius = 52;
  const border = 10;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, phoneX - border, phoneY - border, phoneW + border * 2, phoneH + border * 2, radius + border);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, phoneX, phoneY, phoneW, phoneH, radius);
  ctx.clip();
  ctx.drawImage(phone, phoneX, phoneY, phoneW, phoneH);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

type Status = "idle" | "loading" | "done" | "error";

export default function ScreenshotGenerator() {
  const [statuses, setStatuses] = useState<Status[]>(SHOTS.map(() => "idle"));
  const [allLoading, setAllLoading] = useState(false);

  const setStatus = (index: number, status: Status) => {
    setStatuses((prev) => {
      const next = [...prev];
      next[index] = status;
      return next;
    });
  };

  const downloadOne = useCallback(async (index: number) => {
    const shot = SHOTS[index];
    setStatus(index, "loading");
    try {
      const blob = await generateBlob(shot);
      if (!blob) {
        setStatus(index, "error");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${shot.filename}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(index, "done");
      setTimeout(() => setStatus(index, "idle"), 2500);
    } catch {
      setStatus(index, "error");
    }
  }, []);

  const downloadAll = useCallback(async () => {
    setAllLoading(true);
    for (let i = 0; i < SHOTS.length; i++) {
      await downloadOne(i);
      await new Promise((r) => setTimeout(r, 500));
    }
    setAllLoading(false);
  }, [downloadOne]);

  return (
    <div className="min-h-screen bg-[#0d0a1a] text-white py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">App Store Screenshot Generator</h1>
            <p className="text-white/60 mt-1 text-sm max-w-xl">
              1290 × 2796 px PNG · 10 polished frames · headline + subheadline + scenic background + phone mockup
            </p>
          </div>
          <Button
            onClick={downloadAll}
            disabled={allLoading}
            className="bg-[#442f74] hover:bg-[#5a3d94] text-white px-6"
          >
            {allLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> Download All 10
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {SHOTS.map((shot, i) => (
            <div key={shot.filename} className="flex flex-col gap-2">
              <div className="rounded-xl overflow-hidden border border-white/10 bg-[#1a1030]">
                <div
                  className="px-3 py-3 text-center"
                  style={{ background: "linear-gradient(180deg, #5c1e98, #2a1356)", minHeight: 88 }}
                >
                  <p className="text-white font-bold font-serif leading-tight text-xs">{shot.headline}</p>
                  <p className="text-white/75 text-[10px] mt-1 leading-snug">{shot.subheadline}</p>
                </div>
                <div className="relative bg-black" style={{ height: 200 }}>
                  <img
                    src={shot.bgSrc}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                  <img
                    src={shot.phoneSrc}
                    alt={shot.headline}
                    className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[72%] rounded-t-xl border border-white/20"
                  />
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 text-xs"
                onClick={() => downloadOne(i)}
                disabled={statuses[i] === "loading"}
              >
                {statuses[i] === "loading" ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating…
                  </>
                ) : statuses[i] === "done" ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1 text-green-400" /> Downloaded
                  </>
                ) : statuses[i] === "error" ? (
                  <>Retry download</>
                ) : (
                  <>
                    <Download className="w-3 h-3 mr-1" /> {shot.filename}
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs text-center mt-10 leading-relaxed max-w-2xl mx-auto">
          Open on production or local dev: <span className="text-white/50">/screenshot-gen</span>. Upload the 10 PNGs
          to App Store Connect in order. Replace phone captures in{" "}
          <span className="text-white/50">public/screenshots/src/</span> anytime for fresher UI.
        </p>
      </div>
    </div>
  );
}
