import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_ID_KEY = "sp_session_id";
const USER_NAME_KEY = "sp_user_name";
const NAME_PROMPTED_KEY = "sp_name_prompted";
const SUBSCRIBER_EMAIL_KEY = "sp_subscribed_email";
const EMAIL_SUBSCRIBED_KEY = "sp_email_subscribed";

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
  const subscriberEmail = (await AsyncStorage.getItem(SUBSCRIBER_EMAIL_KEY)) ?? "";
  const emailSubscribed = (await AsyncStorage.getItem(EMAIL_SUBSCRIBED_KEY)) === "true";
  return { sessionId, name, prompted, subscriberEmail, emailSubscribed };
}

export async function saveNativeUserProfile(
  sessionId: string,
  name: string,
  prompted: boolean,
): Promise<void> {
  if (sessionId) await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
  if (name.trim()) await AsyncStorage.setItem(USER_NAME_KEY, name.trim());
  else await AsyncStorage.removeItem(USER_NAME_KEY);
  if (prompted) await AsyncStorage.setItem(NAME_PROMPTED_KEY, "true");
  else await AsyncStorage.removeItem(NAME_PROMPTED_KEY);
}

export async function saveNativeSubscriberProfile(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return;
  await AsyncStorage.setItem(SUBSCRIBER_EMAIL_KEY, normalized);
  await AsyncStorage.setItem(EMAIL_SUBSCRIBED_KEY, "true");
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
    if(sid){localStorage.setItem('sp_session_id',sid);document.cookie='sp_session_id='+encodeURIComponent(sid)+';path=/;max-age=63072000;SameSite=Lax;Secure';}
    if(nm){localStorage.setItem('sp_user_name',nm);document.cookie='sp_user_name='+encodeURIComponent(nm)+';path=/;max-age=63072000;SameSite=Lax;Secure';}
    if(pr==='true'){localStorage.setItem('sp_name_prompted','true');document.cookie='sp_name_prompted=true;path=/;max-age=63072000;SameSite=Lax;Secure';}
    if(sub==='true'&&em&&em.indexOf('@')>0){
      localStorage.setItem('sp-email-subscribed','true');
      localStorage.setItem('sp-subscribed-email',em);
      document.cookie='sp_email_subscribed=true;path=/;max-age=63072000;SameSite=Lax;Secure';
      document.cookie='sp_subscriber_email='+encodeURIComponent(em)+';path=/;max-age=63072000;SameSite=Lax;Secure';
      try{
        sessionStorage.setItem('sp-email-subscribed','true');
        sessionStorage.setItem('sp-subscribed-email',em);
      }catch(e){}
    }
  }catch(e){}
  true;
})();`;
}
