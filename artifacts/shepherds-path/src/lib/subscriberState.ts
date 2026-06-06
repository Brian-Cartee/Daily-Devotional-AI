import { isNativeWebViewShell } from "@/lib/platform";
import { getSessionId } from "@/lib/session";

const EMAIL_SUBSCRIBED_KEY = "sp-email-subscribed";
const SUBSCRIBED_EMAIL_KEY = "sp-subscribed-email";
const NOTIF_PREFS_KEY = "sp_notif_prefs";
const COOKIE_MAX_AGE = 63072000;

let memorySubscribed = false;
let memoryEmail: string | null = null;

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
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
    /* ignore */
  }
}

function readNotifPrefs(): { email?: string; emailSubscribed?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) || "{}") as {
      email?: string;
      emailSubscribed?: boolean;
    };
  } catch {
    return {};
  }
}

function normalizeEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  return normalized.includes("@") ? normalized : null;
}

function notifyNativeSubscriberProfile(email: string): void {
  if (!isNativeWebViewShell()) return;
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "sp_subscriber_profile",
        sessionId: getSessionId(),
        email,
        subscribed: true,
      }),
    );
  } catch {
    /* ignore */
  }
}

/** Restore local hints from cookies/sessionStorage (survives some WebView resets). */
export function hydrateSubscriberStateFromStorage(): boolean {
  let restored = false;

  try {
    const cookieSubscribed = readCookie("sp_email_subscribed") === "true";
    const cookieEmail = normalizeEmail(readCookie("sp_subscriber_email") ?? "");
    const mirrorSubscribed =
      readSessionMirror(EMAIL_SUBSCRIBED_KEY) === "true" ||
      readSessionMirror("sp_email_subscribed") === "true";
    const mirrorEmail = normalizeEmail(
      readSessionMirror(SUBSCRIBED_EMAIL_KEY) ?? readSessionMirror("sp_subscriber_email") ?? "",
    );

    const email = cookieEmail ?? mirrorEmail;
    const subscribed =
      cookieSubscribed ||
      mirrorSubscribed ||
      localStorage.getItem(EMAIL_SUBSCRIBED_KEY) === "true";

    if (email) {
      memoryEmail = email;
      restored = true;
      try {
        localStorage.setItem(SUBSCRIBED_EMAIL_KEY, email);
      } catch {
        /* ignore */
      }
    }

    if (subscribed || email) {
      memorySubscribed = true;
      restored = true;
      try {
        localStorage.setItem(EMAIL_SUBSCRIBED_KEY, "true");
      } catch {
        /* ignore */
      }
      if (email) {
        writeCookie("sp_email_subscribed", "true");
        writeCookie("sp_subscriber_email", email);
        writeSessionMirror(EMAIL_SUBSCRIBED_KEY, "true");
        writeSessionMirror(SUBSCRIBED_EMAIL_KEY, email);
      }
    }
  } catch {
    /* ignore */
  }

  return restored;
}

export function isEmailSubscribedLocally(): boolean {
  if (memorySubscribed) return true;
  try {
    if (localStorage.getItem(EMAIL_SUBSCRIBED_KEY) === "true") {
      memorySubscribed = true;
      return true;
    }
    if (readCookie("sp_email_subscribed") === "true") {
      memorySubscribed = true;
      return true;
    }
    if (
      readSessionMirror(EMAIL_SUBSCRIBED_KEY) === "true" ||
      readSessionMirror("sp_email_subscribed") === "true"
    ) {
      memorySubscribed = true;
      return true;
    }
    const prefs = readNotifPrefs();
    if (prefs.emailSubscribed && prefs.email?.includes("@")) {
      memorySubscribed = true;
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function getStoredSubscriberEmail(): string | null {
  if (memoryEmail?.includes("@")) return memoryEmail;

  try {
    const fromKey = normalizeEmail(localStorage.getItem(SUBSCRIBED_EMAIL_KEY) ?? "");
    if (fromKey) {
      memoryEmail = fromKey;
      return fromKey;
    }

    const fromCookie = normalizeEmail(readCookie("sp_subscriber_email") ?? "");
    if (fromCookie) {
      memoryEmail = fromCookie;
      try {
        localStorage.setItem(SUBSCRIBED_EMAIL_KEY, fromCookie);
      } catch {
        /* ignore */
      }
      return fromCookie;
    }

    const fromMirror = normalizeEmail(
      readSessionMirror(SUBSCRIBED_EMAIL_KEY) ?? readSessionMirror("sp_subscriber_email") ?? "",
    );
    if (fromMirror) {
      memoryEmail = fromMirror;
      try {
        localStorage.setItem(SUBSCRIBED_EMAIL_KEY, fromMirror);
      } catch {
        /* ignore */
      }
      return fromMirror;
    }

    const prefsEmail = normalizeEmail(readNotifPrefs().email ?? "");
    if (prefsEmail) {
      memoryEmail = prefsEmail;
      return prefsEmail;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Persist subscriber state everywhere this app stores identity hints. */
export function persistSubscriberState(email: string): void {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  memorySubscribed = true;
  memoryEmail = normalized;

  try {
    localStorage.setItem(EMAIL_SUBSCRIBED_KEY, "true");
    localStorage.setItem(SUBSCRIBED_EMAIL_KEY, normalized);
    writeCookie("sp_email_subscribed", "true");
    writeCookie("sp_subscriber_email", normalized);
    writeSessionMirror(EMAIL_SUBSCRIBED_KEY, "true");
    writeSessionMirror(SUBSCRIBED_EMAIL_KEY, normalized);
    writeSessionMirror("sp_email_subscribed", "true");
    writeSessionMirror("sp_subscriber_email", normalized);

    const current = readNotifPrefs();
    localStorage.setItem(
      NOTIF_PREFS_KEY,
      JSON.stringify({ ...current, email: normalized, emailSubscribed: true }),
    );
  } catch {
    /* ignore */
  }

  notifyNativeSubscriberProfile(normalized);

  try {
    window.dispatchEvent(new Event("sp-email-subscription-updated"));
  } catch {
    /* ignore */
  }
}

/** Called from native shell bootstrap — seed WebView storage before React runs. */
export function applyNativeSubscriberSeed(email: string | null | undefined): void {
  const normalized = email ? normalizeEmail(email) : null;
  if (!normalized) return;
  persistSubscriberState(normalized);
}
