import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const TEST_URI = "https://www.shepherdspathai.com/?native=1&enter=1";

type LogEntry = { event: string; detail: string; ts: number };

export default function WebViewTestScreen() {
  const router = useRouter();
  const [finalUri, setFinalUri] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const pushLog = useCallback((event: string, detail = "") => {
    const entry = { event, detail, ts: Date.now() };
    console.log(`[webview-test] ${event}`, detail || "");
    setLogs((prev) => [...prev.slice(-49), entry]);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      pushLog("finalUri_set", TEST_URI);
      setFinalUri(TEST_URI);
    }, 100);
    return () => clearTimeout(timer);
  }, [pushLog]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Isolated WebView Test</Text>
      </View>

      <View style={styles.webviewWrap}>
        {finalUri ? (
          <WebView
            key={finalUri}
            source={{ uri: finalUri }}
            style={styles.webview}
            cacheEnabled
            javaScriptEnabled
            domStorageEnabled
            onLoadStart={(e) => pushLog("onLoadStart", e.nativeEvent.url)}
            onLoadEnd={(e) => pushLog("onLoadEnd", e.nativeEvent.url)}
            {...(Platform.OS === "ios" ? { inspectable: true } : {})}
            onError={(e) =>
              pushLog(
                "onError",
                `${e.nativeEvent.description || "error"} (code ${e.nativeEvent.code})`,
              )
            }
            onHttpError={(e) =>
              pushLog("onHttpError", `${e.nativeEvent.statusCode} ${e.nativeEvent.url}`)
            }
            onNavigationStateChange={(nav) =>
              pushLog(
                "onNavigationStateChange",
                `${nav.loading ? "loading" : "idle"} ${nav.url || ""}`,
              )
            }
            onContentProcessDidTerminate={() => pushLog("onContentProcessDidTerminate", "")}
          />
        ) : (
          <Text style={styles.waiting}>Waiting for finalUri…</Text>
        )}
      </View>

      <ScrollView style={styles.logPanel} contentContainerStyle={styles.logContent}>
        {logs.length === 0 ? (
          <Text style={styles.logLine}>No events yet…</Text>
        ) : (
          logs.map((entry, index) => (
            <Text key={`${entry.ts}-${index}`} style={styles.logLine} selectable>
              {new Date(entry.ts).toISOString().slice(11, 19)} {entry.event}
              {entry.detail ? ` — ${entry.detail}` : ""}
            </Text>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0612",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  backText: {
    color: "#d4a574",
    fontSize: 16,
  },
  title: {
    flex: 1,
    color: "#f4efe6",
    fontSize: 16,
    fontWeight: "600",
  },
  webviewWrap: {
    flex: 1,
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  waiting: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#a89ab0",
    fontSize: 14,
  },
  logPanel: {
    maxHeight: 160,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  logContent: {
    padding: 10,
    gap: 4,
  },
  logLine: {
    fontSize: 10,
    lineHeight: 14,
    color: "#c0a8cc",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
