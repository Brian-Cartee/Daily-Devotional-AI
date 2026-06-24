import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { getHoldsDueForReturn, markHoldFollowedUp, releaseHold, type PrayerHold } from "@/lib/prayerHolds";
import { getUserName } from "@/lib/userName";
import { isPhilipMode } from "@/lib/companionMode";
import { PhilipPortraitBadge } from "@/components/PhilipPortraitBadge";
import { fetchGuidanceMemory, buildPhilipReturnLine } from "@/lib/guidanceMemory";

const CREAM = "#e8dcc8";

export function PhilipRememberedCard() {
  const [hold, setHold] = useState<PrayerHold | null>(null);
  const [philipReturn, setPhilipReturn] = useState<string | null>(null);
  const [memoryLine, setMemoryLine] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"notice" | "philip" | "done">("notice");
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isPhilipMode()) return;
    const due = getHoldsDueForReturn();
    if (due.length > 0) setHold(due[0]);
    fetchGuidanceMemory().then((memory) => {
      if (!memory) return;
      const line = buildPhilipReturnLine(memory);
      if (line) setMemoryLine(line);
    });
  }, []);

  if (!hold || stage === "done") return null;

  const daysHeld = Math.round((Date.now() - hold.createdAt) / (1000 * 60 * 60 * 24));

  const handleTalkAboutIt = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const r = await fetch("/api/guidance/hold-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdText: hold.text, daysHeld, userName: getUserName() ?? undefined }),
      });
      const data = await r.json() as { text?: string };
      const returnText =
        memoryLine ??
        data.text ??
        `You asked me to hold "${hold.text}" with you. Is it still there?`;
      markHoldFollowedUp(hold.id, returnText);
      setPhilipReturn(returnText);
      setStage("philip");
    } catch {
      if (memoryLine) {
        setPhilipReturn(memoryLine);
        setStage("philip");
      } else {
        setStage("done");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStillPraying = () => {
    markHoldFollowedUp(hold.id, "Still praying.");
    setStage("done");
  };

  const handleRelease = () => {
    releaseHold(hold.id);
    setStage("done");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        borderRadius: "18px",
        border: "1px solid rgba(251,191,36,0.12)",
        background: "#0e0905",
        padding: "18px 18px 14px",
        marginBottom: "4px",
      }}
      data-testid="philip-remembered-card"
    >
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <PhilipPortraitBadge size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {stage === "notice" && (
            <>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(232,220,200,0.38)",
                  marginBottom: "10px",
                }}
              >
                Philip remembered
              </p>
              <p
                style={{
                  fontSize: "15px",
                  lineHeight: 1.65,
                  color: CREAM,
                  marginBottom: "14px",
                  fontFamily: "'Georgia', serif",
                }}
              >
                {daysHeld === 1
                  ? `Yesterday you asked me to hold "${hold.text}" with you.`
                  : `${daysHeld} days ago you asked me to hold "${hold.text}" with you.`}
              </p>
              {memoryLine && (
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: "rgba(232,220,200,0.62)",
                    fontStyle: "italic",
                    marginBottom: "14px",
                  }}
                >
                  {memoryLine}
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={handleTalkAboutIt}
                  disabled={loading}
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: loading ? "rgba(251,191,36,0.35)" : "rgba(251,191,36,0.82)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: loading ? "default" : "pointer",
                  }}
                >
                  {loading ? "Philip is returning…" : "Talk about it"}
                </button>
                <span style={{ color: "rgba(232,220,200,0.15)" }}>·</span>
                <button
                  onClick={handleStillPraying}
                  style={{
                    fontSize: "12px",
                    color: "rgba(232,220,200,0.32)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  Still praying
                </button>
                <span style={{ color: "rgba(232,220,200,0.15)" }}>·</span>
                <button
                  onClick={handleRelease}
                  style={{
                    fontSize: "12px",
                    color: "rgba(232,220,200,0.32)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  Release this
                </button>
              </div>
            </>
          )}

          {stage === "philip" && philipReturn && (
            <>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(232,220,200,0.38)",
                  marginBottom: "10px",
                }}
              >
                Philip
              </p>
              <p
                style={{
                  fontSize: "16px",
                  lineHeight: 1.65,
                  color: CREAM,
                  marginBottom: "14px",
                  fontFamily: "'Georgia', serif",
                }}
              >
                {philipReturn}
              </p>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={() => navigate("/guidance")}
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "rgba(251,191,36,0.82)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  Talk it through
                </button>
                <span style={{ color: "rgba(232,220,200,0.15)" }}>·</span>
                <button
                  onClick={() => setStage("done")}
                  style={{
                    fontSize: "12px",
                    color: "rgba(232,220,200,0.32)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  I&apos;m good
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
