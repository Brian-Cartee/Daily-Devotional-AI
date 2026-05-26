import { useState, useEffect } from "react";
import {
  incrementWelcomeVisitCount,
  markIntroFlowComplete,
  recordWelcomeShownThisSession,
  shouldShowWelcomeOverlay,
  WELCOME_SESSION_KEY,
} from "@/lib/introState";
import { isNativeWebViewShell } from "@/lib/platform";

export function useWelcomeOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isNativeWebViewShell()) return;

    const params = new URLSearchParams(window.location.search);
    const forceIntro = params.has("intro");

    if (forceIntro) {
      const url = new URL(window.location.href);
      url.searchParams.delete("intro");
      window.history.replaceState({}, "", url.toString());
      try {
        sessionStorage.removeItem(WELCOME_SESSION_KEY);
      } catch {
        /* noop */
      }
    }

    if (!shouldShowWelcomeOverlay(forceIntro)) return;

    if (!forceIntro) {
      incrementWelcomeVisitCount();
    }

    const timer = setTimeout(() => {
      recordWelcomeShownThisSession();
      setShow(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    recordWelcomeShownThisSession();
    markIntroFlowComplete();
    setShow(false);
  };

  return { show, dismiss };
}
