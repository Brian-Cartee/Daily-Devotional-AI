import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { PurchasesPackage } from "react-native-purchases";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

const FEATURES = [
  { icon: "book-open", text: "Daily devotional with guided prayer" },
  { icon: "zap", text: "AI-powered Bible study companion" },
  { icon: "users", text: "Community prayer wall" },
  { icon: "heart", text: "Unlimited verse memorization" },
  { icon: "bell", text: "Daily scripture reminders" },
];

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { offerings, isSubscribed, purchase, isPurchasing, restore, isRestoring } = useSubscription();
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [confirmPkg, setConfirmPkg] = useState<PurchasesPackage | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const packages = offerings?.current?.availablePackages ?? [];
  const monthlyPkg = packages.find((p) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly");
  const annualPkg = packages.find((p) => p.packageType === "ANNUAL" || p.identifier === "$rc_annual");

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setErrorMsg("");
    if (__DEV__) {
      setConfirmPkg(pkg);
      return;
    }
    try {
      await purchase(pkg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      if (!e?.userCancelled) setErrorMsg("Purchase failed. Please try again.");
    }
  };

  const confirmPurchase = async () => {
    if (!confirmPkg) return;
    setConfirmPkg(null);
    try {
      await purchase(confirmPkg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      if (!e?.userCancelled) setErrorMsg("Purchase failed. Please try again.");
    }
  };

  const styles = makeStyles(colors, insets);

  if (isSubscribed) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center", gap: 16 }]}>
        <Feather name="check-circle" size={60} color="#16a34a" />
        <Text style={styles.alreadyTitle}>You're a Pro member!</Text>
        <Text style={styles.alreadySubtitle}>Thank you for supporting Shepherd's Path.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="button-back">
          <Text style={styles.backBtnText}>Back to app</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} testID="button-close-subscription">
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroSection}>
        <View style={styles.iconCircle}>
          <Feather name="star" size={32} color={colors.primaryForeground} />
        </View>
        <Text style={styles.heroTitle}>Shepherd's Path Pro</Text>
        <Text style={styles.heroSubtitle}>
          Walk deeper in faith with daily devotionals, AI Bible study, and a community of prayer.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.featuresCard}>
        {FEATURES.map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Feather name={f.icon as any} size={16} color={colors.primary} />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Plan cards */}
      <Text style={styles.planHeader}>Choose your plan</Text>

      {packages.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.plans}>
          {annualPkg && (
            <TouchableOpacity
              style={[styles.planCard, selectedPkg === "$rc_annual" && styles.planCardSelected]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPkg("$rc_annual"); }}
              testID="button-select-annual"
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <Text style={styles.planName}>Annual</Text>
              <Text style={styles.planPrice} testID="text-annual-price">{annualPkg.product.priceString}</Text>
              <Text style={styles.planPer}>per year</Text>
              <Text style={styles.planSavings}>
                {monthlyPkg ? `Save vs. monthly` : "Best deal"}
              </Text>
            </TouchableOpacity>
          )}

          {monthlyPkg && (
            <TouchableOpacity
              style={[styles.planCard, selectedPkg === "$rc_monthly" && styles.planCardSelected]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPkg("$rc_monthly"); }}
              testID="button-select-monthly"
            >
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice} testID="text-monthly-price">{monthlyPkg.product.priceString}</Text>
              <Text style={styles.planPer}>per month</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaBtn, (!selectedPkg || isPurchasing) && { opacity: 0.6 }]}
        disabled={!selectedPkg || isPurchasing}
        onPress={() => {
          const pkg = selectedPkg === "$rc_monthly" ? monthlyPkg : annualPkg;
          if (pkg) handlePurchase(pkg);
        }}
        testID="button-subscribe-cta"
      >
        {isPurchasing ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.ctaBtnText}>
            {selectedPkg ? `Subscribe${selectedPkg === "$rc_annual" ? " Annually" : " Monthly"}` : "Select a plan to continue"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Restore */}
      <TouchableOpacity
        style={styles.restoreBtn}
        onPress={async () => { try { await restore(); } catch (e) {} }}
        disabled={isRestoring}
        testID="button-restore"
      >
        {isRestoring ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : null}
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={styles.legalText}>
        Subscription auto-renews. Cancel anytime in your App Store settings.
      </Text>

      {/* Dev confirmation modal */}
      <Modal visible={!!confirmPkg} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmPkg(null)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={styles.modalTitle}>Test Purchase</Text>
            <Text style={styles.modalBody}>
              You're in development mode. This would trigger the Apple payment sheet for:
              {"\n\n"}<Text style={{ fontFamily: "Inter_700Bold" }}>{confirmPkg?.product.title}</Text>
              {"\n"}{confirmPkg?.product.priceString}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setConfirmPkg(null)} style={styles.modalCancelBtn}>
                <Text style={{ color: colors.mutedForeground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmPurchase} style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(colors: any, insets: any) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 32,
      paddingTop: isWeb ? 67 : 0,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingTop: 16,
      paddingBottom: 8,
    },
    heroSection: { alignItems: "center", paddingVertical: 24, gap: 12 },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" },
    heroSubtitle: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
    featuresCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    featureIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    featureText: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", flex: 1 },
    planHeader: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 12 },
    plans: { flexDirection: "row", gap: 12, marginBottom: 20 },
    planCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 4,
      position: "relative",
    },
    planCardSelected: { borderColor: colors.primary },
    bestValueBadge: {
      position: "absolute",
      top: -10,
      alignSelf: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
    },
    bestValueText: { fontSize: 10, color: colors.primaryForeground, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
    planName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginTop: 8 },
    planPrice: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.primary },
    planPer: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    planSavings: { fontSize: 12, color: colors.secondary, fontFamily: "Inter_500Medium" },
    errorText: { color: colors.destructive, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8 },
    ctaBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 12,
    },
    ctaBtnText: { color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 16 },
    restoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
    restoreText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    legalText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, lineHeight: 16 },
    alreadyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    alreadySubtitle: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    backBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
    backBtnText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalCard: { borderRadius: 16, padding: 24, width: "100%", gap: 12 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    modalBody: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22 },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
    modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    modalConfirmBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  });
}
