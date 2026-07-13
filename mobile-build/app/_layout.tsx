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
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isPhilipVoiceLabEnabled } from "@/lib/philipVoiceLabFlags";
import { ensureLiveKitGlobals } from "@/lib/setupLiveKit";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import {
  loadNotificationPrefs,
  enableNotifications,
} from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

if (isPhilipVoiceLabEnabled()) {
  ensureLiveKitGlobals();
}

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

initializeRevenueCat();

async function rescheduleNotifications() {
  if (Platform.OS === "web") return;
  try {
    const prefs = await loadNotificationPrefs();
    if (!prefs.enabled) return;
    await enableNotifications(prefs);
  } catch {}
}

const FONT_LOAD_TIMEOUT_MS = 800;

function LoadingScreen() {
  return <View style={styles.loadingScreen} />;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="webview-test" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="subscription" options={{ headerShown: false, presentation: "modal" }} />
      {isPhilipVoiceLabEnabled() ? (
        <>
          <Stack.Screen
            name="philip-voice-lab"
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
          <Stack.Screen
            name="philip-voice-eval"
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
        </>
      ) : null}
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

  const [fontsTimedOut, setFontsTimedOut] = useState(false);

  const fontsReady = fontsLoaded || fontError || fontsTimedOut;

  useEffect(() => {
    const fontTimer = setTimeout(() => setFontsTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(fontTimer);
  }, []);

  useEffect(() => {
    if (fontsReady) {
      rescheduleNotifications();
      // Hide the Expo native splash as soon as fonts are ready — don't wait
      // for the WebView to signal react_booted. This prevents a permanent
      // black screen when the web page is slow or fails to load on first open.
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SubscriptionProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
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
  loadingScreen: {
    flex: 1,
    backgroundColor: "#000",
  },
});
