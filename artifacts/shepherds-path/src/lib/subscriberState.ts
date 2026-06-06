import { getUserName, hasBeenPrompted } from "@/lib/userName";
import { isNativeWebViewShell } from "@/lib/platform";
import { getSessionId } from "@/lib/session";
import { writeSubscriberCookie } from "@/lib/subscriberCookie";
import { setConfirmedSubscriberEmail } from "@/lib/dailyEmailState";

const EMAIL_SUBSCRIBED_KEY = "sp-email-subscribed";
const SUBSCRIBED_EMAIL_KEY = "sp-subscribed-email";
const NOTIF_PREFS_KEY = "sp_notif_prefs";
const IDB_NAME = "sp_subscriber_idb";
const IDB_STORE = "state";
const IDB_KEY = "profile";

let memorySubscribed = false;
let memoryEmail: string | null = null;
let idbReady: Promise<void> | null = null;

type SubscriberBootstrap = {
  subscribed?: boolean;
  email?: string;
  sessionId?: string;
};

function readBootstrapSubscriber(): SubscriberBootstrap | null {
  try {
    const boot = (window as Window & { __SP_SUBSCRIBER_BOOT__?: SubscriberBootstrap })
      .__SP_SUBSCRIBER_BOOT__;
    if (boot?.email?.includes("@")) return boot;
  } catch {
    /* ignore */
  }
  return null;
}

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
  writeSubscriberCookie(name, value);
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

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

async function writeIdbProfile(email: string): Promise<void> {
  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put({ email, subscribed: true }, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

async function readIdbProfile(): Promise<{ email?: string; subscribed?: boolean } | null> {
  try {
    const db = await openIdb();
    const value = await new Promise<{ email?: string; subscribed?: boolean } | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as { email?: string; subscribed?: boolean } | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  } catch {
    return null;
  }
}

function notifyNativeSubscriberProfile(email: string): void {
  if (!isNativeWebViewShell()) return;
  try {
    const bridge = (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView;
    if (!bridge) return;
    const sessionId = getSessionId();
    const payload = JSON.stringify({
      type: "sp_subscriber_profile",
      sessionId,
      email,
      subscribed: true,
    });
    bridge.postMessage(payload);
    bridge.postMessage(
      JSON.stringify({
        type: "sp_user_profile",
        sessionId,
        name: getUserName() ?? "",
        prompted: hasBeenPrompted(),
        subscriberEmail: email,
      }),
    );
  } catch {
    /* ignore */
  }
}

/** iOS shell: ask native app for saved email (AsyncStorage) before React boots. */
export function requestNativeSubscriberBootstrap(): Promise<void> {
  if (!isNativeWebViewShell()) return Promise.resolve();
  const win = window as Window & {
    __spNativeProfilePromise?: Promise<void>;
    __spResolveNativeProfile?: (profile: NativeProfilePayload | null) => void;
    ReactNativeWebView?: { postMessage: (s: string) => void };
  };
  if (win.__spNativeProfilePromise) return win.__spNativeProfilePromise;

  win.__spNativeProfilePromise = new Promise((resolve) => {
    win.__spResolveNativeProfile = (profile) => {
      if (profile?.subscriberEmail?.includes("@")) {
        setConfirmedSubscriberEmail(profile.subscriberEmail);
        persistSubscriberState(profile.subscriberEmail);
      } else if (profile?.sessionId) {
        try {
          localStorage.setItem("sp_session_id", profile.sessionId);
          writeSubscriberCookie("sp_session_id", profile.sessionId);
        } catch {
          /* ignore */
        }
      }
      resolve();
    };
    try {
      win.ReactNativeWebView?.postMessage(JSON.stringify({ type: "sp_request_native_profile" }));
    } catch {
      resolve();
    }
    window.setTimeout(() => resolve(), 1500);
  });

  return win.__spNativeProfilePromise;
}

export type NativeProfilePayload = {
  sessionId?: string;
  subscriberEmail?: string;
  emailSubscribed?: boolean;
};

/** Read `?se=` param injected by iOS shell on each cold start. */
export function hydrateSubscriberFromUrlParam(): boolean {
  try {
    const se = new URLSearchParams(window.location.search).get("se");
    const normalized = se ? normalizeEmail(se) : null;
    if (!normalized) return false;
    persistSubscriberState(normalized);
    return true;
  } catch {
    return false;
  }
}

/** Restore local hints from cookies/sessionStorage/IndexedDB. */
export function hydrateSubscriberStateFromStorage(): boolean {
  let restored = false;

  try {
    const bootstrap = readBootstrapSubscriber();
    if (bootstrap?.email) {
      persistSubscriberState(bootstrap.email);
      return true;
    }

    hydrateSubscriberFromUrlParam();

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
        notifyNativeSubscriberProfile(email);
      }
    }
  } catch {
    /* ignore */
  }

  return restored;
}

export async function hydrateSubscriberStateFromIndexedDB(): Promise<boolean> {
  if (idbReady) await idbReady;
  idbReady = (async () => {
    const profile = await readIdbProfile();
    if (profile?.email?.includes("@")) {
      persistSubscriberState(profile.email);
    }
  })();
  await idbReady;
  return isEmailSubscribedLocally();
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

  const bootstrapEmail = readBootstrapSubscriber()?.email;
  if (bootstrapEmail?.includes("@")) {
    memoryEmail = normalizeEmail(bootstrapEmail);
    if (memoryEmail) return memoryEmail;
  }

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
  setConfirmedSubscriberEmail(normalized);

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

  void writeIdbProfile(normalized);
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
