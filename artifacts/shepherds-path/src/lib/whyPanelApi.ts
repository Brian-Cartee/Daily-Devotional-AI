import { getSessionId } from "@/lib/session";
import type { WhyPanelState } from "@/lib/homeHeroState";

export async function fetchWhyPanelFromServer(): Promise<WhyPanelState | null> {
  try {
    const sessionId = getSessionId();
    const res = await fetch(
      `/api/client/why-panel?sessionId=${encodeURIComponent(sessionId)}`,
      { credentials: "same-origin" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<WhyPanelState>;
    return {
      autoShows: Math.max(0, Number(data.autoShows) || 0),
      dismissals: Math.max(0, Number(data.dismissals) || 0),
      done: data.done === true,
    };
  } catch {
    return null;
  }
}

export function pushWhyPanelToServer(state: WhyPanelState): void {
  const body = JSON.stringify({
    sessionId: getSessionId(),
    autoShows: state.autoShows,
    dismissals: state.dismissals,
    done: state.done,
  });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        "/api/client/why-panel",
        new Blob([body], { type: "application/json" }),
      );
      if (ok) return;
    }
  } catch {
    /* fall through */
  }
  void fetch("/api/client/why-panel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {});
}
