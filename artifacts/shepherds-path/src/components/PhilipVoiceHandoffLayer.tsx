import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { VoiceSessionOrb, type VoiceOrbMode } from "@/components/VoiceSessionOrb";
import { VoiceQuietHint } from "@/components/VoiceQuietHint";
import { nativeDiag } from "@/lib/nativeDiag";

type Props = {
  visible: boolean;
  micCaptureOpen: boolean;
  mode: VoiceOrbMode;
  onDone: () => void;
  quietHintVisible?: boolean;
};

/**
 * Full bottom capture zone — iOS WKWebView often misses small button taps.
 * When the mic is open, the whole lower panel is one touch target.
 */
export function PhilipVoiceHandoffLayer({
  visible,
  micCaptureOpen,
  mode,
  onDone,
  quietHintVisible = false,
}: Props) {
  const busyRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!micCaptureOpen) return;
    const fire = () => {
      if (busyRef.current) return;
      busyRef.current = true;
      nativeDiag("handoff_layer_fire");
      window.setTimeout(() => { busyRef.current = false; }, 800);
      onDoneRef.current();
    };
    (window as Window & { __spPhilipVoiceDone?: () => void }).__spPhilipVoiceDone = fire;
    return () => {
      delete (window as Window & { __spPhilipVoiceDone?: () => void }).__spPhilipVoiceDone;
    };
  }, [micCaptureOpen]);

  if (typeof document === "undefined" || !visible) return null;

  const tappable = micCaptureOpen && mode === "listen";

  const fire = () => {
    if (!tappable || busyRef.current) return;
    busyRef.current = true;
    nativeDiag("handoff_tap");
    window.setTimeout(() => { busyRef.current = false; }, 800);
    onDoneRef.current();
  };

  return createPortal(
    <div
      data-testid="philip-voice-handoff-layer"
      role={tappable ? "button" : "status"}
      aria-label={tappable ? "Done speaking" : undefined}
      onTouchEnd={(e) => {
        if (!tappable) return;
        e.preventDefault();
        e.stopPropagation();
        fire();
      }}
      onClick={(e) => {
        if (!tappable) return;
        e.preventDefault();
        e.stopPropagation();
        fire();
      }}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: "min(42vh, 320px)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 10,
        pointerEvents: tappable ? "auto" : "none",
        padding: "12px 16px max(4.5rem, calc(3.75rem + env(safe-area-inset-bottom, 0px)))",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        background: tappable
          ? "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.55) 100%)"
          : "transparent",
      }}
    >
      <VoiceSessionOrb mode={mode} size={tappable ? 84 : 72} />
      {tappable && (
        <>
          <div
            data-testid="philip-voice-orb-tap"
            style={{
              width: "100%",
              maxWidth: 360,
              minHeight: 58,
              padding: "15px 20px",
              borderRadius: 16,
              border: "2px solid rgba(239,68,68,0.65)",
              background: "rgba(239,68,68,0.32)",
              boxShadow: "0 8px 32px rgba(239,68,68,0.35)",
              color: "#fff",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "0.03em",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            Done speaking
          </div>
          <span
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: "0.02em",
              color: "rgba(255,255,255,0.72)",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            Stops when you pause — or tap anywhere here
          </span>
        </>
      )}
      {tappable && quietHintVisible ? <VoiceQuietHint visible dark /> : null}
    </div>,
    document.body,
  );
}
