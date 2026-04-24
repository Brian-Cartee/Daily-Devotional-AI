import { useState, useEffect } from "react";

const VISIT_COUNT_KEY = "sp_visit_count";
const SESSION_KEY = "sp_welcome_shown_this_session";

// Show welcome overlay for first N visits, then stop
const REGULAR_THRESHOLD = 5;

export function useWelcomeOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceIntro = params.has("intro");

    if (forceIntro) {
      const url = new URL(window.location.href);
      url.searchParams.delete("intro");
      window.history.replaceState({}, "", url.toString());
      sessionStorage.removeItem(SESSION_KEY);
    }

    // Only show once per browser session (prevents re-showing on back navigation)
    if (!forceIntro && sessionStorage.getItem(SESSION_KEY)) return;

    // Count how many times this person has visited
    const currentCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? "0");
    const newCount = currentCount + 1;

    // Increment visit count for this new session
    if (!sessionStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(VISIT_COUNT_KEY, String(newCount));
    }

    // Show overlay for first REGULAR_THRESHOLD visits (or when forced)
    if (forceIntro || newCount <= REGULAR_THRESHOLD) {
      const timer = setTimeout(() => {
        sessionStorage.setItem(SESSION_KEY, "1");
        setShow(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(false);
  };

  return { show, dismiss };
}
