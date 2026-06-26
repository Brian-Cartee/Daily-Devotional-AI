import { createPortal } from "react-dom";
import { VoiceSessionOrb, type VoiceOrbMode } from "@/components/VoiceSessionOrb";
import { VoiceQuietHint } from "@/components/VoiceQuietHint";
import { VOICE_TAP_WHEN_DONE } from "@/lib/voiceQuietHint";

type Props = {
  visible: boolean;
  tappable: boolean;
  mode: VoiceOrbMode;
  onDone: () => void;
  quietHintVisible?: boolean;
};

/** Portal layer — sits above scroll content in iOS WKWebView (fixed inside main often misses taps). */
export function PhilipVoiceHandoffLayer({
  visible,
  tappable,
  mode,
  onDone,
  quietHintVisible = false,
}: Props) {
  if (typeof document === "undefined" || !visible) return null;

  let fired = false;
  const fire = () => {
    if (!tappable || fired) return;
    fired = true;
    window.setTimeout(() => { fired = false; }, 350);
    onDone();
  };

  return createPortal(
    <div
      data-testid="philip-voice-handoff-layer"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "max(4.25rem, calc(3.5rem + env(safe-area-inset-bottom, 0px)))",
        zIndex: 9990,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        pointerEvents: tappable ? "auto" : "none",
        padding: "0 12px 4px",
      }}
    >
      {tappable ? (
        <button
          type="button"
          data-testid="philip-voice-orb-tap"
          aria-label="Done speaking"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fire();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            fire();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fire();
          }}
          className="border-0 bg-transparent cursor-pointer touch-manipulation flex flex-col items-center justify-center gap-2"
          style={{
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
            minHeight: 132,
            minWidth: 200,
            padding: "8px 24px 4px",
          }}
        >
          <VoiceSessionOrb mode={mode} size={92} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "rgba(196,181,253,0.88)",
            }}
          >
            {VOICE_TAP_WHEN_DONE}
          </span>
        </button>
      ) : (
        <VoiceSessionOrb mode={mode} size={92} />
      )}
      {tappable && quietHintVisible ? <VoiceQuietHint visible /> : null}
    </div>,
    document.body,
  );
}
