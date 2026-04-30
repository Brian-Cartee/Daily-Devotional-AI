import React, { useState, useEffect, useCallback } from "react";
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
  Switch,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { API_BASE } from "@/lib/api";
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  requestNotificationPermissions,
  enableNotifications,
  disableNotifications,
  formatTime,
  NotificationPrefs,
} from "@/lib/notifications";

const SESSION_ID_KEY = "shepherds_session_id";
const DAYS_KEY = "shepherds_days_with_app";

type WeekDay = { date: string; dayName: string; count: number; limit: number };

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSubscribed, restore, isRestoring } = useSubscription();
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [weeklyUsage, setWeeklyUsage] = useState<WeekDay[]>([]);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [usageLoading, setUsageLoading] = useState(true);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    enabled: false,
    hour: 7,
    minute: 0,
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerHour, setPickerHour] = useState(7);
  const [pickerMinute, setPickerMinute] = useState(0);

  useEffect(() => {
    loadNotificationPrefs().then(setNotifPrefs);
  }, []);

  useEffect(() => {
    async function loadUsage() {
      try {
        const sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
        const daysRaw = await AsyncStorage.getItem(DAYS_KEY);
        const daysWithApp = daysRaw ? Math.max(1, parseInt(daysRaw)) : 1;
        const params = sessionId
          ? `?sessionId=${sessionId}&daysWithApp=${daysWithApp}`
          : `?daysWithApp=${daysWithApp}`;
        const res = await fetch(`${API_BASE}/api/ai-usage/weekly${params}`);
        if (res.ok) {
          const data = await res.json();
          setWeeklyUsage(data.days);
          setDailyLimit(data.dailyLimit);
        }
      } catch (_) {}
      setUsageLoading(false);
    }
    loadUsage();
  }, []);

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

  const handleNotifToggle = useCallback(async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      Alert.alert("Notifications", "Push notifications are only available on iOS and Android.");
      return;
    }

    setNotifLoading(true);
    try {
      if (value) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Please allow notifications in your device settings to receive daily scripture reminders."
          );
          setNotifLoading(false);
          return;
        }
        const updated = { ...notifPrefs, enabled: true };
        setNotifPrefs(updated);
        await saveNotificationPrefs(updated);
        await enableNotifications(updated);
      } else {
        const updated = { ...notifPrefs, enabled: false };
        setNotifPrefs(updated);
        await saveNotificationPrefs(updated);
        await disableNotifications();
      }
    } finally {
      setNotifLoading(false);
    }
  }, [notifPrefs]);

  const openTimePicker = () => {
    setPickerHour(notifPrefs.hour);
    setPickerMinute(notifPrefs.minute);
    setTimePickerVisible(true);
  };

  const confirmTime = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimePickerVisible(false);
    setNotifLoading(true);
    try {
      const updated = { ...notifPrefs, hour: pickerHour, minute: pickerMinute };
      setNotifPrefs(updated);
      await saveNotificationPrefs(updated);
      if (updated.enabled) {
        await enableNotifications(updated);
      }
    } finally {
      setNotifLoading(false);
    }
  };

  const incrementHour = () => setPickerHour((h) => (h + 1) % 24);
  const decrementHour = () => setPickerHour((h) => (h + 23) % 24);
  const incrementMinute = () => setPickerMinute((m) => (m + 5) % 60);
  const decrementMinute = () => setPickerMinute((m) => (m - 5 + 60) % 60);

  const styles = makeStyles(colors, insets);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Settings</Text>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Notifications</Text>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Feather name="bell" size={16} color={colors.mutedForeground} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Daily Scripture Reminder</Text>
          </View>
          {notifLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              testID="toggle-daily-notifications"
              value={notifPrefs.enabled}
              onValueChange={handleNotifToggle}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.background}
              ios_backgroundColor={colors.muted}
            />
          )}
        </View>

        {notifPrefs.enabled && (
          <TouchableOpacity
            style={styles.timeRow}
            onPress={openTimePicker}
            testID="button-notification-time"
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Feather name="clock" size={16} color={colors.mutedForeground} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Reminder Time</Text>
            </View>
            <View style={styles.timeValue}>
              <Text style={styles.timeValueText}>
                {formatTime(notifPrefs.hour, notifPrefs.minute)}
              </Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.notifHint}>
          {notifPrefs.enabled
            ? `You'll receive today's verse each day at ${formatTime(notifPrefs.hour, notifPrefs.minute)}.`
            : "Turn on to receive a daily scripture verse each morning."}
        </Text>
      </View>

      {/* Weekly Usage Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Your Journey This Week</Text>
        <Text style={styles.usageSubtitle}>AI conversations used each day</Text>

        {usageLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
        ) : (
          <>
            <View style={styles.chartRow}>
              {weeklyUsage.map((day, i) => {
                const isToday = i === weeklyUsage.length - 1;
                const pct = Math.min(1, day.limit > 0 ? day.count / day.limit : 0);
                const barH = Math.max(4, Math.round(pct * 56));
                return (
                  <View key={day.date} style={styles.chartCol}>
                    <Text style={[styles.chartCount, { color: isToday ? colors.primary : colors.mutedForeground }]}>
                      {day.count > 0 ? day.count : ""}
                    </Text>
                    <View style={styles.chartBarBg}>
                      <View style={[
                        styles.chartBarFill,
                        {
                          height: barH,
                          backgroundColor: isToday ? colors.primary : colors.mutedForeground,
                          opacity: isToday ? 1 : 0.45,
                        }
                      ]} />
                    </View>
                    <Text style={[styles.chartDay, isToday && { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                      {day.dayName}
                    </Text>
                  </View>
                );
              })}
            </View>
            {weeklyUsage.length > 0 && (
              <Text style={styles.usageNote}>
                {isSubscribed
                  ? "Pro — unlimited conversations"
                  : `Up to ${dailyLimit} conversations/day · resets at midnight`}
              </Text>
            )}
          </>
        )}
      </View>

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
          <Text style={styles.rowValue}>2.0.0</Text>
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

      {/* Time Picker Modal */}
      <Modal
        visible={timePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Reminder Time</Text>

            <View style={styles.pickerRow}>
              {/* Hour picker */}
              <View style={styles.pickerColumn}>
                <TouchableOpacity
                  onPress={incrementHour}
                  style={styles.pickerBtn}
                  testID="button-hour-up"
                >
                  <Feather name="chevron-up" size={22} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={styles.pickerValue} testID="text-picker-hour">
                  {pickerHour % 12 === 0 ? 12 : pickerHour % 12}
                </Text>
                <TouchableOpacity
                  onPress={decrementHour}
                  style={styles.pickerBtn}
                  testID="button-hour-down"
                >
                  <Feather name="chevron-down" size={22} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <Text style={styles.pickerSeparator}>:</Text>

              {/* Minute picker */}
              <View style={styles.pickerColumn}>
                <TouchableOpacity
                  onPress={incrementMinute}
                  style={styles.pickerBtn}
                  testID="button-minute-up"
                >
                  <Feather name="chevron-up" size={22} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={styles.pickerValue} testID="text-picker-minute">
                  {pickerMinute.toString().padStart(2, "0")}
                </Text>
                <TouchableOpacity
                  onPress={decrementMinute}
                  style={styles.pickerBtn}
                  testID="button-minute-down"
                >
                  <Feather name="chevron-down" size={22} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              {/* AM/PM */}
              <View style={styles.pickerColumn}>
                <TouchableOpacity
                  style={[styles.ampmBtn, pickerHour < 12 && styles.ampmBtnActive]}
                  onPress={() => {
                    if (pickerHour >= 12) setPickerHour(pickerHour - 12);
                  }}
                  testID="button-am"
                >
                  <Text style={[styles.ampmText, pickerHour < 12 && styles.ampmTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ampmBtn, pickerHour >= 12 && styles.ampmBtnActive]}
                  onPress={() => {
                    if (pickerHour < 12) setPickerHour(pickerHour + 12);
                  }}
                  testID="button-pm"
                >
                  <Text style={[styles.ampmText, pickerHour >= 12 && styles.ampmTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setTimePickerVisible(false)}
                testID="button-cancel-time"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={confirmTime}
                testID="button-confirm-time"
              >
                <Text style={styles.confirmBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 2,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    rowIcon: {},
    rowLabel: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    rowValue: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    timeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 2,
    },
    timeValue: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    timeValueText: {
      fontSize: 14,
      color: colors.primary,
      fontFamily: "Inter_500Medium",
    },
    notifHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
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
    footer: {
      textAlign: "center",
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
      marginTop: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: "100%",
      maxWidth: 360,
      gap: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      textAlign: "center",
    },
    pickerRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
    },
    pickerColumn: {
      alignItems: "center",
      gap: 8,
    },
    pickerBtn: {
      padding: 8,
    },
    pickerValue: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      minWidth: 52,
      textAlign: "center",
    },
    pickerSeparator: {
      fontSize: 32,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 4,
    },
    ampmBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.muted,
    },
    ampmBtnActive: {
      backgroundColor: colors.primary,
    },
    ampmText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    ampmTextActive: {
      color: colors.primaryForeground,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    cancelBtnText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    confirmBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    usageSubtitle: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    chartRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginVertical: 8,
    },
    chartCol: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    chartCount: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      minHeight: 14,
    },
    chartBarBg: {
      width: 20,
      height: 60,
      backgroundColor: colors.muted,
      borderRadius: 4,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    chartBarFill: {
      width: "100%",
      borderRadius: 4,
    },
    chartDay: {
      fontSize: 10,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    usageNote: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 4,
    },
  });
}
