import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { fetchDailyArt } from "@/lib/api";

const DEVOTIONAL_STEPS = [
  {
    number: 1,
    title: "Read & Receive",
    body: "Read today's verse slowly. Let the words settle. Don't rush — God's Word is alive and speaks when we slow down.",
  },
  {
    number: 2,
    title: "Reflect",
    body: "What does this verse reveal about God's character? What is He saying to you personally in this season?",
  },
  {
    number: 3,
    title: "Respond in Prayer",
    body: "Talk to God about what you read. Thank Him, confess, or simply tell Him what's on your heart. He's listening.",
  },
  {
    number: 4,
    title: "Walk It Out",
    body: "How can you apply this truth today? Identify one small act of obedience or one attitude to carry forward.",
  },
];

export default function DevotionalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: dailyArt, isLoading } = useQuery({
    queryKey: ["daily-art"],
    queryFn: fetchDailyArt,
    staleTime: 1000 * 60 * 60,
  });

  const styles = makeStyles(colors, insets);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} testID="button-back-devotional">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Today's Devotional</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Date */}
      <Text style={styles.dateLabel}>
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </Text>

      {/* Verse card */}
      <View style={styles.verseCard}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View style={styles.verseTopBar} />
            <Text style={styles.verseText} testID="text-devotional-verse">
              "{dailyArt?.verse ?? "The Lord is my shepherd; I shall not want."}"
            </Text>
            <View style={styles.verseRefRow}>
              <Feather name="book-open" size={14} color={colors.primary} />
              <Text style={styles.verseRef} testID="text-devotional-ref">
                {dailyArt?.reference ?? "Psalm 23:1"}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Steps */}
      <Text style={styles.stepsHeader}>Walk through it</Text>

      {DEVOTIONAL_STEPS.map((step, idx) => (
        <View key={step.number} style={styles.stepCard} testID={`card-step-${step.number}`}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>{step.number}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
          </View>
          <Text style={styles.stepBody}>{step.body}</Text>

          {idx < DEVOTIONAL_STEPS.length - 1 && (
            <View style={styles.connector}>
              <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
            </View>
          )}
        </View>
      ))}

      {/* Closing */}
      <View style={styles.closingCard}>
        <Feather name="heart" size={20} color={colors.primary} />
        <Text style={styles.closingTitle}>You've completed today's devotional</Text>
        <Text style={styles.closingBody}>
          May the Lord bless you and keep you. May His face shine upon you, and be gracious to you.
        </Text>
        <Text style={styles.closingRef}>— Numbers 6:24-25</Text>
      </View>
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
      paddingTop: isWeb ? 67 : 0,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
    },
    headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    dateLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginBottom: 16,
    },
    verseCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
      overflow: "hidden",
    },
    verseTopBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: colors.primary,
    },
    verseText: {
      fontSize: 18,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      lineHeight: 28,
      marginTop: 8,
    },
    verseRefRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    verseRef: { fontSize: 14, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    stepsHeader: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 12,
    },
    stepCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
    stepNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    stepNumberText: { color: "#ffffff", fontFamily: "Inter_700Bold", fontSize: 14 },
    stepTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 },
    stepBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 22 },
    connector: { alignItems: "center", marginTop: 8 },
    connectorLine: { width: 1, height: 8 },
    closingCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      gap: 10,
    },
    closingTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      textAlign: "center",
    },
    closingBody: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
    },
    closingRef: {
      fontSize: 13,
      color: colors.primary,
      fontFamily: "Inter_500Medium",
    },
  });
}
