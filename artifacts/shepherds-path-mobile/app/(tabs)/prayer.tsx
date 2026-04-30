import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { fetchPrayerWall, submitPrayer, prayForEntry, fetchPrayerRecordings, type PrayerReflection } from "@/lib/api";

const SESSION_ID_KEY = "sp_session_id";

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PrayerHistoryCard({ record, colors }: { record: PrayerReflection; colors: ReturnType<typeof useColors> }) {
  const gold = colors.secondary;
  return (
    <View style={[historyStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={historyStyles.cardHeader}>
        <Text style={[historyStyles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
          {record.title}
        </Text>
        <Text style={[historyStyles.cardDate, { color: colors.mutedForeground }]}>
          {formatRelativeDate(record.prayedAt)}
        </Text>
      </View>
      {record.scriptureRef && (
        <Text style={[historyStyles.scripture, { color: gold }]}>{record.scriptureRef}</Text>
      )}
      {record.reflection && (
        <Text style={[historyStyles.reflection, { color: colors.mutedForeground }]} numberOfLines={2}>
          {record.reflection}
        </Text>
      )}
      {record.themes.length > 0 && (
        <View style={historyStyles.chipRow}>
          {record.themes.slice(0, 3).map((t, i) => (
            <View key={i} style={[historyStyles.chip, { backgroundColor: colors.muted }]}>
              <Text style={[historyStyles.chipText, { color: gold }]}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const historyStyles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
  cardDate: { fontSize: 12 },
  scripture: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  reflection: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  chipText: { fontSize: 11, fontWeight: "600" },
});

export default function PrayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isSubscribed } = useSubscription();
  const [sessionId, setSessionId] = useState("");
  const [newPrayer, setNewPrayer] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [prayerHistory, setPrayerHistory] = useState<PrayerReflection[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_ID_KEY).then((id) => {
      if (id) setSessionId(id);
    });
  }, []);

  const loadPrayerHistory = useCallback(async (sid: string) => {
    if (!sid) return;
    const limit = isSubscribed ? 50 : 20;
    const history = await fetchPrayerRecordings(sid, limit);
    setPrayerHistory(history);
  }, [isSubscribed]);

  useEffect(() => {
    if (sessionId) loadPrayerHistory(sessionId);
  }, [sessionId, loadPrayerHistory]);

  const { data: prayers, isLoading } = useQuery({
    queryKey: ["prayer-wall", sessionId],
    queryFn: () => fetchPrayerWall(sessionId),
    enabled: !!sessionId,
    staleTime: 30000,
  });

  const submitMutation = useMutation({
    mutationFn: () => submitPrayer(newPrayer.trim(), sessionId),
    onSuccess: () => {
      setNewPrayer("");
      setShowInput(false);
      queryClient.invalidateQueries({ queryKey: ["prayer-wall", sessionId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const prayMutation = useMutation({
    mutationFn: (id: number) => prayForEntry(id, sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prayer-wall", sessionId] }),
  });

  const styles = makeStyles(colors, insets);

  const handleStartPraying = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/prayer-live", params: { sessionId } });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card} testID={`card-prayer-${item.id}`}>
      <Text style={styles.prayerText}>{item.request}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.prayerCount}>
          <Feather name="heart" size={12} color={colors.mutedForeground} /> {item.prayCount ?? 0} praying
        </Text>
        <TouchableOpacity
          style={[styles.prayBtn, item.hasPrayed && styles.prayBtnActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); prayMutation.mutate(item.id); }}
          testID={`button-pray-${item.id}`}
          disabled={item.hasPrayed}
        >
          <Text style={[styles.prayBtnText, item.hasPrayed && { color: colors.primaryForeground }]}>
            {item.hasPrayed ? "Prayed" : "I'll pray"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListHeader = (
    <View>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.title}>Prayer</Text>
        <Text style={styles.subtitle}>Your voice, God's ear</Text>
      </View>

      {/* Pray Now CTA */}
      <TouchableOpacity
        style={[styles.prayNowBtn, { backgroundColor: colors.primary }]}
        onPress={handleStartPraying}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Start praying"
      >
        <View style={[styles.prayNowIconWrap, { borderColor: "rgba(255,255,255,0.3)" }]}>
          <Feather name="mic" size={22} color="#fff" />
        </View>
        <View style={styles.prayNowText}>
          <Text style={styles.prayNowLabel}>Pray Now</Text>
          <Text style={styles.prayNowSub}>Speak aloud — get scripture + reflection</Text>
        </View>
        <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

      {/* My Prayers history */}
      {prayerHistory.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>My Prayers</Text>
          {prayerHistory.map((record) => (
            <PrayerHistoryCard key={record.id} record={record} colors={colors} />
          ))}
          {!isSubscribed && prayerHistory.length >= 5 && (
            <TouchableOpacity
              style={[styles.upgradeRow, { borderColor: colors.secondary + "44" }]}
              onPress={() => router.push("/subscription")}
              activeOpacity={0.8}
            >
              <Feather name="lock" size={13} color={colors.secondary} />
              <Text style={[styles.upgradeText, { color: colors.mutedForeground }]}>
                <Text style={{ color: colors.secondary }}>Pro</Text> keeps your full prayer history + pattern insights
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Community wall header */}
      <Text style={styles.sectionTitle}>Community Prayer Wall</Text>
      <Text style={styles.sectionSub}>Lift one another up</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={prayers ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="heart" size={32} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No prayer requests yet</Text>
              <Text style={styles.emptySubtext}>Be the first to share</Text>
            </View>
          ) : null
        }
        ListFooterComponent={isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Submit area */}
      {showInput ? (
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + 12 }]}>
          <TextInput
            style={styles.input}
            value={newPrayer}
            onChangeText={setNewPrayer}
            placeholder="Share your prayer request..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            autoFocus
            testID="input-prayer"
          />
          <View style={styles.inputActions}>
            <TouchableOpacity onPress={() => setShowInput(false)} testID="button-cancel-prayer">
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!newPrayer.trim() || submitMutation.isPending) && styles.submitBtnDisabled]}
              onPress={() => submitMutation.mutate()}
              disabled={!newPrayer.trim() || submitMutation.isPending}
              testID="button-submit-prayer"
            >
              <Text style={styles.submitBtnText}>
                {submitMutation.isPending ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.fab, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowInput(true); }}
            testID="button-add-prayer"
          >
            <Feather name="plus" size={24} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: any, insets: any) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: {
      paddingHorizontal: 16,
      paddingBottom: insets.bottom + 80,
      paddingTop: isWeb ? 67 : 0,
    },
    pageHeader: { marginBottom: 16, marginTop: 8 },
    title: { fontSize: 26, fontWeight: "700", color: colors.foreground },
    subtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 3 },
    prayNowBtn: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 20,
      gap: 12,
    },
    prayNowIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    prayNowText: { flex: 1 },
    prayNowLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
    prayNowSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
    historySection: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
    sectionSub: { fontSize: 13, color: colors.mutedForeground, marginBottom: 14 },
    upgradeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 4,
    },
    upgradeText: { flex: 1, fontSize: 13 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    prayerText: { fontSize: 15, color: colors.foreground, lineHeight: 22 },
    cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 12, justifyContent: "space-between" },
    prayerCount: { fontSize: 13, color: colors.mutedForeground },
    prayBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    prayBtnActive: { backgroundColor: colors.primary },
    prayBtnText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
    empty: { alignItems: "center", paddingVertical: 32, gap: 8 },
    emptyText: { fontSize: 16, color: colors.mutedForeground, fontWeight: "500" },
    emptySubtext: { fontSize: 14, color: colors.mutedForeground },
    inputArea: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.foreground,
      minHeight: 80,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    cancelText: { fontSize: 15, color: colors.mutedForeground },
    submitBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 9,
      borderRadius: 8,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: colors.primaryForeground, fontWeight: "600", fontSize: 15 },
    fab: { position: "absolute", right: 20 },
    fabBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
