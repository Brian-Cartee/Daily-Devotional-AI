/**
 * BeginTodaysWalk — first-home overlay for users who came through /start onboarding.
 * Shows once, acknowledges their burden, points to today's devotional.
 */

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const SHOWN_KEY = "sp_begin_walk_shown";

export function hasShownBeginWalk(): boolean {
  try { return localStorage.getItem(SHOWN_KEY) === "1"; } catch { return false; }
}

export function markBeginWalkShown(): void {
  try { localStorage.setItem(SHOWN_KEY, "1"); } catch {}
}

function getBurdenLine(burden: string | null): string {
  switch (burden) {
    case "lost":           return "You said you're finding your way. That's exactly where this begins.";
    case "hard-season":    return "You said life feels heavy. You don't have to carry it alone today.";
    case "grow-deeper":    return "You said you're ready to go deeper. God meets you there.";
    case "peace":          return "You said you need peace. Let's start there — quietly, together.";
    case "coming-back":    return "You said you're coming back. The door has been open the whole time.";
    case "grateful":       return "You said you're grateful and open. That's a beautiful place to begin.";
    default:               return "Your walk begins here — one moment, one day at a time.";
  }
}

interface Props {
  onEnter: () => void;
}

export function BeginTodaysWalk({ onEnter }: Props) {
  const burden = (() => { try { return localStorage.getItem("sp_start_burden"); } catch { return null; } })();

  const handleEnter = () => {
    markBeginWalkShown();
    onEnter();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between"
      style={{ background: "linear-gradient(175deg, #1e0d50 0%, #130636 55%, #09031e 100%)" }}
    >
      {/* Radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 45% at 50% 30%, rgba(110,50,220,0.22) 0%, transparent 70%)",
        }}
      />

      {/* Hero image — top portion */}
      <div className="absolute top-0 left-0 right-0 h-[42vh] overflow-hidden">
        <img
          src="/hero-landing.webp"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ opacity: 0.85 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(13,10,26,0.05) 0%, rgba(13,10,26,0.0) 35%, rgba(13,10,26,0.7) 80%, rgba(13,10,26,1) 100%)",
          }}
        />
        <p className="absolute bottom-4 left-0 right-0 text-center text-white/40 text-[9px] tracking-[0.3em] uppercase font-medium">
          Shepherd's Path
        </p>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 w-full max-w-sm mx-auto px-7 justify-end pb-16"
        style={{ paddingBottom: "max(56px, calc(36px + env(safe-area-inset-bottom, 0px)))" }}
      >
        {/* Spacer for hero image */}
        <div style={{ height: "38vh" }} />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col items-center text-center gap-5"
        >
          <div>
            <h1
              className="text-white text-2xl font-light leading-snug mb-3"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              Your walk begins today.
            </h1>
            <p className="text-white/55 text-sm leading-relaxed">
              {getBurdenLine(burden)}
            </p>
          </div>

          <button
            onClick={handleEnter}
            className="w-full py-4 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #7A018D, #442f74)",
              boxShadow: "0 8px 32px rgba(122,1,141,0.38)",
            }}
          >
            Open today's devotional <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-white/28 text-xs">
            Walk with God, one moment at a time.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
