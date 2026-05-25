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

/** Hosts allowed inside the shell (app + worship embeds) */
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

// Injected BEFORE content — brand background + flag for web UI
const BEFORE_CONTENT_JS = `(function(){
  document.documentElement.style.backgroundColor='#0d0612';
  document.body.style.backgroundColor='#0d0612';
  document.documentElement.setAttribute('data-sp-shell','native');
  document.documentElement.classList.add('sp-native-shell');
  true;
})();`;

// Injected AFTER load — hide native splash when React mounts
const READY_JS = `(function(){
  var sent=false;
  function notify(){
    if(sent)return; sent=true;
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'app_ready'}));}catch(e){}
  }
  function check(){
    var r=document.getElementById('root');
    if(r&&r.children.length>0){notify();return;}
    setTimeout(check,150);
  }
  check();
  setTimeout(notify,8000);
  true;
})();`;

export default function MainScreen() {
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideOverlay = useCallback(() => {
    if (loadEndTimerRef.current) {
      clearTimeout(loadEndTimerRef.current);
      loadEndTimerRef.current = null;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const absoluteMax = setTimeout(() => setLoading(false), 12000);
    return () => {
      clearTimeout(absoluteMax);
      if (loadEndTimerRef.current) clearTimeout(loadEndTimerRef.current);
    };
  }, []);

  const reload = () => {
    setError(false);
    setLoading(true);
    webviewRef.current?.reload();
  };

  const onShouldStartLoadWithRequest = (event: ShouldStartLoadRequest): boolean => {
    const { url, navigationType } = event;
    if (!url || url === "about:blank") return true;
    if (hostAllowedInWebView(url)) return true;
    // External links (support, mailto, etc.) open in Safari
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
          Shepherd&apos;s Path couldn&apos;t load. Check your connection, then try again.
          {"\n\n"}
          The website updates on its own — pull down in the app to refresh after we ship changes.
        </Text>
        <Pressable
          onPress={reload}
          style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <WebView
        ref={webviewRef}
        source={{ uri: APP_ORIGIN }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        injectedJavaScriptBeforeContentLoaded={BEFORE_CONTENT_JS}
        injectedJavaScript={READY_JS}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.type === "app_ready") hideOverlay();
          } catch {
            /* noop */
          }
        }}
        onLoadStart={() => {
          setLoading(true);
          setError(false);
        }}
        onLoadEnd={() => {
          if (loadEndTimerRef.current) clearTimeout(loadEndTimerRef.current);
          loadEndTimerRef.current = setTimeout(hideOverlay, 8000);
        }}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) {
            setLoading(false);
            setError(true);
          }
        }}
        onContentProcessDidTerminate={() => {
          setLoading(true);
          webviewRef.current?.reload();
        }}
        {...(Platform.OS === "android"
          ? { thirdPartyCookiesEnabled: true, mixedContentMode: "compatibility" as const }
          : {})}
      />
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#7A018D" />
          <Text style={styles.loadingHint}>Loading Shepherd&apos;s Path…</Text>
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
    backgroundColor: "#0d0612",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingHint: {
    fontSize: 14,
    color: "#c0a8cc",
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
  retryButton: {
    marginTop: 8,
    backgroundColor: "#7A018D",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});
