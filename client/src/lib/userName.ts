const USER_NAME_KEY = "sp_user_name";
const NAME_PROMPTED_KEY = "sp_name_prompted";
const GENDER_KEY = "sp_gender";

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

export type UserGender = "male" | "female" | "unset";

export function getUserGender(): UserGender {
  try {
    const g = localStorage.getItem(GENDER_KEY);
    if (g === "male" || g === "female") return g;
    return "unset";
  } catch {
    return "unset";
  }
}

export function setUserGender(gender: UserGender): void {
  try {
    localStorage.setItem(GENDER_KEY, gender);
  } catch {}
}

/**
 * Returns the TTS voice to use based on the stored gender preference.
 * Men hear a female voice (nova), women hear a male voice (onyx).
 */
export function getUserVoice(): string {
  const gender = getUserGender();
  if (gender === "male") return "nova";
  if (gender === "female") return "onyx";
  return "onyx";
}
