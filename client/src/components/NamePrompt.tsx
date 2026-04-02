import { useState } from "react";
import { motion } from "framer-motion";
import { setUserName, markNamePrompted } from "@/lib/userName";

interface Props {
  onDone: () => void;
}

export function NamePrompt({ onDone }: Props) {
  const [name, setName] = useState("");

  const handleContinue = () => {
    const trimmed = name.trim();
    if (trimmed) setUserName(trimmed);
    else markNamePrompted();
    onDone();
  };

  const handleSkip = () => {
    markNamePrompted();
    onDone();
  };

  const firstName = name.trim().split(" ")[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-sm bg-background rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-amber-400" />

        <div className="px-7 pt-8 pb-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <span className="text-2xl">🌿</span>
          </div>

          <h2 className="text-[22px] font-black text-foreground tracking-tight leading-tight mb-2">
            Before we begin —
          </h2>

          <p className="text-[15px] text-muted-foreground leading-snug mb-7 max-w-[240px]">
            What should we call you? Your name helps us make every reflection personal.
          </p>

          <input
            type="text"
            spellCheck={false}
            autoCapitalize="words"
            autoCorrect="off"
            autoComplete="given-name"
            enterKeyHint="done"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleContinue()}
            placeholder="Your first name"
            autoFocus
            maxLength={40}
            data-testid="input-user-name"
            className="w-full text-center text-[17px] font-semibold bg-muted/50 border border-border rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/50 mb-4 transition-all"
          />

          <button
            onClick={handleContinue}
            data-testid="btn-name-continue"
            className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 text-[15px] font-bold hover:opacity-90 transition-opacity mb-3"
          >
            {firstName ? `Continue as ${firstName}` : "Continue"}
          </button>

          <button
            onClick={handleSkip}
            data-testid="btn-name-skip"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
