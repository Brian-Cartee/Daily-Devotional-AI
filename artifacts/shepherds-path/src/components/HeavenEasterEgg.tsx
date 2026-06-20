/**
 * HeavenEasterEgg — pull down from the top of any page to reveal a glimpse of heaven.
 *
 * Works everywhere in the app (home, brand splash, devotional, etc.) except /start and /threshold.
 * Pull 90px+ from the very top → heaven image + John 14:2 → holds 2.8s → fades out.
 *
 * iOS black rubber-band fix: set <html> background gold on touchstart so the
 * native overscroll area shows gold instead of black before our overlay appears.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const TRIGGER_PX = 90;
const HOLD_MS    = 2800;

// Pages where the easter egg must not appear
const BLOCKED_ROUTES = new Set(["/start", "/threshold"]);

function getScrollY(): number {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

function setHtmlBg(gold: boolean) {
  document.documentElement.style.backgroundColor = gold ? "#7a5c1e" : "";
}

export function HeavenEasterEgg() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity]  = useState(0);
  const touchStartY = useRef<number | null>(null);
  const triggered   = useRef(false);
  const holdTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef  = useRef(false);
  const blocked     = useRef(false); // tracks whether current route is blocked

  // Keep blocked ref in sync with route
  useEffect(() => {
    blocked.current = BLOCKED_ROUTES.has(location);
    // If we navigate away from a blocked page while egg is showing, clean up
    if (!blocked.current) return;
    setHtmlBg(false);
    setOpacity(0);
    visibleRef.current = false;
    setVisible(false);
    triggered.current = false;
    touchStartY.current = null;
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, [location]);

  const reveal = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    visibleRef.current = true;
    setVisible(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setOpacity(1)));
  };

  const dismiss = () => {
    setOpacity(0);
    holdTimer.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
      setHtmlBg(false); // remove gold only after fade completes — never flash black
    }, 650);
  };

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (blocked.current) return;
      if (getScrollY() > 20) return;
      touchStartY.current = e.touches[0].clientY;
      triggered.current = false;
      setHtmlBg(true); // go gold instantly — covers native iOS black rubber-band
    };

    const onTouchMove = (e: TouchEvent) => {
      if (blocked.current) return;
      if (touchStartY.current === null) return;
      // Don't re-check scrollY here — it fluctuates during iOS rubber-band pull
      // and would kill the trigger mid-gesture. scrollY was already validated at touchstart.
      const delta = e.touches[0].clientY - touchStartY.current;

      if (delta >= TRIGGER_PX && !triggered.current) {
        triggered.current = true;
        reveal();
      }
    };

    const onTouchEnd = () => {
      if (blocked.current) {
        touchStartY.current = null;
        setHtmlBg(false);
        return;
      }
      touchStartY.current = null;
      if (triggered.current) {
        triggered.current = false;
        holdTimer.current = setTimeout(dismiss, HOLD_MS);
      } else {
        // Short pull — reset without showing
        visibleRef.current = false;
        setVisible(false);
        setOpacity(0);
        setHtmlBg(false);
      }
    };

    const lockScroll = (e: TouchEvent) => {
      if (visibleRef.current) e.preventDefault();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove",  onTouchMove,  { passive: true });
    document.addEventListener("touchmove",  lockScroll,   { passive: false });
    document.addEventListener("touchend",   onTouchEnd,   { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove",  onTouchMove);
      document.removeEventListener("touchmove",  lockScroll);
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
        zIndex: 100001,
        opacity,
        transition: "opacity 0.55s ease",
        // pointerEvents ACTIVE — blocks touches so nothing underneath is tapped
        pointerEvents: "all",
        background: "rgba(90,50,10,1)", // rich amber fallback — never black
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
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

      {/* Light bloom */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", height: "55%", pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(255,245,200,0.65) 0%, transparent 70%)",
      }} />

      {/* Bottom scrim for text legibility */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", pointerEvents: "none",
        background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)",
      }} />

      {/* Scripture */}
      <div style={{
        position: "relative", zIndex: 1, textAlign: "center", padding: "0 32px",
        marginTop: "auto",
        paddingBottom: "max(72px, calc(48px + env(safe-area-inset-bottom, 0px)))",
      }}>
        <p style={{
          fontSize: "clamp(1.15rem, 5vw, 1.5rem)",
          fontFamily: "var(--font-serif, Georgia, serif)",
          fontStyle: "italic",
          color: "rgba(255,255,255,0.95)",
          lineHeight: 1.55,
          margin: "0 0 14px",
          textShadow: "0 2px 20px rgba(0,0,0,0.65)",
        }}>
          "He has gone to prepare a place for you."
        </p>
        <p style={{
          fontSize: "0.78rem",
          fontFamily: "var(--font-serif, Georgia, serif)",
          color: "rgba(255,220,120,0.90)",
          letterSpacing: "0.06em",
          textShadow: "0 1px 8px rgba(0,0,0,0.60)",
        }}>
          John 14:2
        </p>
      </div>
    </div>
  );
}
