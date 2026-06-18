import { useLocation } from "wouter";
import { HandHeart, Heart } from "lucide-react";
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
      {/* Hand outline + filled red heart overlaid on the heart portion of the glyph */}
      <span style={{ position: "relative", display: "inline-flex", width: "18px", height: "18px" }}>
        <HandHeart style={{ width: "18px", height: "18px", color: "rgba(255,255,255,0.92)" }} strokeWidth={2.1} />
        <Heart
          aria-hidden
          style={{
            position: "absolute",
            top: "0px",
            right: "0px",
            width: "9px",
            height: "9px",
            color: "rgb(239,68,68)",
            fill: "rgb(239,68,68)",
            filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.6))",
          }}
        />
      </span>
    </button>
  );
}
