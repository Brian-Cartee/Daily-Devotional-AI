import { motion } from "framer-motion";
import { StaffLoader } from "@/components/StaffLoader";

interface AILoadingStateProps {
  type?: "reflection" | "prayer" | "general";
  message?: string;
}

const MESSAGES: Record<string, string> = {
  reflection: "Seeking a reflection for you…",
  prayer: "Writing a prayer from His Word…",
  general: "Walking with you through this…",
};

export function AILoadingState({ type = "general", message }: AILoadingStateProps) {
  const text = message ?? MESSAGES[type];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-6 p-8 text-center rounded-2xl bg-card border border-border relative overflow-hidden"
    >
      <div className="absolute inset-0 animate-shimmer opacity-10 pointer-events-none" />
      <div className="relative z-10 flex justify-center">
        <StaffLoader message={text} size="md" />
      </div>
    </motion.div>
  );
}
