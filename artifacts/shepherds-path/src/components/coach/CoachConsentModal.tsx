import { motion, AnimatePresence } from "framer-motion";

interface CoachConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function CoachConsentModal({ open, onAccept, onDecline }: CoachConsentModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="coach-consent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coach-consent-title"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDecline} />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-violet-400/25 bg-[#130636] px-6 py-6 shadow-2xl"
            data-testid="modal-coach-consent"
          >
            <p
              id="coach-consent-title"
              className="text-[1.1rem] font-semibold text-white/92 leading-snug mb-3"
            >
              Coach mode is direct — never harsh
            </p>
            <p className="text-[15px] text-white/65 leading-relaxed mb-6">
              You asked for honesty. We&apos;ll name what we see with care. We won&apos;t shame you.
              If it lands too hard, you can switch back to gentle mode anytime.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                data-testid="btn-coach-consent-accept"
                onClick={onAccept}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3.5 transition-colors"
              >
                I&apos;m ready for honesty
              </button>
              <button
                type="button"
                data-testid="btn-coach-consent-decline"
                onClick={onDecline}
                className="w-full rounded-xl border border-white/15 text-white/70 hover:text-white py-3 transition-colors"
              >
                Stay in gentle mode
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
