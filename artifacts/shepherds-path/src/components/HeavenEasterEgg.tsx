/**
 * HeavenEasterEgg — pull down from the top of any page to reveal a glimpse of heaven.
 *
 * How it works:
 * - Listens for touch events globally
 * - Overlay appears at 15px pull (transparent) so it immediately covers iOS's native black rubber-band
 * - Fully fades in at 90px pull
 * - Holds 2800ms after finger lifts, then fades out
 *
 * Image: /public/heaven.webp  (always rendered directly — no existence check needed)
 * Golden gradient on container = fallback while image loads
 */

import { useEffect, useRef, useState } from "react";

const SHOW_PX    = 15;  // show overlay this early to block native iOS black
const TRIGGER_PX = 90;  // fully reveal at this distance
const HOLD_MS    = 2800;

function getScrollY(): number {
  // window.scrollY can return 0 on iOS PWA even when slightly scrolled.
  // Check all three sources.
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

export function HeavenEasterEgg() {
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const touchStartY  = useRef<number | null>(null);
  const triggered    = useRef(false);
  const holdTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef   = useRef(false); // shadow visible in a ref so closures stay current

  const reveal = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    visibleRef.current = true;
    setVisible(true);
    // Double rAF so the DOM paints with opacity:0 before we animate to 1
    requestAnimationFrame(() => requestAnimationFrame(() => setOpacity(1)));
  };

  const dismiss = () => {
    setOpacity(0);
    holdTimer.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
    }, 600);
  };

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only trigger when at the very top of the page
      if (getScrollY() > 4) return;
      touchStartY.current = e.touches[0].clientY;
      triggered.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      if (getScrollY() > 4) return;
      const delta = e.touches[0].clientY - touchStartY.current;

      // Show overlay early (transparent) to immediately cover native iOS black
      if (delta >= SHOW_PX && !visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }

      // Fully reveal at TRIGGER_PX
      if (delta >= TRIGGER_PX && !triggered.current) {
        triggered.current = true;
        reveal();
      }
    };

    const onTouchEnd = () => {
      touchStartY.current = null;
      if (triggered.current) {
        triggered.current = false;
        holdTimer.current = setTimeout(dismiss, HOLD_MS);
      } else {
        // Pulled a little but not enough — hide immediately
        visibleRef.current = false;
        setVisible(false);
        setOpacity(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove",  onTouchMove,  { passive: true });
    document.addEventListener("touchend",   onTouchEnd,   { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove",  onTouchMove);
      document.removeEventListener("touchend",   onTouchEnd);
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        opacity,
        transition: "opacity 0.55s ease",
        // Golden gradient = instant background while image loads
        background:
          "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255,220,120,0.98) 0%, rgba(255,180,60,0.90) 30%, rgba(180,110,20,0.92) 60%, rgba(40,18,5,1) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Heaven image — always rendered; CSS background is the fallback */}
      <img
        src="/heaven.webp"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
        }}
      />

      {/* Soft light bloom at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          height: "55%",
          background:
            "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(255,245,200,0.65) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Dark scrim at bottom so text is legible */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "45%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Scripture */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "0 32px",
          marginTop: "auto",
          paddingBottom: "max(72px, calc(48px + env(safe-area-inset-bottom, 0px)))",
        }}
      >
        <p
          style={{
            fontSize: "clamp(1.15rem, 5vw, 1.5rem)",
            fontFamily: "var(--font-serif, Georgia, serif)",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.95)",
            lineHeight: 1.55,
            margin: "0 0 14px",
            textShadow: "0 2px 20px rgba(0,0,0,0.65)",
          }}
        >
          "He has gone to prepare a place for you."
        </p>
        <p
          style={{
            fontSize: "0.78rem",
            fontFamily: "var(--font-serif, Georgia, serif)",
            color: "rgba(255,220,120,0.90)",
            letterSpacing: "0.06em",
            textShadow: "0 1px 8px rgba(0,0,0,0.60)",
          }}
        >
          John 14:2
        </p>
      </div>
    </div>
  );
}
