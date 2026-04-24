import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    } else {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister());
      });
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
