let memorySessionId: string | null = null;

const SESSION_KEY = "sp_session_id";
const SESSION_COOKIE = "sp_session_id";

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
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=63072000; SameSite=Lax${secure}`;
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

function persistSessionId(id: string): void {
  memorySessionId = id;
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore */
  }
  writeSessionMirror(id);
  writeCookie(SESSION_COOKIE, id);
}

export function getSessionId(): string {
  if (memorySessionId) return memorySessionId;

  try {
    let id = localStorage.getItem(SESSION_KEY);
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
