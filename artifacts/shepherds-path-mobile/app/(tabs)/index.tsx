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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { fetchDailyArt, recordStreak, fetchStreak } from "@/lib/api";
import { useSubscription } from "@/lib/revenuecat";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SESSION_ID_KEY = "sp_session_id";

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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getOrCreateSessionId().then(setSessionId);
  }, []);

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

      {/* Today's word section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reflect on this</Text>
        <Text style={styles.sectionBody}>
          Take a moment to sit with today's verse. Let it speak into your morning, your challenges, and your gratitude.
          {"\n\n"}
          The Word is alive and active — sharper than any double-edged sword.
        </Text>
      </View>
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
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginHorizontal: 16,
      marginTop: 20,
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
  });
}
