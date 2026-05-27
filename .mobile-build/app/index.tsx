import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
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

const READY_JS = `(function(){
  var sent=false;
  function hasRealApp(){
    var r=document.getElementById('root');
    if(!r||r.children.length===0)return false;
    if(document.getElementById('sp-boot'))return false;
    return true;
  }
  function notify(){
    if(sent||!hasRealApp())return;
    sent=true;
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'app_ready'}));}catch(e){}
  }
  function check(){
    notify();
    if(!sent)setTimeout(check,250);
  }
  check();
  true;
})();`;

function isBootstrapUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return pathname.includes("native-shell");
  } catch {
    return url.includes("native-shell");
  }
}

export default function MainScreen() {
  const webviewRef = useRef<WebView>(null);
  const [entryUrl, setEntryUrl] = useState(() => shellEntryUrl());
  const [showOverlay, setShowOverlay] = useState(true);
  const [showSlowOptions, setShowSlowOptions] = useState(false);
  const [showStuckHelp, setShowStuckHelp] = useState(false);
  const [error, setError] = useState(false);
  const readyRef = useRef(false);

  const onAppReady = useCallback(() => {
    readyRef.current = true;
    setShowOverlay(false);
    setShowSlowOptions(false);
    setShowStuckHelp(false);
  }, []);

  useEffect(() => {
    const slowTimer = setTimeout(() => setShowSlowOptions(true), 4000);
    return () => clearTimeout(slowTimer);
  }, [entryUrl]);

  const reload = () => {
    setError(false);
    setShowOverlay(true);
    setShowSlowOptions(false);
    setShowStuckHelp(false);
    readyRef.current = false;
    setEntryUrl(shellEntryUrl());
  };

  const openInSafari = () => {
    Linking.openURL(`${APP_ORIGIN}/native-shell.html`).catch(() => {});
  };

  const onUserContinue = () => {
    readyRef.current = true;
    setShowOverlay(false);
    setShowStuckHelp(false);
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
        cacheEnabled
        injectedJavaScriptBeforeContentLoaded={BEFORE_CONTENT_JS}
        injectedJavaScript={READY_JS}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.type === "app_ready") onAppReady();
            // Only block the UI for errors before the app has mounted — worship/audio
            // often logs benign rejections that must not force a full refresh.
            if (data.type === "js_error") {
              setShowOverlay(false);
              setShowStuckHelp(true);
            }
          } catch {
            /* noop */
          }
        }}
        onLoadStart={() => {
          setError(false);
        }}
        onLoadEnd={() => {
          setShowStuckHelp(false);
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

          {showSlowOptions && (
            <View style={styles.slowOptions}>
              <Text style={styles.slowHint}>
                Still waking up? You can wait, refresh, or open in Safari.
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

          <Pressable
            onPress={onUserContinue}
            style={({ pressed }) => [styles.continueBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </Pressable>
        </View>
      )}

      {showStuckHelp && !showOverlay && !readyRef.current && (
        <View style={styles.stuckSheet} pointerEvents="auto">
          <Text style={styles.stuckTitle}>Having trouble loading?</Text>
          <Text style={styles.stuckText}>
            The page didn&apos;t finish loading in the app. Try Dismiss to peek underneath, then
            Refresh for a clean load — or use Safari for the full experience.
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
          <Pressable onPress={() => setShowStuckHelp(false)} style={styles.tertiaryButton}>
            <Text style={styles.tertiaryText}>Dismiss</Text>
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
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 6, 18, 0.96)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
    zIndex: 20,
  },
  loadingHint: {
    fontSize: 16,
    color: "#f4efe6",
    fontWeight: "600",
    textAlign: "center",
  },
  slowOptions: {
    marginTop: 8,
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
  continueBtn: {
    marginTop: 24,
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#d4a574",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1208",
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
