/** Persisted “Why we built this” auto-show caps (per sessionId). */

import type { EmotionPattern } from "@workspace/db";
import { storage } from "./storage";

export type WhyPanelServerState = {
  autoShows: number;
  dismissals: number;
  done: boolean;
};

const PATTERN_KEY = "__whyPanel";
const MAX = 1;

function encode(state: WhyPanelServerState): EmotionPattern {
  const autoShows = Math.max(0, state.autoShows);
  const dismissals = Math.max(0, state.dismissals);
  const done =
    state.done || autoShows >= MAX || dismissals >= MAX;
  return {
    count: autoShows + dismissals * 10 + (done ? 10_000 : 0),
    lastSeen: JSON.stringify({ autoShows, dismissals, done }),
  };
}

function decode(raw: EmotionPattern | undefined): WhyPanelServerState | null {
  if (!raw?.lastSeen) return null;
  try {
    const o = JSON.parse(raw.lastSeen) as Partial<WhyPanelServerState>;
    const autoShows = Math.max(0, Number(o.autoShows) || 0);
    const dismissals = Math.max(0, Number(o.dismissals) || 0);
    const done =
      o.done === true ||
      autoShows >= MAX ||
      dismissals >= MAX ||
      (raw.count ?? 0) >= 10_000;
    return { autoShows, dismissals, done };
  } catch {
    return null;
  }
}

function merge(a: WhyPanelServerState, b: WhyPanelServerState): WhyPanelServerState {
  const autoShows = Math.max(a.autoShows, b.autoShows);
  const dismissals = Math.max(a.dismissals, b.dismissals);
  const done =
    a.done ||
    b.done ||
    autoShows >= MAX ||
    dismissals >= MAX;
  return { autoShows, dismissals, done };
}

export async function getWhyPanelServerState(
  sessionId: string,
): Promise<WhyPanelServerState | null> {
  const row = await storage.getUserMemory(sessionId);
  if (!row?.emotionalPatterns) return null;
  const patterns = row.emotionalPatterns as Record<string, EmotionPattern>;
  return decode(patterns[PATTERN_KEY]);
}

export async function saveWhyPanelServerState(
  sessionId: string,
  incoming: WhyPanelServerState,
): Promise<WhyPanelServerState> {
  const existing = (await getWhyPanelServerState(sessionId)) ?? {
    autoShows: 0,
    dismissals: 0,
    done: false,
  };
  const merged = merge(existing, incoming);
  const row = await storage.getUserMemory(sessionId);
  const patterns = {
    ...(row?.emotionalPatterns ?? {}),
    [PATTERN_KEY]: encode(merged),
  } as Record<string, EmotionPattern>;
  await storage.upsertUserMemory(sessionId, { emotionalPatterns: patterns });
  return merged;
}
