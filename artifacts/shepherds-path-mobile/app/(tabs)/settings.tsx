import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSubscribed, restore, isRestoring } = useSubscription();
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await restore();
      setRestoreSuccess(true);
      setTimeout(() => setRestoreSuccess(false), 3000);
    } catch (e) {
      Alert.alert("Restore Failed", "No previous purchases found, or there was an error.");
    }
  };

  const styles = makeStyles(colors, insets);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Settings</Text>

      {/* Subscription status */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Subscription</Text>

        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: isSubscribed ? "#16a34a22" : colors.muted }]}>
            <Feather name={isSubscribed ? "check-circle" : "lock"} size={16} color={isSubscribed ? "#16a34a" : colors.mutedForeground} />
            <Text style={[styles.statusText, { color: isSubscribed ? "#16a34a" : colors.mutedForeground }]}>
              {isSubscribed ? "Shepherd's Path Pro" : "Free plan"}
            </Text>
          </View>
        </View>

        {!isSubscribed && (
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/subscription"); }}
            testID="button-upgrade"
          >
            <Feather name="star" size={16} color={colors.primaryForeground} />
            <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.restoreBtn, isRestoring && { opacity: 0.6 }]}
          onPress={handleRestore}
          disabled={isRestoring}
          testID="button-restore-purchases"
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={16} color={colors.primary} />
          )}
          <Text style={styles.restoreBtnText}>
            {restoreSuccess ? "Restored!" : "Restore Purchases"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>About</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Website</Text>
          <Text style={styles.rowValue}>shepherdspathai.com</Text>
        </View>
      </View>

      {/* Legal */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Legal</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL("https://shepherdspathai.com/privacy"); }}
          testID="button-privacy-policy"
        >
          <Text style={styles.rowLabel}>Privacy Policy</Text>
          <Feather name="external-link" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL("https://shepherdspathai.com/terms"); }}
          testID="button-terms-of-use"
        >
          <Text style={styles.rowLabel}>Terms of Use</Text>
          <Feather name="external-link" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Made with faith for the journey ahead.{"\n"}Shepherd's Path © {new Date().getFullYear()}
      </Text>
    </ScrollView>
  );
}

function makeStyles(colors: any, insets: any) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: 16,
      paddingBottom: insets.bottom + 32,
      paddingTop: isWeb ? 67 : 8,
    },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 24 },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    sectionHeader: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    statusRow: { flexDirection: "row" },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    statusText: { fontSize: 14, fontFamily: "Inter_500Medium" },
    upgradeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 10,
      alignSelf: "flex-start",
    },
    upgradeBtnText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    restoreBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
    },
    restoreBtnText: { fontSize: 14, color: colors.primary, fontFamily: "Inter_500Medium" },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 2,
    },
    rowLabel: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    rowValue: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    footer: {
      textAlign: "center",
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
      marginTop: 8,
    },
  });
}
