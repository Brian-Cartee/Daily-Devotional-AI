import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Loader2 } from "lucide-react";

import img5755 from "@assets/IMG_5755_1775236238074.png";
import img5756 from "@assets/IMG_5756_1775236238074.png";
import img5757 from "@assets/IMG_5757_1775236238074.png";
import img5758 from "@assets/IMG_5758_1775236238074.png";
import img5759 from "@assets/IMG_5759_1775236238074.png";
import img5760 from "@assets/IMG_5760_1775236238074.png";
import img5761 from "@assets/IMG_5761_1775236238074.png";
import img5762 from "@assets/IMG_5762_1775236238074.png";
import img5763 from "@assets/IMG_5763_1775236238074.png";
import img5764 from "@assets/IMG_5764_1775236238074.png";
import img5765 from "@assets/IMG_5765_1775236238074.png";
import img5766 from "@assets/IMG_5766_1775236238074.png";
import img5820 from "@assets/IMG_5820_1775236373461.png";

const CANVAS_W = 1290;
const CANVAS_H = 2796;
const BAND_H = 560;
const PURPLE = "#7A018D";

const SHOTS = [
  { src: img5755, headline: "Begin your journey.", subtitle: "Scripture meets you where you are.", filename: "ss-01-welcome" },
  { src: img5756, headline: "A gentle invitation.", subtitle: "Start wherever you are.", filename: "ss-02-home" },
  { src: img5757, headline: "A new word every morning.", subtitle: "Scripture and prayer — daily.", filename: "ss-03-devotional" },
  { src: img5758, headline: "Share what's on your heart.", subtitle: "Receive Scripture made for your moment.", filename: "ss-04-guidance" },
  { src: img5759, headline: "Guided paths through Scripture.", subtitle: "Seven passages. One direction.", filename: "ss-05-journeys" },
  { src: img5760, headline: "Every book. Every chapter.", subtitle: "With pastoral insight at every turn.", filename: "ss-06-bible" },
  { src: img5761, headline: "Test your faith.", subtitle: "Challenge a friend to beat your score.", filename: "ss-07-study" },
  { src: img5762, headline: "Pray with others.", subtitle: "You are never alone in this.", filename: "ss-08-prayer" },
  { src: img5763, headline: "Your Iron Circle.", subtitle: "Walk with people who sharpen you.", filename: "ss-09-iron-circle" },
  { src: img5764, headline: "A place to begin.", subtitle: "No background required. Just you.", filename: "ss-10-beginning" },
  { src: img5765, headline: "Real stories. Real moments.", subtitle: "See what others are finding here.", filename: "ss-11-testimonials" },
  { src: img5766, headline: "Beauty in the Word.", subtitle: "A daily image and verse, just for you.", filename: "ss-12-stories" },
  { src: img5820, headline: "This is more than an app.", subtitle: "You carry something someone needs.", filename: "ss-13-calling" },
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

function generateBlob(imgSrc: string, headline: string, subtitle: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) { resolve(null); return; }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // Purple band
      ctx.fillStyle = PURPLE;
      ctx.fillRect(0, 0, CANVAS_W, BAND_H);

      const padding = 80;
      const maxW = CANVAS_W - padding * 2;

      // "SHEPHERD'S PATH" label
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "500 30px Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "7px";
      ctx.fillText("SHEPHERD'S PATH", CANVAS_W / 2, 110);
      ctx.letterSpacing = "0px";

      // Headline (italic, large)
      ctx.font = "italic 90px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      const headLines = wrapText(ctx, headline, maxW);
      const lineH = 108;
      const headBlockH = headLines.length * lineH;
      const headStartY = 140 + (BAND_H - 220 - headBlockH) / 2 + 80;
      headLines.forEach((l, i) => {
        ctx.fillText(l, CANVAS_W / 2, headStartY + i * lineH);
      });

      // Subtitle (italic, smaller)
      ctx.font = "italic 42px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      const subLines = wrapText(ctx, subtitle, maxW);
      const subLineH = 56;
      const subStartY = BAND_H - 50 - (subLines.length - 1) * subLineH;
      subLines.forEach((l, i) => {
        ctx.fillText(l, CANVAS_W / 2, subStartY + i * subLineH);
      });

      // Phone screenshot — cover-fit into remaining area
      const areaH = CANVAS_H - BAND_H;
      const scaleX = CANVAS_W / img.width;
      const scaleY = areaH / img.height;
      const scale = Math.max(scaleX, scaleY);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (CANVAS_W - drawW) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, BAND_H, CANVAS_W, areaH);
      ctx.clip();
      ctx.drawImage(img, offsetX, BAND_H, drawW, drawH);
      ctx.restore();

      canvas.toBlob((blob) => resolve(blob), "image/png");
    };

    img.onerror = () => resolve(null);
    img.src = imgSrc;
  });
}

type Status = "idle" | "loading" | "done";

export default function ScreenshotGenerator() {
  const [statuses, setStatuses] = useState<Status[]>(SHOTS.map(() => "idle"));
  const [allLoading, setAllLoading] = useState(false);

  const downloadOne = useCallback(async (index: number) => {
    const shot = SHOTS[index];
    setStatuses((prev) => {
      const next = [...prev];
      next[index] = "loading";
      return next;
    });
    const blob = await generateBlob(shot.src, shot.headline, shot.subtitle);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${shot.filename}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setStatuses((prev) => {
      const next = [...prev];
      next[index] = "done";
      return next;
    });
    setTimeout(() => {
      setStatuses((prev) => {
        const next = [...prev];
        next[index] = "idle";
        return next;
      });
    }, 3000);
  }, []);

  const downloadAll = useCallback(async () => {
    setAllLoading(true);
    for (let i = 0; i < SHOTS.length; i++) {
      const shot = SHOTS[i];
      setStatuses((prev) => {
        const next = [...prev];
        next[i] = "loading";
        return next;
      });
      const blob = await generateBlob(shot.src, shot.headline, shot.subtitle);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${shot.filename}.png`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 400));
      }
      setStatuses((prev) => {
        const next = [...prev];
        next[i] = "done";
        return next;
      });
    }
    setAllLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0a1a] text-white py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">App Store Screenshot Generator</h1>
            <p className="text-white/60 mt-1 text-sm">1290 × 2796 px · PNG · 13 screenshots ready · pick 10 to upload</p>
          </div>
          <Button
            onClick={downloadAll}
            disabled={allLoading}
            className="bg-[#7A018D] hover:bg-[#9A01B0] text-white px-6"
          >
            {allLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download All 13</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {SHOTS.map((shot, i) => (
            <div key={shot.filename} className="flex flex-col gap-2">
              <div className="rounded-xl overflow-hidden border border-white/10 relative group">
                <div
                  className="flex flex-col items-center justify-center text-center px-3"
                  style={{ background: PURPLE, height: 120 }}
                >
                  <p className="text-white/50 text-[9px] tracking-widest font-medium mb-1">SHEPHERD'S PATH</p>
                  <p className="text-white italic font-serif leading-tight text-sm">{shot.headline}</p>
                  <p className="text-white/75 italic font-serif text-[10px] mt-1 leading-snug">{shot.subtitle}</p>
                </div>
                <div className="bg-black" style={{ height: 160, overflow: "hidden" }}>
                  <img
                    src={shot.src}
                    alt={shot.headline}
                    className="w-full object-cover object-top"
                    style={{ height: 160 }}
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
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating…</>
                ) : statuses[i] === "done" ? (
                  <><CheckCircle className="w-3 h-3 mr-1 text-green-400" /> Downloaded</>
                ) : (
                  <><Download className="w-3 h-3 mr-1" /> {shot.filename}</>
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs text-center mt-10">
          Each download is a full-resolution 1290×2796 PNG ready for App Store Connect.
          The preview above is a scaled thumbnail.
        </p>
      </div>
    </div>
  );
}
