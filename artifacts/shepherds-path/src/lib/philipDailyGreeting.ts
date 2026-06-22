import { getSessionId } from "@/lib/session";
import { getUserName } from "@/lib/userName";
import { isProVerifiedLocally } from "@/lib/proStatus";

const CACHE_KEY = "sp_philip_greeting";
const CACHE_DATE_KEY = "sp_philip_greeting_date";
const DISMISSED_KEY = "sp_philip_greeting_dismissed";

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function timeOfDay(): "morning" | "midday" | "evening" | "night" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "midday";
  if (h < 21) return "evening";
  return "night";
}

export interface DailyGreeting {
  text: string;
  date: string;
}

export function getGreetingFromCache(): DailyGreeting | null {
  try {
    if (localStorage.getItem(CACHE_DATE_KEY) !== todayKey()) return null;
    const text = localStorage.getItem(CACHE_KEY);
    if (!text) return null;
    return { text, date: todayKey() };
  } catch {
    return null;
  }
}

export function cacheGreeting(text: string): void {
  try {
    localStorage.setItem(CACHE_KEY, text);
    localStorage.setItem(CACHE_DATE_KEY, todayKey());
  } catch { /* noop */ }
}

export function hasGreetingBeenDismissedToday(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === todayKey();
  } catch {
    return false;
  }
}

export function dismissGreetingToday(): void {
  try { localStorage.setItem(DISMISSED_KEY, todayKey()); } catch { /* noop */ }
}

export async function fetchDailyGreeting(): Promise<DailyGreeting | null> {
  const cached = getGreetingFromCache();
  if (cached) return cached;

  const sessionId = getSessionId() ?? "";
  const name = getUserName() ?? "";
  const tod = timeOfDay();

  const params = new URLSearchParams({
    sessionId,
    firstName: name,
    timeOfDay: tod,
  });

  try {
    const r = await fetch(`/api/philip/daily-greeting?${params}`);
    if (!r.ok) return null;
    const data = await r.json() as { text: string };
    if (!data.text) return null;
    cacheGreeting(data.text);
    return { text: data.text, date: todayKey() };
  } catch {
    return null;
  }
}

export async function speakDailyGreeting(text: string): Promise<HTMLAudioElement | null> {
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.trim(),
        voice: "onyx",
        scope: "guidance",
        sessionId: getSessionId(),
        isPro: isProVerifiedLocally(),
      }),
    });
    if (!r.ok) return null;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    return audio;
  } catch {
    return null;
  }
}
