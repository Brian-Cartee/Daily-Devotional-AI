import React, { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

const APP_URL = "https://www.shepherdspathai.com";

// Injected AFTER the page loads. Polls until React has mounted (#root has
// children) then notifies the native shell to hide the loading overlay.
// Hard 8s failsafe fires regardless so the overlay never blocks forever.
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

  const hideOverlay = () => {
    if (loadEndTimerRef.current) {
      clearTimeout(loadEndTimerRef.current);
      loadEndTimerRef.current = null;
    }
    setLoading(false);
  };

  // Absolute maximum: overlay always clears within 12 seconds of mount.
  // This guarantees the spinner is never permanent even if the page hangs
  // or the ready signal is never received.
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

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="light" />
        <Text style={styles.errorIcon}>🙏</Text>
        <Text style={styles.errorTitle}>Unable to Connect</Text>
        <Text style={styles.errorMessage}>
          Please check your internet connection and try again.
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <WebView
        ref={webviewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        injectedJavaScript={READY_JS}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.type === "app_ready") hideOverlay();
          } catch {}
        }}
        onLoadStart={() => {
          setLoading(true);
          setError(false);
        }}
        onLoadEnd={() => {
          // Secondary failsafe: if the app_ready message never comes,
          // hide the overlay 8 seconds after the page finishes loading.
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
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#7A018D" />
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
