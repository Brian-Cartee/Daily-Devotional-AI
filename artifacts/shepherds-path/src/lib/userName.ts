import { getSessionId } from "./session";

const USER_NAME_KEY = "sp_user_name";
const NAME_PROMPTED_KEY = "sp_name_prompted";
const VOICE_KEY = "sp_voice";

export function getUserName(): string | null {
  try {
    return localStorage.getItem(USER_NAME_KEY) || null;
  } catch {
    return null;
  }
}

export function setUserName(name: string): void {
  try {
    const trimmed = name.trim();
    localStorage.setItem(USER_NAME_KEY, trimmed);
    localStorage.setItem(NAME_PROMPTED_KEY, "true");
    const sessionId = getSessionId();
    fetch("/api/user-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, name: trimmed }),
    }).catch(() => {});
  } catch {}
}

export async function syncUserNameFromServer(): Promise<string | null> {
  try {
    const cached = localStorage.getItem(USER_NAME_KEY);
    if (cached) return cached;
    const sessionId = getSessionId();
    const res = await fetch(`/api/user-name?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    const data: { name: string | null } = await res.json();
    if (data.name) {
      localStorage.setItem(USER_NAME_KEY, data.name);
      localStorage.setItem(NAME_PROMPTED_KEY, "true");
    }
    return data.name;
  } catch {
    return null;
  }
}

export function markNamePrompted(): void {
  try {
    localStorage.setItem(NAME_PROMPTED_KEY, "true");
  } catch {}
}

export function hasBeenPrompted(): boolean {
  try {
    return !!localStorage.getItem(NAME_PROMPTED_KEY);
  } catch {
    return false;
  }
}

export function getUserVoice(): string {
  try {
    const v = localStorage.getItem(VOICE_KEY);
    if (v === "onyx" || v === "shimmer") return v;
    return "shimmer";
  } catch {
    return "shimmer";
  }
}

export function setUserVoice(voice: string): void {
  try {
    localStorage.setItem(VOICE_KEY, voice);
  } catch {}
}
