import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").then((registration) => {

        const notifyWaiting = (reg: ServiceWorkerRegistration) => {
          window.dispatchEvent(
            new CustomEvent("sw-update-waiting", { detail: reg })
          );
        };

        // A SW was already waiting when the page loaded (e.g. dismissed last time)
        if (registration.waiting) {
          notifyWaiting(registration);
        }

        // A new SW is found and begins installing
        registration.addEventListener("updatefound", () => {
          const incoming = registration.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            // "installed" + existing controller = new SW waiting behind the current one
            if (incoming.state === "installed" && navigator.serviceWorker.controller) {
              notifyWaiting(registration);
            }
          });
        });

      }).catch(() => {});

      // Only reload when the user explicitly triggered an update (not on first SW activation)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if ((window as any).__swUpdateInitiated) {
          window.location.reload();
        }
      });

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
