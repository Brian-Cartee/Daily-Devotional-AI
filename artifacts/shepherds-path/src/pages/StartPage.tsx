import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { saveRhythm } from "@/lib/faithRhythm";
import { markThresholdComplete } from "@/lib/thresholdState";
import { setUserNameAsync, markNamePrompted } from "@/lib/userName";
import { fireHaptic } from "@/lib/haptics";

// ─── Animation ───────────────────────────────────────────────────────────────

const FADE_INITIAL    = { opacity: 0, y: 10 } as const;
const FADE_ANIMATE    = { opacity: 1, y: 0  } as const;
const FADE_EXIT       = { opacity: 0, y: -8 } as const;
const FADE_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

type Step = "hero" | "name";

// ─── Component ───────────────────────────────────────────────────────────────

export default function StartPage() {
  const [, navigate] = useLocation();
  const [step, setStep]           = useState<Step>("hero");
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    document.title = "Shepherd's Path — Walk with God, One Moment at a Time";
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNameContinue = async () => {
    const trimmed = nameInput.trim();
    fireHaptic("soft");
    if (trimmed) {
      await setUserNameAsync(trimmed);
    } else {
      markNamePrompted();
    }
    enterApp();
  };

  const enterApp = () => {
    try {
      localStorage.setItem("sp_welcomed", "1");
    } catch {}

    saveRhythm({
      season: "seeking",
      time:   "15min",
      focus:  "peace",
      setAt:  new Date().toISOString(),
    });

    markThresholdComplete();
    navigate("/");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#09031e",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── SCREEN 1: Hero — full-bleed road photo ──────────────────────── */}
      {step === "hero" && (
        <motion.div
          key="hero-photo"
          initial={FADE_INITIAL} animate={FADE_ANIMATE} exit={FADE_EXIT} transition={FADE_TRANSITION}
          style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column" }}
        >
          {/* Road photo */}
          <img
            src="/hero-landing.webp"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 30%",
            }}
          />

          {/* Warm dark gradient — lighter at top, amber-dark at bottom */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.20) 40%, rgba(20,10,4,0.78) 75%, rgba(30,15,5,0.97) 100%)",
            }}
          />

          {/* Content */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding:
                "max(52px, env(safe-area-inset-top, 52px)) 28px max(48px, calc(36px + env(safe-area-inset-bottom, 0px)))",
              maxWidth: 420,
              width: "100%",
              margin: "0 auto",
              boxSizing: "border-box",
            }}
          >
            {/* Top — breathe */}
            <div />

            {/* Bottom — headline + CTA */}
            <div>
              <h1
                style={{
                  fontSize: "clamp(2rem, 8vw, 2.6rem)",
                  fontWeight: 500,
                  fontFamily: "var(--font-serif, Georgia, serif)",
                  color: "rgba(255,255,255,0.96)",
                  lineHeight: 1.22,
                  margin: "0 0 24px",
                  letterSpacing: "-0.01em",
                  textShadow: "0 2px 16px rgba(0,0,0,0.55)",
                }}
              >
                Walk with God,<br />one moment<br />at a time.
              </h1>

              <button
                type="button"
                onClick={() => {
                  fireHaptic("soft");
                  setStep("name");
                }}
                style={{
                  width: "100%",
                  padding: "18px 24px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.18)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.38)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.22)";
                }}
              >
                Step inside
              </button>

              <p
                style={{
                  textAlign: "center",
                  fontSize: "0.68rem",
                  color: "rgba(255,255,255,0.22)",
                  marginTop: 16,
                  lineHeight: 1.5,
                }}
              >
                Always free. No account. Just you and God.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── SCREEN 2: Name ──────────────────────────────────────────────── */}
      {step === "name" && (
        <>
          {/* Dark gradient bg */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              background: "linear-gradient(175deg, #1e0d50 0%, #130636 50%, #09031e 100%)",
            }}
          />

          <motion.div
            key="name"
            initial={FADE_INITIAL} animate={FADE_ANIMATE} exit={FADE_EXIT} transition={FADE_TRANSITION}
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding:
                "max(52px, env(safe-area-inset-top, 52px)) 28px max(48px, calc(32px + env(safe-area-inset-bottom, 0px)))",
              maxWidth: 420,
              width: "100%",
              margin: "0 auto",
              boxSizing: "border-box",
            }}
          >
            <p
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)",
                margin: "0 0 36px",
              }}
            >
              Shepherd's Path
            </p>

            <h2
              style={{
                fontSize: "clamp(1.3rem, 5.5vw, 1.6rem)",
                fontWeight: 400,
                fontFamily: "var(--font-serif, Georgia, serif)",
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.35,
                margin: "0 0 8px",
              }}
            >
              What can I call you?
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "rgba(255,255,255,0.32)",
                margin: "0 0 36px",
                lineHeight: 1.5,
              }}
            >
              Optional — for prayer and reflection.
            </p>

            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleNameContinue()}
              placeholder="Your first name"
              autoComplete="given-name"
              autoFocus
              aria-label="Your first name"
              style={{
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                backgroundColor: "rgba(255,255,255,0.05)",
                padding: "16px 18px",
                fontSize: "16px",
                color: "#ffffff",
                outline: "none",
                marginBottom: 14,
                transition: "border-color 0.18s",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.30)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.14)";
              }}
            />

            <button
              type="button"
              onClick={() => void handleNameContinue()}
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.88)",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.02em",
                marginBottom: 8,
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.30)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.18)";
              }}
            >
              Continue
            </button>

            <button
              type="button"
              onClick={() => {
                markNamePrompted();
                enterApp();
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "12px 0",
                textAlign: "center",
                fontSize: "0.78rem",
                color: "rgba(255,255,255,0.28)",
                transition: "color 0.18s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.50)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)";
              }}
            >
              Continue without
            </button>
          </motion.div>
        </>
      )}

      {/* AnimatePresence wrapper for crossfades */}
      <AnimatePresence mode="wait" />
    </div>
  );
}
