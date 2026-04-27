import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
  Dimensions,
  ImageBackground,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { fetchDailyArt, recordStreak, fetchStreak } from "@/lib/api";
import { useSubscription } from "@/lib/revenuecat";
import {
  requestNotificationPermissions,
  enableNotifications,
  loadNotificationPrefs,
  saveNotificationPrefs,
} from "@/lib/notifications";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SESSION_ID_KEY = "sp_session_id";
const POSTURE_KEY = "sp_posture";
const PUSH_ASKED_KEY = "sp_push_asked_v1";
const OPEN_COUNT_KEY = "sp_open_count";

type SpiritualPosture = "Grateful" | "Growing" | "Seeking" | "Heavy";

const POSTURES: { key: SpiritualPosture; icon: string; label: string }[] = [
  { key: "Grateful", icon: "sun", label: "Grateful" },
  { key: "Growing", icon: "trending-up", label: "Growing" },
  { key: "Seeking", icon: "search", label: "Seeking" },
  { key: "Heavy", icon: "cloud", label: "Heavy" },
];

const POSTURE_COPY: Record<SpiritualPosture, { title: string; body: string }> = {
  Grateful: {
    title: "Celebrate what He's done",
    body: "Take a moment to name what God has been faithful in. Gratitude is the language of the surrendered heart — let it overflow in prayer and praise today.",
  },
  Growing: {
    title: "Go deeper in the Word",
    body: "A disciple is always a student. Let today's scripture stretch you, challenge you, and plant something new. Growth is rarely comfortable — it's always worth it.",
  },
  Seeking: {
    title: "Ask, and it shall be given",
    body: "Bring your questions to the One who has answers. Doubt and wonder are not enemies of faith — they are the beginning of it. Sit with the Word and listen.",
  },
  Heavy: {
    title: "You are not alone in this",
    body: "Whatever is weighing on you today, God holds it. Bring your burden to Him in prayer. The Word is not a formula — it is a presence, and He is with you now.",
  },
};

function getOrCreateSessionId(): Promise<string> {
  return AsyncStorage.getItem(SESSION_ID_KEY).then((id) => {
    if (id) return id;
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    return AsyncStorage.setItem(SESSION_ID_KEY, newId).then(() => newId);
  });
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSubscribed } = useSubscription();
  const [sessionId, setSessionId] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [posture, setPosture] = useState<SpiritualPosture | null>(null);
  const [showPushNudge, setShowPushNudge] = useState(false);
  const [pushNudgeLoading, setPushNudgeLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getOrCreateSessionId().then(setSessionId);
    AsyncStorage.getItem(POSTURE_KEY).then((saved) => {
      if (saved) setPosture(saved as SpiritualPosture);
    });
    checkPushNudge();
  }, []);

  async function checkPushNudge() {
    if (Platform.OS === "web") return;
    try {
      const asked = await AsyncStorage.getItem(PUSH_ASKED_KEY);
      if (asked) return;
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") return;
      const countStr = await AsyncStorage.getItem(OPEN_COUNT_KEY);
      const count = parseInt(countStr || "0", 10) + 1;
      await AsyncStorage.setItem(OPEN_COUNT_KEY, String(count));
      if (count >= 2) {
        setShowPushNudge(true);
      }
    } catch {}
  }

  async function handlePushYes() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPushNudgeLoading(true);
    try {
      const granted = await requestNotificationPermissions();
      if (granted) {
        const prefs = await loadNotificationPrefs();
        const updatedPrefs = { ...prefs, enabled: true };
        await saveNotificationPrefs(updatedPrefs);
        await enableNotifications(updatedPrefs);
      }
    } catch {}
    await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");
    setPushNudgeLoading(false);
    setShowPushNudge(false);
  }

  async function handlePushDismiss() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");
    setShowPushNudge(false);
  }

  const handlePosture = (p: SpiritualPosture) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = posture === p ? null : p;
    setPosture(next);
    if (next) AsyncStorage.setItem(POSTURE_KEY, next);
    else AsyncStorage.removeItem(POSTURE_KEY);
  };

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const { data: dailyArt, isLoading, error } = useQuery({
    queryKey: ["daily-art"],
    queryFn: fetchDailyArt,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  const { data: streak } = useQuery({
    queryKey: ["streak", sessionId],
    queryFn: () => fetchStreak(sessionId),
    enabled: !!sessionId,
  });

  const streakMutation = useMutation({
    mutationFn: () => recordStreak(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streak", sessionId] }),
  });

  useEffect(() => {
    if (sessionId) {
      streakMutation.mutate();
    }
  }, [sessionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["daily-art"] });
    setRefreshing(false);
  };

  const styles = makeStyles(colors, insets);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading today's word...</Text>
      </View>
    );
  }

  if (error || !dailyArt) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Feather name="cloud-off" size={40} color={colors.mutedForeground} />
        <Text style={styles.errorText}>Couldn't load today's verse</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} testID="button-retry">
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero verse image */}
      <Animated.View style={[styles.heroContainer, { transform: [{ scale: pulseAnim }] }]}>
        {dailyArt.imageUrl ? (
          <Image
            source={{ uri: dailyArt.imageUrl }}
            style={styles.heroImage}
            contentFit="cover"
            testID="img-daily-art"
          />
        ) : (
          <View style={[styles.heroImage, styles.heroImageFallback]} testID="img-daily-art-fallback" />
        )}
        <View style={styles.heroDarkWash} />
        <View style={styles.heroContent}>
          <View style={styles.heroBrandRow}>
            <Text style={styles.heroBrand}>TODAY'S WORD</Text>
            <Text style={styles.heroDateChip}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.heroVerse} testID="text-verse">
            "{dailyArt.verse || "The Lord is my shepherd; I shall not want."}"
          </Text>
          <View style={styles.heroRefRow}>
            <Feather name="book-open" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroRef} testID="text-reference">
              {dailyArt.reference || "Psalm 23:1"}
            </Text>
          </View>
          {!!dailyArt.reflection && (
            <Text style={styles.heroReflection}>{dailyArt.reflection}</Text>
          )}
        </View>
      </Animated.View>

      {/* Streak card */}
      {!!sessionId && (
        <View style={styles.streakCard} testID="card-streak">
          <View style={styles.streakIconWrap}>
            <Feather name="zap" size={20} color={colors.secondary} />
          </View>
          <View>
            <Text style={styles.streakLabel}>Day streak</Text>
            <Text style={styles.streakCount} testID="text-streak">{streak?.currentStreak ?? 0} days</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.streakBest}>Best: {streak?.longestStreak ?? 0}</Text>
        </View>
      )}

      {/* Spiritual posture selector */}
      <View style={styles.postureRow}>
        {POSTURES.map((p) => {
          const active = posture === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.posturePill,
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => handlePosture(p.key)}
              activeOpacity={0.8}
              testID={`button-posture-${p.key.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityLabel={`Set posture to ${p.key}`}
            >
              <Feather
                name={p.icon as any}
                size={13}
                color={active ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text style={[styles.posturePillText, active && { color: colors.primaryForeground }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/devotional"); }}
          testID="button-devotional"
        >
          <Feather name="heart" size={22} color={colors.primary} />
          <Text style={styles.actionLabel}>Devotional</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/prayer"); }}
          testID="button-prayer"
        >
          <Feather name="users" size={22} color={colors.primary} />
          <Text style={styles.actionLabel}>Prayer Wall</Text>
        </TouchableOpacity>

        {!isSubscribed && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnHighlight]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/subscription"); }}
            testID="button-subscribe"
          >
            <Feather name="star" size={22} color={colors.primaryForeground} />
            <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>Go Pro</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Today's word section — posture-aware */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {posture ? POSTURE_COPY[posture].title : "Sit with this"}
        </Text>
        <Text style={styles.sectionBody}>
          {posture
            ? POSTURE_COPY[posture].body
            : "Take a moment with today's verse. Let it settle, stretch you, or surprise you — the Word meets you exactly where you are today."}
          {"\n\n"}
          {!posture && "Tap a posture above to personalize today's reflection."}
        </Text>
      </View>

      {/* Push notification nudge — shown after 2nd visit if not yet asked */}
      {showPushNudge && (
        <View style={styles.pushNudge} testID="card-push-nudge">
          <View style={styles.pushNudgeTop}>
            <View style={styles.pushNudgeIconWrap}>
              <Feather name="bell" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pushNudgeTitle}>Start your day with scripture</Text>
              <Text style={styles.pushNudgeBody}>
                Get today's verse delivered each morning — right when you wake up.
              </Text>
            </View>
          </View>
          <View style={styles.pushNudgeActions}>
            <TouchableOpacity
              style={styles.pushNudgeYes}
              onPress={handlePushYes}
              disabled={pushNudgeLoading}
              testID="button-push-nudge-yes"
            >
              {pushNudgeLoading
                ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                : <Text style={styles.pushNudgeYesText}>Yes, turn on</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pushNudgeNo}
              onPress={handlePushDismiss}
              testID="button-push-nudge-dismiss"
            >
              <Text style={styles.pushNudgeNoText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: any, insets: any) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingBottom: insets.bottom + 32,
      paddingTop: isWeb ? 67 : 0,
    },
    centered: {
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingTop: isWeb ? 67 : 0,
    },
    loadingText: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    errorText: {
      fontSize: 16,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    retryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryBtnText: {
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    heroContainer: {
      width: SCREEN_WIDTH,
      height: 440,
      position: "relative",
      overflow: "hidden",
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroImageFallback: {
      backgroundColor: "#1a2a3a",
    },
    heroDarkWash: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.50)",
    },
    heroContent: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
      padding: 24,
      paddingBottom: 36,
    },
    heroBrandRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    heroBrand: {
      color: "rgba(255,255,255,0.55)",
      fontSize: 10,
      letterSpacing: 3,
      fontFamily: "Inter_600SemiBold",
    },
    heroDateChip: {
      color: "rgba(255,255,255,0.55)",
      fontSize: 10,
      letterSpacing: 1.5,
      fontFamily: "Inter_400Regular",
    },
    heroVerse: {
      color: "#ffffff",
      fontSize: 22,
      fontFamily: "Inter_500Medium",
      lineHeight: 33,
      marginBottom: 14,
    },
    heroRefRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 10,
    },
    heroRef: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
    heroReflection: {
      color: "rgba(255,255,255,0.55)",
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
      marginTop: 2,
    },
    streakCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 20,
      padding: 16,
      borderRadius: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    streakIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    streakLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    streakCount: {
      fontSize: 18,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    streakBest: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    postureRow: {
      flexDirection: "row",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 16,
      flexWrap: "wrap",
    },
    posturePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 13,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    posturePillText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginHorizontal: 16,
      marginTop: 16,
    },
    actionBtn: {
      flex: 1,
      minWidth: 100,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnHighlight: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    actionLabel: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    section: {
      marginHorizontal: 16,
      marginTop: 24,
      padding: 20,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 17,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 10,
    },
    sectionBody: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      lineHeight: 24,
    },
    pushNudge: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 18,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    pushNudgeTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    pushNudgeIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    pushNudgeTitle: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 4,
    },
    pushNudgeBody: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      lineHeight: 19,
    },
    pushNudgeActions: {
      flexDirection: "row",
      gap: 10,
    },
    pushNudgeYes: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 11,
      alignItems: "center",
    },
    pushNudgeYesText: {
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    pushNudgeNo: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 11,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    pushNudgeNoText: {
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
  });
}
