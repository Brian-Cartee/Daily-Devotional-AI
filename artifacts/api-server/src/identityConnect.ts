import { z } from "zod";

export const PLACEHOLDER_PRO_EMAILS = new Set(["apple-iap", "play-verified"]);

export const identityConnectSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  sessionId: z.string().min(8),
  name: z.string().max(80).optional(),
  socialHandle: z.string().max(64).optional(),
  source: z.string().max(64).optional(),
  subscribeDaily: z.boolean().optional().default(true),
});

export const mobileSyncProSchema = z.object({
  sessionId: z.string().min(8),
  isPro: z.boolean(),
  platform: z.enum(["ios", "android"]).default("ios"),
  expiresAt: z.string().datetime().optional(),
});

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function normalizeSocialHandle(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/^@+/, "").slice(0, 64);
  return trimmed || undefined;
}

export function isRealEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  if (PLACEHOLDER_PRO_EMAILS.has(normalized)) return false;
  return normalized.includes("@");
}
