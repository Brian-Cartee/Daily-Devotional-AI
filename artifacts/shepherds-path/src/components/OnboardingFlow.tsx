import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isIntroFlowComplete, isReturningHome, markIntroFlowComplete } from "@/lib/introState";

const ONBOARD_KEY = "sp_onboarding_shown";
const LAST_VISIT_KEY = "sp_last_visit_date";
const INACTIVITY_DAYS = 30;

const SCREENS = [
  "This isn't another Bible app.",
  "You don't have to know what to say.",
  "You don't have to have it together.",
  "You just have to be honest.",
  "When you share what's on your mind, Scripture meets you in it.",
];

const FINAL = "Say what's actually on your mind.";

const SCREEN_VISIBLE_MS = 2600;
const FADE_MS = 650;

export function shouldShowOnboarding(): boolean {
  if (isReturningHome() || isIntroFlowComplete()) return false;
  const lastShown = localStorage.getItem(ONBOARD_KEY);
  if (!lastShown) return true;
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  if (!lastVisit) return false;
  const daysSinceVisit =
    (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceVisit >= INACTIVITY_DAYS;
}

export function markOnboardingShown(): void {
  localStorage.setItem(ONBOARD_KEY, new Date().toISOString().split("T")[0]);
  markIntroFlowComplete();
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [screenIndex, setScreenIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [onFinal, setOnFinal] = useState(false);
  const [finalVisible, setFinalVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalHapticFired = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const advanceTo = (nextIndex: number) => {
    clearTimer();
    setVisible(false);
    timerRef.current = setTimeout(() => {
      if (nextIndex >= SCREENS.length) {
        setOnFinal(true);
        setTimeout(() => setFinalVisible(true), 80);
        if (!finalHapticFired.current) {
          finalHapticFired.current = true;
          try { navigator.vibrate?.(50); } catch { /* noop */ }
        }
      } else {
        setScreenIndex(nextIndex);
        setVisible(true);
        scheduleAdvance(nextIndex);
      }
    }, FADE_MS);
  };

  const scheduleAdvance = (idx: number) => {
    clearTimer();
    timerRef.current = setTimeout(() => advanceTo(idx + 1), SCREEN_VISIBLE_MS);
  };

  useEffect(() => {
    scheduleAdvance(0);
    return clearTimer;
  }, []);

  const handleSkip = () => {
    clearTimer();
    setVisible(false);
    setTimeout(() => {
      setOnFinal(true);
      setTimeout(() => setFinalVisible(true), 80);
      if (!finalHapticFired.current) {
        finalHapticFired.current = true;
        try { navigator.vibrate?.(50); } catch { /* noop */ }
      }
    }, FADE_MS);
  };

  const handleBegin = () => {
    markOnboardingShown();
    onComplete();
  };

  const showSkip = screenIndex >= 2;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden select-none"
      style={{
        background: [
          "radial-gradient(ellipse 75% 65% at 62% 52%, rgba(148,12,188,0.46) 0%, transparent 62%)",
          "radial-gradient(ellipse 52% 48% at 22% 28%, rgba(80,32,162,0.32) 0%, transparent 62%)",
          "radial-gradient(ellipse at 50% -8%, rgba(255,255,255,0.11) 0%, transparent 48%)",
          "linear-gradient(158deg, #5c1e98 0%, #390f70 42%, #130635 100%)",
        ].join(", "),
      }}
    >
      {/* App name — top center */}
      <p
        className="absolute top-0 left-0 right-0 text-center z-10 text-[11px] font-semibold tracking-[0.26em] uppercase pt-14"
        style={{ color: "rgba(255,255,255,0.52)" }}
      >
        Shepherd&rsquo;s Path
      </p>

      {/* Progress dots */}
      <div className="absolute top-0 left-0 right-0 flex justify-center gap-1.5 pt-[84px] pointer-events-none z-10">
        {SCREENS.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{ height: 3 }}
            animate={{
              width: onFinal || i < screenIndex ? 20 : i === screenIndex ? 20 : 6,
              background:
                onFinal || i <= screenIndex
                  ? "rgba(255,255,255,0.75)"
                  : "rgba(255,255,255,0.22)",
            }}
            transition={{ duration: 0.35 }}
          />
        ))}
      </div>

      {/* Skip button — top right — visible from screen 3 onward */}
      <AnimatePresence>
        {showSkip && !onFinal && (
          <motion.button
            key="skip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={handleSkip}
            data-testid="button-onboarding-skip"
            className="absolute top-12 right-5 z-20 py-1.5 px-3 rounded-full text-[12px] font-medium"
            style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.08)" }}
          >
            Skip
          </motion.button>
        )}
      </AnimatePresence>

      {/* Story screens */}
      <AnimatePresence>
        {!onFinal && (
          <motion.div
            key="screens"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_MS / 1000 }}
            className="absolute inset-0 flex items-center justify-center px-9"
          >
            <AnimatePresence mode="wait">
              {visible && (
                <motion.p
                  key={screenIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: FADE_MS / 1000, ease: "easeInOut" }}
                  className="text-center leading-snug font-light"
                  style={{
                    fontFamily: "'Georgia', serif",
                    fontSize: "clamp(1.55rem, 5vw, 2rem)",
                    color: "rgba(255,255,255,0.95)",
                    textShadow: "0 2px 24px rgba(0,0,0,0.4)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {SCREENS[screenIndex]}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final screen */}
      <AnimatePresence>
        {onFinal && (
          <motion.div
            key="final"
            initial={{ opacity: 0 }}
            animate={{ opacity: finalVisible ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-9"
          >
            {/* Warm amber glow on final screen */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 55% 40% at 50% 50%, rgba(210,110,10,0.10) 0%, transparent 65%)",
              }}
            />

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: finalVisible ? 1 : 0, y: finalVisible ? 0 : 10 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="relative z-10 text-center leading-snug font-light mb-12"
              style={{
                fontFamily: "'Georgia', serif",
                fontSize: "clamp(1.55rem, 5vw, 2rem)",
                color: "rgba(255,255,255,0.97)",
                textShadow: "0 2px 28px rgba(0,0,0,0.4)",
                letterSpacing: "-0.01em",
              }}
            >
              {FINAL}
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: finalVisible ? 1 : 0, y: finalVisible ? 0 : 14 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              onClick={handleBegin}
              data-testid="button-onboarding-begin"
              className="relative z-10 px-10 py-4 rounded-2xl text-white font-semibold text-[16px] tracking-wide"
              style={{
                background: "linear-gradient(135deg, #7A018D 0%, #442f74 100%)",
                boxShadow:
                  "0 8px 36px rgba(122,1,141,0.45), 0 0 0 1px rgba(255,255,255,0.10)",
                minWidth: 180,
              }}
            >
              Begin
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle bottom attribution */}
      <p
        className="absolute bottom-8 left-0 right-0 text-center text-[11px] tracking-[0.16em] uppercase z-10"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        ✝ Rooted in Scripture
      </p>
    </div>
  );
}
