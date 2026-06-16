/**
 * HeavenEasterEgg — pull down from the top of any page to reveal a glimpse of heaven.
 *
 * How it works:
 * - Listens for touch events globally
 * - When the user is scrolled to the top and pulls down 90px+, the overlay appears
 * - Full-screen: heaven image (or golden gradient fallback) + John 14:2
 * - Releases naturally when finger lifts — no button needed
 *
 * To use the heaven image: place your image at /public/heaven.webp
 */

import { useEffect, useRef, useState } from "react";

const TRIGGER_PX = 90; // how far down to pull before revealing
const HOLD_MS    = 2800; // how long to hold after finger lifts

export function HeavenEasterEgg() {
  const [visible, setVisible]     = useState(false);
  const [opacity, setOpacity]     = useState(0);
  const touchStartY               = useRef<number | null>(null);
  const pulling                   = useRef(false);
  const holdTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgExists                 = useRef<boolean | null>(null);

  // Check once whether /heaven.webp exists
  useEffect(() => {
    const img = new Image();
    img.onload  = () => { imgExists.current = true; };
    img.onerror = () => { imgExists.current = false; };
    img.src = "/heaven.webp";
  }, []);

  const reveal = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setVisible(true);
    // Slight delay so DOM paints before fade-in
    requestAnimationFrame(() => requestAnimationFrame(() => setOpacity(1)));
  };

  const dismiss = () => {
    setOpacity(0);
    holdTimer.current = setTimeout(() => setVisible(false), 600);
  };

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only trigger when scrolled to very top
      if (window.scrollY > 4) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      if (window.scrollY > 4) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta >= TRIGGER_PX && !pulling.current) {
        pulling.current = true;
        reveal();
      }
    };

    const onTouchEnd = () => {
      touchStartY.current = null;
      if (pulling.current) {
        pulling.current = false;
        // Hold briefly so it doesn't feel like a flash, then fade
        holdTimer.current = setTimeout(dismiss, HOLD_MS);
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Background — image if available, else golden light gradient */}
      {imgExists.current ? (
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
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255,220,120,0.95) 0%, rgba(255,180,60,0.85) 25%, rgba(200,130,30,0.75) 50%, rgba(60,30,10,0.95) 100%)",
          }}
        />
      )}

      {/* Light bloom at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          height: "55%",
          background:
            "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(255,245,200,0.70) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Dark scrim at bottom so text reads */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "45%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Text */}
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
            textShadow: "0 2px 20px rgba(0,0,0,0.60)",
          }}
        >
          "He has gone to prepare a place for you."
        </p>
        <p
          style={{
            fontSize: "0.78rem",
            fontFamily: "var(--font-serif, Georgia, serif)",
            color: "rgba(255,220,120,0.85)",
            letterSpacing: "0.06em",
            textShadow: "0 1px 8px rgba(0,0,0,0.55)",
          }}
        >
          John 14:2
        </p>
      </div>
    </div>
  );
}
