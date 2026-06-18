import { useLocation } from "wouter";
import { HandHeart } from "lucide-react";
import { CONVICTION_PANEL_EYEBROW } from "@/content/convictionManifesto";
import { openConvictionPanel } from "@/lib/openConvictionPanel";
import { shouldShowConvictionTab } from "@/lib/convictionTabVisibility";
import { topMoreMenuButtonClass, topMoreMenuButtonStyle } from "@/lib/topMoreMenuButton";
import { isNativeWebViewShell, usesCompactTopNav } from "@/lib/platform";

/** Top-left icon — opens conviction panel; out of the way of threshold copy. */
export function ConvictionTopWhisper() {
  const [location] = useLocation();
  if (!shouldShowConvictionTab(location)) return null;

  const nativeShell = isNativeWebViewShell();
  const compact = usesCompactTopNav();

  return (
    <button
      type="button"
      data-testid="button-conviction-tab"
      onClick={openConvictionPanel}
      aria-label={`${CONVICTION_PANEL_EYEBROW} — Scripture, faith, and mission`}
      title={CONVICTION_PANEL_EYEBROW}
      className={nativeShell || compact ? undefined : `${topMoreMenuButtonClass(false)} shrink-0`}
      style={nativeShell || compact ? { ...topMoreMenuButtonStyle(false), position: "relative" } : { position: "relative" }}
    >
      <HandHeart className="w-[18px] h-[18px]" strokeWidth={2.1} style={{ color: "rgba(255,255,255,0.92)" }} />
      {/* Tiny filled red heart badge */}
      <svg
        viewBox="0 0 10 10"
        aria-hidden
        style={{
          position: "absolute",
          top: "2px",
          right: "2px",
          width: "8px",
          height: "8px",
          filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))",
        }}
      >
        <path
          d="M5 8.5C5 8.5 1 5.8 1 3.3a2 2 0 0 1 4-0.6A2 2 0 0 1 9 3.3C9 5.8 5 8.5 5 8.5z"
          fill="rgb(239,68,68)"
        />
      </svg>
    </button>
  );
}
