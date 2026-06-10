import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const APP_ORIGIN = "https://www.shepherdspathai.com";
const SESSION_ID_KEY = "sp_session_id";
const USER_NAME_KEY = "sp_user_name";
const NAME_PROMPTED_KEY = "sp_name_prompted";
const SUBSCRIBER_EMAIL_KEY = "sp_subscribed_email";
const EMAIL_SUBSCRIBED_KEY = "sp_email_subscribed";
const SECURE_SUBSCRIBER_EMAIL_KEY = "sp_secure_subscriber_email";

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getOrCreateNativeSessionId(): Promise<string> {
  let id = await AsyncStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = newSessionId();
    await AsyncStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

async function readSecureSubscriberEmail(): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(SECURE_SUBSCRIBER_EMAIL_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function loadNativeUserProfile(): Promise<{
  sessionId: string;
  name: string;
  prompted: boolean;
  subscriberEmail: string;
  emailSubscribed: boolean;
}> {
  const sessionId = await getOrCreateNativeSessionId();
  const name = (await AsyncStorage.getItem(USER_NAME_KEY)) ?? "";
  const prompted =
    (await AsyncStorage.getItem(NAME_PROMPTED_KEY)) === "true" || !!name.trim();
  const secureEmail = await readSecureSubscriberEmail();
  const asyncEmail = (await AsyncStorage.getItem(SUBSCRIBER_EMAIL_KEY)) ?? "";
  const subscriberEmail = secureEmail || asyncEmail;
  const emailSubscribed =
    (await AsyncStorage.getItem(EMAIL_SUBSCRIBED_KEY)) === "true" ||
    !!subscriberEmail.trim();
  return { sessionId, name, prompted, subscriberEmail, emailSubscribed };
}

export type NativeUserProfilePatch = {
  sessionId?: string;
  name?: string;
  prompted?: boolean;
};

/** Merge partial profile updates — omitted fields are left unchanged. */
export async function mergeNativeUserProfile(
  patch: NativeUserProfilePatch,
): Promise<void> {
  const existing = await loadNativeUserProfile();
  const sessionId = patch.sessionId?.trim() || existing.sessionId;
  const name = patch.name !== undefined ? patch.name : existing.name;
  const prompted =
    patch.prompted !== undefined
      ? patch.prompted
      : existing.prompted || !!name.trim();

  if (sessionId) await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
  if (name.trim()) await AsyncStorage.setItem(USER_NAME_KEY, name.trim());
  else if (patch.name !== undefined) await AsyncStorage.removeItem(USER_NAME_KEY);
  if (prompted) await AsyncStorage.setItem(NAME_PROMPTED_KEY, "true");
  else if (patch.prompted === false) await AsyncStorage.removeItem(NAME_PROMPTED_KEY);
}

export async function saveNativeUserProfile(
  sessionId: string,
  name: string,
  prompted: boolean,
): Promise<void> {
  await mergeNativeUserProfile({ sessionId, name, prompted });
}

export async function saveNativeSubscriberProfile(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return;
  await AsyncStorage.setItem(SUBSCRIBER_EMAIL_KEY, normalized);
  await AsyncStorage.setItem(EMAIL_SUBSCRIBED_KEY, "true");
  try {
    await SecureStore.setItemAsync(SECURE_SUBSCRIBER_EMAIL_KEY, normalized);
  } catch {
    /* non-blocking — AsyncStorage remains fallback */
  }
}

type StatusResponse = { subscribed?: boolean; email?: string | null };

/** Ask the server if this device session (or saved email) is subscribed — runs outside the WebView. */
export async function fetchSubscriberEmailFromServer(
  sessionId: string,
  emailHint = "",
): Promise<string> {
  const hint = emailHint.trim().toLowerCase();
  const urls: string[] = [];
  if (sessionId && hint.includes("@")) {
    urls.push(
      `${APP_ORIGIN}/api/subscribe/status?sessionId=${encodeURIComponent(sessionId)}&email=${encodeURIComponent(hint)}`,
    );
  }
  if (sessionId) {
    urls.push(`${APP_ORIGIN}/api/subscribe/status?sessionId=${encodeURIComponent(sessionId)}`);
  }
  if (hint.includes("@")) {
    urls.push(`${APP_ORIGIN}/api/subscribe/status?email=${encodeURIComponent(hint)}`);
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) continue;
      const data = (await res.json()) as StatusResponse;
      const email = data.email?.trim().toLowerCase() ?? "";
      if (data.subscribed && email.includes("@")) {
        return email;
      }
    } catch {
      /* try next URL */
    }
  }
  return "";
}

/** Load native profile and restore subscriber email from server when local storage is empty. */
export async function prepareNativeUserProfileForWebView(): Promise<{
  sessionId: string;
  name: string;
  prompted: boolean;
  subscriberEmail: string;
  emailSubscribed: boolean;
}> {
  const profile = await loadNativeUserProfile();
  let email = profile.subscriberEmail.trim().toLowerCase();

  if (!email.includes("@")) {
    const fromServer = await fetchSubscriberEmailFromServer(profile.sessionId, email);
    if (fromServer) {
      await saveNativeSubscriberProfile(fromServer);
      email = fromServer;
    }
  }

  return {
    sessionId: profile.sessionId,
    name: profile.name,
    prompted: profile.prompted,
    subscriberEmail: email,
    emailSubscribed: profile.emailSubscribed || email.includes("@"),
  };
}

function jsString(value: string): string {
  return JSON.stringify(value);
}

/** Runs before page JS — keeps WebView session + name + email aligned with native storage. */
export function buildNativeProfileSeedJs(
  sessionId: string,
  name: string,
  prompted: boolean,
  subscriberEmail = "",
  emailSubscribed = false,
): string {
  const sid = jsString(sessionId);
  const nm = jsString(name.trim());
  const pr = prompted || !!name.trim() ? "true" : "false";
  const em = jsString(subscriberEmail.trim().toLowerCase());
  const sub = emailSubscribed || !!subscriberEmail.trim() ? "true" : "false";
  return `(function(){
  try{
    var sid=${sid};
    var nm=${nm};
    var pr=${pr};
    var em=${em};
    var sub=${sub};
    var dom=';path=/;max-age=63072000;SameSite=Lax;Secure;domain=.shepherdspathai.com';
    if(sid){localStorage.setItem('sp_session_id',sid);document.cookie='sp_session_id='+encodeURIComponent(sid)+dom;}
    if(nm){localStorage.setItem('sp_user_name',nm);document.cookie='sp_user_name='+encodeURIComponent(nm)+dom;}
    if(pr==='true'){localStorage.setItem('sp_name_prompted','true');document.cookie='sp_name_prompted=true'+dom;}
    if(sub==='true'&&em&&em.indexOf('@')>0){
      localStorage.setItem('sp-email-subscribed','true');
      localStorage.setItem('sp-subscribed-email',em);
      document.cookie='sp_email_subscribed=true'+dom;
      document.cookie='sp_subscriber_email='+encodeURIComponent(em)+dom;
      window.__SP_SUBSCRIBER_BOOT__={subscribed:true,email:em,sessionId:sid||''};
      try{
        sessionStorage.setItem('sp-email-subscribed','true');
        sessionStorage.setItem('sp-subscribed-email',em);
      }catch(e){}
    }
    if(sid){window.__SP_SESSION_BOOT__=sid;}
  }catch(e){}
  true;
})();`;
}

/** After page load, pull any subscriber email from WebView storage into native Keychain. */
export const SCRAPE_WEB_SUBSCRIBER_JS = `(function(){
  try{
    function readCookie(n){try{var m=document.cookie.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?decodeURIComponent(m[1]):'';}catch(e){return '';}}
    var em=(localStorage.getItem('sp-subscribed-email')||readCookie('sp_subscriber_email')||'').trim().toLowerCase();
    if(em.indexOf('@')>0&&window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'sp_subscriber_profile',email:em,subscribed:true}));
    }
  }catch(e){}
  true;
})();`;
