/** Server-side first-seen timestamps keyed by sessionId. */
const firstSeenStore = new Map<string, number>();

/**
 * Records first-seen timestamp for a session (no-op if already recorded).
 * Returns the first-seen timestamp in ms.
 */
export function touchSessionFirstSeen(sessionId: string): number {
  if (!firstSeenStore.has(sessionId)) {
    firstSeenStore.set(sessionId, Date.now());
  }
  return firstSeenStore.get(sessionId)!;
}

/**
 * Returns server-computed days-with-app for a session (1-based).
 * If the session has never been seen, it records now and returns 1.
 */
export function getServerDaysWithApp(sessionId: string): number {
  const first = touchSessionFirstSeen(sessionId);
  const ms = Date.now() - first;
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}
