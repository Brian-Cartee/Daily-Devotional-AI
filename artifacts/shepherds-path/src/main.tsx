import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installApiFetch } from "./lib/api";
import { swState, SW_UPDATE_EVENT } from "./lib/sw-state";
import "./index.css";
import {
  isNativeShellUiReady,
  isNativeWebViewShell,
  notifyNativeShellReady,
  removeNativeBootPlaceholder,
} from "./lib/platform";

installApiFetch();

if ("serviceWorker" in navigator) {
  if (isNativeWebViewShell()) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    }).catch(() => {});
  } else {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").then((registration) => {

        const notifyWaiting = (reg: ServiceWorkerRegistration) => {
          window.dispatchEvent(
            new CustomEvent(SW_UPDATE_EVENT, { detail: reg })
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
        if (swState.updateInitiated) {
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
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root mount node");
}

/** iOS WebView: keep splash visible until React replaces #root (avoids black flash). */
if (isNativeWebViewShell()) {
  document.getElementById("sp-safari-link")?.remove();
  document.getElementById("sp-enter-btn")?.remove();
  const bootStatus = document.getElementById("sp-boot-splash-status");
  if (bootStatus) bootStatus.textContent = "Loading…";
}

createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

if (typeof window !== "undefined" && isNativeWebViewShell()) {
  const pollReady = (attempts = 0) => {
    if (isNativeShellUiReady()) {
      removeNativeBootPlaceholder();
    }
    notifyNativeShellReady();
    if (attempts < 80) {
      setTimeout(() => pollReady(attempts + 1), 250);
    }
  };
  requestAnimationFrame(() => pollReady());
}
