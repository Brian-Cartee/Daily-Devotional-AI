import { motion } from "framer-motion";
import { Bookmark, X } from "lucide-react";

interface ResumeBarProps {
  label: string;
  onResume: () => void;
  onDismiss: () => void;
}

export function ResumeBar({ label, onResume, onDismiss }: ResumeBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="mx-4 mt-3 mb-1 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-700/40 rounded-xl px-3 py-2.5"
    >
      <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 fill-amber-500/30" />
      <button
        onClick={onResume}
        data-testid="btn-resume-bookmark"
        className="flex-1 text-left text-sm font-semibold text-amber-800 dark:text-amber-300 truncate hover:underline"
      >
        Continue: {label}
      </button>
      <button
        onClick={onDismiss}
        data-testid="btn-dismiss-bookmark"
        aria-label="Dismiss"
        className="text-amber-500/70 hover:text-amber-700 dark:hover:text-amber-300 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
