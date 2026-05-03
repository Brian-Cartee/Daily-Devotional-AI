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

// Runs BEFORE any web content — forces dark class immediately so there is
// never a flash of the light (cream/white) theme during page bootstrap.
const BEFORE_CONTENT_JS = `(function(){
  try{
    document.documentElement.classList.add('dark');
    if(!localStorage.getItem('sp-theme')){
      localStorage.setItem('sp-theme','dark');
    }
  }catch(e){}
  true;
})();`;

// Runs AFTER the page has loaded — polls until React has mounted (#root has
// children) then notifies the native shell so it can hide the loading overlay.
// A hard 8-second failsafe fires regardless so the overlay never blocks forever.
const AFTER_LOAD_JS = `(function(){
  var sent=false;
  function notify(){
    if(sent)return;
    sent=true;
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'app_ready'}));}catch(e){}
  }
  function check(){
    var r=document.getElementById('root');
    if(r&&r.children.length>0){notify();return;}
    setTimeout(check,100);
  }
  check();
  setTimeout(notify,8000);
  true;
})();`;

export default function MainScreen() {
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (failsafeRef.current) clearTimeout(failsafeRef.current);
    };
  }, []);

  const hideOverlay = () => {
    if (failsafeRef.current) {
      clearTimeout(failsafeRef.current);
      failsafeRef.current = null;
    }
    setLoading(false);
  };

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
        injectedJavaScriptBeforeContentLoaded={BEFORE_CONTENT_JS}
        injectedJavaScript={AFTER_LOAD_JS}
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
          // Don't hide the overlay here — wait for the app_ready message from
          // the web app instead. Start a 10-second failsafe in case the
          // message never arrives (e.g. old website version, JS error).
          if (failsafeRef.current) clearTimeout(failsafeRef.current);
          failsafeRef.current = setTimeout(hideOverlay, 10000);
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
