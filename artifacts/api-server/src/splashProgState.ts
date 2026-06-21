/** Splash progression backup — survives iOS WKWebView localStorage/cookie wipes. */

import type { EmotionPattern } from "@workspace/db";
import { storage } from "./storage";

const SPLASH_PROG_KEY = "__splashProg";

export type ServerSplashProg = {
  v: 1;
  onboarding: number;
  dailyDate: string;
  dailyOpens: number;
  dailyFeature: number;
  dailySecond: number | null;
  lastImage: string | null;
};

function encodeProg(prog: ServerSplashProg): EmotionPattern {
  return { count: prog.onboarding, lastSeen: JSON.stringify(prog) };
}

function decodeProg(raw: EmotionPattern | undefined): ServerSplashProg | null {
  if (!raw?.lastSeen) return null;
  try {
    const parsed = JSON.parse(raw.lastSeen) as Partial<ServerSplashProg>;
    if (parsed.v !== 1 || typeof parsed.onboarding !== "number") return null;
    return {
      v: 1,
      onboarding: parsed.onboarding,
      dailyDate: parsed.dailyDate ?? "",
      dailyOpens: typeof parsed.dailyOpens === "number" ? parsed.dailyOpens : 0,
      dailyFeature: typeof parsed.dailyFeature === "number" ? parsed.dailyFeature : 0,
      dailySecond: typeof parsed.dailySecond === "number" ? parsed.dailySecond : null,
      lastImage: parsed.lastImage ?? null,
    };
  } catch {
    return null;
  }
}

export async function getSplashProgFromServer(sessionId: string): Promise<ServerSplashProg | null> {
  const row = await storage.getUserMemory(sessionId);
  if (!row?.emotionalPatterns) return null;
  const patterns = row.emotionalPatterns as Record<string, EmotionPattern>;
  return decodeProg(patterns[SPLASH_PROG_KEY]);
}

export async function setSplashProgOnServer(sessionId: string, prog: ServerSplashProg): Promise<void> {
  const row = await storage.getUserMemory(sessionId);
  const patterns = {
    ...(row?.emotionalPatterns ?? {}),
    [SPLASH_PROG_KEY]: encodeProg(prog),
  } as Record<string, EmotionPattern>;
  await storage.upsertUserMemory(sessionId, { emotionalPatterns: patterns });
}
