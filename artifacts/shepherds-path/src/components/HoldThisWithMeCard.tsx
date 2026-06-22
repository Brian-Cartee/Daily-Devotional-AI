import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { addHold, canAddHold, type HoldDuration } from "@/lib/prayerHolds";
import { getUserName } from "@/lib/userName";
import { isPhilipMode } from "@/lib/companionMode";

interface Props {
  onDismiss: () => void;
}

const DURATIONS: { value: HoldDuration; label: string }[] = [
  { value: "3days", label: "3 days" },
  { value: "1week", label: "1 week" },
  { value: "sunday", label: "Until Sunday" },
];

export function HoldThisWithMeCard({ onDismiss }: Props) {
  const [stage, setStage] = useState<"offer" | "input" | "receiving" | "received">("offer");
  const [holdText, setHoldText] = useState("");
  const [duration, setDuration] = useState<HoldDuration>("1week");
  const [philipText, setPhilipText] = useState("");

  if (!isPhilipMode() || !canAddHold()) return null;

  const handleSubmit = async () => {
    if (!holdText.trim()) return;
    setStage("receiving");
    try {
      const r = await fetch("/api/guidance/hold-receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdText: holdText.trim(), userName: getUserName() ?? undefined }),
      });
      const data = await r.json() as { text?: string };
      const receiveText = data.text ?? "I'll hold this with you before God.";
      addHold(holdText.trim(), duration, receiveText);
      setPhilipText(receiveText);
      setStage("received");
    } catch {
      addHold(holdText.trim(), duration, "I'll hold this with you before God.");
      setPhilipText("I'll hold this with you before God.");
      setStage("received");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-white/10 bg-zinc-900/50 px-5 py-5 mt-2"
        data-testid="hold-this-card"
      >
        <button
          onClick={onDismiss}
          aria-label="Not now"
          className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <X size={14} />
        </button>

        {stage === "offer" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400/70 mb-2">
              Philip · Hold This With Me
            </p>
            <p className="text-[14px] text-foreground/80 leading-relaxed mb-1">
              Is there something you want Philip to hold before God with you this week?
            </p>
            <p className="text-[12px] text-zinc-500 mb-4 leading-relaxed">
              Not a reminder. He'll return to it — and ask how your heart is carrying it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStage("input")}
                className="text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
              >
                Ask Philip to hold something
              </button>
              <span className="text-zinc-700">·</span>
              <button onClick={onDismiss} className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors">
                Not now
              </button>
            </div>
          </>
        )}

        {stage === "input" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400/70 mb-3">
              What are we holding before God?
            </p>
            <textarea
              value={holdText}
              onChange={(e) => setHoldText(e.target.value)}
              placeholder="My son. This decision. The fear at night. My marriage."
              maxLength={200}
              rows={2}
              className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-[14px] text-foreground placeholder:text-zinc-600 resize-none focus:outline-none focus:border-violet-500/40 mb-3"
              autoFocus
            />

            <p className="text-[11px] text-zinc-500 mb-2">Philip holds this with you for:</p>
            <div className="flex gap-2 mb-4">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                    duration === d.value
                      ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                      : "border-white/10 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={!holdText.trim()}
                className="text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-colors disabled:opacity-40"
              >
                Hand it to Philip
              </button>
              <span className="text-zinc-700">·</span>
              <button onClick={onDismiss} className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors">
                Never mind
              </button>
            </div>
          </>
        )}

        {stage === "receiving" && (
          <div className="flex items-center gap-3 py-2">
            <Loader2 size={16} className="animate-spin text-violet-400" />
            <p className="text-[13px] text-zinc-400">Philip is receiving it…</p>
          </div>
        )}

        {stage === "received" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400/70 mb-3">
              Philip · Received
            </p>
            <p className="text-[15px] leading-relaxed text-foreground/90 italic mb-4">
              "{philipText}"
            </p>
            <button
              onClick={onDismiss}
              className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Continue
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
