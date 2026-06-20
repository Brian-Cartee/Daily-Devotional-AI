import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type HeartWeather,
  type HeartTopic,
  saveHeartCheck,
  markHeartCheckShown,
  getHeartTrend,
} from "@/lib/heartCheck";

const WEATHER_OPTIONS: { value: HeartWeather; emoji: string; label: string }[] = [
  { value: "peaceful",    emoji: "☀️",  label: "Peaceful"    },
  { value: "hopeful",     emoji: "🌅",  label: "Hopeful"     },
  { value: "uncertain",   emoji: "⛅",  label: "Uncertain"   },
  { value: "heavy",       emoji: "🌧️", label: "Heavy"       },
  { value: "overwhelmed", emoji: "🌩️", label: "Overwhelmed" },
];

const TOPIC_OPTIONS: { value: HeartTopic; emoji: string; label: string }[] = [
  { value: "relationships", emoji: "❤️",  label: "Relationships" },
  { value: "finances",      emoji: "💰",  label: "Finances"      },
  { value: "work",          emoji: "💼",  label: "Work"          },
  { value: "health",        emoji: "🏥",  label: "Health"        },
  { value: "family",        emoji: "👨‍👩‍👧", label: "Family"       },
  { value: "faith",         emoji: "🙏",  label: "Faith"         },
  { value: "anxiety",       emoji: "😔",  label: "Anxiety"       },
  { value: "gratitude",     emoji: "😊",  label: "Gratitude"     },
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
    const trend = getHeartTrend(weather);
    setTrendMessage(trend.message);
    setStep("ack");
  };

  const handleClose = () => {
    if (step === "weather") markHeartCheckShown();
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          borderRadius: "24px 24px 0 0",
          background: "linear-gradient(160deg, #1a0d2e 0%, #0d0612 100%)",
          border: "1px solid rgba(139,92,246,0.18)",
          borderBottom: "none",
          padding: "20px 20px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
        // @ts-ignore — motion.div forwards refs
        ref={sheetRef}
      >
        <AnimatePresence mode="wait">

          {/* ── Step 1: Weather ── */}
          {step === "weather" && (
            <motion.div key="weather" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              <div className="flex items-center justify-between mb-4">
                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(167,139,250,0.65)" }}>
                  Shepherd's Path
                </p>
                <button onClick={handleClose} style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", padding: "2px 6px" }}>
                  Skip
                </button>
              </div>

              <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "1.4rem", fontWeight: 300, color: "rgba(255,255,255,0.92)", marginBottom: "14px", lineHeight: 1.3 }}>
                How is your heart today?
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {WEATHER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleWeatherSelect(opt.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 16px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        textAlign: "left",
                        width: "100%",
                        transition: "background 0.15s",
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(139,92,246,0.14)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    >
                      <span style={{ fontSize: "20px", lineHeight: 1 }}>{opt.emoji}</span>
                      <span style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>{opt.label}</span>
                    </button>
                  ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Topic ── */}
          {step === "topic" && (
            <motion.div key="topic" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              {weather && HEAVY.includes(weather) && (
                <p style={{ fontFamily: "'Georgia', serif", fontSize: "1rem", color: "rgba(255,255,255,0.55)", marginBottom: "16px", fontStyle: "italic" }}>
                  That's okay. You can bring that here.
                </p>
              )}
              <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "1.3rem", fontWeight: 300, color: "rgba(255,255,255,0.92)", marginBottom: "16px", lineHeight: 1.3 }}>
                What's most on your heart?
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                {TOPIC_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleTopicSelect(opt.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      textAlign: "left",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(139,92,246,0.14)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  >
                    <span style={{ fontSize: "18px", lineHeight: 1 }}>{opt.emoji}</span>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>{opt.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleTopicSelect(null)}
                style={{ width: "100%", padding: "10px", fontSize: "13px", color: "rgba(255,255,255,0.35)", background: "none", border: "none" }}
              >
                Skip
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Acknowledgment ── */}
          {step === "ack" && weather && (
            <motion.div key="ack" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
                <p style={{ fontSize: "36px", marginBottom: "16px" }}>
                  {WEATHER_OPTIONS.find(o => o.value === weather)?.emoji}
                </p>

                {trendMessage && (
                  <p style={{ fontFamily: "'Georgia', serif", fontSize: "0.95rem", color: "rgba(167,139,250,0.75)", marginBottom: "10px", fontStyle: "italic" }}>
                    {trendMessage}
                  </p>
                )}

                <p style={{ fontFamily: "'Georgia', serif", fontSize: "1.2rem", fontWeight: 300, color: "rgba(255,255,255,0.90)", lineHeight: 1.4, marginBottom: "28px" }}>
                  {ACKNOWLEDGMENTS[weather]}
                </p>

                <button
                  onClick={handleClose}
                  style={{
                    width: "100%",
                    padding: "15px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(109,40,217,0.45))",
                    border: "1px solid rgba(139,92,246,0.40)",
                    color: "rgba(255,255,255,0.92)",
                    fontSize: "15px",
                    fontWeight: 600,
                  }}
                >
                  Enter
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
