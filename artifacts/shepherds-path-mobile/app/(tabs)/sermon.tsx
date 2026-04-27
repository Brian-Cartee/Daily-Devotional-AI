import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { fetchSermonSessions, type SermonSessionSummary } from "@/lib/api";

const SESSION_ID_KEY = "sp_session_id";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function SessionCard({
  session,
  onPress,
  colors,
}: {
  session: SermonSessionSummary;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      <View style={styles.sessionCardRow}>
        <View style={styles.sessionCardLeft}>
          <Text style={[styles.sessionTitle, { color: colors.foreground }]} numberOfLines={2}>
            {session.title}
          </Text>
          <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
            {formatDate(session.startedAt)}
            {session.durationSeconds ? `  ·  ${formatDuration(session.durationSeconds)}` : ""}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
      {session.scriptures.length > 0 && (
        <View style={styles.scriptureTagRow}>
          {session.scriptures.slice(0, 4).map((ref, i) => (
            <View
              key={i}
              style={[styles.scriptureTag, { backgroundColor: colors.muted }]}
            >
              <Text style={[styles.scriptureTagText, { color: colors.secondary }]}>
                {ref}
              </Text>
            </View>
          ))}
          {session.scriptures.length > 4 && (
            <Text style={[styles.scriptureTagMore, { color: colors.mutedForeground }]}>
              +{session.scriptures.length - 4} more
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SermonScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSubscribed } = useSubscription();

  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<SermonSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_ID_KEY).then((id) => {
      if (id) {
        setSessionId(id);
      } else {
        const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        AsyncStorage.setItem(SESSION_ID_KEY, newId);
        setSessionId(newId);
      }
    });
  }, []);

  const loadSessions = useCallback(async (sid: string) => {
    if (!sid) return;
    const limit = isSubscribed ? 50 : 3;
    const data = await fetchSermonSessions(sid, limit);
    setSessions(data);
    setLoading(false);
  }, [isSubscribed]);

  useEffect(() => {
    if (sessionId) loadSessions(sessionId);
  }, [sessionId, loadSessions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions(sessionId);
    setRefreshing(false);
  }, [sessionId, loadSessions]);

  const handleStartListening = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/sermon-live", params: { sessionId } });
  };

  const handleOpenSession = (session: SermonSessionSummary) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/sermon-detail", params: { id: session.id } });
  };

  const gold = colors.secondary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sermon Mode</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            Follow along live — scriptures surface as your pastor speaks
          </Text>
        </View>

        {/* Start Listening CTA */}
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.primary }]}
          onPress={handleStartListening}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Start Listening"
        >
          <View style={styles.startButtonInner}>
            <View style={[styles.micCircle, { borderColor: "rgba(255,255,255,0.35)" }]}>
              <Feather name="mic" size={26} color="#ffffff" />
            </View>
            <View style={styles.startButtonText}>
              <Text style={styles.startButtonLabel}>Start Listening</Text>
              <Text style={styles.startButtonSub}>Open your mic during service</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>

        {/* Free tier note */}
        {!isSubscribed && (
          <TouchableOpacity
            style={[styles.proPrompt, { backgroundColor: colors.muted, borderColor: gold + "44" }]}
            onPress={() => router.push("/subscription")}
            activeOpacity={0.8}
          >
            <Feather name="lock" size={14} color={gold} />
            <Text style={[styles.proPromptText, { color: colors.mutedForeground }]}>
              <Text style={{ color: gold }}>Pro</Text>
              {" "}unlocks full transcript, AI Q&A, and unlimited history
            </Text>
            <Feather name="chevron-right" size={13} color={gold} />
          </TouchableOpacity>
        )}

        {/* Recent Sessions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {sessions.length === 0 ? "Your Sermons" : "Recent Sermons"}
          </Text>
          {!isSubscribed && sessions.length > 0 && (
            <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>Last 3 saved</Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="mic-off" size={36} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No sessions yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Tap "Start Listening" during your next church service
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onPress={() => handleOpenSession(session)}
              colors={colors}
            />
          ))
        )}

        {/* Upgrade nudge for free users who have hit limit */}
        {!isSubscribed && sessions.length >= 3 && (
          <TouchableOpacity
            style={[styles.upgradeCard, { backgroundColor: colors.card, borderColor: gold + "55" }]}
            onPress={() => router.push("/subscription")}
            activeOpacity={0.8}
          >
            <Text style={[styles.upgradeTitle, { color: gold }]}>Unlock Full History</Text>
            <Text style={[styles.upgradeText, { color: colors.mutedForeground }]}>
              Pro members keep every sermon — with transcripts, AI summaries, and the ability to ask questions about any message.
            </Text>
            <View style={[styles.upgradeButton, { backgroundColor: gold }]}>
              <Text style={styles.upgradeButtonText}>Go Pro</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginBottom: 6 },
  headerSubtitle: { fontSize: 15, lineHeight: 22 },
  startButton: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  startButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  micCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: { flex: 1 },
  startButtonLabel: { color: "#fff", fontSize: 17, fontWeight: "700" },
  startButtonSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  proPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 28,
  },
  proPromptText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600" },
  sectionNote: { fontSize: 13 },
  sessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  sessionCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionCardLeft: { flex: 1 },
  sessionTitle: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
  sessionMeta: { fontSize: 13 },
  scriptureTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  scriptureTag: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  scriptureTagText: { fontSize: 12, fontWeight: "600" },
  scriptureTagMore: { fontSize: 12, alignSelf: "center" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 260 },
  upgradeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginTop: 16,
    gap: 10,
  },
  upgradeTitle: { fontSize: 16, fontWeight: "700" },
  upgradeText: { fontSize: 14, lineHeight: 20 },
  upgradeButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  upgradeButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
