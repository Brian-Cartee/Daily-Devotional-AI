import { useState, useEffect } from "react";

const WELCOMED_KEY = "sp_welcomed";

export function useWelcomeOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
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
