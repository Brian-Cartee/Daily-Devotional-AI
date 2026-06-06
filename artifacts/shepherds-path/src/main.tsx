import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installApiFetch } from "./lib/api";
import { swState, SW_UPDATE_EVENT } from "./lib/sw-state";
import "./index.css";
import {
  isNativeShellUiReady,
  isNativeWebViewShell,
  markNativeShellUiPainted,
  notifyNativeReactBooted,
  notifyNativeShellReady,
  removeNativeBootPlaceholder,
} from "./lib/platform";
import { nativeDiag } from "./lib/nativeDiag";
import { syncEmailSubscriptionStatus } from "@/hooks/use-email-subscription";
import {
  hydrateSubscriberFromUrlParam,
  hydrateSubscriberStateFromIndexedDB,
  hydrateSubscriberStateFromStorage,
  requestNativeSubscriberBootstrap,
} from "@/lib/subscriberState";

if (isNativeWebViewShell()) {
  nativeDiag("react_entry_started");
}

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

        if (registration.waiting) {
          notifyWaiting(registration);
        }

        registration.addEventListener("updatefound", () => {
          const incoming = registration.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            if (incoming.state === "installed" && navigator.serviceWorker.controller) {
              notifyWaiting(registration);
            }
          });
        });

      }).catch(() => {});

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

let mountEl = document.getElementById("sp-app-mount");
if (!mountEl) {
  mountEl = document.createElement("div");
  mountEl.id = "sp-app-mount";
  rootEl.appendChild(mountEl);
}

async function mountApp() {
  document.getElementById("sp-safari-link")?.remove();
  document.getElementById("sp-enter-btn")?.remove();
  if (isNativeWebViewShell()) {
    const bootStatus = document.getElementById("sp-boot-splash-status");
    if (bootStatus) bootStatus.textContent = "Loading…";
    hydrateSubscriberFromUrlParam();
    hydrateSubscriberStateFromStorage();
    await requestNativeSubscriberBootstrap();
    hydrateSubscriberStateFromStorage();
    await hydrateSubscriberStateFromIndexedDB();
    nativeDiag("react_render_called");
  }
  await syncEmailSubscriptionStatus();

  createRoot(mountEl!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

  if (typeof window !== "undefined" && isNativeWebViewShell()) {
    requestAnimationFrame(() => {
      nativeDiag("react_booted");
      notifyNativeReactBooted();
    });
    const pollReady = (attempts = 0) => {
      notifyNativeShellReady();
      if (!isNativeShellUiReady() && attempts < 120) {
        setTimeout(() => pollReady(attempts + 1), 250);
      }
    };
    requestAnimationFrame(() => pollReady());
  } else {
    requestAnimationFrame(() => removeNativeBootPlaceholder());
  }
}

void mountApp();
