import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { getSessionId } from "@/lib/session";
import { getUserName } from "@/lib/userName";
import { isPhilipMode } from "@/lib/companionMode";

interface Props {
  situation: string;
  onDismiss: () => void;
}

export function PatternPhilipCard({ situation, onDismiss }: Props) {
  const [stage, setStage] = useState<"notice" | "consent" | "loading" | "pattern" | "response">("notice");
  const [pattern, setPattern] = useState("");
  const [userResponse, setUserResponse] = useState<"true" | "partly" | "no" | "sitting" | null>(null);

  if (!isPhilipMode()) return null;

  const handleHearIt = async () => {
    setStage("consent");
  };

  const handleConsent = async () => {
    setStage("loading");
    try {
      const r = await fetch("/api/guidance/pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          sessionId: getSessionId(),
          userName: getUserName() ?? undefined,
        }),
      });
      const data = await r.json() as { pattern?: string };
      setPattern(data.pattern ?? "");
      setStage("pattern");
    } catch {
      onDismiss();
    }
  };

  const handleResponse = (resp: "true" | "partly" | "no" | "sitting") => {
    setUserResponse(resp);
    setStage("response");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-violet-500/20 bg-violet-950/20 px-5 py-5 mt-2"
        data-testid="pattern-philip-card"
      >
        <button
          onClick={onDismiss}
          aria-label="Not today"
          className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <X size={14} />
        </button>

        {stage === "notice" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/80 mb-2">
              Philip has noticed something
            </p>
            <p className="text-[14px] text-foreground/80 leading-relaxed mb-1">
              Across a few conversations, a pattern may be forming.
            </p>
            <p className="text-[12px] text-zinc-500 mb-4 leading-relaxed">
              You can hear it, ignore it, or save it for later.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleHearIt}
                className="text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
              >
                Hear it
              </button>
              <span className="text-zinc-700">·</span>
              <button onClick={onDismiss} className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors">
                Not today
              </button>
            </div>
          </>
        )}

        {stage === "consent" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/80 mb-3">
              Philip · A word carefully held
            </p>
            <p className="text-[15px] text-foreground/85 leading-relaxed italic mb-4">
              "I want to say this carefully. I may not have the whole picture. But across several conversations, I've noticed something. Can I say what I'm hearing?"
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConsent}
                className="text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
              >
                Yes, say it
              </button>
              <span className="text-zinc-700">·</span>
              <button onClick={onDismiss} className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors">
                Not right now
              </button>
            </div>
          </>
        )}

        {stage === "loading" && (
          <div className="flex items-center gap-3 py-2">
            <Loader2 size={16} className="animate-spin text-violet-400" />
            <p className="text-[13px] text-zinc-400">Philip is choosing his words…</p>
          </div>
        )}

        {stage === "pattern" && pattern && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/80 mb-3">
              Philip · What I'm noticing
            </p>
            <p className="text-[15px] leading-[1.75] text-foreground/90 mb-5">
              {pattern}
            </p>
            <p className="text-[12px] text-zinc-500 mb-3">Does that feel true, partly true, or off?</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "true" as const, label: "That feels true" },
                { key: "partly" as const, label: "Partly" },
                { key: "no" as const, label: "Not really" },
                { key: "sitting" as const, label: "I need to sit with it" },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleResponse(opt.key)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-white/10 text-zinc-400 hover:border-violet-500/40 hover:text-violet-300 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "response" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/80 mb-3">
              Philip · Thank you for that
            </p>
            <p className="text-[14px] text-foreground/80 leading-relaxed">
              {userResponse === "true" && "Then let's not move past it too quickly. Bring it to God honestly — you don't have to resolve it today."}
              {userResponse === "partly" && "That's honest. Hold the part that fits and let the rest go. Philip may have only seen one side of it."}
              {userResponse === "no" && "Then set it down. Philip can be wrong. What matters is what God is actually doing in you — not what I noticed from the outside."}
              {userResponse === "sitting" && "That's the right move. Some things need time before they're ready to be named. It'll be here when you are."}
            </p>
            <button
              onClick={onDismiss}
              className="mt-4 text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Close
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
