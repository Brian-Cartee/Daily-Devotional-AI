import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { hideNativeSplashWhenWebReady } from "@/lib/native-splash";
import { formatDiagLines, type WebViewDiagEntry } from "@/lib/webview-diag";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";

const APP_ORIGIN = "https://www.shepherdspathai.com";

/** Open the live app directly — skip the extra bootstrap tap. */
function shellEntryUrl(): string {
  return `${APP_ORIGIN}/?native=1&enter=1&debugNative=1&_=${Date.now()}`;
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

const BEFORE_CONTENT_JS = `(function(){
  document.documentElement.style.backgroundColor='#0d0612';
  if(document.body){document.body.style.backgroundColor='#0d0612';}
  document.documentElement.setAttribute('data-sp-shell','native');
  document.documentElement.classList.add('sp-native-shell');
  true;
})();`;

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
      window.__spModuleSrc=url;
      diag('module_load_start',url);
      var s=document.createElement('script');
      s.type='module';
      s.src=url;
      s.addEventListener('load',function(){window.__spBootstrapDone=true;diag('module_script_loaded',url);});
      s.addEventListener('error',function(){diag('module_script_error',url);});
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
        if(links[i].rel==='modulepreload'&&links[i].href&&/\\/assets\\/index-/.test(links[i].href)){
          return links[i].getAttribute('href');
        }
      }
      return null;
    }
    var shellMain='${mainChunk}';
    if(shellMain){diag('module_from_native_shell',shellMain);loadModule(shellMain);return true;}
    var domSrc=fromDom();
    if(domSrc){diag('module_from_dom',domSrc);loadModule(domSrc);return true;}
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

const VISIBILITY_PROBE_JS = `(function(){
  try{
    var sel='[data-testid="card-devotional"],[data-testid="bottom-nav-home"],[data-testid="text-threshold-welcome"],[data-testid="threshold-arrival"],[data-testid="btn-threshold-enter"]';
    if(document.querySelector(sel)){
      document.documentElement.setAttribute('data-native-ui-ready','1');
      document.getElementById('sp-boot-splash')?.remove();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'web_ui_visible' }));
    }
  }catch(e){}
  true;
})();`;

export default function MainScreen() {
  const webviewRef = useRef<WebView>(null);
  const [entryUrl, setEntryUrl] = useState(() => shellEntryUrl());
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
  }, []);

  const pushNativeDiag = useCallback((event: string, detail = "") => {
    const entry: WebViewDiagEntry = {
      source: "native",
      event,
      detail,
      ts: Date.now(),
    };
    diagLogsRef.current.push(entry);
    if (diagLogsRef.current.length > 48) diagLogsRef.current.shift();
    setDiagSummary(formatDiagLines(diagLogsRef.current, 12));
  }, []);

  const showDiagAlert = useCallback(
    (title: string) => {
      const body = formatDiagLines(diagLogsRef.current, 14);
      Alert.alert(title, body || "No diagnostic lines captured yet.");
    },
    [],
  );

  const runNativeBootstrap = useCallback(
    (pageUrl: string) => {
      if (!shouldBootstrapWebView(pageUrl)) return;
      const main = mainJsPathRef.current ?? "";
      webviewRef.current?.injectJavaScript(buildNativeBootstrapJs(APP_ORIGIN, main));
    },
    [],
  );

  const probeWebReady = useCallback(() => {
    webviewRef.current?.injectJavaScript(VISIBILITY_PROBE_JS);
  }, []);

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
  }, []);

  useEffect(() => {
    webUiConfirmedRef.current = false;
    readyRef.current = false;
    setAppReady(false);
    setShowOverlay(true);
    setShowSlowOptions(false);
    setShowStuckHelp(false);
    setShowBlankRecovery(false);
    pushNativeDiag("webview_session_start", entryUrl);

    const slowTimer = setTimeout(() => setShowSlowOptions(true), 8000);
    const diagPullTimer = setInterval(() => {
      if (!webUiConfirmedRef.current) {
        webviewRef.current?.injectJavaScript(PULL_DIAG_JS);
      }
    }, 2500);

    const stuckTimer = setTimeout(() => {
      if (!webUiConfirmedRef.current) {
        setShowOverlay(false);
        setShowStuckHelp(true);
        webviewRef.current?.injectJavaScript(PULL_DIAG_JS);
        setTimeout(() => showDiagAlert("Load stalled"), 400);
      }
    }, 12000);
    const blankTimer = setTimeout(() => {
      if (!webUiConfirmedRef.current) {
        setShowOverlay(false);
        setShowBlankRecovery(true);
        webviewRef.current?.injectJavaScript(PULL_DIAG_JS);
      }
    }, 15000);
    const probeInterval = setInterval(() => {
      if (!webUiConfirmedRef.current) probeWebReady();
    }, 1500);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(stuckTimer);
      clearTimeout(blankTimer);
      clearInterval(probeInterval);
      clearInterval(diagPullTimer);
    };
  }, [entryUrl, probeWebReady, pushNativeDiag, showDiagAlert]);

  const reload = useCallback(() => {
    setError(false);
    setShowOverlay(true);
    setShowSlowOptions(false);
    setShowStuckHelp(false);
    setShowBlankRecovery(false);
    readyRef.current = false;
    webUiConfirmedRef.current = false;
    setAppReady(false);
    webviewRef.current?.clearCache?.(true);
    reloadCountRef.current += 1;
    pushNativeDiag("reload", `count=${reloadCountRef.current}`);
    setEntryUrl(shellEntryUrl());
  }, [pushNativeDiag]);

  const openInSafari = () => {
    Linking.openURL(`${APP_ORIGIN}/?native=1&enter=1`).catch(() => {});
  };

  const onShouldStartLoadWithRequest = (event: ShouldStartLoadRequest): boolean => {
    const { url, navigationType } = event;
    if (!url || url === "about:blank") return true;
    if (url.startsWith("shepherdspath://app-ready")) {
      onWebUiVisible();
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <WebView
        key={entryUrl}
        ref={webviewRef}
        source={{ uri: entryUrl }}
        style={styles.webview}
        originWhitelist={["https://*", "http://*", "shepherdspath://*"]}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        cacheEnabled={false}
        injectedJavaScriptBeforeContentLoaded={BEFORE_CONTENT_JS}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.type === "sp_diag") {
              const entry: WebViewDiagEntry = {
                source: "web",
                event: String(data.event || ""),
                detail: String(data.detail || ""),
                ts: Number(data.ts) || Date.now(),
              };
              diagLogsRef.current.push(entry);
              if (diagLogsRef.current.length > 48) diagLogsRef.current.shift();
              setDiagSummary(formatDiagLines(diagLogsRef.current, 12));
              if (/error|failed|module_script_error/i.test(`${data.event || ""}${data.detail || ""}`)) {
                showDiagAlert("WebView error");
              }
            }
            if (data.type === "sp_diag_batch" && Array.isArray(data.lines)) {
              for (const line of data.lines) {
                const text = String(line || "");
                if (!text) continue;
                diagLogsRef.current.push({
                  source: "web",
                  event: text,
                  detail: "",
                  ts: Date.now(),
                });
              }
              if (diagLogsRef.current.length > 48) {
                diagLogsRef.current = diagLogsRef.current.slice(-48);
              }
              setDiagSummary(formatDiagLines(diagLogsRef.current, 12));
            }
            if (data.type === "react_booted") {
              pushNativeDiag("web_react_booted");
              hideNativeSplashWhenWebReady();
            }
            if (data.type === "web_ui_visible" || data.type === "app_ready") onWebUiVisible();
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
          } catch {
            /* noop */
          }
        }}
        onLoadStart={() => {
          setError(false);
          pushNativeDiag("onLoadStart", entryUrl);
        }}
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress >= 0.25 && nativeEvent.progress < 0.3) {
            pushNativeDiag("onLoadProgress", `${Math.round(nativeEvent.progress * 100)}%`);
          }
          if (nativeEvent.progress >= 0.99) {
            pushNativeDiag("onLoadProgress", "100%");
          }
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.webviewLoadingLogo}
              resizeMode="contain"
            />
            <Text style={styles.loadingHint}>Shepherd&apos;s Path</Text>
            <ActivityIndicator size="small" color="#E8C99B" style={{ marginTop: 12 }} />
          </View>
        )}
        onLoadEnd={(e) => {
          const pageUrl = e.nativeEvent.url || entryUrl;
          pushNativeDiag("onLoadEnd", pageUrl);
          if (!shouldBootstrapWebView(pageUrl)) return;
          runNativeBootstrap(pageUrl);
          const delays = [200, 400, 1200, 2500, 5000, 8000, 12000];
          delays.forEach((ms) => {
            setTimeout(() => {
              runNativeBootstrap(pageUrl);
              probeWebReady();
            }, ms);
          });
        }}
        onError={(e) => {
          pushNativeDiag("onError", String(e.nativeEvent.description || "unknown"));
          setShowOverlay(false);
          setError(true);
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 400) {
            pushNativeDiag("onHttpError", String(e.nativeEvent.statusCode));
            setShowOverlay(false);
            setError(true);
          }
        }}
        onContentProcessDidTerminate={() => {
          pushNativeDiag("onContentProcessDidTerminate", "reload");
          reload();
        }}
        onNavigationStateChange={(nav) => {
          if (nav.loading || isBlankWebViewUrl(nav.url || "")) return;
          pushNativeDiag("navigation", `${nav.title || ""} | ${nav.url || ""}`.trim());
          if (shouldBootstrapWebView(nav.url || "")) {
            runNativeBootstrap(nav.url || entryUrl);
          }
        }}
        {...(Platform.OS === "android"
          ? { thirdPartyCookiesEnabled: true, mixedContentMode: "compatibility" as const }
          : {})}
      />

      {showOverlay && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.overlayLogo}
            resizeMode="contain"
          />
          <ActivityIndicator size="large" color="#E8C99B" />
          <Text style={styles.loadingHint}>Loading Shepherd&apos;s Path…</Text>
          <Text style={styles.loadingSubhint}>
            Please wait — the app will open when it&apos;s ready.
          </Text>

          {showSlowOptions && (
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
          )}
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
            {diagSummary || "Waiting for load diagnostics…"}
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
  webview: {
    flex: 1,
    backgroundColor: "#0d0612",
    opacity: 1,
  },
  webviewLoading: {
    flex: 1,
    backgroundColor: "#0d0612",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
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
    backgroundColor: "rgba(13, 6, 18, 0.96)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 10,
    zIndex: 20,
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
