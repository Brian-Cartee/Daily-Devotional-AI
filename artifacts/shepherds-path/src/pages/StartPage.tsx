import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useLocation } from "wouter";
import { saveRhythm } from "@/lib/faithRhythm";
import { markThresholdComplete } from "@/lib/thresholdState";
import { subscribePush, isPushSupported } from "@/lib/push";
import { getUserTimezone } from "@/lib/timezone";
import { getRhythmReminderPreset } from "@/lib/rhythmReminders";
import { setUserNameAsync, markNamePrompted } from "@/lib/userName";
import { fireHaptic } from "@/lib/haptics";

// ─── Types ───────────────────────────────────────────────────────────────────

type Mood = "carrying" | "quiet" | "grateful" | "exploring";
type Step = "hero" | "mood" | "name" | "push";

// Maps new mood options to existing burden values the rest of the app understands
const MOOD_TO_BURDEN: Record<Mood, string> = {
  carrying: "hard-season",
  quiet:    "peace",
  grateful: "grateful",
  exploring: "lost",
};

// ─── Mood Options ─────────────────────────────────────────────────────────────

const MOOD_OPTIONS: Array<{ id: Mood; label: string; sub: string }> = [
  { id: "carrying",  label: "CARRYING SOMETHING",   sub: "Help me with what I'm holding."      },
  { id: "quiet",     label: "QUIET",                 sub: "I just need to slow down."           },
  { id: "grateful",  label: "GRATEFUL",              sub: "I want to rest in what's good."      },
];

// ─── Animation ───────────────────────────────────────────────────────────────

const FADE_INITIAL    = { opacity: 0, y: 10 } as const;
const FADE_ANIMATE    = { opacity: 1, y: 0  } as const;
const FADE_EXIT       = { opacity: 0, y: -8 } as const;
const FADE_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

// ─── Component ───────────────────────────────────────────────────────────────

export default function StartPage() {
  const [, navigate] = useLocation();
  const [step, setStep]         = useState<Step>("hero");
  const [mood, setMood]         = useState<Mood | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [pushRequesting, setPushRequesting] = useState(false);
  const [pushDone, setPushDone] = useState(false);

  useEffect(() => {
    document.title = "Shepherd's Path — Walk with God, One Moment at a Time";
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMoodSelect = (m: Mood) => {
    fireHaptic("soft");
    setMood(m);
    setStep("name");
  };

  const handleExploring = () => {
    fireHaptic("soft");
    setMood("exploring");
    setStep("name");
  };

  const handleNameContinue = async () => {
    const trimmed = nameInput.trim();
    fireHaptic("soft");
    if (trimmed) {
      await setUserNameAsync(trimmed);
    } else {
      markNamePrompted();
    }
    setStep("push");
  };

  const handleSkipName = () => {
    fireHaptic("soft");
    markNamePrompted();
    setStep("push");
  };

  const handlePushOptIn = async () => {
    if (!isPushSupported() || pushDone) {
      enterApp();
      return;
    }
    setPushRequesting(true);
    const preset = getRhythmReminderPreset("15min", "07:00");
    await subscribePush({ ...preset, streakReminder: true, timezone: getUserTimezone() });
    setPushRequesting(false);
    setPushDone(true);
    setTimeout(enterApp, 900);
  };

  const enterApp = () => {
    try {
      localStorage.setItem("sp_welcomed", "1");
      if (mood) {
        localStorage.setItem("sp_start_burden", MOOD_TO_BURDEN[mood]);
      }
    } catch {}

    // Save a default rhythm so the rest of the app has context
    saveRhythm({
      season: mood === "carrying" ? "hardship" : mood === "grateful" ? "growing" : "seeking",
      time:   "15min",
      focus:  "peace",
      setAt:  new Date().toISOString(),
    });

    markThresholdComplete();
    navigate("/devotional");
  };

  // ─── Shared background ────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#09031e",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── SCREEN 1: Hero — full-bleed photo ─────────────────────────────── */}
      {step === "hero" && (
        <motion.div
          key="hero-photo"
          initial={FADE_INITIAL} animate={FADE_ANIMATE} exit={FADE_EXIT} transition={FADE_TRANSITION}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
          }}
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

          {/* Dark gradient — heavier at bottom so CTA reads clean */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.72) 75%, rgba(9,3,30,0.97) 100%)",
            }}
          />

          {/* Content layer */}
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
            {/* Top spacer — photo breathes here */}
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
                  setStep("mood");
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
                Scripture &amp; prayer stay free. No paywall to pray.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Subsequent screens — deep dark bg */}
      <div
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
          // Hidden during hero screen — photo overlay handles that
          visibility: step === "hero" ? "hidden" : "visible",
        }}
      >
        {/* Dark gradient bg for post-hero screens */}
        {step !== "hero" && (
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: -1,
              background: "linear-gradient(175deg, #1e0d50 0%, #130636 50%, #09031e 100%)",
            }}
          />
        )}

        <AnimatePresence mode="wait">
          {/* hero AnimatePresence slot — empty, handled above */}
          {step === "hero" && <motion.div key="hero-placeholder" />}

          {/* ── SCREEN 2: Mood question ───────────────────────────────── */}
          {step === "mood" && (
            <motion.div
              key="mood"
              initial={FADE_INITIAL} animate={FADE_ANIMATE} exit={FADE_EXIT} transition={FADE_TRANSITION}
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
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
                How are you coming in today?
              </h2>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "rgba(255,255,255,0.32)",
                  margin: "0 0 36px",
                  lineHeight: 1.5,
                }}
              >
                No wrong answer.
              </p>

              {/* Mood cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {MOOD_OPTIONS.map(({ id, label, sub }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleMoodSelect(id)}
                    style={{
                      textAlign: "left",
                      padding: "20px 22px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      transition: "border-color 0.18s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.10)";
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.70)",
                        margin: "0 0 6px",
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        fontSize: "0.82rem",
                        color: "rgba(255,255,255,0.32)",
                        margin: 0,
                        lineHeight: 1.45,
                      }}
                    >
                      {sub}
                    </p>
                  </button>
                ))}

                {/* Ghost option */}
                <button
                  type="button"
                  onClick={handleExploring}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "14px 0 0",
                    textAlign: "center",
                    fontSize: "0.78rem",
                    color: "rgba(255,255,255,0.28)",
                    lineHeight: 1.5,
                    transition: "color 0.18s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.50)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.28)";
                  }}
                >
                  Just exploring for now
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SCREEN 3: Name ───────────────────────────────────────────── */}
          {step === "name" && (
            <motion.div
              key="name"
              initial={FADE_INITIAL} animate={FADE_ANIMATE} exit={FADE_EXIT} transition={FADE_TRANSITION}
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
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
                onClick={handleSkipName}
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
          )}

          {/* ── SCREEN 4: Push opt-in + Enter ────────────────────────────── */}
          {step === "push" && (
            <motion.div
              key="push"
              initial={FADE_INITIAL} animate={FADE_ANIMATE} exit={FADE_EXIT} transition={FADE_TRANSITION}
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
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

              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
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
                    A quiet reminder<br />can change a day.
                  </h2>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "rgba(255,255,255,0.32)",
                      margin: "0 0 36px",
                      lineHeight: 1.6,
                    }}
                  >
                    We'll send you one verse each morning. Nothing else.
                  </p>

                  {/* Verse preview */}
                  <div
                    style={{
                      padding: "20px 22px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      marginBottom: 32,
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.92rem",
                        fontFamily: "var(--font-serif, Georgia, serif)",
                        color: "rgba(255,255,255,0.72)",
                        lineHeight: 1.65,
                        fontStyle: "italic",
                        margin: "0 0 10px",
                      }}
                    >
                      "He himself is our peace."
                    </p>
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "rgba(212,175,114,0.65)",
                        margin: 0,
                        letterSpacing: "0.04em",
                      }}
                    >
                      Ephesians 2:14
                    </p>
                  </div>
                </div>

                <div>
                  {/* Push confirmed */}
                  {pushDone && (
                    <div
                      style={{
                        padding: "14px 18px",
                        borderRadius: 12,
                        background: "rgba(16,185,129,0.10)",
                        border: "1px solid rgba(16,185,129,0.22)",
                        color: "rgba(110,231,183,0.88)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        textAlign: "center",
                        marginBottom: 12,
                      }}
                    >
                      ✓ You'll hear from us each morning
                    </div>
                  )}

                  {/* Push CTA */}
                  {isPushSupported() && !pushDone && (
                    <button
                      type="button"
                      onClick={() => void handlePushOptIn()}
                      disabled={pushRequesting}
                      style={{
                        width: "100%",
                        padding: "17px 24px",
                        borderRadius: 999,
                        border: "none",
                        background: "rgba(255,255,255,0.92)",
                        color: "#130636",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        cursor: pushRequesting ? "not-allowed" : "pointer",
                        opacity: pushRequesting ? 0.7 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginBottom: 12,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <Bell style={{ width: 15, height: 15 }} />
                      {pushRequesting ? "Setting up…" : "Send me a daily verse"}
                    </button>
                  )}

                  {/* Enter */}
                  <button
                    type="button"
                    onClick={enterApp}
                    style={{
                      width: "100%",
                      padding: "16px 24px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.50)",
                      fontSize: "0.88rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      letterSpacing: "0.02em",
                      transition: "color 0.18s, border-color 0.18s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.80)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.28)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.50)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.14)";
                    }}
                  >
                    {isPushSupported() && !pushDone ? "Maybe later — enter the app" : "Begin your walk"}
                  </button>

                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "0.68rem",
                      color: "rgba(255,255,255,0.18)",
                      marginTop: 16,
                      lineHeight: 1.5,
                    }}
                  >
                    Scripture &amp; prayer stay free. No paywall to pray.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
