import React, { useRef, useState } from "react";
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

export default function MainScreen() {
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        onLoadStart={() => { setLoading(true); setError(false); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
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
