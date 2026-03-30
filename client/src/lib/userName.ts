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
    localStorage.setItem(USER_NAME_KEY, name.trim());
    localStorage.setItem(NAME_PROMPTED_KEY, "true");
  } catch {}
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
