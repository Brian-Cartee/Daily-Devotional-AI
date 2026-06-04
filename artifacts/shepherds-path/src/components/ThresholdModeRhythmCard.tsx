import { Link } from "wouter";
import { BookOpen, Heart, MoonStar, Shield, Sparkles, Wind } from "lucide-react";
import { getCurrentDayPart, getThresholdAtmosphere, getThresholdModePlan } from "@/lib/thresholdModePlan";
import { getThresholdNeed } from "@/lib/thresholdState";

export function ThresholdModeRhythmCard() {
  const mode = getThresholdNeed();
  const plan = getThresholdModePlan(mode);
  const atmosphere = getThresholdAtmosphere(mode);
  const part = getCurrentDayPart();
  const isNight = part === "night";
  const primaryLabel = isNight ? plan.rhythmNightLabel : plan.rhythmMorningLabel;
  const primaryHref = isNight ? plan.rhythmNightHref : plan.rhythmMorningHref;
  const secondaryLabel = isNight ? plan.rhythmMorningLabel : plan.rhythmNightLabel;
  const secondaryHref = isNight ? plan.rhythmMorningHref : plan.rhythmNightHref;
  const Icon =
    mode === "peace" || mode === "stillness"
      ? Wind
      : mode === "grief"
        ? Heart
        : mode === "battle"
          ? Shield
          : mode === "deep-dive"
            ? BookOpen
            : mode === "night-prayer"
              ? MoonStar
              : Sparkles;
  const accent =
    mode === "battle"
      ? "text-amber-200/85"
      : mode === "deep-dive"
        ? "text-sky-200/85"
        : "text-violet-200/85";

  return (
    <div
      className={`rounded-2xl border px-4 py-4 mb-3 ${atmosphere.rhythmCardClass}`}
      data-testid="card-threshold-mode-rhythm"
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${accent}`} aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300/75">
          {plan.title}
        </p>
      </div>
      <p className="text-[14px] leading-relaxed text-foreground/88 mb-3">
        {plan.returnLine}
      </p>
      <div className="flex items-center gap-2">
        <Link href={primaryHref}>
          <a
            className="inline-flex min-h-[44px] items-center justify-center px-3.5 py-2 rounded-xl bg-white text-[#141019] text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={`Open ${primaryLabel}`}
          >
            {primaryLabel}
          </a>
        </Link>
        <Link href={secondaryHref}>
          <a
            className="inline-flex min-h-[44px] items-center justify-center px-3 py-2 rounded-xl border border-white/18 text-white/80 text-[13px] font-semibold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label={`Open ${secondaryLabel}`}
          >
            {secondaryLabel}
          </a>
        </Link>
      </div>
      <p className="mt-2.5 text-[11px] text-zinc-400/80">
        Quiet rhythm over streak pressure.
      </p>
    </div>
  );
}
