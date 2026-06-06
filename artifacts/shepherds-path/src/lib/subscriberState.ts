const EMAIL_SUBSCRIBED_KEY = "sp-email-subscribed";
const SUBSCRIBED_EMAIL_KEY = "sp-subscribed-email";
const NOTIF_PREFS_KEY = "sp_notif_prefs";
const COOKIE_MAX_AGE = 63072000;

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

export function isEmailSubscribedLocally(): boolean {
  try {
    if (localStorage.getItem(EMAIL_SUBSCRIBED_KEY) === "true") return true;
    if (readCookie("sp_email_subscribed") === "true") return true;
    const prefs = readNotifPrefs();
    if (prefs.emailSubscribed && prefs.email?.includes("@")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function getStoredSubscriberEmail(): string | null {
  try {
    const fromKey = localStorage.getItem(SUBSCRIBED_EMAIL_KEY)?.trim().toLowerCase();
    if (fromKey?.includes("@")) return fromKey;

    const fromCookie = readCookie("sp_subscriber_email")?.trim().toLowerCase();
    if (fromCookie?.includes("@")) return fromCookie;

    const prefsEmail = readNotifPrefs().email?.trim().toLowerCase();
    if (prefsEmail?.includes("@")) return prefsEmail;
  } catch {
    /* ignore */
  }
  return null;
}

/** Persist subscriber state everywhere this app stores identity hints. */
export function persistSubscriberState(email: string): void {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return;

  try {
    localStorage.setItem(EMAIL_SUBSCRIBED_KEY, "true");
    localStorage.setItem(SUBSCRIBED_EMAIL_KEY, normalized);
    writeCookie("sp_email_subscribed", "true");
    writeCookie("sp_subscriber_email", normalized);

    const current = readNotifPrefs();
    localStorage.setItem(
      NOTIF_PREFS_KEY,
      JSON.stringify({ ...current, email: normalized, emailSubscribed: true }),
    );
  } catch {
    /* ignore */
  }

  try {
    window.dispatchEvent(new Event("sp-email-subscription-updated"));
  } catch {
    /* ignore */
  }
}
