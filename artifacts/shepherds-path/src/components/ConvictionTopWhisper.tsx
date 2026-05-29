import { useEffect, useState, type MouseEvent } from "react";
import { useLocation } from "wouter";
import { HandHeart, X } from "lucide-react";
import { CONVICTION_PANEL_EYEBROW } from "@/content/convictionManifesto";
import { openConvictionPanel } from "@/lib/openConvictionPanel";
import { shouldShowConvictionTab } from "@/lib/convictionTabVisibility";
import {
  CONVICTION_WHISPER_CHANGE_EVENT,
  dismissConvictionWhisper,
  isConvictionWhisperVisible,
} from "@/lib/convictionWhisperState";
import { topMoreMenuButtonClass } from "@/lib/topMoreMenuButton";

/** Frosted icon beside ⋯ — same weight as the more menu. Dismissible with ×. */
export function ConvictionTopWhisper() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(isConvictionWhisperVisible);

  useEffect(() => {
    const sync = () => setVisible(isConvictionWhisperVisible());
    window.addEventListener(CONVICTION_WHISPER_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CONVICTION_WHISPER_CHANGE_EVENT, sync);
  }, []);

  if (!shouldShowConvictionTab(location) || !visible) return null;

  const hide = (e: MouseEvent) => {
    e.stopPropagation();
    dismissConvictionWhisper();
    setVisible(false);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        data-testid="button-conviction-tab"
        onClick={openConvictionPanel}
        aria-label={`${CONVICTION_PANEL_EYEBROW} — Scripture, faith, and mission`}
        title={CONVICTION_PANEL_EYEBROW}
        className={topMoreMenuButtonClass(false)}
      >
        <HandHeart className="w-[18px] h-[18px]" strokeWidth={2.1} />
      </button>
      <button
        type="button"
        data-testid="button-conviction-dismiss"
        onClick={hide}
        aria-label="Hide Our conviction button"
        title="Hide"
        className="absolute -top-1 -right-1 w-[18px] h-[18px] flex items-center justify-center rounded-full bg-black/55 text-white/75 hover:text-white hover:bg-black/70 ring-1 ring-white/15 transition-colors"
      >
        <X className="w-2.5 h-2.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
