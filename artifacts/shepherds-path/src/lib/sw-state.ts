/**
 * Shared mutable state for service worker lifecycle coordination.
 * Used to distinguish a user-initiated update reload from a first-time
 * SW activation (which should not auto-reload the page).
 */
export const swState = {
  updateInitiated: false,
};

/**
 * Custom window event dispatched when a new service worker is waiting to activate.
 * The event detail is the ServiceWorkerRegistration that holds the waiting worker.
 */
export const SW_UPDATE_EVENT = "sw-update-waiting" as const;
