import { Link } from "wouter";
import { BookOpen, Heart, MoonStar, Shield, Sparkles, Wind } from "lucide-react";
import { getCurrentDayPart, getThresholdModePlan } from "@/lib/thresholdModePlan";
import { getThresholdNeed } from "@/lib/thresholdState";
import { NATIVE_TEXT_SOFT } from "@/lib/nativeColors";

export function ThresholdModeRhythmCard() {
  const mode = getThresholdNeed();
  const plan = getThresholdModePlan(mode);
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
  const accentColor =
    mode === "battle"
      ? "rgba(253, 230, 138, 0.85)"
      : mode === "deep-dive"
        ? "rgba(186, 230, 253, 0.85)"
        : "rgba(221, 214, 254, 0.85)";

  const cardBorder =
    mode === "battle"
      ? "1px solid rgba(245, 158, 11, 0.22)"
      : mode === "deep-dive"
        ? "1px solid rgba(56, 189, 248, 0.22)"
        : "1px solid rgba(139, 92, 246, 0.22)";
  const cardBg =
    mode === "battle"
      ? "rgba(69, 26, 3, 0.35)"
      : mode === "deep-dive"
        ? "rgba(12, 30, 55, 0.35)"
        : "rgba(46, 16, 101, 0.30)";

  return (
    <div
      data-testid="card-threshold-mode-rhythm"
      style={{
        borderRadius: "16px",
        border: cardBorder,
        backgroundColor: cardBg,
        padding: "16px",
        marginBottom: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <Icon style={{ width: "14px", height: "14px", color: accentColor }} aria-hidden />
        <p
          style={{
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "rgba(212, 212, 216, 0.75)",
            margin: 0,
          }}
        >
          {plan.title}
        </p>
      </div>
      <p
        style={{
          fontSize: "14px",
          lineHeight: 1.625,
          color: NATIVE_TEXT_SOFT,
          marginBottom: "12px",
          marginTop: 0,
        }}
      >
        {plan.returnLine}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
        <Link href={primaryHref}>
          <a
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              padding: "8px 14px",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              color: "#141019",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
            aria-label={`Open ${primaryLabel}`}
          >
            {primaryLabel}
          </a>
        </Link>
        <Link href={secondaryHref}>
          <a
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              padding: "8px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.80)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
            aria-label={`Open ${secondaryLabel}`}
          >
            {secondaryLabel}
          </a>
        </Link>
      </div>
      <p
        style={{
          marginTop: "10px",
          marginBottom: 0,
          fontSize: "11px",
          color: "rgba(161, 161, 170, 0.80)",
        }}
      >
        Quiet rhythm over streak pressure.
      </p>
    </div>
  );
}
