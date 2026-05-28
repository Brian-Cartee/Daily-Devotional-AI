import { Bookmark } from "lucide-react";
import type { ReactNode } from "react";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";

interface ScriptureSceneCardProps {
  text: string;
  reference: string;
  label?: string;
  imageSrc?: string;
  onBookmark?: () => void;
  bookmarked?: boolean;
  footer?: ReactNode;
  testId?: string;
}

/** Marketing-style verse card — nature backdrop, serif quote, calm hierarchy. */
export function ScriptureSceneCard({
  text,
  reference,
  label = "Scripture for you",
  imageSrc = "/hero-guidance.jpg",
  onBookmark,
  bookmarked,
  footer,
  testId = "card-scripture-scene",
}: ScriptureSceneCardProps) {
  return (
    <div
      data-testid={testId}
      className="relative rounded-2xl overflow-hidden min-h-[200px] border border-white/10 shadow-xl shadow-black/20"
    >
      <img
        src={imageSrc}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "brightness(0.72) saturate(1.1)" }}
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          const fallback = getDevotionalHeroImage();
          if (!el.src.includes(fallback)) el.src = fallback;
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,4,20,0.25) 0%, rgba(8,4,20,0.55) 45%, rgba(8,4,20,0.88) 100%)",
        }}
      />
      <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-end min-h-[200px]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            {label}
          </p>
          {onBookmark && (
            <button
              type="button"
              onClick={onBookmark}
              aria-label={bookmarked ? "Saved" : "Save verse"}
              className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white/90 hover:bg-white/10 transition-colors shrink-0"
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-white" : ""}`} />
            </button>
          )}
        </div>
        <p
          className="text-[20px] sm:text-[22px] leading-[1.45] text-white text-balance mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          &ldquo;{text}&rdquo;
        </p>
        <p className="text-[13px] font-bold text-white/75 tracking-wide">— {reference}</p>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
