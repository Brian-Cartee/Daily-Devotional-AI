import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function UpdatePrompt() {
  const [waitingReg, setWaitingReg] = useState<ServiceWorkerRegistration | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const reg = (e as CustomEvent<ServiceWorkerRegistration>).detail;
      setWaitingReg(reg);
      setDismissed(false);
    };
    window.addEventListener("sw-update-waiting", handler);
    return () => window.removeEventListener("sw-update-waiting", handler);
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waitingReg?.waiting) return;
    waitingReg.waiting.postMessage({ type: "SKIP_WAITING" });
    // reload is handled by the controllerchange listener in main.tsx
  }, [waitingReg]);

  const visible = !!waitingReg && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="update-prompt"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
          role="status"
          aria-live="polite"
          aria-label="App update available"
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-foreground leading-tight">
                Update available
              </span>
              <span className="text-xs text-muted-foreground leading-snug">
                Tap to reload and get the latest
              </span>
            </div>

            <button
              data-testid="button-apply-update"
              onClick={applyUpdate}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-75"
            >
              Update
            </button>

            <button
              data-testid="button-dismiss-update"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss update prompt"
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
