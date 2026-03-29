import { useState, useEffect } from "react";

const WELCOMED_KEY = "sp_welcomed";

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
    }

    const welcomed = localStorage.getItem(WELCOMED_KEY);
    if (!welcomed) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(WELCOMED_KEY, "true");
    setShow(false);
  };

  return { show, dismiss };
}
