import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type HeartWeather,
  type HeartTopic,
  saveHeartCheck,
  markHeartCheckShown,
  getHeartTrend,
} from "@/lib/heartCheck";

const WEATHER_OPTIONS: { value: HeartWeather; label: string }[] = [
  { value: "peaceful",    label: "Peaceful"    },
  { value: "hopeful",     label: "Hopeful"     },
  { value: "uncertain",   label: "Uncertain"   },
  { value: "heavy",       label: "Heavy"       },
  { value: "overwhelmed", label: "Overwhelmed" },
];

const TOPIC_OPTIONS: { value: HeartTopic; label: string }[] = [
  { value: "relationships", label: "Relationships" },
  { value: "finances",      label: "Finances"      },
  { value: "work",          label: "Work"          },
  { value: "health",        label: "Health"        },
  { value: "family",        label: "Family"        },
  { value: "faith",         label: "Faith"         },
  { value: "anxiety",       label: "Anxiety"       },
  { value: "gratitude",     label: "Gratitude"     },
];

const HEAVY: HeartWeather[] = ["heavy", "overwhelmed"];

const ACKNOWLEDGMENTS: Record<HeartWeather, string> = {
  peaceful:    "Carry that peace into today.",
  hopeful:     "Hope is a gift. Let's tend it.",
  uncertain:   "That's okay. You can bring that here.",
  heavy:       "That's okay. You can bring that here.",
  overwhelmed: "That's okay. You can bring that here.",
};

interface Props {
  onDismiss: () => void;
}

export function HeartCheckModal({ onDismiss }: Props) {
  const [step, setStep] = useState<"weather" | "topic" | "ack">("weather");
  const [weather, setWeather] = useState<HeartWeather | null>(null);
  const [trendMessage, setTrendMessage] = useState<string | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Lock ALL scroll elements the WKWebView might be using
    const scrollY = window.scrollY;
    const scroller = (document.scrollingElement as HTMLElement | null) || document.body;
    const savedPos = scroller.scrollTop;

    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";

    // Belt-and-suspenders: block touchmove on document, allow it only inside the sheet
    const blockTouch = (e: TouchEvent) => {
      if (sheetRef.current && sheetRef.current.contains(e.target as Node)) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", blockTouch, { passive: false });

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overflow = "";
      document.removeEventListener("touchmove", blockTouch);
      scroller.scrollTop = savedPos;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleWeatherSelect = (w: HeartWeather) => {
    setWeather(w);
    setStep("topic");
  };

  const handleTopicSelect = (topic: HeartTopic | null) => {
    if (!weather) return;
    saveHeartCheck(weather, topic);
    window.dispatchEvent(new CustomEvent("sp-heart-updated"));
    const trend = getHeartTrend(weather);
    setTrendMessage(trend.message);
    setStep("ack");
  };

  const handleClose = () => {
    if (step === "weather") markHeartCheckShown();
    onDismiss();
  };

  // Full-screen sacred threshold — not a modal, not a sheet. A moment.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "linear-gradient(175deg, #1a0d2e 0%, #0d0612 60%, #09031e 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "max(52px, env(safe-area-inset-top, 52px)) 32px max(48px, calc(36px + env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <AnimatePresence mode="wait">

          {/* ── Step 1: Weather ── */}
          {step === "weather" && (
            <motion.div key="weather" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(167,139,250,0.55)", marginBottom: "32px" }}>
                Before we begin
              </p>
              <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "1.6rem", fontWeight: 300, color: "rgba(255,255,255,0.94)", marginBottom: "8px", lineHeight: 1.25 }}>
                How is your heart today?
              </h2>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginBottom: "28px", lineHeight: 1.5 }}>
                A quick check-in helps Shepherd's Path meet you where you are.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {WEATHER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleWeatherSelect(opt.value)}
                    style={{
                      padding: "14px 20px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      textAlign: "left",
                      width: "100%",
                      fontSize: "15px",
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.86)",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.12)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.30)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={handleClose} style={{ marginTop: "24px", fontSize: "12px", color: "rgba(255,255,255,0.25)", background: "none", border: "none", width: "100%", textAlign: "center" }}>
                Skip for now
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Topic ── */}
          {step === "topic" && (
            <motion.div key="topic" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
              {weather && HEAVY.includes(weather) && (
                <p style={{ fontFamily: "'Georgia', serif", fontSize: "0.95rem", color: "rgba(255,255,255,0.40)", marginBottom: "20px", fontStyle: "italic", lineHeight: 1.5 }}>
                  That's okay. You can bring that here.
                </p>
              )}
              <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem", fontWeight: 300, color: "rgba(255,255,255,0.94)", marginBottom: "24px", lineHeight: 1.25 }}>
                What's carrying the most weight?
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                {TOPIC_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleTopicSelect(opt.value)}
                    style={{
                      padding: "13px 16px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      textAlign: "left",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.82)",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.12)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.30)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleTopicSelect(null)}
                style={{ width: "100%", padding: "10px", fontSize: "12px", color: "rgba(255,255,255,0.25)", background: "none", border: "none", textAlign: "center" }}
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Acknowledgment ── */}
          {step === "ack" && weather && (
            <motion.div key="ack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              {trendMessage && (
                <p style={{ fontFamily: "'Georgia', serif", fontSize: "0.95rem", color: "rgba(167,139,250,0.65)", marginBottom: "16px", fontStyle: "italic", lineHeight: 1.6 }}>
                  {trendMessage}
                </p>
              )}
              <p style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem", fontWeight: 300, color: "rgba(255,255,255,0.92)", lineHeight: 1.4, marginBottom: "40px" }}>
                {ACKNOWLEDGMENTS[weather]}
              </p>
              <button
                onClick={handleClose}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "14px",
                  background: "rgba(139,92,246,0.18)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  color: "rgba(255,255,255,0.92)",
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                Continue
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
