/**
 * Shared mutable state for service worker lifecycle coordination.
 * Used to distinguish a user-initiated update reload from a first-time
 * SW activation (which should not auto-reload the page).
 */
export const swState = {
  updateInitiated: false,
};
