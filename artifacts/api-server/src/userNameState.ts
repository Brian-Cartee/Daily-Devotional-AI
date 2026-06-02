/** Persist name + “already asked” across iOS WebView storage clears (per sessionId). */

import type { EmotionPattern } from "@workspace/db";
import { storage } from "./storage";

const PROMPTED_KEY = "__namePrompted";

function encodePrompted(): EmotionPattern {
  return { count: 1, lastSeen: JSON.stringify({ prompted: true }) };
}

function decodePrompted(raw: EmotionPattern | undefined): boolean {
  if (!raw) return false;
  if ((raw.count ?? 0) >= 1) return true;
  try {
    const o = JSON.parse(raw.lastSeen ?? "{}") as { prompted?: boolean };
    return o.prompted === true;
  } catch {
    return false;
  }
}

export async function getNamePromptedOnServer(sessionId: string): Promise<boolean> {
  const row = await storage.getUserMemory(sessionId);
  if (!row?.emotionalPatterns) return false;
  const patterns = row.emotionalPatterns as Record<string, EmotionPattern>;
  return decodePrompted(patterns[PROMPTED_KEY]);
}

export async function setNamePromptedOnServer(sessionId: string): Promise<void> {
  const row = await storage.getUserMemory(sessionId);
  const patterns = {
    ...(row?.emotionalPatterns ?? {}),
    [PROMPTED_KEY]: encodePrompted(),
  } as Record<string, EmotionPattern>;
  await storage.upsertUserMemory(sessionId, { emotionalPatterns: patterns });
}
