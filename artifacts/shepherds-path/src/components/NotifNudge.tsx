import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check } from "lucide-react";
import { isPushSupported, isPushGranted, subscribePush } from "@/lib/push";
import { NotificationSettings } from "@/components/NotificationSettings";

const SIMPLE_KEY = "sp_notif_strip_shown";
const DEEP_KEY   = "sp_notif_nudge_dismissed";

// ── Step 1: Simple strip ────────────────────────────────────────────────────
// Appears ~2s after the user saves their first moment.
// One sentence. One tap. Morning reminder only. Then gone forever.

export function SimpleNotifNudge() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    // Already shown or already granted — skip entirely
    if (localStorage.getItem(SIMPLE_KEY)) return;
    if (!isPushSupported()) return;
    if (isPushGranted()) { localStorage.setItem(SIMPLE_KEY, "1"); return; }

    const show = () => {
      // Only fire once
      localStorage.setItem(SIMPLE_KEY, "1");
      setTimeout(() => setVisible(true), 1800);
    };

    window.addEventListener("sp-first-moment-saved", show, { once: true });
    return () => window.removeEventListener("sp-first-moment-saved", show);
  }, []);

  const dismiss = () => setVisible(false);

  const handleYes = async () => {
    setStatus("loading");
    const ok = await subscribePush({ morningEnabled: true, eveningEnabled: false, middayEnabled: false, streakReminder: true, weeklySummary: false });
    if (ok) {
      setStatus("done");
      // Also mark the deep nudge as done so they won't be asked again
      localStorage.setItem(DEEP_KEY, "1");
      setTimeout(() => setVisible(false), 2200);
    } else {
      setVisible(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none px-4 pb-safe-or-4"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl px-4 py-3.5 flex items-center gap-3 pointer-events-auto shadow-xl"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.6)" }}
          >
            {status === "done" ? (
              <>
                <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <p className="flex-1 text-[13px] font-medium text-foreground">
                  You'll hear from us tomorrow morning. 🙏
                </p>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-primary/70" />
                </div>

                <p className="flex-1 text-[13px] font-medium text-foreground leading-snug">
                  Want a reminder when tomorrow's is ready?
                </p>

                <button
                  onClick={handleYes}
                  disabled={status === "loading"}
                  data-testid="button-notif-simple-yes"
                  className="shrink-0 text-[12px] font-bold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-xl"
                  style={{ background: "hsl(var(--primary) / 0.1)" }}
                >
                  {status === "loading" ? "…" : "Yes →"}
                </button>

                <button
                  onClick={dismiss}
                  data-testid="button-notif-simple-dismiss"
                  className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Step 2: Deep nudge ──────────────────────────────────────────────────────
// Opens the full NotificationSettings sheet after the user writes a journal note.
// Only fires if push is not yet granted and the nudge hasn't been dismissed.

export function DeepNotifNudge() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DEEP_KEY)) return;
    if (!isPushSupported()) return;
    if (isPushGranted()) return;

    const handle = () => {
      // Give them a moment after they finish writing
      setTimeout(() => {
        if (!isPushGranted()) setOpen(true);
      }, 1200);
    };

    window.addEventListener("sp-journal-note-written", handle, { once: true });
    return () => window.removeEventListener("sp-journal-note-written", handle);
  }, []);

  const handleClose = () => {
    localStorage.setItem(DEEP_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;
  return <NotificationSettings onClose={handleClose} />;
}
