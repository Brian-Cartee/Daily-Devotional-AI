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
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

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

initializeRevenueCat();

async function rescheduleNotifications() {
  if (Platform.OS === "web") return;
  try {
    const prefs = await loadNotificationPrefs();
    if (!prefs.enabled) return;
    await enableNotifications(prefs);
  } catch {}
}

const FONT_LOAD_TIMEOUT_MS = 3500;

function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color="#7A018D" />
      <Text style={styles.loadingText}>{message}</Text>
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

  const [fontsTimedOut, setFontsTimedOut] = useState(false);

  const fontsReady = fontsLoaded || fontError || fontsTimedOut;

  useEffect(() => {
    const fontTimer = setTimeout(() => setFontsTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(fontTimer);
  }, []);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync();
      rescheduleNotifications();
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return <LoadingScreen message="Loading..." />;
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
    backgroundColor: "#0d0612",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#c0a8cc",
    textAlign: "center",
  },
});
