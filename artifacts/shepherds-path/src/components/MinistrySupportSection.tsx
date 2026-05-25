import { Link } from "wouter";
import { HandHeart, Heart, Sparkles, ArrowRight } from "lucide-react";
import {
  MINISTRY_SUPPORT_CLOSING,
  MINISTRY_SUPPORT_EYEBROW,
  MINISTRY_SUPPORT_HEADLINE,
  MINISTRY_SUPPORT_PARAGRAPHS,
  MINISTRY_SUPPORT_PROMISES,
} from "@/lib/ministrySupportCopy";

type MinistrySupportSectionProps = {
  /** Light pages (How to Use); dark matches About */
  theme?: "light" | "dark";
  /** Show primary link to About gift flow */
  showGiftLink?: boolean;
  className?: string;
};

export function MinistrySupportSection({
  theme = "light",
  showGiftLink = true,
  className = "",
}: MinistrySupportSectionProps) {
  const isDark = theme === "dark";

  const card = isDark
    ? "rounded-2xl p-6 border border-indigo-500/25"
    : "rounded-2xl border border-primary/15 bg-primary/[0.04] p-5 sm:p-6";

  const cardStyle = isDark
    ? { background: "linear-gradient(135deg, #1e1040 0%, #0f0a2e 100%)" }
    : undefined;

  const eyebrow = isDark ? "text-white/40" : "text-primary/70";
  const title = isDark ? "text-white" : "text-foreground";
  const body = isDark ? "text-white/55" : "text-muted-foreground";
  const bodyStrong = isDark ? "text-white/65" : "text-foreground/80";
  const promiseTitle = isDark ? "text-white/90" : "text-foreground";
  const promiseBody = isDark ? "text-white/45" : "text-muted-foreground";
  const promiseBox = isDark
    ? "rounded-xl p-3.5 border border-white/8 bg-white/[0.03]"
    : "rounded-xl p-3.5 border border-border/50 bg-background/80";
  const closing = isDark ? "text-white/40 italic" : "text-muted-foreground italic";
  const btnGift = isDark
    ? "bg-white/10 border-white/18 text-white hover:bg-white/15"
    : "bg-primary text-primary-foreground hover:opacity-90";
  const btnPro = isDark
    ? "bg-transparent border border-white/18 text-white/80 hover:bg-white/5"
    : "border border-border/70 bg-muted/40 text-foreground hover:bg-muted/60";

  return (
    <section
      className={`${card} ${className}`}
      style={cardStyle}
      data-testid="section-ministry-support"
      aria-labelledby="ministry-support-heading"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isDark ? "bg-white/10" : "bg-primary/10"
          }`}
        >
          <HandHeart className={`w-4.5 h-4.5 ${isDark ? "text-white/70" : "text-primary/80"}`} style={{ width: 18, height: 18 }} />
        </div>
        <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${eyebrow}`}>
          {MINISTRY_SUPPORT_EYEBROW}
        </p>
      </div>

      <h2 id="ministry-support-heading" className={`font-bold text-[20px] leading-snug mb-4 ${title}`}>
        {MINISTRY_SUPPORT_HEADLINE}
      </h2>

      <div className="space-y-3 mb-5">
        {MINISTRY_SUPPORT_PARAGRAPHS.map((p, i) => (
          <p key={i} className={`text-[14px] leading-relaxed ${i === 0 ? bodyStrong : body}`}>
            {p}
          </p>
        ))}
      </div>

      <ul className="space-y-2.5 mb-5">
        {MINISTRY_SUPPORT_PROMISES.map(({ title: pt, body: pb }) => (
          <li key={pt} className={promiseBox}>
            <p className={`text-[14px] font-semibold mb-1 ${promiseTitle}`}>{pt}</p>
            <p className={`text-[13px] leading-relaxed ${promiseBody}`}>{pb}</p>
          </li>
        ))}
      </ul>

      <p className={`text-[13px] leading-relaxed mb-5 ${closing}`}>{MINISTRY_SUPPORT_CLOSING}</p>

      {showGiftLink && (
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link href="/about">
            <span
              data-testid="link-ministry-gift"
              className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98] border ${btnGift}`}
            >
              <Heart className="w-4 h-4" />
              Leave a one-time gift
              <ArrowRight className="w-4 h-4 opacity-70" />
            </span>
          </Link>
          <Link href="/restore">
            <span
              data-testid="link-ministry-pro"
              className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.98] ${btnPro}`}
            >
              <Sparkles className="w-4 h-4 opacity-80" />
              About Pro support
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}
