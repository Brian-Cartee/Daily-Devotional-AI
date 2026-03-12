import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

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
    // Don't show if already dismissed or installed
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Track visit count — show on 2nd visit+
    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? "0") + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < 2) return;

    // iOS detection (Safari doesn't fire beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = (window.navigator as any).standalone === true;
    if (ios && !isInStandaloneMode) {
      setIsIOS(true);
      setTimeout(() => setVisible(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 3000);
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
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-5 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="bg-card border border-primary/20 rounded-2xl shadow-xl shadow-primary/10 px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <img src="/logo-mark-white.png" alt="" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground leading-tight">Add to Home Screen</p>
              {isIOS ? (
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Tap <span className="font-semibold">Share</span> then <span className="font-semibold">"Add to Home Screen"</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Open Shepherd's Path like a native app
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!isIOS && (
                <button
                  data-testid="btn-install-pwa"
                  onClick={handleInstall}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-[12px] font-bold hover:bg-primary/90 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </button>
              )}
              <button
                data-testid="btn-dismiss-install"
                onClick={dismiss}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
