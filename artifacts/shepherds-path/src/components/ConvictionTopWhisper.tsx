import { useLocation } from "wouter";
import { CONVICTION_PANEL_EYEBROW } from "@/content/convictionManifesto";
import { openConvictionPanel } from "@/lib/openConvictionPanel";
import { shouldShowConvictionTab } from "@/lib/convictionTabVisibility";

/** Rest: ~85% transparent (15% visible). Hover/focus: ~45% visible. */
const REST_OPACITY = "0.15";
const ACTIVE_OPACITY = "0.55";

/** Centered in the top nav bar — opens conviction panel. */
export function ConvictionTopWhisper() {
  const [location] = useLocation();
  if (!shouldShowConvictionTab(location)) return null;

  const isHome = location === "/" || location === "";
  const colorClass = isHome ? "text-white" : "text-foreground";

  return (
    <button
      type="button"
      data-testid="button-conviction-tab"
      onClick={openConvictionPanel}
      aria-label={`${CONVICTION_PANEL_EYEBROW} — Scripture, faith, and mission`}
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-md transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-200/35 ${colorClass}`}
      style={{
        opacity: REST_OPACITY,
        textShadow: isHome ? "0 1px 10px rgba(0,0,0,0.65)" : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = ACTIVE_OPACITY;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = REST_OPACITY;
      }}
      onFocus={(e) => {
        e.currentTarget.style.opacity = ACTIVE_OPACITY;
      }}
      onBlur={(e) => {
        e.currentTarget.style.opacity = REST_OPACITY;
      }}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] whitespace-nowrap">
        {CONVICTION_PANEL_EYEBROW}
      </span>
    </button>
  );
}
