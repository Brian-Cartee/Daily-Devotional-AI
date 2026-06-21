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
import { applyTheme, getStoredTheme } from "@/lib/theme";
import {
  hydrateSubscriberFromUrlParam,
  hydrateSubscriberStateFromIndexedDB,
  hydrateSubscriberStateFromStorage,
  requestNativeSubscriberBootstrap,
} from "@/lib/subscriberState";
import { mergeServerSplashProg } from "@/lib/entrySplashState";
import { reconcileEntryOverlayIdle } from "@/lib/entryOverlayState";

if (isNativeWebViewShell()) {
  nativeDiag("react_entry_started");
}

installApiFetch();

applyTheme(getStoredTheme());

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

declare const __BUILD_HASH__: string;

async function checkForStaleBuildAndReload(): Promise<void> {
  try {
    const r = await fetch("/native-manifest.json", { cache: "no-store" });
    const j: { builtAt?: string } = await r.json();
    const serverHash = j.builtAt ?? "";
    if (serverHash && serverHash !== __BUILD_HASH__) {
      window.location.reload();
    }
  } catch {
    // network unavailable — skip
  }
}

async function mountApp() {
  document.getElementById("sp-safari-link")?.remove();
  document.getElementById("sp-enter-btn")?.remove();
  const native = isNativeWebViewShell();
  await mergeServerSplashProg();
  reconcileEntryOverlayIdle();
  if (!native) {
    removeNativeBootPlaceholder();
  }
  if (native) {
    // Never block first paint on network / IndexedDB — profile is already seeded
    // by native injectedJavaScriptBeforeContentLoaded before this script runs.
    void checkForStaleBuildAndReload();
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
    const pollReady = (attempts = 0) => {
      notifyNativeShellReady();
      if (!isNativeShellUiReady() && attempts < 120) {
        setTimeout(() => pollReady(attempts + 1), 250);
      }
    };
    requestAnimationFrame(() => pollReady());
  } else {
    removeNativeBootPlaceholder();
  }

  void syncEmailSubscriptionStatus().catch(() => {});
}

void mountApp();
