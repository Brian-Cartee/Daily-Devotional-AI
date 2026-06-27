import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installApiFetch } from "./lib/api";
import { swState, SW_UPDATE_EVENT } from "./lib/sw-state";
import "./index.css";
import {
  isNativeWebViewShell,
  markNativeShellUiPainted,
  notifyNativeReactBooted,
  removeNativeBootPlaceholder,
} from "./lib/platform";
import { nativeDiag } from "./lib/nativeDiag";
import { syncEmailSubscriptionStatus } from "@/hooks/use-email-subscription";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import {
  hydrateSubscriberFromUrlParam,
  hydrateSubscriberStateFromIndexedDB,
  hydrateSubscriberStateFromStorage,
  requestNativeSubscriberBootstrap,
} from "@/lib/subscriberState";
import { mergeServerSplashProg } from "@/lib/entrySplashState";
import { reconcileEntryOverlayIdle } from "@/lib/entryOverlayState";
import { installNativeBootGuard } from "@/lib/nativeBootGuard";

if (isNativeWebViewShell()) {
  try {
    installNativeBootGuard();
  } catch {
    /* never abort React boot on guard install failure */
  }
  nativeDiag("react_entry_started");
}

installApiFetch();

applyTheme(getStoredTheme());

if (!isNativeWebViewShell()) {
  removeNativeBootPlaceholder();
}

if ("serviceWorker" in navigator) {
  if (isNativeWebViewShell()) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    }).catch(() => {});
  } else {
    const SW_MIGRATION = "2026-06-10-safari-cache-fix";
    const migrated = (() => {
      try {
        return localStorage.getItem("sp-sw-migration") === SW_MIGRATION;
      } catch {
        return false;
      }
    })();
    if (!migrated) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .then(() => {
          try {
            localStorage.setItem("sp-sw-migration", SW_MIGRATION);
          } catch {
            /* noop */
          }
        })
        .catch(() => {});
    }
  }
}

if ("serviceWorker" in navigator && !isNativeWebViewShell()) {
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
  var saf = document.getElementById("sp-safari-link");
  if (saf && saf.remove) saf.remove();
  var ent = document.getElementById("sp-enter-btn");
  if (ent && ent.remove) ent.remove();
  const native = isNativeWebViewShell();
  // Never block React mount on splash-prog API — slow/hung fetch = black WebView forever.
  void Promise.race([
    mergeServerSplashProg(),
    new Promise<void>((resolve) => setTimeout(resolve, 2500)),
  ]).finally(() => reconcileEntryOverlayIdle());
  reconcileEntryOverlayIdle();
  if (!native) {
    removeNativeBootPlaceholder();
  } else {
    // Never block first paint on network / IndexedDB — profile is already seeded
    // by native injectedJavaScriptBeforeContentLoaded before this script runs.
    hydrateSubscriberFromUrlParam();
    hydrateSubscriberStateFromStorage();
    void requestNativeSubscriberBootstrap().then(() => {
      hydrateSubscriberStateFromStorage();
      void hydrateSubscriberStateFromIndexedDB();
    });
    nativeDiag("react_render_called");
  }

  createRoot(mountEl!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

  if (typeof window !== "undefined" && native) {
    requestAnimationFrame(() => {
      nativeDiag("react_booted");
      notifyNativeReactBooted();
    });
  } else {
    removeNativeBootPlaceholder();
  }

  void syncEmailSubscriptionStatus().catch(() => {});
}

void mountApp();
