import { createPortal } from "react-dom";
import { useRef } from "react";
import { VoiceSessionOrb, type VoiceOrbMode } from "@/components/VoiceSessionOrb";
import { VoiceQuietHint } from "@/components/VoiceQuietHint";

type Props = {
  visible: boolean;
  tappable: boolean;
  mode: VoiceOrbMode;
  onDone: () => void;
  quietHintVisible?: boolean;
};

/** Portal layer — full-width done button so iOS WebView gets an easy, reliable tap target. */
export function PhilipVoiceHandoffLayer({
  visible,
  tappable,
  mode,
  onDone,
  quietHintVisible = false,
}: Props) {
  const busyRef = useRef(false);

  if (typeof document === "undefined" || !visible) return null;

  const fire = () => {
    if (!tappable || busyRef.current) return;
    busyRef.current = true;
    window.setTimeout(() => { busyRef.current = false; }, 1200);
    onDone();
  };

  return createPortal(
    <div
      data-testid="philip-voice-handoff-layer"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "max(3.75rem, calc(3.25rem + env(safe-area-inset-bottom, 0px)))",
        zIndex: 99990,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        pointerEvents: tappable ? "auto" : "none",
        padding: "0 16px 10px",
      }}
    >
      {tappable ? (
        <>
          <VoiceSessionOrb mode={mode} size={80} />
          <button
            type="button"
            data-testid="philip-voice-orb-tap"
            aria-label="Done speaking"
            onTouchStart={(e) => {
              e.stopPropagation();
              fire();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              fire();
            }}
            className="cursor-pointer touch-manipulation active:opacity-90"
            style={{
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              width: "100%",
              maxWidth: 360,
              minHeight: 56,
              padding: "14px 20px",
              borderRadius: 16,
              border: "1.5px solid rgba(239,68,68,0.55)",
              background: "linear-gradient(180deg, rgba(239,68,68,0.28) 0%, rgba(127,29,29,0.22) 100%)",
              boxShadow: "0 6px 28px rgba(239,68,68,0.28)",
              color: "rgba(255,255,255,0.95)",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            Done speaking
          </button>
          <span
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.03em",
              color: "rgba(196,181,253,0.55)",
              textAlign: "center",
            }}
          >
            Pauses automatically — tap only if needed
          </span>
        </>
      ) : (
        <VoiceSessionOrb mode={mode} size={80} />
      )}
      {tappable && quietHintVisible ? <VoiceQuietHint visible /> : null}
    </div>,
    document.body,
  );
}
