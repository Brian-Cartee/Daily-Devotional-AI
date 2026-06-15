import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { saveRhythm } from "@/lib/faithRhythm";
import { markThresholdComplete } from "@/lib/thresholdState";
import { subscribePush, isPushSupported } from "@/lib/push";
import { getUserTimezone } from "@/lib/timezone";
import { getRhythmReminderPreset, formatReminderTime } from "@/lib/rhythmReminders";
import { isNativeWebViewShell, isIOS } from "@/lib/platform";
import { APP_STORE_URL } from "@/components/ExternalPromoLinks";

// ─── Data ───────────────────────────────────────────────────────────────────

type Burden = "lost" | "hard-season" | "grow-deeper" | "peace" | "coming-back" | "grateful";
type HelpMode = "verse" | "prayer" | "conversation" | "stillness";
type TimeOfDay = "morning" | "midday" | "evening";

const BURDENS: Array<{ id: Burden; label: string; sub: string; emoji: string }> = [
  { id: "lost",        label: "Finding my way",           sub: "I'm not sure where I stand with God",   emoji: "🌱" },
  { id: "hard-season", label: "Going through something",  sub: "Life feels heavy right now",             emoji: "🕊️" },
  { id: "grow-deeper", label: "Ready to go deeper",       sub: "I want more than Sunday morning",        emoji: "📖" },
  { id: "peace",       label: "Seeking peace and rest",   sub: "My mind won't quiet down",               emoji: "🌊" },
  { id: "coming-back", label: "Coming back to faith",     sub: "I've been away for a while",             emoji: "✨" },
  { id: "grateful",    label: "Grateful and open",        sub: "God has been faithful — I want to grow", emoji: "🙏" },
];

const HELP_MODES: Array<{ id: HelpMode; label: string; desc: string }> = [
  { id: "verse",        label: "A verse for this moment",      desc: "Something to anchor my heart today" },
  { id: "prayer",       label: "A guided prayer",              desc: "Help me find the words" },
  { id: "conversation", label: "Talk it through",              desc: "I need to process this out loud" },
  { id: "stillness",    label: "Just some stillness",          desc: "Be still with me" },
];

const TIME_OPTIONS: Array<{ id: TimeOfDay; label: string; sub: string; time: string }> = [
  { id: "morning",  label: "Morning",  sub: "Before the day begins",     time: "07:00" },
  { id: "midday",   label: "Midday",   sub: "A moment to reset",         time: "12:00" },
  { id: "evening",  label: "Evening",  sub: "At the end of the day",     time: "20:00" },
];

// Curated first moments — verse + short pastoral line, matched to burden
const FIRST_MOMENTS: Record<Burden, { verse: string; ref: string; reflection: string }> = {
  lost: {
    verse: "I will instruct you and teach you in the way you should go; I will counsel you with my loving eye on you.",
    ref: "Psalm 32:8",
    reflection: "You don't have to figure out the next ten steps. Just this one.",
  },
  "hard-season": {
    verse: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
    ref: "Psalm 34:18",
    reflection: "He doesn't wait for you to be okay. He comes to you in the middle of it.",
  },
  "grow-deeper": {
    verse: "Your word is a lamp for my feet, a light on my path.",
    ref: "Psalm 119:105",
    reflection: "The deeper you go into Scripture, the more you find it going deeper into you.",
  },
  peace: {
    verse: "He says, 'Be still, and know that I am God.'",
    ref: "Psalm 46:10",
    reflection: "The quieter you get, the more you realize He was never far.",
  },
  "coming-back": {
    verse: "Return to me, for I have redeemed you.",
    ref: "Isaiah 44:22",
    reflection: "There is no distance too far. The door is open — it has always been open.",
  },
  grateful: {
    verse: "Give thanks to the Lord, for he is good; his love endures forever.",
    ref: "Psalm 107:1",
    reflection: "Gratitude isn't the ceiling — it's the floor that everything else is built on.",
  },
};

// Map burden to season for FaithRhythm
const BURDEN_TO_SEASON: Record<Burden, "seeking" | "growing" | "hardship" | "deeper"> = {
  lost: "seeking",
  "coming-back": "seeking",
  "hard-season": "hardship",
  peace: "hardship",
  "grow-deeper": "deeper",
  grateful: "growing",
};

// Map timeOfDay to TimeSlot
const TIME_TO_SLOT: Record<TimeOfDay, "5min" | "15min" | "30min"> = {
  morning: "15min",
  midday: "5min",
  evening: "15min",
};

// ─── Component ───────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3; // burden → help → timing → moment

export default function StartPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>(0);
  const [burden, setBurden] = useState<Burden | null>(null);
  const [helpMode, setHelpMode] = useState<HelpMode | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(null);
  const [morningTime, setMorningTime] = useState("07:00");
  const [pushRequesting, setPushRequesting] = useState(false);
  const [pushDone, setPushDone] = useState(false);

  useEffect(() => {
    document.title = "Shepherd's Path — Walk with God, One Moment at a Time";
  }, []);

  // Auto-set morning time based on timeOfDay
  useEffect(() => {
    if (timeOfDay === "morning") setMorningTime("07:00");
    if (timeOfDay === "midday") setMorningTime("12:00");
    if (timeOfDay === "evening") setMorningTime("20:00");
  }, [timeOfDay]);

  const handleBurdenSelect = (b: Burden) => {
    setBurden(b);
    setStep(1);
  };

  const handleHelpSelect = (h: HelpMode) => {
    setHelpMode(h);
    setStep(2);
  };

  const handleTimeSelect = (t: TimeOfDay) => {
    setTimeOfDay(t);
    // Save rhythm immediately
    if (burden) {
      const season = BURDEN_TO_SEASON[burden];
      const slot = TIME_TO_SLOT[t];
      saveRhythm({ season, time: slot, focus: "peace", setAt: new Date().toISOString() });
    }
    setStep(3);
  };

  const handlePushOptIn = async () => {
    if (!isPushSupported() || pushDone) {
      enterApp();
      return;
    }
    setPushRequesting(true);
    const time = timeOfDay ?? "morning";
    const slot = TIME_TO_SLOT[time];
    const preset = getRhythmReminderPreset(slot, morningTime);
    // Always enable streak reminder for onboarding users — critical for Day 2 retention
    await subscribePush({ ...preset, streakReminder: true, timezone: getUserTimezone() });
    setPushRequesting(false);
    setPushDone(true);
    setTimeout(enterApp, 1000);
  };

  const enterApp = () => {
    // Mark welcomed + threshold complete so home screen knows onboarding is done
    try {
      localStorage.setItem("sp_welcomed", "1");
      // Save burden for personalized first-home greeting
      if (burden) localStorage.setItem("sp_start_burden", burden);
      if (helpMode) localStorage.setItem("sp_start_help_mode", helpMode);
    } catch {}
    // Mark threshold complete so user isn't bounced to /threshold
    markThresholdComplete();
    // Route to appropriate experience based on help mode
    if (helpMode === "conversation") {
      navigate("/talk-it-through");
    } else {
      navigate("/devotional");
    }
  };

  const moment = burden ? FIRST_MOMENTS[burden] : null;
  const inNativeApp = isNativeWebViewShell();
  const onIOS = isIOS();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(175deg, #1e0d50 0%, #130636 50%, #09031e 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Radial glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(110,50,220,0.22) 0%, transparent 70%)",
        }}
      />

      {/* Progress dots */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "center",
          gap: 6,
          paddingTop: "max(48px, env(safe-area-inset-top, 48px))",
          paddingBottom: 8,
        }}
      >
        {([0, 1, 2, 3] as Step[]).map((i) => (
          <div
            key={i}
            style={{
              height: 5,
              borderRadius: 99,
              background: i === step ? "rgba(255,255,255,0.85)" : i < step ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
              width: i === step ? 28 : 16,
              transition: "all 0.35s ease",
            }}
          />
        ))}
      </div>

      {/* Screens */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "24px 24px max(56px, calc(32px + env(safe-area-inset-bottom, 0px)))",
          maxWidth: 440,
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <AnimatePresence mode="wait">

          {/* SCREEN 1 — What are you carrying today? */}
          {step === 0 && (
            <motion.div
              key="burden"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                Step 1 of 4
              </p>
              <h1
                style={{
                  fontSize: "clamp(1.6rem, 7vw, 2rem)",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.96)",
                  lineHeight: 1.22,
                  margin: "0 0 8px",
                  fontFamily: "var(--font-serif, Georgia, serif)",
                }}
              >
                Walk with God, one moment at a time.
              </h1>
              <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.52)", marginBottom: 28, lineHeight: 1.5 }}>
                What are you carrying today?
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {BURDENS.map(({ id, label, sub, emoji }) => (
                  <button
                    key={id}
                    onClick={() => handleBurdenSelect(id)}
                    style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.11)",
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.90)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(122,1,141,0.22)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(180,80,220,0.35)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.11)";
                    }}
                  >
                    <span style={{ fontSize: "1.3rem", flexShrink: 0, marginTop: 1 }}>{emoji}</span>
                    <div>
                      <p style={{ fontSize: "0.975rem", fontWeight: 600, margin: "0 0 2px", color: "rgba(255,255,255,0.92)" }}>{label}</p>
                      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.42)", margin: 0 }}>{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCREEN 2 — What would help most right now? */}
          {step === 1 && (
            <motion.div
              key="help"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                Step 2 of 4
              </p>
              <h2
                style={{
                  fontSize: "clamp(1.4rem, 6vw, 1.75rem)",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.96)",
                  lineHeight: 1.25,
                  margin: "0 0 8px",
                  fontFamily: "var(--font-serif, Georgia, serif)",
                }}
              >
                What would help most right now?
              </h2>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.46)", marginBottom: 28 }}>
                No wrong answer here.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {HELP_MODES.map(({ id, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => handleHelpSelect(id)}
                    style={{
                      textAlign: "left",
                      padding: "16px 18px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.11)",
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.90)",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(122,1,141,0.22)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(180,80,220,0.35)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.11)";
                    }}
                  >
                    <p style={{ fontSize: "0.975rem", fontWeight: 600, margin: "0 0 3px", color: "rgba(255,255,255,0.92)" }}>{label}</p>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.42)", margin: 0 }}>{desc}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(0)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.32)", fontSize: "0.8rem", cursor: "pointer", marginTop: 20, padding: "8px 0", textAlign: "left" }}
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* SCREEN 3 — When do you need God's Word? */}
          {step === 2 && (
            <motion.div
              key="timing"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                Step 3 of 4
              </p>
              <h2
                style={{
                  fontSize: "clamp(1.4rem, 6vw, 1.75rem)",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.96)",
                  lineHeight: 1.25,
                  margin: "0 0 8px",
                  fontFamily: "var(--font-serif, Georgia, serif)",
                }}
              >
                When do you need God's Word?
              </h2>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.46)", marginBottom: 28 }}>
                We'll send you a quiet reminder at the right moment.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {TIME_OPTIONS.map(({ id, label, sub }) => (
                  <button
                    key={id}
                    onClick={() => handleTimeSelect(id)}
                    style={{
                      textAlign: "left",
                      padding: "16px 18px",
                      borderRadius: 14,
                      border: `1px solid ${timeOfDay === id ? "rgba(180,80,220,0.5)" : "rgba(255,255,255,0.11)"}`,
                      background: timeOfDay === id ? "rgba(122,1,141,0.25)" : "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.90)",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <p style={{ fontSize: "0.975rem", fontWeight: 600, margin: "0 0 3px", color: "rgba(255,255,255,0.92)" }}>{label}</p>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.42)", margin: 0 }}>{sub}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.32)", fontSize: "0.8rem", cursor: "pointer", marginTop: 4, padding: "8px 0", textAlign: "left" }}
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* SCREEN 4 — Your first moment */}
          {step === 3 && moment && (
            <motion.div
              key="moment"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                Step 4 of 4
              </p>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginBottom: 20, fontStyle: "italic" }}>
                A word for you today —
              </p>

              {/* Verse card */}
              <div
                style={{
                  borderRadius: 20,
                  padding: "24px 22px",
                  marginBottom: 20,
                  background: "linear-gradient(160deg, rgba(122,1,141,0.28) 0%, rgba(68,47,116,0.22) 100%)",
                  border: "1px solid rgba(180,80,220,0.20)",
                }}
              >
                <p
                  style={{
                    fontSize: "1.15rem",
                    fontFamily: "var(--font-serif, Georgia, serif)",
                    color: "rgba(255,255,255,0.93)",
                    lineHeight: 1.6,
                    margin: "0 0 14px",
                    fontStyle: "italic",
                  }}
                >
                  "{moment.verse}"
                </p>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "rgba(212,175,114,0.85)",
                    margin: "0 0 16px",
                    fontFamily: "var(--font-serif, Georgia, serif)",
                  }}
                >
                  — {moment.ref}
                </p>
                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.10)",
                    paddingTop: 14,
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "rgba(255,255,255,0.62)",
                      lineHeight: 1.55,
                      margin: 0,
                      fontStyle: "italic",
                    }}
                  >
                    {moment.reflection}
                  </p>
                </div>
              </div>

              {/* Push opt-in — primary CTA */}
              {isPushSupported() && !pushDone && (
                <button
                  onClick={() => void handlePushOptIn()}
                  disabled={pushRequesting}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    borderRadius: 16,
                    border: "none",
                    background: "linear-gradient(135deg, #7A018D, #442f74)",
                    color: "#fff",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: pushRequesting ? "not-allowed" : "pointer",
                    opacity: pushRequesting ? 0.75 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 8px 32px rgba(122,1,141,0.35)",
                    marginBottom: 10,
                    transition: "opacity 0.2s",
                  }}
                >
                  <Bell style={{ width: 17, height: 17 }} />
                  {pushRequesting ? "Setting up…" : "Send me daily Scripture"}
                </button>
              )}

              {pushDone && (
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.28)",
                    color: "rgba(110,231,183,0.92)",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    textAlign: "center",
                    marginBottom: 10,
                  }}
                >
                  ✓ You'll hear from us at {formatReminderTime(morningTime)}
                </div>
              )}

              {/* App Store badge — iOS only when not already in native */}
              {onIOS && !inNativeApp && (
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}
                >
                  <img
                    src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/white/en-us?size=250x83"
                    alt="Download on the App Store"
                    style={{ height: 44, width: "auto" }}
                  />
                </a>
              )}

              {/* Enter the app */}
              <button
                onClick={enterApp}
                style={{
                  width: "100%",
                  padding: "15px 20px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.88)",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 20,
                  transition: "background 0.18s ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
              >
                Begin your walk <ArrowRight style={{ width: 16, height: 16 }} />
              </button>

              {/* Trust line */}
              <p style={{ textAlign: "center", fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.5 }}>
                Scripture &amp; prayer stay free. No paywall to pray.
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
