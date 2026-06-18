import { useLocation } from "wouter";
import { Heart } from "lucide-react";
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
      style={nativeShell || compact ? topMoreMenuButtonStyle(false) : undefined}
    >
      <Heart
        style={{
          width: "22px",
          height: "22px",
          color: "rgba(255,255,255,0.92)",
          fill: "rgba(255,255,255,0.92)",
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
        }}
      />
    </button>
  );
}
