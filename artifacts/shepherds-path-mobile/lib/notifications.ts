import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerExpoPushToken, unregisterExpoPushToken } from "./api";

const PREFS_KEY = "notification_prefs_v1";
const SESSION_ID_KEY = "sp_session_id";

export interface NotificationPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  hour: 7,
  minute: 0,
};

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const stored = await AsyncStorage.getItem(PREFS_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_PREFS;
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function localToUtcHourMinute(localHour: number, localMinute: number): { utcHour: number; utcMinute: number } {
  const offsetMinutes = new Date().getTimezoneOffset();
  const localTotal = localHour * 60 + localMinute;
  const utcTotal = ((localTotal + offsetMinutes) % (24 * 60) + 24 * 60) % (24 * 60);
  return {
    utcHour: Math.floor(utcTotal / 60),
    utcMinute: utcTotal % 60,
  };
}

async function scheduleLocalFallbackNotification(prefs: NotificationPrefs): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Your Daily Scripture",
      body: "Today's verse is waiting — open Shepherd's Path to read it.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.hour,
      minute: prefs.minute,
    },
  });
}

async function cancelLocalNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

async function getSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_ID_KEY);
}

export async function registerPushTokenWithBackend(prefs: NotificationPrefs): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const sessionId = await getSessionId();
    if (!sessionId) return false;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const { utcHour, utcMinute } = localToUtcHourMinute(prefs.hour, prefs.minute);
    await registerExpoPushToken(sessionId, tokenData.data, utcHour, utcMinute);
    await cancelLocalNotifications();
    return true;
  } catch (err) {
    console.warn("[notifications] Failed to register push token with backend:", err);
    return false;
  }
}

export async function enableNotifications(prefs: NotificationPrefs): Promise<void> {
  if (Platform.OS === "web") return;
  const backendOk = await registerPushTokenWithBackend(prefs);
  if (!backendOk) {
    await scheduleLocalFallbackNotification(prefs);
  }
}

export async function disableNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelLocalNotifications();
  await unregisterPushTokenFromBackend();
}

export async function unregisterPushTokenFromBackend(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const sessionId = await getSessionId();
    if (!sessionId) return;
    await unregisterExpoPushToken(sessionId);
  } catch (err) {
    console.warn("[notifications] Failed to unregister push token:", err);
  }
}

export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute.toString().padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}
