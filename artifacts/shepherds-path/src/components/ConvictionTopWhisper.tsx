import { useLocation } from "wouter";
import { CONVICTION_PANEL_EYEBROW } from "@/content/convictionManifesto";
import { openConvictionPanel } from "@/lib/openConvictionPanel";
import { shouldShowConvictionTab } from "@/lib/convictionTabVisibility";

/** Centered in the top nav bar — opens conviction panel. Text-only, no background. */
export function ConvictionTopWhisper() {
  const [location] = useLocation();
  if (!shouldShowConvictionTab(location)) return null;

  const isHome = location === "/" || location === "";

  return (
    <button
      type="button"
      data-testid="button-conviction-tab"
      onClick={openConvictionPanel}
      aria-label={`${CONVICTION_PANEL_EYEBROW} — Scripture, faith, and mission`}
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-200/35 ${
        isHome
          ? "text-[#9a8268] hover:text-[#d4b896] focus-visible:text-[#d4b896]"
          : "text-muted-foreground/80 hover:text-foreground/90 focus-visible:text-foreground/90"
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] whitespace-nowrap">
        {CONVICTION_PANEL_EYEBROW}
      </span>
    </button>
  );
}
