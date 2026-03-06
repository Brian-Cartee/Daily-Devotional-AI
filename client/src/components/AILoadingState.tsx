import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AILoadingStateProps {
  type: "reflection" | "prayer";
}

export function AILoadingState({ type }: AILoadingStateProps) {
  const loadingText = type === "reflection"
    ? "Thinking through your reflection..."
    : "Writing a personalized prayer...";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-6 p-8 text-center rounded-2xl bg-card border border-border relative overflow-hidden"
    >
      <div className="absolute inset-0 animate-shimmer opacity-20 pointer-events-none" />

      <div className="flex flex-col items-center justify-center gap-4 relative z-10">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-6 h-6 text-primary/60" />
        </motion.div>

        <p className="text-muted-foreground text-sm font-medium animate-pulse">{loadingText}</p>

        <div className="w-full max-w-xs space-y-2">
          <div className="h-2.5 bg-muted rounded-full w-full" />
          <div className="h-2.5 bg-muted rounded-full w-4/5 mx-auto" />
          <div className="h-2.5 bg-muted rounded-full w-5/6 mx-auto" />
        </div>
      </div>
    </motion.div>
  );
}
