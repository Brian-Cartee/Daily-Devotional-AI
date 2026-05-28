import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";

const APP_ORIGIN = "https://www.shepherdspathai.com";

/** Open the live app directly — skip the extra bootstrap tap. */
function shellEntryUrl(): string {
  return `${APP_ORIGIN}/?native=1&enter=1&_=${Date.now()}`;
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
  document.body.style.backgroundColor='#0d0612';
  document.documentElement.setAttribute('data-sp-shell','native');
  document.documentElement.classList.add('sp-native-shell');
  true;
})();`;

const PROBE_READY_JS = `(function(){
  function hasRealApp(){
    var r=document.getElementById('root');
    if(!r||r.children.length===0)return false;
    if(document.getElementById('sp-boot'))return false;
    return true;
  }
  function forceReady(){
    var boot=document.getElementById('sp-boot');
    if(boot)boot.remove();
    return true;
  }
  try{
    var ready=hasRealApp()||forceReady();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: ready ? 'app_ready' : 'app_still_loading'
    }));
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
  const readyRef = useRef(false);

  const probeWebReady = useCallback(() => {
    webviewRef.current?.injectJavaScript(PROBE_READY_JS);
  }, []);

  const onAppReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    setAppReady(true);
    setShowOverlay(false);
    setShowSlowOptions(false);
    setShowStuckHelp(false);
  }, []);

  useEffect(() => {
    const slowTimer = setTimeout(() => setShowSlowOptions(true), 5000);
    const autoDismissTimer = setTimeout(() => {
      if (!readyRef.current) onAppReady();
    }, 3000);
    const stuckTimer = setTimeout(() => {
      if (!readyRef.current) setShowStuckHelp(true);
    }, 30000);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(autoDismissTimer);
      clearTimeout(stuckTimer);
    };
  }, [entryUrl, onAppReady]);

  const reload = useCallback(() => {
    setError(false);
    setShowOverlay(true);
    setShowSlowOptions(false);
    setShowStuckHelp(false);
    readyRef.current = false;
    setAppReady(false);
    setEntryUrl(shellEntryUrl());
  }, []);

  const openInSafari = () => {
    Linking.openURL(`${APP_ORIGIN}/?native=1&enter=1`).catch(() => {});
  };

  const onShouldStartLoadWithRequest = (event: ShouldStartLoadRequest): boolean => {
    const { url, navigationType } = event;
    if (!url || url === "about:blank") return true;
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
        originWhitelist={["https://*", "http://*"]}
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
        cacheMode="LOAD_NO_CACHE"
        incognito={Platform.OS === "ios"}
        injectedJavaScriptBeforeContentLoaded={BEFORE_CONTENT_JS}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.type === "app_ready") onAppReady();
            if (data.type === "js_error" && !readyRef.current) {
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
        }}
        onLoadEnd={() => {
          setTimeout(() => {
            if (!readyRef.current) onAppReady();
          }, 1800);
          const delays = [0, 200, 500, 1200, 2500, 4000, 6000];
          delays.forEach((ms) => setTimeout(probeWebReady, ms));
        }}
        onError={() => {
          setShowOverlay(false);
          setError(true);
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 400) {
            setShowOverlay(false);
            setError(true);
          }
        }}
        onContentProcessDidTerminate={() => {
          reload();
        }}
        {...(Platform.OS === "android"
          ? { thirdPartyCookiesEnabled: true, mixedContentMode: "compatibility" as const }
          : {})}
      />

      {showOverlay && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
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

      {showStuckHelp && showOverlay ? (
        <View style={styles.stuckSheet} pointerEvents="auto">
          <Text style={styles.stuckTitle}>Having trouble loading?</Text>
          <Text style={styles.stuckText}>
            The app didn&apos;t finish loading. Refresh for a clean start, or use Safari while we
            catch up.
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
      ) : null}
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
