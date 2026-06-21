import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const APP_ORIGIN = "https://www.shepherdspathai.com";
const SESSION_ID_KEY = "sp_session_id";
const USER_NAME_KEY = "sp_user_name";
const NAME_PROMPTED_KEY = "sp_name_prompted";
const SUBSCRIBER_EMAIL_KEY = "sp_subscribed_email";
const EMAIL_SUBSCRIBED_KEY = "sp_email_subscribed";
const SECURE_SUBSCRIBER_EMAIL_KEY = "sp_secure_subscriber_email";
const SPLASH_COUNT_KEY = "sp_native_splash_count";
const DAILY_SPLASH_KEY = "sp_native_daily_splash";
const SPLASH_PROG_KEY = "sp_native_splash_prog";
const HEART_LAST_SHOWN_KEY = "sp_native_heart_last_shown";
const HEART_STATE_KEY = "sp_native_heart_state";

export type NativeDailySplashState = {
  date: string;
  count: number;
  featureIdx: number;
  secondIdx: number | null;
};

function parseNativeDailySplash(raw: string | null): NativeDailySplashState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<NativeDailySplashState>;
    if (!parsed.date || typeof parsed.count !== "number") return null;
    return {
      date: parsed.date,
      count: parsed.count,
      featureIdx: typeof parsed.featureIdx === "number" ? parsed.featureIdx : 0,
      secondIdx:
        typeof parsed.secondIdx === "number" && !Number.isNaN(parsed.secondIdx)
          ? parsed.secondIdx
          : null,
    };
  } catch {
    return null;
  }
}

export type NativeHeartState = {
  weather: string;
  topic: string | null;
  ts: number;
};

function parseNativeHeartState(raw: string | null): NativeHeartState | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as NativeHeartState;
    if (typeof o.weather === "string" && typeof o.ts === "number") {
      return { weather: o.weather, topic: o.topic ?? null, ts: o.ts };
    }
  } catch {
    /* invalid */
  }
  return null;
}

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
  splashCount: number;
  dailySplash: NativeDailySplashState | null;
  splashProg: string | null;
  heartLastShown: number;
  heartState: NativeHeartState | null;
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
  const splashCount = parseInt((await AsyncStorage.getItem(SPLASH_COUNT_KEY)) ?? "0", 10) || 0;
  const dailySplash = parseNativeDailySplash(await AsyncStorage.getItem(DAILY_SPLASH_KEY));
  const splashProg = (await AsyncStorage.getItem(SPLASH_PROG_KEY)) ?? null;
  const heartLastShown = parseInt((await AsyncStorage.getItem(HEART_LAST_SHOWN_KEY)) ?? "0", 10) || 0;
  const heartState = parseNativeHeartState(await AsyncStorage.getItem(HEART_STATE_KEY));
  return { sessionId, name, prompted, subscriberEmail, emailSubscribed, splashCount, dailySplash, splashProg, heartLastShown, heartState };
}

export async function saveNativeUiState(patch: {
  splashCount?: number;
  dailySplash?: NativeDailySplashState | null;
  splashProg?: string | null;
  heartLastShown?: number;
  heartState?: NativeHeartState | null;
}): Promise<void> {
  if (patch.splashCount !== undefined) {
    await AsyncStorage.setItem(SPLASH_COUNT_KEY, String(patch.splashCount));
  }
  if (patch.dailySplash !== undefined) {
    if (patch.dailySplash) {
      await AsyncStorage.setItem(DAILY_SPLASH_KEY, JSON.stringify(patch.dailySplash));
    } else {
      await AsyncStorage.removeItem(DAILY_SPLASH_KEY);
    }
  }
  if (patch.splashProg !== undefined) {
    if (patch.splashProg) {
      await AsyncStorage.setItem(SPLASH_PROG_KEY, patch.splashProg);
    } else {
      await AsyncStorage.removeItem(SPLASH_PROG_KEY);
    }
  }
  if (patch.heartLastShown !== undefined) {
    await AsyncStorage.setItem(HEART_LAST_SHOWN_KEY, String(patch.heartLastShown));
  }
  if (patch.heartState !== undefined) {
    if (patch.heartState) {
      await AsyncStorage.setItem(HEART_STATE_KEY, JSON.stringify(patch.heartState));
    } else {
      await AsyncStorage.removeItem(HEART_STATE_KEY);
    }
  }
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
  splashCount: number;
  dailySplash: NativeDailySplashState | null;
  splashProg: string | null;
  heartLastShown: number;
  heartState: NativeHeartState | null;
}> {
  const profile = await loadNativeUserProfile();
  const email = profile.subscriberEmail.trim().toLowerCase();

  // Restore email from server in background — don't block WebView cold start.
  if (!email.includes("@")) {
    void fetchSubscriberEmailFromServer(profile.sessionId, email).then((fromServer) => {
      if (fromServer) void saveNativeSubscriberProfile(fromServer);
    });
  }

  return {
    sessionId: profile.sessionId,
    name: profile.name,
    prompted: profile.prompted,
    subscriberEmail: email,
    emailSubscribed: profile.emailSubscribed || email.includes("@"),
    splashCount: profile.splashCount,
    dailySplash: profile.dailySplash,
    splashProg: profile.splashProg,
    heartLastShown: profile.heartLastShown,
    heartState: profile.heartState,
  };
}

function jsString(value: string): string {
  return JSON.stringify(value);
}

/** Runs before page JS — keeps WebView session + name + email + UI state aligned with native storage. */
export function buildNativeProfileSeedJs(
  sessionId: string,
  name: string,
  prompted: boolean,
  subscriberEmail = "",
  emailSubscribed = false,
  splashCount = 0,
  heartLastShown = 0,
  heartState: NativeHeartState | null = null,
  dailySplash: NativeDailySplashState | null = null,
  splashProg: string | null = null,
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
    var sc=${splashCount};
    if(sc>=0){
      localStorage.setItem('sp_brand_splash_count',String(sc));
      document.cookie='sp_bsc='+sc+dom;
    }
    var curSc=typeof window.__spNativeSplashCount==='number'?window.__spNativeSplashCount:0;
    window.__spNativeSplashCount=Math.max(sc,curSc);
    var ds=${JSON.stringify(dailySplash)};
    if(ds&&ds.date){
      window.__spNativeDailySplash=ds;
      localStorage.setItem('sp_daily_open_date',ds.date);
      localStorage.setItem('sp_daily_open_count',String(ds.count));
      localStorage.setItem('sp_daily_feature_idx',String(ds.featureIdx));
      if(ds.secondIdx!==null&&ds.secondIdx!==undefined){
        localStorage.setItem('sp_daily_second_idx',String(ds.secondIdx));
      }
      var dsc=encodeURIComponent(ds.date+'|'+ds.count+'|'+ds.featureIdx+'|'+(ds.secondIdx===null||ds.secondIdx===undefined?'':ds.secondIdx));
      document.cookie='sp_dsc='+dsc+';path=/;max-age=172800;SameSite=Lax;Secure';
    }else{
      window.__spNativeDailySplash=null;
    }
    var sp=${JSON.stringify(splashProg)};
    if(sp){
      try{
        localStorage.setItem('sp_splash_prog',sp);
        document.cookie='sp_splash_prog='+encodeURIComponent(sp)+dom;
        var pj=JSON.parse(sp);
        if(pj&&pj.v===1&&typeof pj.onboarding==='number'){
          localStorage.setItem('sp_brand_splash_count',String(pj.onboarding));
          document.cookie='sp_bsc='+pj.onboarding+dom;
        }
      }catch(e){}
    }
    window.__spNativeHeartLastShown=${heartLastShown};
    var hs=${JSON.stringify(heartState)};
    if(hs&&hs.weather&&hs.ts){
      window.__spNativeHeartState=hs;
      localStorage.setItem('sp_heart_current',JSON.stringify(hs));
      document.cookie='sp_hs='+encodeURIComponent(hs.weather+'|'+(hs.topic||'')+'|'+hs.ts)+dom;
    }else{
      window.__spNativeHeartState=null;
    }
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
