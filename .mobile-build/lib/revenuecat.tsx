import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";
export const REVENUECAT_MISSION_PARTNER_ENTITLEMENT = "mission_partner";

export type SubscriptionTier = "free" | "pro" | "mission_partner";

function getRevenueCatApiKey(): string {
  const isExpoGo = Constants.executionEnvironment === "storeClient";

  if (__DEV__ || isExpoGo || Platform.OS === "web") {
    if (!REVENUECAT_TEST_API_KEY) {
      throw new Error("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY is not set");
    }
    return REVENUECAT_TEST_API_KEY;
  }

  if (Platform.OS === "ios") {
    if (!REVENUECAT_IOS_API_KEY) {
      throw new Error("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is not set");
    }
    return REVENUECAT_IOS_API_KEY;
  }

  if (Platform.OS === "android") {
    if (!REVENUECAT_ANDROID_API_KEY) {
      throw new Error("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY is not set");
    }
    return REVENUECAT_ANDROID_API_KEY;
  }

  if (!REVENUECAT_TEST_API_KEY) {
    throw new Error("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY is not set");
  }
  return REVENUECAT_TEST_API_KEY;
}

let revenueCatConfigured = false;

export function isRevenueCatConfigured(): boolean {
  return revenueCatConfigured;
}

/** Never throw — a billing init failure must not block the WebView shell. */
export function initializeRevenueCat(): boolean {
  try {
    const apiKey = getRevenueCatApiKey();
    Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
    revenueCatConfigured = true;
    if (__DEV__) {
      console.log("[RevenueCat] Configured with key for platform:", Platform.OS);
    }
    return true;
  } catch (err) {
    console.warn("[RevenueCat] Not configured:", err);
    revenueCatConfigured = false;
    return false;
  }
}

function useSubscriptionContext() {
  const enabled = revenueCatConfigured;

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
    enabled,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
    enabled,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: any) => {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => Purchases.restorePurchases(),
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isMissionPartner =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_MISSION_PARTNER_ENTITLEMENT] !== undefined;
  const isSubscribed =
    isMissionPartner ||
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  const tier: SubscriptionTier = isMissionPartner ? "mission_partner" : isSubscribed ? "pro" : "free";

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isMissionPartner,
    tier,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
