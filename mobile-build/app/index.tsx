import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  NativeModules,
  Image,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { hideNativeSplashWhenWebReady } from "@/lib/native-splash";
import { formatDiagLines, type WebViewDiagEntry } from "@/lib/webview-diag";
import { injectApplePro, injectAppleMissionPartner, reloadEmbeddedWeb } from "@/lib/inject-pro";
import { syncMobileProToServer } from "@/lib/sync-mobile-pro";
import type { PhilipNativeVoiceController } from "@/lib/philipNativeVoice";
import { injectPhilipVoiceBridgeEnabled, injectPhilipVoiceEvent } from "@/lib/philipVoiceInject";
import {
  buildNativeProfileSeedJs,
  loadNativeUserProfile,
  prepareNativeUserProfileForWebView,
  mergeNativeUserProfile,
  saveNativeSubscriberProfile,
  saveNativeUiState,
  SCRAPE_WEB_SUBSCRIBER_JS,
} from "@/lib/native-profile";
import { useSubscription } from "@/lib/revenuecat";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { ShellWebView, type ShellWebViewHandlers } from "@/components/ShellWebView";

const APP_ORIGIN = "https://www.shepherdspathai.com";
// Sent as ?nv= param so the web page can enforce a minimum version.
// Update this every release — must match app.json version string.
const APP_VERSION = "2.2.4";

/** Open the live app directly — pass saved session + email so WebView can restore subscription state. */
function shellEntryUrl(subscriberEmail?: string, sessionId?: string): string {
  let url = `${APP_ORIGIN}/?native=1&enter=1`;
  // Always send the native binary version so the web page can enforce a
  // minimum version requirement and show "Please update" instead of
  // silently breaking on incompatible old binaries.
  url += `&nv=${encodeURIComponent(APP_VERSION)}`;
  const sid = sessionId?.trim();
  if (sid) {
    url += `&ssid=${encodeURIComponent(sid)}`;
  }
  const email = subscriberEmail?.trim().toLowerCase();
  if (email?.includes("@")) {
    url += `&se=${encodeURIComponent(email)}`;
  }
  return url;
}

const IN_APP_HOST_SUFFIXES = [
  "shepherdspathai.com",
  "youtube.com",
  "youtu.be",
  "googlevideo.com",
  "ytimg.com",
  "ggpht.com",
];

function hostAllowedInWebView(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol === "about:" || protocol === "blob:" || protocol === "data:") {
      return true;
    }
    if (protocol !== "https:" && protocol !== "http:") return false;
    const host = hostname.replace(/^www\./, "");
    return IN_APP_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

function buildNativeBootstrapJs(appOrigin: string, mainJs = ""): string {
  const origin = appOrigin.replace(/'/g, "\\'");
  const mainChunk = mainJs.replace(/'/g, "\\'");
  return `(function(){
  try{
    var b=window.ReactNativeWebView;
    if(!b){return true;}
    var ORIGIN='${origin}';
    var PAGE=ORIGIN+'/?native=1&enter=1';
    if(!location.href||location.href.indexOf('about:')===0){location.replace(PAGE);}
    function diag(event,detail){
      try{
        b.postMessage(JSON.stringify({type:'sp_diag',event:String(event||''),detail:String(detail||'').slice(0,500),ts:Date.now()}));
      }catch(e){}
    }
    if(!window.__spDiag){window.__spDiag=diag;}
    if(window.__spBootstrapDone){return true;}
    function absUrl(path){
      if(!path){return '';}
      if(/^https?:/i.test(path)){return path;}
      return ORIGIN+(path.charAt(0)==='/'?path:'/'+path);
    }
    function loadModule(src){
      var url=absUrl(src);
      if(!url||window.__spModuleSrc===url){return;}
      var existing=document.querySelector('script[type="module"]');
      if(existing){
        var ex=existing.getAttribute('src')||'';
        if(ex&&absUrl(ex)===url){diag('module_already_in_dom',url);window.__spModuleSrc=url;return;}
      }
      window.__spModuleSrc=url;
      diag('module_load_start',url);
      var s=document.createElement('script');
      s.type='module';
      s.src=url;
      s.addEventListener('load',function(){window.__spBootstrapDone=true;diag('module_script_loaded',url);});
      s.addEventListener('error',function(){
        if(window.__spBootstrapDone){diag('module_inject_error_ignored',url);return;}
        diag('module_script_error',url);
      });
      (document.head||document.documentElement).appendChild(s);
    }
    function fromDom(){
      var scripts=document.getElementsByTagName('script');
      var i;
      for(i=0;i<scripts.length;i++){
        if(scripts[i].type==='module'){return scripts[i].getAttribute('src');}
      }
      var links=document.getElementsByTagName('link');
      for(i=0;i<links.length;i++){
        if(links[i].rel==='modulepreload'&&links[i].href&&links[i].href.indexOf('/assets/index-')>=0){
          return links[i].getAttribute('href');
        }
      }
      return null;
    }
    if(document.querySelector('script[type="module"]')){
      diag('module_tag_in_html','skip inject');
      return true;
    }
    var domSrc=fromDom();
    if(domSrc){diag('module_from_dom',domSrc);loadModule(domSrc);return true;}
    var shellMain='${mainChunk}';
    if(shellMain){diag('module_from_native_shell',shellMain);loadModule(shellMain);return true;}
    diag('module_dom_missing','fetch manifest');
    fetch(ORIGIN+'/native-manifest.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){
      if(j&&j.mainJs){diag('module_from_manifest',j.mainJs);loadModule(j.mainJs);return;}
      throw new Error('empty manifest');
    }).catch(function(e1){
      diag('manifest_fetch_failed',String(e1));
      fetch(PAGE,{cache:'no-store'}).then(function(r){return r.text();}).then(function(html){
        var m=html.match(/modulepreload" href="(\\/assets\\/index-[^"]+\\.js)"/);
        if(m&&m[1]){diag('module_from_html',m[1]);loadModule(m[1]);return;}
        diag('html_parse_failed','no index chunk');
      }).catch(function(e2){diag('html_fetch_failed',String(e2));});
    });
  }catch(e){
    try{b.postMessage(JSON.stringify({type:'sp_diag',event:'bootstrap_error',detail:String(e),ts:Date.now()}));}catch(e3){}
  }
  true;
})();`;
}

function isBlankWebViewUrl(url: string): boolean {
  return !url || url === "about:blank" || url.startsWith("about:");
}

function shouldBootstrapWebView(url: string): boolean {
  if (isBlankWebViewUrl(url)) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "shepherdspathai.com" || host.endsWith(".shepherdspathai.com");
  } catch {
    return false;
  }
}

const PULL_DIAG_JS = `(function(){
  try{
    var logs=window.__spDiagLogs||[];
    var lines=logs.slice(-14).map(function(x){
      return x.event+(x.detail?': '+x.detail:'');
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type:'sp_diag_batch',
      lines:lines
    }));
  }catch(e){}
  true;
})();`;

export default function MainScreen() {
  const router = useRouter();
  const { isSubscribed, isMissionPartner, tier } = useSubscription();
  const webviewRef = useRef<WebView>(null);
  const wasSubscribedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const [entryUrl, setEntryUrl] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showSlowOptions, setShowSlowOptions] = useState(false);
  const [showStuckHelp, setShowStuckHelp] = useState(false);
  const [error, setError] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [showBlankRecovery, setShowBlankRecovery] = useState(false);
  const readyRef = useRef(false);
  const webUiConfirmedRef = useRef(false);
  const reloadCountRef = useRef(0);
  const diagLogsRef = useRef<WebViewDiagEntry[]>([]);
  const [diagSummary, setDiagSummary] = useState("");
  const [mainJsPath, setMainJsPath] = useState<string | null>(null);
  const mainJsPathRef = useRef<string | null>(null);
  const philipVoiceRef = useRef<PhilipNativeVoiceController | null>(null);
  const shellHandlersRef = useRef<ShellWebViewHandlers>({
    onMessage: () => {},
    onShouldStartLoadWithRequest: () => true,
    onLoadStart: () => {},
    onLoadProgress: () => {},
    onLoadEnd: () => {},
    onError: () => {},
    onHttpError: () => {},
    onNavigation: () => {},
    onContentProcessDidTerminate: () => {},
  });
  const philipVoiceLoadRef = useRef<Promise<PhilipNativeVoiceController> | null>(null);
  const webviewSessionStartedAtRef = useRef(0);
  const loadStartedRef = useRef(false);
  const bootReloadAttemptedRef = useRef(false);

  const injectDuringBoot = useCallback((js: string, delayMs = 300) => {
    setTimeout(() => {
      try {
        webviewRef.current?.injectJavaScript(js);
      } catch {
        /* noop */
      }
    }, delayMs);
  }, []);

  const deferInjectWebview = useCallback(
    (
      js: string,
      delayMs = 100,
      opts?: { requireUiReady?: boolean; minBootMs?: number },
    ) => {
      const requireUiReady = opts?.requireUiReady !== false;
      const minBootMs = opts?.minBootMs ?? 5000;
      setTimeout(() => {
        try {
          if (requireUiReady && !webUiConfirmedRef.current) return;
          if (Date.now() - webviewSessionStartedAtRef.current < minBootMs && !webUiConfirmedRef.current) {
            return;
          }
          webviewRef.current?.injectJavaScript(js);
        } catch {
          /* noop */
        }
      }, delayMs);
    },
    [],
  );

  const loadPhilipVoice = useCallback(async (): Promise<PhilipNativeVoiceController | null> => {
    if (philipVoiceRef.current) return philipVoiceRef.current;
    if (!philipVoiceLoadRef.current) {
      philipVoiceLoadRef.current = import("@/lib/philipNativeVoice")
        .then(({ createPhilipNativeVoiceController }) =>
          createPhilipNativeVoiceController((event) => {
            injectPhilipVoiceEvent(webviewRef, event);
          }),
        )
        .catch(() => null);
    }
    const ctrl = await philipVoiceLoadRef.current;
    if (ctrl) philipVoiceRef.current = ctrl;
    return ctrl;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void prepareNativeUserProfileForWebView().then(({ subscriberEmail, sessionId }) => {
      if (cancelled) return;
      setEntryUrl(shellEntryUrl(subscriberEmail, sessionId));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const injectProfileSeed = useCallback(
    (duringBoot = false) => {
      void prepareNativeUserProfileForWebView().then(
        ({ sessionId, name, prompted, subscriberEmail, emailSubscribed, splashCount, dailySplash, splashProg, heartLastShown, heartState }) => {
          const seed = buildNativeProfileSeedJs(
            sessionId,
            name,
            prompted,
            subscriberEmail,
            emailSubscribed,
            splashCount,
            heartLastShown,
            heartState,
            dailySplash,
            splashProg,
          );
          const js = `${seed}try{window.dispatchEvent(new Event('sp-email-subscription-updated'));}catch(e){}${SCRAPE_WEB_SUBSCRIBER_JS}`;
          if (duringBoot) {
            injectDuringBoot(js, 400);
            return;
          }
          deferInjectWebview(js, 100);
        },
      );
    },
    [deferInjectWebview, injectDuringBoot],
  );

  // When iOS brings the app to foreground, tell the WebView to check if a
  // splash screen should be shown. This is the reliable alternative to
  // visibilitychange/focus events which are unreliable in WKWebView.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/inactive|background/) && nextState === "active") {
        if (webUiConfirmedRef.current) {
          deferInjectWebview(`(function(){
          var fg=document.getElementById('sp-fg-cover');if(fg&&fg.remove)fg.remove();
          try{if(window.__onAppForeground)window.__onAppForeground();}catch(e){}
          true;
        })();`, 50, { requireUiReady: true, minBootMs: 0 });
        }
        checkSiriLaunchScreen();
      }
    });
    return () => sub.remove();
  }, []);

  // "Hey Siri, start Talk It Through" — navigate WebView when intent fires.
  // The App Intent stores "guidance" in UserDefaults; we read and clear it here.
  const checkSiriLaunchScreen = useCallback(() => {
    const SpLaunch = NativeModules.SpLaunch;
    if (!SpLaunch?.getLaunchScreen) return;
    SpLaunch.getLaunchScreen((screen: string | null) => {
      if (screen === "guidance" && webUiConfirmedRef.current) {
        deferInjectWebview(
          `(function(){try{window.location.href='/guidance?listen=1';}catch(e){}true;})();`,
          50,
          { requireUiReady: true, minBootMs: 0 },
        );
      }
    });
  }, [deferInjectWebview]);

  // Also check on initial mount (app launched cold by Siri)
  useEffect(() => {
    checkSiriLaunchScreen();
  }, [checkSiriLaunchScreen]);

  const pushNativeDiag = useCallback((event: string, detail = "") => {
    const entry: WebViewDiagEntry = {
      source: "native",
      event,
      detail,
      ts: Date.now(),
    };
    diagLogsRef.current.push(entry);
    if (diagLogsRef.current.length > 48) diagLogsRef.current.shift();
    // Avoid setState on every line during boot — re-rendering with a fresh `source`
    // object was reloading WKWebView before onLoadStart could fire.
    if (webUiConfirmedRef.current || showStuckHelp || showBlankRecovery) {
      setDiagSummary(formatDiagLines(diagLogsRef.current, 16));
    }
  }, [showStuckHelp, showBlankRecovery]);

  const pushWebDiag = useCallback(
    (event: string, detail = "", ts = Date.now()) => {
      const entry: WebViewDiagEntry = {
        source: "web",
        event,
        detail,
        ts,
      };
      diagLogsRef.current.push(entry);
      if (diagLogsRef.current.length > 48) diagLogsRef.current.shift();
      if (webUiConfirmedRef.current || showStuckHelp || showBlankRecovery) {
        setDiagSummary(formatDiagLines(diagLogsRef.current, 12));
      }
    },
    [showStuckHelp, showBlankRecovery],
  );

  const enablePhilipVoiceBridge = useCallback(async () => {
    try {
      const ctrl = await loadPhilipVoice();
      if (!ctrl) {
        pushNativeDiag("voice_bridge_load_failed");
        return;
      }
      setTimeout(() => {
        injectPhilipVoiceBridgeEnabled(webviewRef);
        if (!ctrl.isBridgeReady()) {
          void ctrl.initBridge();
        }
        injectPhilipVoiceEvent(webviewRef, { type: "PHILIP_VOICE_BRIDGE_READY" });
        pushNativeDiag("voice_bridge_ready_injected");
      }, 0);
    } catch (err) {
      pushNativeDiag("voice_bridge_init_failed", String(err));
    }
  }, [loadPhilipVoice, pushNativeDiag]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${APP_ORIGIN}/native-manifest.json`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { mainJs?: string }) => {
        if (cancelled || !j?.mainJs) return;
        mainJsPathRef.current = j.mainJs;
        setMainJsPath(j.mainJs);
        pushNativeDiag("manifest_loaded", j.mainJs);
      })
      .catch((err) => {
        if (!cancelled) pushNativeDiag("manifest_load_failed", String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [pushNativeDiag]);

  const showDiagAlert = useCallback(
    (title: string) => {
      if (!__DEV__) return;
      const body = formatDiagLines(diagLogsRef.current, 14);
      Alert.alert(title, body || "No diagnostic lines captured yet.");
    },
    [],
  );

  const onWebUiVisible = useCallback(() => {
    if (webUiConfirmedRef.current) return;
    webUiConfirmedRef.current = true;
    readyRef.current = true;
    setAppReady(true);
    setShowOverlay(false);
    setShowSlowOptions(false);
    setShowStuckHelp(false);
    setShowBlankRecovery(false);
    hideNativeSplashWhenWebReady();
    injectProfileSeed();
    setTimeout(() => {
      void enablePhilipVoiceBridge();
    }, 0);
  }, [enablePhilipVoiceBridge, injectProfileSeed]);

  const syncAppleProToWeb = useCallback(
    async (reloadAfterInject = false, currentTier: "pro" | "mission_partner" = "pro") => {
      if (!webUiConfirmedRef.current) return;
      if (currentTier === "mission_partner") {
        injectAppleMissionPartner(webviewRef);
      } else {
        injectApplePro(webviewRef);
      }
      try {
        const { sessionId } = await loadNativeUserProfile();
        await syncMobileProToServer(sessionId, true, null, currentTier);
      } catch {
        /* non-blocking */
      }
      if (reloadAfterInject) {
        reloadEmbeddedWeb(webviewRef);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isSubscribed) return;
      wasSubscribedRef.current = true;
      // Never reload the WebView for Pro inject — it mid-boot reload caused black screens.
      syncAppleProToWeb(false, isMissionPartner ? "mission_partner" : "pro");
    }, [isSubscribed, isMissionPartner, syncAppleProToWeb]),
  );

  useEffect(() => {
    if (isSubscribed && appReady) {
      syncAppleProToWeb(false, isMissionPartner ? "mission_partner" : "pro");
    }
  }, [isSubscribed, isMissionPartner, appReady, syncAppleProToWeb]);

  const entrySessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!entryUrl) return;
    if (entrySessionRef.current === entryUrl) return;
    entrySessionRef.current = entryUrl;
    webviewSessionStartedAtRef.current = Date.now();
    loadStartedRef.current = false;
    bootReloadAttemptedRef.current = false;
    webUiConfirmedRef.current = false;
    readyRef.current = false;
    setAppReady(false);
    setShowOverlay(true);
    setShowSlowOptions(false);
    setShowStuckHelp(false);
    setShowBlankRecovery(false);
    pushNativeDiag("webview_session_start", entryUrl);

    const slowTimer = setTimeout(() => setShowSlowOptions(true), 8000);
    const loadWatchdog = setTimeout(() => {
      if (webUiConfirmedRef.current || loadStartedRef.current) return;
      pushNativeDiag("load_never_started", entryUrl);
      if (!bootReloadAttemptedRef.current) {
        bootReloadAttemptedRef.current = true;
        pushNativeDiag("load_watchdog_ping");
        injectDuringBoot(
          `(function(){try{location.replace('${APP_ORIGIN}/webview-ping.html?_='+Date.now());}catch(e){}true;})();`,
          0,
        );
      }
    }, 10000);
    const diagPullTimer = setInterval(() => {
      if (!webUiConfirmedRef.current && Date.now() - webviewSessionStartedAtRef.current >= 8000) {
        injectDuringBoot(PULL_DIAG_JS, 0);
      }
    }, 4000);

    const stuckTimer = setTimeout(() => {
      if (!webUiConfirmedRef.current) {
        setShowOverlay(false);
        setShowStuckHelp(true);
        setDiagSummary(formatDiagLines(diagLogsRef.current, 16));
        injectDuringBoot(PULL_DIAG_JS, 0);
        setTimeout(() => showDiagAlert("Load stalled"), 400);
      }
    }, 30000);
    const blankTimer = setTimeout(() => {
      if (!webUiConfirmedRef.current) {
        setShowOverlay(false);
        setShowBlankRecovery(true);
        setDiagSummary(formatDiagLines(diagLogsRef.current, 16));
        injectDuringBoot(PULL_DIAG_JS, 0);
      }
    }, 45000);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(loadWatchdog);
      clearTimeout(stuckTimer);
      clearTimeout(blankTimer);
      clearInterval(diagPullTimer);
    };
  }, [entryUrl, pushNativeDiag, showDiagAlert, deferInjectWebview, injectDuringBoot]);

  const reload = useCallback(() => {
    setError(false);
    setShowOverlay(true);
    setShowSlowOptions(false);
    setShowStuckHelp(false);
    setShowBlankRecovery(false);
    readyRef.current = false;
    webUiConfirmedRef.current = false;
    entrySessionRef.current = null;
    setAppReady(false);
    webviewRef.current?.clearCache?.(true);
    reloadCountRef.current += 1;
    pushNativeDiag("reload", `count=${reloadCountRef.current}`);
    void prepareNativeUserProfileForWebView().then(({ subscriberEmail, sessionId }) => {
      const next = shellEntryUrl(subscriberEmail, sessionId);
      setEntryUrl(next);
      if (entryUrl === next) {
        webviewRef.current?.reload();
      }
    });
  }, [entryUrl, pushNativeDiag]);

  const openInSafari = () => {
    Linking.openURL(`${APP_ORIGIN}/?native=1&enter=1`).catch(() => {});
  };

  const onShouldStartLoadWithRequest = useCallback((event: ShouldStartLoadRequest): boolean => {
    const { url, navigationType } = event;
    if (!webUiConfirmedRef.current && url && url !== "about:blank") {
      pushNativeDiag("should_load", `${navigationType || ""} ${url}`.trim());
    }
    if (!url || url === "about:blank") return true;
    if (url.startsWith("shepherdspath://app-ready")) {
      return false;
    }
    if (url.startsWith("shepherdspath://diag")) {
      try {
        const parsed = new URL(url.replace("shepherdspath://", "https://shepherdspath.app/"));
        pushNativeDiag(
          `web:${parsed.searchParams.get("event") || "diag"}`,
          parsed.searchParams.get("detail") || "",
        );
      } catch {
        pushNativeDiag("web:diag", url);
      }
      return false;
    }
    if (hostAllowedInWebView(url)) return true;
    if (navigationType === "click" || url.startsWith("http")) {
      Linking.openURL(url).catch(() => {});
    }
    return false;
  }, [pushNativeDiag]);

  const handleWebViewMessage = useCallback(
    (data: Record<string, unknown>) => {
      if (data.type === "sp_user_profile") {
        const patch: {
          sessionId?: string;
          name?: string;
          prompted?: boolean;
        } = {};
        if (typeof data.sessionId === "string" && data.sessionId.trim()) {
          patch.sessionId = data.sessionId.trim();
        }
        if (typeof data.name === "string") patch.name = data.name;
        if (typeof data.prompted === "boolean") patch.prompted = data.prompted;
        const subscriberEmail =
          typeof data.subscriberEmail === "string" ? data.subscriberEmail : "";
        void mergeNativeUserProfile(patch);
        if (subscriberEmail.includes("@")) {
          void saveNativeSubscriberProfile(subscriberEmail);
        }
      }
      if (data.type === "sp_subscriber_profile") {
        const email = typeof data.email === "string" ? data.email : "";
        if (email.includes("@") && webUiConfirmedRef.current) {
          void saveNativeSubscriberProfile(email).then(() => {
            injectProfileSeed();
          });
        }
      }
      if (data.type === "sp_request_native_profile") {
        void prepareNativeUserProfileForWebView().then((profile) => {
          const payload = JSON.stringify({
            sessionId: profile.sessionId,
            subscriberEmail: profile.subscriberEmail,
            emailSubscribed: profile.emailSubscribed,
          });
          deferInjectWebview(
            `(function(){try{if(window.__spResolveNativeProfile){window.__spResolveNativeProfile(${payload});}}catch(e){}true;})();`,
            150,
            { requireUiReady: false, minBootMs: 2500 },
          );
        });
      }
      if (data.type === "sp_ui_state") {
        const patch: {
          splashCount?: number;
          dailySplash?: {
            date: string;
            count: number;
            featureIdx: number;
            secondIdx: number | null;
          } | null;
          splashProg?: string | null;
          heartLastShown?: number;
          heartState?: { weather: string; topic: string | null; ts: number } | null;
        } = {};
        if (typeof data.splashCount === "number") patch.splashCount = data.splashCount;
        if (typeof data.splashProg === "string") patch.splashProg = data.splashProg;
        if (data.dailySplash && typeof data.dailySplash === "object" && typeof data.dailySplash.date === "string") {
          patch.dailySplash = {
            date: data.dailySplash.date,
            count: typeof data.dailySplash.count === "number" ? data.dailySplash.count : 0,
            featureIdx: typeof data.dailySplash.featureIdx === "number" ? data.dailySplash.featureIdx : 0,
            secondIdx:
              typeof data.dailySplash.secondIdx === "number" && !Number.isNaN(data.dailySplash.secondIdx)
                ? data.dailySplash.secondIdx
                : null,
          };
        }
        if (typeof data.heartLastShown === "number") patch.heartLastShown = data.heartLastShown;
        if (
          data.heartState &&
          typeof data.heartState === "object" &&
          typeof data.heartState.weather === "string" &&
          typeof data.heartState.ts === "number"
        ) {
          patch.heartState = {
            weather: data.heartState.weather,
            topic: typeof data.heartState.topic === "string" ? data.heartState.topic : null,
            ts: data.heartState.ts,
          };
        }
        if (Object.keys(patch).length > 0) void saveNativeUiState(patch);
      }
      if (data.type === "scroll_home_top") {
        deferInjectWebview(
          `(function(){try{var s=document.scrollingElement||document.body;s.scrollTop=0;try{s.scrollTo({top:0,left:0,behavior:'auto'});}catch(e){}}catch(e){}true;})();`,
          50,
          { requireUiReady: true, minBootMs: 0 },
        );
      }
      if (data.type === "sp_diag" && data.event === "webview_ping_html") {
        pushNativeDiag("webview_ping_ok");
        if (entryUrl) {
          injectDuringBoot(
            `(function(){try{location.replace(${JSON.stringify(entryUrl)});}catch(e){}true;})();`,
            800,
          );
        }
      }
      if (data.type === "sp_diag") {
        pushWebDiag(
          String(data.event || ""),
          String(data.detail || ""),
          Number(data.ts) || Date.now(),
        );
        const ev = String(data.event || "");
        const isBenignModuleNoise =
          /module_script_error|module_inject_error_ignored|module_already_in_dom|module_tag_in_html|resource_error.*fonts\.googleapis|resource_error.*fonts\.gstatic/i.test(
            `${ev}${data.detail || ""}`,
          );
        if (
          !isBenignModuleNoise &&
          /error|failed/i.test(`${ev}${data.detail || ""}`) &&
          !webUiConfirmedRef.current
        ) {
          showDiagAlert("WebView error");
        }
      }
      if (data.type === "sp_diag_batch" && Array.isArray(data.lines)) {
        for (const line of data.lines) {
          const text = String(line || "");
          if (!text) continue;
          pushWebDiag(text);
        }
      }
      if (data.type === "sp_request_voice_bridge") {
        pushNativeDiag("voice_bridge_requested");
        setTimeout(() => {
          void enablePhilipVoiceBridge();
        }, 0);
      }
      if (typeof data.type === "string" && data.type.startsWith("PHILIP_VOICE_")) {
        pushNativeDiag(`voice_cmd_${data.type}`);
        void loadPhilipVoice().then((ctrl) => {
          if (ctrl) void ctrl.handleCommand(data);
        });
      }
      if (data.type === "react_booted") {
        pushNativeDiag("web_react_booted");
        hideNativeSplashWhenWebReady();
        injectProfileSeed(true);
        setTimeout(() => onWebUiVisible(), 0);
      }
      if (data.type === "web_ui_visible" || data.type === "app_ready") {
        setTimeout(() => onWebUiVisible(), 0);
      }
      if (data.type === "open_subscription") {
        router.push("/subscription");
      }
      if (data.type === "share") {
        const shareUrl =
          typeof data.url === "string" && data.url.startsWith("http") ? data.url : APP_ORIGIN;
        const message =
          typeof data.text === "string" && data.text.trim() ? String(data.text) : shareUrl;
        void Share.share(
          Platform.OS === "ios"
            ? { message: message.includes(shareUrl) ? message : `${message}\n\n${shareUrl}` }
            : {
                title: String(data.title || "Shepherd's Path"),
                message,
                url: shareUrl,
              },
        ).catch(() => {});
      }
      if (data.type === "js_error" && !readyRef.current) {
        pushNativeDiag("web_js_error", `${data.msg || ""} ${data.detail || ""}`.trim());
        const msg = String(data.msg || data.detail || "");
        const benign =
          /ResizeObserver|AbortError|NotAllowedError|play\(\)|interrupted|cancelled|Load failed|Script error|WebKit|SecurityError|Importing a module/i.test(
            msg,
          );
        if (!benign) {
          setTimeout(() => {
            if (!readyRef.current) setShowStuckHelp(true);
          }, 12000);
        }
      }
    },
    [
      deferInjectWebview,
      enablePhilipVoiceBridge,
      entryUrl,
      injectDuringBoot,
      injectProfileSeed,
      loadPhilipVoice,
      onWebUiVisible,
      pushNativeDiag,
      pushWebDiag,
      router,
      showDiagAlert,
    ],
  );

  const handleWebViewLoadStart = useCallback(() => {
    setError(false);
    loadStartedRef.current = true;
    pushNativeDiag("onLoadStart", entryUrl || "");
  }, [entryUrl, pushNativeDiag]);

  const handleWebViewLoadProgress = useCallback(
    (progress: number) => {
      if (progress >= 0.25 && progress < 0.3) {
        pushNativeDiag("onLoadProgress", `${Math.round(progress * 100)}%`);
      }
      if (progress >= 0.99) {
        pushNativeDiag("onLoadProgress", "100%");
      }
    },
    [pushNativeDiag],
  );

  const handleWebViewLoadEnd = useCallback(
    (pageUrl: string) => {
      loadStartedRef.current = true;
      pushNativeDiag("onLoadEnd", pageUrl);
    },
    [pushNativeDiag],
  );

  const handleWebViewError = useCallback(
    (description: string) => {
      pushNativeDiag("onError", description);
      setShowOverlay(false);
      setError(true);
    },
    [pushNativeDiag],
  );

  const handleWebViewHttpError = useCallback(
    (statusCode: number) => {
      if (statusCode >= 400) {
        pushNativeDiag("onHttpError", String(statusCode));
        setShowOverlay(false);
        setError(true);
      }
    },
    [pushNativeDiag],
  );

  const handleWebViewNavigation = useCallback(
    (loading: boolean, title: string, url: string) => {
      if (isBlankWebViewUrl(url)) return;
      if (!webUiConfirmedRef.current) {
        pushNativeDiag(
          "navigation",
          `${loading ? "loading" : "idle"} | ${title || ""} | ${url || ""}`.trim(),
        );
      } else if (!loading) {
        pushNativeDiag("navigation", `${title || ""} | ${url || ""}`.trim());
      }
    },
    [pushNativeDiag],
  );

  const handleWebViewContentProcessDidTerminate = useCallback(() => {
    pushNativeDiag("onContentProcessDidTerminate", "reload");
    reload();
  }, [pushNativeDiag, reload]);

  shellHandlersRef.current = {
    onMessage: handleWebViewMessage,
    onShouldStartLoadWithRequest,
    onLoadStart: handleWebViewLoadStart,
    onLoadProgress: handleWebViewLoadProgress,
    onLoadEnd: handleWebViewLoadEnd,
    onError: handleWebViewError,
    onHttpError: handleWebViewHttpError,
    onNavigation: handleWebViewNavigation,
    onContentProcessDidTerminate: handleWebViewContentProcessDidTerminate,
  };

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={["top", "bottom"]}>
        <StatusBar style="light" />
        <Text style={styles.errorIcon}>🙏</Text>
        <Text style={styles.errorTitle}>Unable to Connect</Text>
        <Text style={styles.errorMessage}>
          Shepherd&apos;s Path couldn&apos;t load. Check your connection, then try again — or open
          the site in Safari.
        </Text>
        <Pressable
          onPress={reload}
          style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </Pressable>
        <Pressable onPress={openInSafari} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Open in Safari</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!entryUrl) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="light" />
        <View style={styles.webviewLoading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.webviewHost}>
        <ShellWebView uri={entryUrl} webviewRef={webviewRef} handlersRef={shellHandlersRef} />
      </View>
      {showOverlay && showSlowOptions && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <>
            <Image
              source={require("../assets/images/app-icon.png")}
              style={styles.overlayLogo}
              resizeMode="contain"
            />
            <ActivityIndicator size="large" color="#E8C99B" />
            <Text style={styles.loadingHint}>Loading Shepherd&apos;s Path…</Text>
            <Text style={styles.loadingSubhint}>
              Please wait — the app will open when it&apos;s ready.
            </Text>
          </>

          <View style={styles.slowOptions}>
            <Text style={styles.slowHint}>
              Taking longer than usual? Refresh or open in Safari.
            </Text>
            <Pressable
              onPress={reload}
              style={({ pressed }) => [styles.overlayBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.overlayBtnText}>Refresh</Text>
            </Pressable>
            <Pressable
              onPress={openInSafari}
              style={({ pressed }) => [styles.overlayBtnOutline, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.overlayBtnOutlineText}>Open in Safari</Text>
            </Pressable>
          </View>
        </View>
      )}

      {(showStuckHelp || showBlankRecovery) && (
        <View
          style={[styles.stuckSheet, styles.stuckSheetOverWebview]}
          pointerEvents="auto"
        >
          <Text style={styles.stuckTitle}>Having trouble loading?</Text>
          <Text style={styles.stuckText}>
            The app didn&apos;t finish loading. Refresh for a clean start, or use Safari.
          </Text>
          <Text style={styles.diagText} selectable>
            {formatDiagLines(diagLogsRef.current, 16) || diagSummary || "Waiting for load diagnostics…"}
          </Text>
          <Pressable
            onPress={reload}
            style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.primaryButtonText}>Refresh app</Text>
          </Pressable>
          <Pressable onPress={openInSafari} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Open in Safari</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0612",
  },
  webviewHost: {
    flex: 1,
    backgroundColor: "#0d0612",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0d0612",
    opacity: 1,
  },
  webviewLoading: {
    flex: 1,
    backgroundColor: "#000",
  },
  webviewLoadingLogo: {
    width: 88,
    height: 88,
    marginBottom: 16,
  },
  overlayLogo: {
    width: 72,
    height: 72,
    marginBottom: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 10,
    zIndex: 20,
  },
  loadingOverlayTransparent: {
    backgroundColor: "transparent",
  },
  loadingHint: {
    fontSize: 16,
    color: "#f4efe6",
    fontWeight: "600",
    textAlign: "center",
  },
  loadingSubhint: {
    fontSize: 13,
    color: "#c0a8cc",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
    marginTop: 4,
  },
  slowOptions: {
    marginTop: 16,
    width: "100%",
    maxWidth: 320,
    gap: 10,
    alignItems: "center",
  },
  slowHint: {
    fontSize: 13,
    color: "#c0a8cc",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 4,
  },
  overlayBtn: {
    width: "100%",
    backgroundColor: "#d4a574",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  overlayBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1208",
  },
  overlayBtnOutline: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(212, 165, 116, 0.5)",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  overlayBtnOutlineText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#d4a574",
  },
  stuckSheet: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 6, 18, 0.97)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
    zIndex: 30,
  },
  stuckSheetOverWebview: {
    zIndex: 50,
  },
  stuckTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f4efe6",
    textAlign: "center",
  },
  stuckText: {
    fontSize: 15,
    color: "#c0a8cc",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  diagText: {
    fontSize: 10,
    lineHeight: 14,
    color: "#a89ab0",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlign: "left",
    width: "100%",
    maxWidth: 320,
    maxHeight: 140,
    marginBottom: 8,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 8,
  },
  primaryButton: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: "#7A018D",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryText: {
    color: "#d4a574",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  tertiaryButton: {
    marginTop: 4,
    paddingVertical: 8,
  },
  tertiaryText: {
    color: "#8a8378",
    fontSize: 13,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0d0612",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#c0a8cc",
    textAlign: "center",
    lineHeight: 24,
  },
});
