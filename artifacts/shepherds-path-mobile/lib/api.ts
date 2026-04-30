import { Platform } from "react-native";
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || (Platform.OS !== "web" ? "https://www.shepherdspathai.com" : "");

export async function fetchBible(): Promise<{ reference: string; text: string; verses?: any[] }> {
  const res = await fetch(`${API_BASE}/api/bible`);
  if (!res.ok) throw new Error("Failed to fetch bible verse");
  return res.json();
}

export async function fetchDailyArt(): Promise<{ imageUrl: string | null; reference: string; verse: string; reflection: string }> {
  const res = await fetch(`${API_BASE}/api/daily-art`);
  if (!res.ok) throw new Error("Failed to fetch daily art");
  const data = await res.json();
  // Normalize field names and make imageUrl absolute
  const imageUrl = data.imageUrl
    ? (data.imageUrl.startsWith("http") ? data.imageUrl : `${API_BASE}${data.imageUrl}`)
    : null;
  return {
    ...data,
    imageUrl,
    verse: data.verse ?? data.scripture ?? "",
    reflection: data.reflection ?? "",
  };
}

export async function fetchStreak(sessionId: string): Promise<{ currentStreak: number; longestStreak: number }> {
  const res = await fetch(`${API_BASE}/api/streak?sessionId=${sessionId}`);
  if (!res.ok) return { currentStreak: 0, longestStreak: 0 };
  return res.json();
}

export async function recordStreak(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/streak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export const PRAYER_CATEGORIES = [
  "Anxiety / Fear", "Family", "Healing", "Grief", "Marriage / Relationship",
  "Direction / Decision", "Financial Stress", "Loneliness", "Thanksgiving / Praise", "Other",
] as const;
export type PrayerCategory = typeof PRAYER_CATEGORIES[number];

export const ENCOURAGEMENT_ACTIONS = [
  { key: "prayed", label: "I prayed for you" },
  { key: "standing_with_you", label: "Standing with you" },
  { key: "not_alone", label: "You're not alone" },
  { key: "god_is_near", label: "God is near" },
] as const;
export type EncouragementAction = typeof ENCOURAGEMENT_ACTIONS[number]["key"];

export interface PrayerWallItem {
  id: number;
  sessionId: string;
  displayName: string | null;
  isAnonymous: boolean;
  request: string;
  category: PrayerCategory;
  status: "active" | "answered" | "hidden" | "removed";
  answeredText: string | null;
  answeredAt: string | null;
  createdAt: string;
  isOwner: boolean;
  encouragements: { prayed: number; standing_with_you: number; not_alone: number; god_is_near: number; total: number };
  myActions: EncouragementAction[];
}

export interface AnsweredPrayer {
  id: number;
  displayName: string | null;
  request: string;
  category: PrayerCategory;
  answeredText: string | null;
  answeredAt: string | null;
  createdAt: string;
}

export async function fetchPrayerWall(sessionId: string, category?: string): Promise<PrayerWallItem[]> {
  const params = new URLSearchParams({ sessionId });
  if (category) params.set("category", category);
  const res = await fetch(`${API_BASE}/api/prayer-wall?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAnsweredPrayers(): Promise<AnsweredPrayer[]> {
  const res = await fetch(`${API_BASE}/api/prayer-wall/answered`);
  if (!res.ok) return [];
  return res.json();
}

export async function submitPrayer(params: {
  request: string;
  sessionId: string;
  category?: PrayerCategory;
  isAnonymous?: boolean;
  displayName?: string;
  isPro?: boolean;
}): Promise<{ error?: string; crisis?: string; entry?: any }> {
  const res = await fetch(`${API_BASE}/api/prayer-wall`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (res.status === 422) {
    const data = await res.json();
    return { error: data.message, crisis: data.crisis };
  }
  if (res.status === 429) {
    const data = await res.json();
    return { error: data.message };
  }
  if (!res.ok) return { error: "submit_failed" };
  return { entry: await res.json() };
}

export async function encouragePrayer(id: number, sessionId: string, actionType: EncouragementAction, isPro: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/api/prayer-wall/${id}/encourage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, actionType, isPro }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error("encourage_failed"), { code: data.message });
  }
  return res.json();
}

export async function markPrayerAnswered(id: number, sessionId: string, answeredText?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/prayer-wall/${id}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, answeredText }),
  });
  if (!res.ok) throw new Error("Failed to mark prayer answered");
  return res.json();
}

export async function reportPrayer(id: number, sessionId: string, reason: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/prayer-wall/${id}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, reason }),
  });
  if (!res.ok) throw new Error("Failed to report prayer");
  return res.json();
}

export async function prayForEntry(id: number, sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/prayer-wall/${id}/pray`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error("Failed to pray for entry");
  return res.json();
}

export async function registerExpoPushToken(
  sessionId: string,
  token: string,
  hour: number,
  minute: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/expo-push-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, token, hour, minute }),
  });
  if (!res.ok) throw new Error(`Failed to register push token: ${res.status}`);
}

export async function unregisterExpoPushToken(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/expo-push-token/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to unregister push token: ${res.status}`);
}

// ── Sermon Mode ──────────────────────────────────────────────────────────────

export interface SermonChunkResult {
  text: string;
  scriptures: string[];
}

export async function analyzeSermonChunk(audioUri: string, mimeType: string = "audio/mp4"): Promise<SermonChunkResult> {
  const formData = new FormData();
  formData.append("audio", { uri: audioUri, name: "chunk.m4a", type: mimeType } as any);
  const res = await fetch(`${API_BASE}/api/sermon/chunk`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Chunk analysis failed");
  return res.json();
}

export interface SermonSessionSummary {
  id: number;
  title: string;
  startedAt: string;
  endedAt: string | null;
  scriptures: string[];
  durationSeconds: number | null;
}

export interface SermonSessionDetail extends SermonSessionSummary {
  transcript: string | null;
  keyPoints: string[];
  application: string | null;
}

export async function saveSermonSession(params: {
  sessionId: string;
  title: string;
  scriptures: string[];
  transcript?: string;
  keyPoints?: string[];
  application?: string;
  durationSeconds?: number;
}): Promise<SermonSessionDetail> {
  const res = await fetch(`${API_BASE}/api/sermon/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to save sermon session");
  return res.json();
}

export async function fetchSermonSessions(sessionId: string, limit?: number): Promise<SermonSessionSummary[]> {
  const params = new URLSearchParams({ sessionId });
  if (limit) params.set("limit", String(limit));
  const res = await fetch(`${API_BASE}/api/sermon/sessions?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSermonSession(id: number): Promise<SermonSessionDetail | null> {
  const res = await fetch(`${API_BASE}/api/sermon/sessions/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function summarizeSermonSession(id: number): Promise<SermonSessionDetail> {
  const res = await fetch(`${API_BASE}/api/sermon/sessions/${id}/summarize`, { method: "POST" });
  if (!res.ok) throw new Error("Summarization failed");
  return res.json();
}

export async function askSermon(sessionId: number, question: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/sermon/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, question }),
  });
  if (!res.ok) throw new Error("Failed to ask question");
  const data = await res.json();
  return data.answer;
}

// ── Prayer Mode ───────────────────────────────────────────────────────────────

export interface PrayerChunkResult {
  text: string;
  themes: string[];
}

export async function analyzePrayerChunk(audioUri: string, mimeType: string = "audio/mp4"): Promise<PrayerChunkResult> {
  const formData = new FormData();
  formData.append("audio", { uri: audioUri, name: "chunk.m4a", type: mimeType } as any);
  const res = await fetch(`${API_BASE}/api/prayer/chunk`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Prayer chunk analysis failed");
  return res.json();
}

export interface PrayerReflection {
  id: number;
  title: string;
  themes: string[];
  scriptureRef: string | null;
  scriptureText: string | null;
  reflection: string | null;
  transcript: string | null;
  durationSeconds: number | null;
  prayedAt: string;
}

export async function savePrayerRecording(params: {
  sessionId: string;
  transcript: string;
  themes: string[];
  durationSeconds?: number;
}): Promise<PrayerReflection> {
  const res = await fetch(`${API_BASE}/api/prayer/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to save prayer");
  return res.json();
}

export async function fetchPrayerRecordings(sessionId: string, limit?: number): Promise<PrayerReflection[]> {
  const params = new URLSearchParams({ sessionId });
  if (limit) params.set("limit", String(limit));
  const res = await fetch(`${API_BASE}/api/prayer/sessions?${params}`);
  if (!res.ok) return [];
  return res.json();
}
