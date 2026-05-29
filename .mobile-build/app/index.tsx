import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { hideNativeSplashWhenWebReady } from "@/lib/native-splash";
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
  if(document.body){document.body.style.backgroundColor='#0d0612';}
  document.documentElement.setAttribute('data-sp-shell','native');
  document.documentElement.classList.add('sp-native-shell');
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

    const slowTimer = setTimeout(() => setShowSlowOptions(true), 8000);
    const stuckTimer = setTimeout(() => {
      if (!webUiConfirmedRef.current) setShowStuckHelp(true);
    }, 35000);
    const blankTimer = setTimeout(() => {
      if (!webUiConfirmedRef.current) setShowBlankRecovery(true);
    }, 40000);
    const probeInterval = setInterval(() => {
      if (!webUiConfirmedRef.current) probeWebReady();
    }, 1500);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(stuckTimer);
      clearTimeout(blankTimer);
      clearInterval(probeInterval);
    };
  }, [entryUrl, probeWebReady]);

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
    setEntryUrl(shellEntryUrl());
  }, []);

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
            if (data.type === "react_booted") hideNativeSplashWhenWebReady();
            if (data.type === "web_ui_visible" || data.type === "app_ready") onWebUiVisible();
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
        onLoadEnd={() => {
          const delays = [400, 1200, 2500, 5000, 8000, 12000];
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
          style={[styles.stuckSheet, !showOverlay && styles.stuckSheetOverWebview]}
          pointerEvents="auto"
        >
          <Text style={styles.stuckTitle}>Having trouble loading?</Text>
          <Text style={styles.stuckText}>
            The app didn&apos;t finish loading. Refresh for a clean start, or use Safari.
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
