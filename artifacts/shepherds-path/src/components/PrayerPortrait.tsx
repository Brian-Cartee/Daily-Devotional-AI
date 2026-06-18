import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronRight, Loader2, Volume2, VolumeX,
  BookMarked, CheckCheck, Heart,
} from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { apiSessionExtras } from "@/lib/requestExtras";

type Step = "questions" | "generating" | "result" | "error";

interface Props {
  situation: string;
  onClose: () => void;
}

export function PrayerPortrait({ situation, onClose }: Props) {
  const [step, setStep] = useState<Step>("questions");
  const [belief, setBelief] = useState("");
  const [burden, setBurden] = useState("");
  const [cover, setCover] = useState("");
  const [prayer, setPrayer] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const tts = useTTS();

  const handleGenerate = async () => {
    setStep("generating");
    try {
      const res = await fetch("/api/guidance/prayer-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: situation.slice(0, 800),
          answers: {
            belief: belief.trim(),
            burden: burden.trim(),
            cover: cover.trim(),
          },
          ...apiSessionExtras(),
        }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setPrayer(data.prayer || "");
      setStep("result");
    } catch {
      setStep("error");
    }
  };

  const handleSave = async () => {
    if (!prayer || saved) return;
    try {
      await apiRequest("POST", "/api/journal", {
        type: "prayer",
        title: "My Prayer Portrait",
        content: prayer,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      setSaved(true);
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-amber-500" />
          <span className="text-[13px] font-bold text-foreground">Personal Prayer Portrait</span>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/20">Pro</span>
        </div>
        <button
          onClick={onClose}
          data-testid="btn-portrait-close"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">

          {/* Step 1 — Questions */}
          {step === "questions" && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-6"
            >
              <div className="text-center pt-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-[22px] font-bold text-foreground mb-2 leading-tight">
                  A prayer spoken over your life
                </h1>
                <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[300px] mx-auto">
                  Share a few things on your heart. We'll craft a prayer written just for you — in this moment.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[12px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-2">
                    What are you believing God for right now?
                  </label>
                  <textarea
                    value={belief}
                    onChange={e => setBelief(e.target.value)}
                    data-testid="input-portrait-belief"
                    placeholder="A breakthrough, healing, direction, peace…"
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[16px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-2">
                    What's felt heavy lately?
                  </label>
                  <textarea
                    value={burden}
                    onChange={e => setBurden(e.target.value)}
                    data-testid="input-portrait-burden"
                    placeholder="Fear, grief, uncertainty, a relationship…"
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[16px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-2">
                    Is there someone you want this prayer to cover?
                  </label>
                  <textarea
                    value={cover}
                    onChange={e => setCover(e.target.value)}
                    data-testid="input-portrait-cover"
                    placeholder="A family member, friend, or yourself…"
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[16px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 leading-relaxed"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                data-testid="btn-portrait-generate"
                disabled={!belief.trim() && !burden.trim() && !cover.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[15px] py-4 shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                Speak a prayer over my life
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* Step 2 — Generating */}
          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <motion.p
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="text-[15px] text-muted-foreground max-w-[240px] mx-auto leading-relaxed italic"
              >
                Taking a moment to hold what you shared and speak it before God.
              </motion.p>
            </motion.div>
          )}

          {/* Step 3 — Result */}
          {step === "result" && prayer && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-5"
            >
              <div className="text-center pt-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  A prayer over your life
                </p>
              </div>

              {/* Prayer card */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-background dark:from-amber-950/25 dark:via-orange-950/10 dark:to-background">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400" />
                <div className="px-6 py-6">
                  <p className="text-[16px] leading-[1.85] text-foreground/90 italic">
                    {prayer}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => tts.toggle(prayer, "nova")}
                  disabled={tts.loading}
                  data-testid="btn-portrait-listen"
                  className="flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold px-4 py-2 transition-colors disabled:opacity-60 shadow-sm"
                >
                  {tts.loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : tts.playing ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  {tts.playing ? "Stop" : "Hear It Aloud"}
                </button>

                <button
                  onClick={handleSave}
                  disabled={saved}
                  data-testid="btn-portrait-save"
                  className="flex items-center gap-1.5 text-[13px] font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors disabled:opacity-70"
                >
                  {saved ? (
                    <><CheckCheck className="w-3.5 h-3.5" /> Saved to Journal</>
                  ) : (
                    <><BookMarked className="w-3.5 h-3.5" /> Save to Journal</>
                  )}
                </button>
              </div>

              {tts.playing && (
                <div className="h-1 rounded-full bg-amber-200/60 dark:bg-amber-800/30 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${tts.progress}%` }}
                  />
                </div>
              )}

              <button
                onClick={() => { setStep("questions"); setPrayer(null); setSaved(false); }}
                className="w-full text-center text-[12px] text-muted-foreground py-2"
              >
                Pray again
              </button>
            </motion.div>
          )}

          {/* Error */}
          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center"
            >
              <p className="text-foreground font-semibold">Something didn't come through.</p>
              <p className="text-[13px] text-muted-foreground">Check your connection and try again.</p>
              <button
                onClick={() => setStep("questions")}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-[13px] font-semibold hover:bg-amber-600 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
