import { isNativeWebViewShell } from "@/lib/platform";

let memorySessionId: string | null = null;

const SESSION_KEY = "sp_session_id";
const SESSION_COOKIE = "sp_session_id";

type WindowWithBootstrap = Window & {
  __SP_SESSION_BOOT__?: string;
};

function readBootstrapSessionId(): string | null {
  try {
    const boot = (window as WindowWithBootstrap).__SP_SESSION_BOOT__?.trim();
    if (boot) return boot;
  } catch {
    /* ignore */
  }
  return null;
}

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string): void {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    const host = window.location.hostname;
    const domain = host.endsWith("shepherdspathai.com") ? "; domain=.shepherdspathai.com" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=63072000; SameSite=Lax${secure}${domain}`;
  } catch {
    /* ignore */
  }
}

function readSessionMirror(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSessionMirror(id: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore */
  }
}

function notifyNativeSessionId(id: string): void {
  if (!isNativeWebViewShell()) return;
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "sp_user_profile", sessionId: id, subscriberEmail: "" }),
    );
  } catch {
    /* ignore */
  }
}

function persistSessionId(id: string): void {
  memorySessionId = id;
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore */
  }
  writeSessionMirror(id);
  writeCookie(SESSION_COOKIE, id);
  try {
    (window as WindowWithBootstrap).__SP_SESSION_BOOT__ = id;
  } catch {
    /* ignore */
  }
  notifyNativeSessionId(id);
}

export function getSessionId(): string {
  if (memorySessionId) return memorySessionId;

  try {
    let id = readBootstrapSessionId();
    if (!id) id = localStorage.getItem(SESSION_KEY);
    if (!id) id = readSessionMirror();
    if (!id) id = readCookie(SESSION_COOKIE);
    if (!id) id = crypto.randomUUID();
    persistSessionId(id);
    return id;
  } catch {
    if (!memorySessionId) memorySessionId = crypto.randomUUID();
    return memorySessionId;
  }
}

/** Seed session from native shell before React boots. */
export function applyNativeSessionSeed(sessionId: string | null | undefined): void {
  const id = sessionId?.trim();
  if (!id) return;
  persistSessionId(id);
}
