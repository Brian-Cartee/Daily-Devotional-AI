import { useState, useEffect } from "react";

const WELCOMED_KEY = "sp_welcomed";
const SESSION_KEY = "sp_welcome_shown_this_session";

export function useWelcomeOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceIntro = params.has("intro");

    if (forceIntro) {
      const url = new URL(window.location.href);
      url.searchParams.delete("intro");
      window.history.replaceState({}, "", url.toString());
      localStorage.removeItem(WELCOMED_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }

    // If already shown once in this browser session, never interrupt again
    // (covers: navigating Home from Journey, back button, etc.)
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const welcomed = localStorage.getItem(WELCOMED_KEY);
    if (!welcomed) {
      const timer = setTimeout(() => {
        // Mark shown for the lifetime of this session immediately
        sessionStorage.setItem(SESSION_KEY, "1");
        setShow(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(WELCOMED_KEY, "true");
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(false);
  };

  return { show, dismiss };
}
