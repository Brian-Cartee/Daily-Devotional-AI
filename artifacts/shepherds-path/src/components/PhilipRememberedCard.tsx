import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { getHoldsDueForReturn, markHoldFollowedUp, releaseHold, type PrayerHold } from "@/lib/prayerHolds";
import { getUserName } from "@/lib/userName";
import { isPhilipMode } from "@/lib/companionMode";

export function PhilipRememberedCard() {
  const [hold, setHold] = useState<PrayerHold | null>(null);
  const [philipReturn, setPhilipReturn] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"notice" | "philip" | "done">("notice");
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isPhilipMode()) return;
    const due = getHoldsDueForReturn();
    if (due.length > 0) setHold(due[0]);
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
      const returnText = data.text ?? `A while ago you asked me to hold "${hold.text}" with you. How is your heart carrying it today?`;
      markHoldFollowedUp(hold.id, returnText);
      setPhilipReturn(returnText);
      setStage("philip");
    } catch {
      setStage("done");
    } finally {
      setLoading(false);
    }
  };

  const handleStillPraying = () => {
    // Re-extend the hold another 3 days silently
    markHoldFollowedUp(hold.id, "Still praying.");
    setStage("done");
  };

  const handleRelease = () => {
    releaseHold(hold.id);
    setStage("done");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-violet-500/20 bg-violet-950/20 px-5 py-4 mb-1"
      data-testid="philip-remembered-card"
    >
      {stage === "notice" && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/80 mb-1">
            Philip remembered
          </p>
          <p className="text-[14px] text-foreground/80 leading-relaxed mb-3">
            {daysHeld === 1
              ? `Yesterday you asked Philip to hold "${hold.text}" with you.`
              : `${daysHeld} days ago you asked Philip to hold "${hold.text}" with you.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTalkAboutIt}
              disabled={loading}
              className="text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-colors disabled:opacity-50"
            >
              {loading ? "Philip is returning…" : "Talk about it"}
            </button>
            <span className="text-zinc-700">·</span>
            <button onClick={handleStillPraying} className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors">
              Still praying
            </button>
            <span className="text-zinc-700">·</span>
            <button onClick={handleRelease} className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors">
              Release this
            </button>
          </div>
        </>
      )}

      {stage === "philip" && philipReturn && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/80 mb-3">
            Philip · Returning
          </p>
          <p className="text-[15px] leading-[1.75] text-foreground/90 mb-4">
            {philipReturn}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/guidance")}
              className="text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
            >
              Talk it through
            </button>
            <span className="text-zinc-700">·</span>
            <button onClick={() => setStage("done")} className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors">
              I'm good
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
