import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ThresholdBreath } from "@/components/threshold/ThresholdBreath";
import {
  isThresholdComplete,
  isThresholdReplay,
  markThresholdComplete,
  type ThresholdNeed,
} from "@/lib/thresholdState";
import {
  setUserNameAsync,
  markNamePrompted,
  getUserName,
  hasBeenPrompted,
  syncUserNameFromServer,
} from "@/lib/userName";
import { fireHaptic } from "@/lib/haptics";
import { getThresholdInteractionProfile } from "@/lib/thresholdModePlan";
import { isNativeWebViewShell } from "@/lib/platform";

type Step = "arrive" | "need" | "sync-name" | "name" | "breath" | "enter";

function initialThresholdStep(): Step {
  if (isNativeWebViewShell() && !isThresholdReplay()) return "need";
  return "arrive";
}

const NEED_OPTIONS: { id: ThresholdNeed; label: string; sub: string }[] = [
  { id: "peace", label: "Peace", sub: "Help me settle." },
  { id: "grief", label: "Grief", sub: "Help me carry this." },
  { id: "battle", label: "Battle", sub: "Help me stand." },
  { id: "stillness", label: "Stillness", sub: "Help me be quiet." },
  { id: "worship", label: "Worship", sub: "Help me adore." },
  { id: "deep-dive", label: "Go Deeper", sub: "Help me go deeper." },
  { id: "morning-surrender", label: "Morning Surrender", sub: "Help me begin." },
  { id: "night-prayer", label: "Night Prayer", sub: "Help me release today." },
  { id: "gratitude", label: "Gratitude", sub: "Help me remember." },
];

const TONE_CONFIRMATION_VERSES: Partial<
  Record<ThresholdNeed, { text: string; reference: string }>
> = {
  peace: { text: "He himself is our peace.", reference: "Ephesians 2:14" },
  grief: { text: "He heals the brokenhearted.", reference: "Psalm 147:3" },
  battle: { text: "The Lord will fight for you.", reference: "Exodus 14:14" },
  stillness: { text: "Be still, and know that I am God.", reference: "Psalm 46:10" },
  worship: { text: "Great is the Lord and worthy of praise.", reference: "Psalm 145:3" },
  "deep-dive": { text: "Your word is a lamp to my feet.", reference: "Psalm 119:105" },
  "morning-surrender": { text: "His mercies are new every morning.", reference: "Lamentations 3:23" },
  "night-prayer": { text: "He grants sleep to those he loves.", reference: "Psalm 127:2" },
  gratitude: { text: "In everything give thanks.", reference: "1 Thessalonians 5:18" },
};

export default function ThresholdArrivalPage() {
  const [, navigate] = useLocation();
  const nativeFastPath = isNativeWebViewShell() && !isThresholdReplay();
  const [step, setStep] = useState<Step>(initialThresholdStep);
  const [need, setNeed] = useState<ThresholdNeed | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [arriveReady, setArriveReady] = useState(false);
  const [nameKnown, setNameKnown] = useState(() => !!getUserName() || hasBeenPrompted());
  const [nameHydrated, setNameHydrated] = useState(() => !!getUserName() || hasBeenPrompted());
  const interaction = getThresholdInteractionProfile(need);

  useEffect(() => {
    if (!isThresholdReplay() && isThresholdComplete()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    void syncUserNameFromServer().then((name) => {
      if (!active) return;
      if (name || hasBeenPrompted()) setNameKnown(true);
      setNameHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (step !== "sync-name" || !nameHydrated) return;
    if (nativeFastPath) {
      setStep(nameKnown ? "enter" : "name");
      return;
    }
    setStep(nameKnown ? "breath" : "name");
  }, [step, nameHydrated, nameKnown, nativeFastPath]);

  useEffect(() => {
    if (step !== "arrive") return;
    const readyTimer = setTimeout(() => setArriveReady(true), 900);
    const autoTimer = setTimeout(() => setStep("need"), 4_000);
    return () => {
      clearTimeout(readyTimer);
      clearTimeout(autoTimer);
    };
  }, [step]);

  const finish = useCallback(() => {
    fireHaptic("medium");
    markThresholdComplete(need ?? undefined);
    navigate("/", { replace: true });
  }, [navigate, need]);

  const handleNeed = (n: ThresholdNeed) => {
    fireHaptic("soft");
    setNeed(n);
    if (nativeFastPath) {
      if (nameKnown) {
        setStep("enter");
        return;
      }
      if (!nameHydrated) {
        setStep("sync-name");
        return;
      }
      setStep("name");
      return;
    }
    if (nameKnown) {
      setStep("breath");
      return;
    }
    if (!nameHydrated) {
      setStep("sync-name");
      return;
    }
    setStep("name");
  };

  const modeLine = (() => {
    switch (need) {
      case "peace":
        return "Let your shoulders drop. We'll move softly.";
      case "grief":
        return "You don't have to carry this by yourself.";
      case "battle":
        return "You are not weak for needing help.";
      case "worship":
        return "Let's turn our attention toward God.";
      case "gratitude":
        return "Let's remember goodness and give thanks.";
      case "stillness":
        return "The quiet is enough. You can just breathe here.";
      case "deep-dive":
        return "Let's sit with Scripture until it speaks.";
      case "morning-surrender":
        return "A small yes is enough to begin the day.";
      case "night-prayer":
        return "You can release today into God's care.";
      case "honesty":
        return "Honesty is not failure. It's the door.";
      case "hope":
        return "Hope can be small. It still counts.";
      default:
        return "You're welcome here - exactly as you are.";
    }
  })();

  const defaultVisibleNeedIds: ThresholdNeed[] = [
    "peace",
    "grief",
    "battle",
    "stillness",
    "worship",
    "deep-dive",
    "morning-surrender",
    "night-prayer",
    "gratitude",
  ];
  const visibleModes = NEED_OPTIONS.filter((opt) => defaultVisibleNeedIds.includes(opt.id));
  const confirmationVerse = need ? TONE_CONFIRMATION_VERSES[need] : undefined;

  const handleNameContinue = async () => {
    const trimmed = nameInput.trim();
    fireHaptic("soft");
    if (trimmed) {
      await setUserNameAsync(trimmed);
      setNameKnown(true);
    } else {
      markNamePrompted();
      setNameKnown(true);
    }
    setStep(nativeFastPath ? "enter" : "breath");
  };

  const skipMotion = true;
  const fade = {
    initial: skipMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: skipMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 },
    transition: {
      duration: skipMotion ? 0.12 : interaction.settleFadeSeconds,
      ease: [0.22, 1, 0.36, 1],
    },
  };

  const innerWrapperStyle: CSSProperties =
    step === "need"
      ? {
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          width: "100%",
          height: "100%",
          paddingLeft: "24px",
          paddingRight: "24px",
          paddingTop: "max(2rem, env(safe-area-inset-top))",
          paddingBottom: "max(2.75rem, env(safe-area-inset-bottom))",
          boxSizing: "border-box",
        }
      : {
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          width: "100%",
          height: "100%",
          paddingLeft: "24px",
          paddingRight: "24px",
          paddingTop: "max(2rem, env(safe-area-inset-top))",
          paddingBottom: "max(2.75rem, env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          alignItems: "center",
          justifyContent: "center",
        };

  return (
    <div
      data-testid="threshold-arrival"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Shepherd's Path"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(175deg, #1e0d50 0%, #130636 45%, #09031e 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 70% 55% at 50% 38%, rgba(110,50,220,0.32) 0%, transparent 70%)",
        }}
      />

      <div style={innerWrapperStyle}>
        <p
          aria-live="polite"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            borderWidth: 0,
          }}
        >
          {step === "arrive"
            ? "Arrival screen. You don't have to be okay to come in."
            : step === "need"
                ? "Choose what you need right now."
                : step === "name"
                  ? "Optional name screen."
                  : step === "breath"
                    ? "Stillness screen."
                    : "Final welcome screen."}
        </p>
        <AnimatePresence mode="wait">
          {step === "arrive" && (
            <motion.div
              key="arrive"
              {...fade}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                width: "100%",
                maxWidth: "28rem",
              }}
            >
              <p
                style={{
                  fontSize: "clamp(1.35rem, 4.5vw, 1.5rem)",
                  lineHeight: 1.375,
                  color: "rgba(255,255,255,0.90)",
                  fontWeight: 500,
                  fontFamily: "var(--font-serif, Georgia, serif)",
                }}
              >
                You don&apos;t have to be okay to come in.
              </p>
              <p style={{ marginTop: "16px", fontSize: "14px", color: "rgba(255,255,255,0.52)", lineHeight: 1.625 }}>
                This is a quiet place. Nothing to prove.
              </p>
              <p style={{ marginTop: "12px", fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.625 }}>
                Whether you&apos;re carrying something heavy or walking steady — same path, your pace.
              </p>
              <p style={{ marginTop: "16px", fontSize: "14px", color: "rgba(255,255,255,0.52)", lineHeight: 1.625 }}>
                One step at a time. Scripture, prayer, stillness — without noise.
              </p>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "rgba(255,255,255,0.42)", lineHeight: 1.625 }}>
                No noise. No shame. No pressure.
              </p>
              {arriveReady && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  type="button"
                  data-testid="btn-threshold-arrive-continue"
                  onClick={() => {
                    fireHaptic("soft");
                    setStep("need");
                  }}
                  className="transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
                  style={{
                    marginTop: "40px",
                    minHeight: "44px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.65)",
                    padding: "10px 24px",
                    borderRadius: "9999px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                  }}
                >
                  Continue
                </motion.button>
              )}
            </motion.div>
          )}

          {step === "need" && (
            <motion.div key="need" {...fade} style={{ width: "100%", maxWidth: "384px", margin: "0 auto", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              {nativeFastPath && (
                <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.55)", marginBottom: "16px", lineHeight: 1.6, flexShrink: 0 }}>
                  Welcome to Shepherd&apos;s Path — steady or struggling, a quiet companion, not a performance.
                </p>
              )}
              <p style={{ textAlign: "center", fontSize: "1.1rem", color: "rgba(255,255,255,0.88)", fontWeight: 500, marginBottom: "8px", flexShrink: 0 }}>
                What do you need right now?
              </p>
              <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.48)", marginBottom: "20px", flexShrink: 0 }}>
                We&apos;ll shape today&apos;s tone — you can change it anytime.
              </p>
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  className="overflow-y-auto overscroll-y-contain"
                  data-testid="threshold-need-scroll"
                  style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "12px" }}>
                    {visibleModes.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`btn-threshold-need-${opt.id}`}
                        aria-label={`${opt.label}: ${opt.sub}`}
                        onClick={() => handleNeed(opt.id)}
                        className="transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          width: "100%",
                          minHeight: "56px",
                          padding: "14px 20px",
                          textAlign: "left",
                          backgroundColor: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "16px",
                        }}
                      >
                        <span style={{ display: "block", color: "rgba(255,255,255,0.92)", fontSize: "16px", fontWeight: 600, lineHeight: 1.3 }}>{opt.label}</span>
                        <span style={{ display: "block", color: "rgba(255,255,255,0.50)", fontSize: "13px", marginTop: "3px", lineHeight: 1.3 }}>{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: "52px",
                    pointerEvents: "none",
                    background:
                      "linear-gradient(to top, #09031e 0%, rgba(19,6,54,0.88) 40%, transparent 100%)",
                  }}
                />
              </div>
            </motion.div>
          )}

          {step === "name" && (
            <motion.div
              key="name"
              {...fade}
              style={{ width: "100%", maxWidth: "24rem", textAlign: "center" }}
            >
              <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.88)", fontWeight: 500, marginBottom: "8px" }}>
                First name?
              </p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "24px" }}>
                Optional — for prayer and reflection.
              </p>
              <input
                data-testid="input-threshold-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleNameContinue()}
                placeholder="Your first name"
                autoComplete="given-name"
                aria-label="Your first name"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  padding: "14px 16px",
                  fontSize: "16px",
                  color: "#ffffff",
                  outline: "none",
                }}
              />
              <button
                type="button"
                data-testid="btn-threshold-name-continue"
                onClick={() => void handleNameContinue()}
                className="transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80"
                style={{
                  marginTop: "24px",
                  width: "100%",
                  minHeight: "48px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(124,58,237,0.90)",
                  color: "#ffffff",
                  fontWeight: 600,
                  padding: "14px",
                  border: "none",
                  fontSize: "16px",
                }}
              >
                Continue
              </button>
              <button
                type="button"
                data-testid="btn-threshold-name-skip"
                onClick={() => {
                  fireHaptic("soft");
                  markNamePrompted();
                  setStep(nativeFastPath ? "enter" : "breath");
                }}
                className="transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
                style={{
                  marginTop: "16px",
                  minHeight: "44px",
                  padding: "0 12px",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.45)",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "none",
                }}
              >
                Skip
              </button>
            </motion.div>
          )}

          {step === "sync-name" && (
            <motion.div
              key="sync-name"
              {...fade}
              style={{ width: "100%", maxWidth: "24rem", textAlign: "center" }}
            >
              <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.82)", fontWeight: 500, marginBottom: "8px" }}>
                Setting this up for you...
              </p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.50)", lineHeight: 1.625 }}>
                We&apos;re checking your saved profile so we don&apos;t ask twice.
              </p>
            </motion.div>
          )}

          {step === "breath" && (
            <motion.div key="breath" {...fade} style={{ width: "100%" }}>
              <ThresholdBreath onDone={() => setStep("enter")} />
            </motion.div>
          )}

          {step === "enter" && (
            <motion.div
              key="enter"
              {...fade}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                width: "100%",
                maxWidth: "28rem",
              }}
            >
              <p
                style={{
                  fontSize: "1.2rem",
                  color: "rgba(255,255,255,0.88)",
                  lineHeight: 1.625,
                  fontFamily: "var(--font-serif, Georgia, serif)",
                }}
              >
                {modeLine}
              </p>
              {confirmationVerse && (
                <div
                  data-testid="threshold-confirmation-verse"
                  style={{ marginTop: "28px", maxWidth: "22rem", width: "100%" }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      fontStyle: "italic",
                      color: "rgba(255,255,255,0.72)",
                      lineHeight: 1.625,
                      fontFamily: "var(--font-serif, Georgia, serif)",
                    }}
                  >
                    &ldquo;{confirmationVerse.text}&rdquo;
                  </p>
                  <p
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.42)",
                      lineHeight: 1.5,
                    }}
                  >
                    — {confirmationVerse.reference}
                  </p>
                </div>
              )}
              <button
                type="button"
                data-testid="btn-threshold-enter"
                onClick={finish}
                className="transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-100"
                style={{
                  marginTop: "48px",
                  width: "100%",
                  maxWidth: "20rem",
                  minHeight: "50px",
                  borderRadius: "12px",
                  backgroundColor: "#ffffff",
                  color: "#130636",
                  fontWeight: 700,
                  fontSize: "16px",
                  padding: "16px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgba(76,29,149,0.30)",
                }}
              >
                Step inside
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
