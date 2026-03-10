import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setUserName, markNamePrompted, setUserGender, type UserGender } from "@/lib/userName";

interface Props {
  onDone: () => void;
}

export function NamePrompt({ onDone }: Props) {
  const [step, setStep] = useState<"name" | "gender">("name");
  const [name, setName] = useState("");

  const handleNameContinue = () => {
    const trimmed = name.trim();
    if (trimmed) setUserName(trimmed);
    else markNamePrompted();
    setStep("gender");
  };

  const handleGenderSelect = (gender: UserGender) => {
    setUserGender(gender);
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

          <AnimatePresence mode="wait">
            {step === "name" ? (
              <motion.div
                key="name-step"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col items-center"
              >
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameContinue()}
                  placeholder="Your first name"
                  autoFocus
                  maxLength={40}
                  data-testid="input-user-name"
                  className="w-full text-center text-[17px] font-semibold bg-muted/50 border border-border rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/50 mb-4 transition-all"
                />

                <button
                  onClick={handleNameContinue}
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
              </motion.div>
            ) : (
              <motion.div
                key="gender-step"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-5">
                  <span className="text-2xl">🎙️</span>
                </div>

                <h2 className="text-[22px] font-black text-foreground tracking-tight leading-tight mb-2">
                  {firstName ? `One more thing, ${firstName}` : "One more thing"}
                </h2>

                <p className="text-[14px] text-muted-foreground leading-snug mb-7 max-w-[250px]">
                  We'd love to read scripture and reflections to you in a voice that feels personal. What are you?
                </p>

                <div className="w-full flex flex-col gap-3 mb-4">
                  <button
                    onClick={() => handleGenderSelect("male")}
                    data-testid="btn-gender-male"
                    className="w-full bg-muted/50 border border-border hover:border-primary/40 hover:bg-primary/5 rounded-2xl py-3.5 text-[15px] font-semibold transition-all flex items-center justify-center gap-2.5"
                  >
                    <span className="text-xl">👨</span>
                    I'm a man
                  </button>

                  <button
                    onClick={() => handleGenderSelect("female")}
                    data-testid="btn-gender-female"
                    className="w-full bg-muted/50 border border-border hover:border-primary/40 hover:bg-primary/5 rounded-2xl py-3.5 text-[15px] font-semibold transition-all flex items-center justify-center gap-2.5"
                  >
                    <span className="text-xl">👩</span>
                    I'm a woman
                  </button>
                </div>

                <button
                  onClick={() => handleGenderSelect("unset")}
                  data-testid="btn-gender-skip"
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Prefer not to say
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </motion.div>
  );
}
