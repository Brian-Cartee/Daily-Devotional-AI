import { getSessionId } from "./session";
import { isNativeWebViewShell } from "./platform";

const USER_NAME_KEY = "sp_user_name";
const NAME_PROMPTED_KEY = "sp_name_prompted";
const VOICE_KEY = "sp_voice";
const USER_NAME_COOKIE = "sp_user_name";
const NAME_PROMPTED_COOKIE = "sp_name_prompted";

let memoryName: string | null = null;
let memoryPrompted = false;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  try {
    const secure = location.protocol === "https:" ? ";Secure" : "";
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=63072000;SameSite=Lax${secure}`;
  } catch {
    /* noop */
  }
}

function readSessionMirror(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionMirror(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

function notifyNativeUserProfile(name: string | null, prompted: boolean): void {
  if (!isNativeWebViewShell()) return;
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "sp_user_profile",
        sessionId: getSessionId(),
        name: name ?? "",
        prompted,
      }),
    );
  } catch {
    /* noop */
  }
}

export function getUserName(): string | null {
  if (memoryName) return memoryName;
  try {
    const local = localStorage.getItem(USER_NAME_KEY);
    if (local) {
      memoryName = local;
      return local;
    }
    const mirror = readSessionMirror(USER_NAME_KEY);
    if (mirror) {
      memoryName = mirror;
      try {
        localStorage.setItem(USER_NAME_KEY, mirror);
      } catch {
        /* noop */
      }
      return mirror;
    }
    const cookie = readCookie(USER_NAME_COOKIE);
    if (cookie) {
      memoryName = cookie;
      try {
        localStorage.setItem(USER_NAME_KEY, cookie);
      } catch {
        /* noop */
      }
      return cookie;
    }
    return null;
  } catch {
    const cookie = readCookie(USER_NAME_COOKIE);
    if (cookie) memoryName = cookie;
    return cookie;
  }
}

function persistUserNameLocally(trimmed: string): void {
  memoryName = trimmed;
  memoryPrompted = true;
  try {
    localStorage.setItem(USER_NAME_KEY, trimmed);
    localStorage.setItem(NAME_PROMPTED_KEY, "true");
  } catch {
    /* noop */
  }
  writeSessionMirror(USER_NAME_KEY, trimmed);
  writeSessionMirror(NAME_PROMPTED_KEY, "true");
  writeCookie(USER_NAME_COOKIE, trimmed);
  writeCookie(NAME_PROMPTED_COOKIE, "true");
  notifyNativeUserProfile(trimmed, true);
}

function persistPromptedLocally(): void {
  memoryPrompted = true;
  try {
    localStorage.setItem(NAME_PROMPTED_KEY, "true");
  } catch {
    /* noop */
  }
  writeSessionMirror(NAME_PROMPTED_KEY, "true");
  writeCookie(NAME_PROMPTED_COOKIE, "true");
  notifyNativeUserProfile(memoryName, true);
}

async function postUserProfileToServer(trimmed: string | null, prompted: boolean): Promise<void> {
  const sessionId = getSessionId();
  const body: { sessionId: string; name?: string; prompted?: boolean } = { sessionId };
  if (trimmed) body.name = trimmed;
  if (prompted) body.prompted = true;
  await fetch("/api/user-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
    keepalive: true,
  });
}

export function setUserName(name: string): void {
  try {
    const trimmed = name.trim();
    if (!trimmed) return;
    persistUserNameLocally(trimmed);
    void postUserProfileToServer(trimmed, true).catch(() => {});
  } catch {}
}

/** Persist name locally and on the server (await server when possible). */
export async function setUserNameAsync(name: string): Promise<boolean> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return false;
    persistUserNameLocally(trimmed);
    await postUserProfileToServer(trimmed, true);
    return true;
  } catch {
    return !!getUserName();
  }
}

export async function syncUserNameFromServer(): Promise<string | null> {
  try {
    const sessionId = getSessionId();
    const res = await fetch(`/api/user-name?sessionId=${encodeURIComponent(sessionId)}`, {
      credentials: "same-origin",
    });
    if (!res.ok) return getUserName();
    const data: { name: string | null; prompted?: boolean } = await res.json();
    if (data.name) {
      persistUserNameLocally(data.name);
    } else if (data.prompted) {
      persistPromptedLocally();
    }
    return data.name ?? getUserName();
  } catch {
    return getUserName();
  }
}

/** Restore name from cookies/server before first devotional generation. */
export async function hydrateUserName(): Promise<{ name: string | null; prompted: boolean }> {
  await syncUserNameFromServer();
  return { name: getUserName(), prompted: hasBeenPrompted() };
}

export function markNamePrompted(): void {
  persistPromptedLocally();
  void postUserProfileToServer(null, true).catch(() => {});
}

export function hasBeenPrompted(): boolean {
  if (getUserName()) return true;
  if (memoryPrompted) return true;
  try {
    if (localStorage.getItem(NAME_PROMPTED_KEY)) {
      memoryPrompted = true;
      return true;
    }
    if (readSessionMirror(NAME_PROMPTED_KEY)) {
      memoryPrompted = true;
      return true;
    }
    const cookie = readCookie(NAME_PROMPTED_COOKIE);
    if (cookie) {
      memoryPrompted = true;
      try {
        localStorage.setItem(NAME_PROMPTED_KEY, "true");
      } catch {
        /* noop */
      }
      return true;
    }
    return false;
  } catch {
    return memoryPrompted || !!readCookie(NAME_PROMPTED_COOKIE);
  }
}

export function getUserVoice(): string {
  try {
    const v = localStorage.getItem(VOICE_KEY);
    if (v === "onyx" || v === "shimmer") return v;
    return "onyx";
  } catch {
    return "onyx";
  }
}

export function setUserVoice(voice: string): void {
  try {
    localStorage.setItem(VOICE_KEY, voice);
  } catch {}
}

/** Called from native shell bootstrap — seed WebView storage before React runs. */
export function applyNativeUserProfileSeed(
  sessionId: string | null | undefined,
  name: string | null | undefined,
  prompted: boolean | undefined,
): void {
  if (sessionId) {
    try {
      localStorage.setItem("sp_session_id", sessionId);
    } catch {
      /* noop */
    }
    writeCookie("sp_session_id", sessionId);
  }
  if (name?.trim()) {
    persistUserNameLocally(name.trim());
  } else if (prompted) {
    persistPromptedLocally();
  }
}
