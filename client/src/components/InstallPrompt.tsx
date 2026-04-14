import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "sp_install_dismissed";
const VISIT_KEY = "sp_visit_count";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Don't show until the user has dismissed the welcome overlay
    if (!localStorage.getItem("sp_welcomed")) return;

    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? "0") + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < 2) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = (window.navigator as any).standalone === true;
    if (ios && !isInStandaloneMode) {
      setIsIOS(true);
      // Extra delay so it doesn't compete with the welcome screen on first impression
      setTimeout(() => setVisible(true), 8000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 8000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setAccepted(true);
    dismiss();
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  return (
    <AnimatePresence>
      {visible && !accepted && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div className="bg-background border-t border-border shadow-2xl shadow-black/30 rounded-t-3xl px-5 pt-5 pb-8 max-w-lg mx-auto">

            {/* Dismiss */}
            <button
              data-testid="btn-dismiss-install"
              onClick={dismiss}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header row */}
            <div className="flex items-center gap-4 mb-4">
              <img
                src="/sp-icon.png"
                alt="Shepherd's Path"
                className="w-16 h-16 rounded-2xl shadow-md flex-shrink-0"
                style={{ boxShadow: "0 4px 16px rgba(82,32,167,0.35)" }}
              />
              <div>
                <p className="text-[15px] font-extrabold text-foreground leading-tight">Shepherd's Path</p>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                  {isIOS
                    ? "Add to your Home Screen for quick access — just 2 taps"
                    : "Install the app for fast, offline access anytime"}
                </p>
              </div>
            </div>

            {isIOS ? (
              /* iOS — step-by-step instructions */
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-primary/6 rounded-2xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-[13px]">1</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <p className="text-[13px] font-semibold text-foreground">Tap</p>
                    <div className="flex items-center gap-1 px-2 py-1 bg-background border border-border rounded-lg">
                      <Share className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[11px] font-bold text-foreground">Share</span>
                    </div>
                    <p className="text-[13px] font-semibold text-foreground">in Safari</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-primary/6 rounded-2xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-[13px]">2</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <p className="text-[13px] font-semibold text-foreground">Tap</p>
                    <div className="flex items-center gap-1 px-2 py-1 bg-background border border-border rounded-lg">
                      <Plus className="w-3.5 h-3.5 text-foreground" />
                      <span className="text-[11px] font-bold text-foreground">Add to Home Screen</span>
                    </div>
                  </div>
                </div>

                <p className="text-center text-[11px] text-muted-foreground pt-1">
                  Opens like an app — no App Store needed
                </p>
              </div>
            ) : (
              /* Android / Chrome — one-tap install */
              <button
                data-testid="btn-install-pwa"
                onClick={handleInstall}
                className="w-full py-4 rounded-2xl font-bold text-[15px] text-white bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
                style={{ boxShadow: "0 4px 20px rgba(82,32,167,0.4)" }}
              >
                <Plus className="w-5 h-5" />
                Add to Home Screen
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
