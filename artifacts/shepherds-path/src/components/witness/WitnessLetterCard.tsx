import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { getSessionId } from "@/lib/session";
import { dismissWitnessLetter, isWitnessDismissed } from "@/lib/witnessLetter";
import { Link } from "wouter";

type WitnessPayload = {
  id: string;
  letter: string;
} | null;

export function WitnessLetterCard() {
  const sessionId = getSessionId();

  const { data, isLoading } = useQuery<WitnessPayload>({
    queryKey: ["/api/guidance/witness-letter", sessionId],
    queryFn: async () => {
      const res = await fetch(
        `/api/guidance/witness-letter?sessionId=${encodeURIComponent(sessionId)}`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      if (!json?.letter || !json?.id) return null;
      if (isWitnessDismissed(json.id)) return null;
      return { id: json.id, letter: json.letter as string };
    },
    staleTime: 120_000,
    retry: false,
  });

  if (isLoading || !data) return null;

  const handleDismiss = () => {
    dismissWitnessLetter(data.id);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/40 via-card to-card overflow-hidden mb-4"
        data-testid="card-witness-letter"
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          data-testid="btn-witness-dismiss"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="px-5 pt-5 pb-4 pr-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500/80 dark:text-violet-300/70 mb-2">
            Held with you
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/85">{data.letter}</p>
          <Link
            href="/guidance"
            onClick={handleDismiss}
            className="inline-block mt-4 text-[13px] font-semibold text-primary hover:underline"
            data-testid="link-witness-continue"
          >
            Continue the conversation →
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
