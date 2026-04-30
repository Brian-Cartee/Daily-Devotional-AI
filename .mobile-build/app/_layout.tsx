import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import {
  loadNotificationPrefs,
  enableNotifications,
} from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { networkMode: "always" } },
});

try {
  initializeRevenueCat();
} catch (err: any) {
  Alert.alert("RevenueCat Unavailable", err?.message ?? "Unknown error");
}

async function rescheduleNotifications() {
  if (Platform.OS === "web") return;
  try {
    const prefs = await loadNotificationPrefs();
    if (!prefs.enabled) return;
    await enableNotifications(prefs);
  } catch {}
}

const API_HEALTH_URL = "https://www.shepherdspathai.com/api/daily-art";
const HEALTH_CHECK_TIMEOUT_MS = 10000;

async function checkApiReachable(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    const res = await fetch(API_HEALTH_URL, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

function ConnectionErrorScreen({ onRetry }: { onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.connectionError, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
      <Text style={styles.connectionIcon}>🙏</Text>
      <Text style={styles.connectionTitle}>Unable to Connect</Text>
      <Text style={styles.connectionMessage}>
        Shepherd's Path can't reach its servers right now.{"\n\n"}
        Please check your internet connection and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
      <Text style={styles.connectionHint}>
        If this keeps happening, the app may be updating.{"\n"}Please try again in a few minutes.
      </Text>
    </View>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");

  const runHealthCheck = useCallback(async () => {
    setApiStatus("checking");
    const reachable = await checkApiReachable();
    setApiStatus(reachable ? "ok" : "error");
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      rescheduleNotifications();
      runHealthCheck();
    }
  }, [fontsLoaded, fontError, runHealthCheck]);

  if (!fontsLoaded && !fontError) return null;
  if (apiStatus === "checking") return null;

  if (apiStatus === "error") {
    return (
      <SafeAreaProvider>
        <ConnectionErrorScreen onRetry={runHealthCheck} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SubscriptionProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SubscriptionProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  connectionError: {
    flex: 1,
    backgroundColor: "#1a0a1e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  connectionIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  connectionTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  connectionMessage: {
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
  retryButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  connectionHint: {
    fontSize: 13,
    color: "#7a5c88",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
});
