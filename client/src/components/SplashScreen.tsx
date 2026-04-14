import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPLASH_KEY = "sp_splash_shown";

export function shouldShowSplash(): boolean {
  return !sessionStorage.getItem(SPLASH_KEY);
}

export function recordSplashShown(): void {
  sessionStorage.setItem(SPLASH_KEY, "1");
}

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    recordSplashShown();
    // Hold for 3s then fade out
    const holdTimer = setTimeout(() => setPhase("out"), 3000);
    return () => clearTimeout(holdTimer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {phase !== "out" && (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(160deg, #1e0d50 0%, #130636 45%, #09031e 100%)",
          }}
        >
          {/* Radial glow behind icon */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 65% 50% at 50% 42%, rgba(110,50,220,0.45) 0%, rgba(80,20,180,0.18) 50%, transparent 75%)",
            }}
          />

          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            {/* App icon */}
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: 24,
                background: "linear-gradient(145deg, #7c3aed 0%, #5b21b6 100%)",
                boxShadow:
                  "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.13), 0 0 60px rgba(120,60,230,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src="/sp-icon.png"
                alt="Shepherd's Path"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Title */}
            <motion.h1
              className="mt-6 text-[28px] font-extrabold text-white tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Shepherd&rsquo;s Path
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="mt-2 text-white/60 text-[15px] tracking-wide"
              style={{ fontFamily: "var(--font-decorative)", fontStyle: "italic" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Scripture for what you&rsquo;re going through
            </motion.p>
          </motion.div>

          {/* Subtle pulsing dot indicator at bottom */}
          <motion.div
            className="absolute bottom-14 flex gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="rounded-full bg-white/30"
                style={{ width: 6, height: 6 }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
