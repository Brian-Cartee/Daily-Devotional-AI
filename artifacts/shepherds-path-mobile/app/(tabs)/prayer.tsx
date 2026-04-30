import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import {
  fetchPrayerWall,
  fetchAnsweredPrayers,
  encouragePrayer,
  markPrayerAnswered,
  reportPrayer,
  fetchPrayerRecordings,
  PRAYER_CATEGORIES,
  ENCOURAGEMENT_ACTIONS,
  type PrayerWallItem,
  type AnsweredPrayer,
  type PrayerReflection,
  type EncouragementAction,
} from "@/lib/api";

const SESSION_ID_KEY = "sp_session_id";

const REPORT_REASONS = [
  { key: "harmful", label: "Harmful or abusive" },
  { key: "spam", label: "Spam" },
  { key: "inappropriate", label: "Inappropriate content" },
  { key: "divisive", label: "Theological argument / divisive" },
  { key: "personal_info", label: "Contains personal information" },
  { key: "other", label: "Other" },
];

const ENC_LABELS: Record<EncouragementAction, string> = {
  prayed: "Prayed",
  standing_with_you: "With You",
  not_alone: "Not Alone",
  god_is_near: "God is Near",
};

const ENC_ICONS: Record<EncouragementAction, string> = {
  prayed: "heart",
  standing_with_you: "users",
  not_alone: "link",
  god_is_near: "sun",
};

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMin < 2) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Prayer History Card ───────────────────────────────────────────────────────
function PrayerHistoryCard({ record, colors }: { record: PrayerReflection; colors: ReturnType<typeof useColors> }) {
  const gold = colors.secondary;
  return (
    <View style={[historyStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={historyStyles.cardHeader}>
        <Text style={[historyStyles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{record.title}</Text>
        <Text style={[historyStyles.cardDate, { color: colors.mutedForeground }]}>{formatRelativeDate(record.prayedAt)}</Text>
      </View>
      {record.scriptureRef && (
        <Text style={[historyStyles.scripture, { color: gold }]}>{record.scriptureRef}</Text>
      )}
      {record.reflection && (
        <Text style={[historyStyles.reflection, { color: colors.mutedForeground }]} numberOfLines={2}>{record.reflection}</Text>
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

// ── Answered Prayer Card ──────────────────────────────────────────────────────
function AnsweredCard({ item, colors }: { item: AnsweredPrayer; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[answeredStyles.card, { backgroundColor: colors.card, borderColor: colors.secondary + "55" }]}>
      <View style={answeredStyles.badgeRow}>
        <View style={[answeredStyles.badge, { backgroundColor: colors.secondary + "22" }]}>
          <Feather name="check-circle" size={11} color={colors.secondary} />
          <Text style={[answeredStyles.badgeText, { color: colors.secondary }]}>Answered</Text>
        </View>
        <Text style={[answeredStyles.categoryText, { color: colors.mutedForeground }]}>{item.category}</Text>
      </View>
      <Text style={[answeredStyles.request, { color: colors.foreground }]} numberOfLines={3}>{item.request}</Text>
      {!!item.answeredText && (
        <Text style={[answeredStyles.answeredText, { color: colors.mutedForeground }]}>{item.answeredText}</Text>
      )}
      <Text style={[answeredStyles.meta, { color: colors.mutedForeground }]}>
        {item.displayName || "Anonymous Believer"} · {formatRelativeDate(item.answeredAt || item.createdAt)}
      </Text>
    </View>
  );
}
const answeredStyles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  categoryText: { fontSize: 12 },
  request: { fontSize: 14, lineHeight: 21, marginBottom: 4 },
  answeredText: { fontSize: 13, lineHeight: 19, fontStyle: "italic", marginBottom: 6 },
  meta: { fontSize: 11 },
});

// ── Prayer Wall Card ──────────────────────────────────────────────────────────
function PrayerCard({
  item,
  sessionId,
  colors,
  onEncourage,
  onAnswer,
  onReport,
}: {
  item: PrayerWallItem;
  sessionId: string;
  colors: ReturnType<typeof useColors>;
  onEncourage: (id: number, action: EncouragementAction) => void;
  onAnswer: (item: PrayerWallItem) => void;
  onReport: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = item.request.length > 160;

  const totalEnc = item.encouragements.total;

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`card-prayer-${item.id}`}>
      {/* Header row */}
      <View style={cardStyles.headerRow}>
        <View style={[cardStyles.catBadge, { backgroundColor: colors.primary + "18" }]}>
          <Text style={[cardStyles.catText, { color: colors.primary }]}>{item.category}</Text>
        </View>
        <Text style={[cardStyles.timestamp, { color: colors.mutedForeground }]}>{formatRelativeDate(item.createdAt)}</Text>
      </View>

      {/* Prayer text */}
      {isLong && !expanded ? (
        <>
          <Text style={[cardStyles.prayerText, { color: colors.foreground }]}>{item.request.slice(0, 160)}…</Text>
          <TouchableOpacity onPress={() => setExpanded(true)}>
            <Text style={[cardStyles.seeMore, { color: colors.primary }]}>See more</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={[cardStyles.prayerText, { color: colors.foreground }]}>{item.request}</Text>
      )}

      {/* Attribution */}
      <Text style={[cardStyles.attribution, { color: colors.mutedForeground }]}>
        — {item.isAnonymous ? "Anonymous Believer" : (item.displayName || "Anonymous Believer")}
      </Text>

      {/* Total encouragement count */}
      {totalEnc > 0 && (
        <Text style={[cardStyles.totalEnc, { color: colors.mutedForeground }]}>
          {totalEnc} {totalEnc === 1 ? "person is" : "people are"} standing with this prayer
        </Text>
      )}

      {/* Encouragement action buttons */}
      <View style={cardStyles.actionRow}>
        {ENCOURAGEMENT_ACTIONS.map((act) => {
          const done = item.myActions.includes(act.key);
          const count = item.encouragements[act.key as EncouragementAction];
          return (
            <TouchableOpacity
              key={act.key}
              style={[
                cardStyles.encBtn,
                { borderColor: done ? colors.primary : colors.border },
                done && { backgroundColor: colors.primary + "18" },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onEncourage(item.id, act.key);
              }}
              disabled={done}
              testID={`button-encourage-${item.id}-${act.key}`}
            >
              <Feather
                name={ENC_ICONS[act.key] as any}
                size={12}
                color={done ? colors.primary : colors.mutedForeground}
              />
              <Text style={[cardStyles.encBtnText, { color: done ? colors.primary : colors.mutedForeground }, done && { fontWeight: "700" }]}>
                {ENC_LABELS[act.key]}{count > 0 ? ` · ${count}` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer: mark answered (owner) + report */}
      <View style={cardStyles.footerRow}>
        {item.isOwner && item.status === "active" && (
          <TouchableOpacity
            style={[cardStyles.footerBtn, { borderColor: colors.secondary + "55" }]}
            onPress={() => onAnswer(item)}
            testID={`button-answered-${item.id}`}
          >
            <Feather name="check-circle" size={12} color={colors.secondary} />
            <Text style={[cardStyles.footerBtnText, { color: colors.secondary }]}>God answered this</Text>
          </TouchableOpacity>
        )}
        {item.status === "answered" && (
          <View style={[cardStyles.footerBtn, { borderColor: colors.secondary + "33", backgroundColor: colors.secondary + "11" }]}>
            <Feather name="check-circle" size={12} color={colors.secondary} />
            <Text style={[cardStyles.footerBtnText, { color: colors.secondary }]}>Prayer answered</Text>
          </View>
        )}
        {!item.isOwner && (
          <TouchableOpacity
            style={cardStyles.reportBtn}
            onPress={() => onReport(item.id)}
            testID={`button-report-${item.id}`}
          >
            <Feather name="flag" size={12} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 11, fontWeight: "700" },
  timestamp: { fontSize: 11 },
  prayerText: { fontSize: 15, lineHeight: 23 },
  seeMore: { fontSize: 13, fontWeight: "600", marginTop: 3 },
  attribution: { fontSize: 12, marginTop: 6, marginBottom: 10, fontStyle: "italic" },
  totalEnc: { fontSize: 12, marginBottom: 10 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 10 },
  encBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  encBtnText: { fontSize: 11 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  footerBtnText: { fontSize: 12, fontWeight: "600" },
  reportBtn: { padding: 4 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PrayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isSubscribed } = useSubscription();
  const [sessionId, setSessionId] = useState("");
  const [prayerHistory, setPrayerHistory] = useState<PrayerReflection[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAnswered, setShowAnswered] = useState(false);
  const [reportModalId, setReportModalId] = useState<number | null>(null);
  const [answerModal, setAnswerModal] = useState<PrayerWallItem | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_ID_KEY).then((id) => { if (id) setSessionId(id); });
  }, []);

  const loadPrayerHistory = useCallback(async (sid: string) => {
    if (!sid) return;
    const history = await fetchPrayerRecordings(sid, isSubscribed ? 50 : 20);
    setPrayerHistory(history);
  }, [isSubscribed]);

  useEffect(() => {
    if (sessionId) loadPrayerHistory(sessionId);
  }, [sessionId, loadPrayerHistory]);

  const { data: prayers, isLoading } = useQuery({
    queryKey: ["prayer-wall", sessionId, activeCategory],
    queryFn: () => fetchPrayerWall(sessionId, activeCategory || undefined),
    enabled: !!sessionId,
    staleTime: 30000,
  });

  const { data: answeredPrayers } = useQuery({
    queryKey: ["prayer-wall-answered"],
    queryFn: fetchAnsweredPrayers,
    staleTime: 60000,
  });

  const encourageMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: EncouragementAction }) =>
      encouragePrayer(id, sessionId, action, isSubscribed),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["prayer-wall", sessionId, activeCategory] });
    },
    onError: (err: any) => {
      if (err?.code === "encouragement_limit") {
        Alert.alert(
          "Daily limit reached",
          "You've encouraged 20 prayers today. Pro removes this limit.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Explore Pro", onPress: () => router.push("/subscription") },
          ]
        );
      }
    },
  });

  const answerMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text?: string }) =>
      markPrayerAnswered(id, sessionId, text),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["prayer-wall", sessionId, activeCategory] });
      queryClient.invalidateQueries({ queryKey: ["prayer-wall-answered"] });
      setAnswerModal(null);
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      reportPrayer(id, sessionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prayer-wall", sessionId, activeCategory] });
      setReportModalId(null);
      Alert.alert("Report submitted", "Thank you. We review all reports to keep this space safe.");
    },
  });

  const styles = makeStyles(colors, insets);

  const handleEncourage = (id: number, action: EncouragementAction) => {
    encourageMutation.mutate({ id, action });
  };

  const handleAnswer = (item: PrayerWallItem) => {
    Alert.alert(
      "God answered this prayer?",
      "This will move your prayer request to the Answered Prayers section as a testimony.",
      [
        { text: "Not yet", style: "cancel" },
        { text: "Yes, praise God!", onPress: () => answerMutation.mutate({ id: item.id }) },
      ]
    );
  };

  const handleReport = (id: number) => setReportModalId(id);

  const categories = ["All", ...PRAYER_CATEGORIES];

  const ListHeader = (
    <View>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={[styles.title, { color: colors.foreground }]}>Prayer</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your voice, God's ear</Text>
      </View>

      {/* Pray Now CTA */}
      <TouchableOpacity
        style={[styles.prayNowBtn, { backgroundColor: colors.primary }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: "/prayer-live", params: { sessionId } }); }}
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
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Prayers</Text>
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

      {/* Answered Prayers toggle */}
      {(answeredPrayers?.length ?? 0) > 0 && (
        <TouchableOpacity
          style={[styles.answeredToggle, { backgroundColor: colors.secondary + "18", borderColor: colors.secondary + "33" }]}
          onPress={() => setShowAnswered((v) => !v)}
          activeOpacity={0.8}
          testID="button-show-answered"
        >
          <Feather name="check-circle" size={15} color={colors.secondary} />
          <Text style={[styles.answeredToggleText, { color: colors.secondary }]}>
            Answered Prayers ({answeredPrayers?.length ?? 0})
          </Text>
          <Feather name={showAnswered ? "chevron-up" : "chevron-down"} size={15} color={colors.secondary} />
        </TouchableOpacity>
      )}
      {showAnswered && (
        <View style={styles.answeredSection}>
          {(answeredPrayers ?? []).map((item) => (
            <AnsweredCard key={item.id} item={item} colors={colors} />
          ))}
        </View>
      )}

      {/* Community wall header + share button */}
      <View style={styles.wallHeaderRow}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Community Prayer Wall</Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Lift one another up</Text>
        </View>
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: "/submit-prayer", params: { sessionId } }); }}
          testID="button-add-prayer"
        >
          <Feather name="plus" size={15} color="#ffffff" />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilter} contentContainerStyle={styles.catFilterContent}>
        {categories.map((cat) => {
          const isActive = (cat === "All" && !activeCategory) || cat === activeCategory;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, { borderColor: isActive ? colors.primary : colors.border }, isActive && { backgroundColor: colors.primary + "18" }]}
              onPress={() => setActiveCategory(cat === "All" ? null : cat)}
            >
              <Text style={[styles.catChipText, { color: isActive ? colors.primary : colors.mutedForeground }]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={prayers ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PrayerCard
            item={item}
            sessionId={sessionId}
            colors={colors}
            onEncourage={handleEncourage}
            onAnswer={handleAnswer}
            onReport={handleReport}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="heart" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No prayer requests yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>Be the first to share</Text>
            </View>
          ) : null
        }
        ListFooterComponent={isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Report modal */}
      <Modal visible={reportModalId !== null} transparent animationType="slide">
        <Pressable style={modalStyles.overlay} onPress={() => setReportModalId(null)}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[modalStyles.title, { color: colors.foreground }]}>Report this prayer request</Text>
            <Text style={[modalStyles.sub, { color: colors.mutedForeground }]}>
              Help us keep this a safe, faithful space.
            </Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[modalStyles.option, { borderBottomColor: colors.border }]}
                onPress={() => reportModalId !== null && reportMutation.mutate({ id: reportModalId, reason: r.key })}
              >
                <Text style={[modalStyles.optionText, { color: colors.foreground }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setReportModalId(null)}>
              <Text style={[modalStyles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  option: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  cancelBtn: { paddingVertical: 16, alignItems: "center" },
  cancelText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});

function makeStyles(colors: any, insets: any) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { paddingHorizontal: 16, paddingBottom: insets.bottom + 80, paddingTop: isWeb ? 67 : 0 },
    pageHeader: { marginBottom: 16, marginTop: 8 },
    title: { fontSize: 26, fontFamily: "Inter_700Bold" },
    subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 3 },
    prayNowBtn: { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 20, gap: 12 },
    prayNowIconWrap: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    prayNowText: { flex: 1 },
    prayNowLabel: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
    prayNowSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },
    historySection: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
    sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14 },
    upgradeRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginTop: 4 },
    upgradeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
    answeredToggle: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
    answeredToggleText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    answeredSection: { marginBottom: 16 },
    wallHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    shareBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
    shareBtnText: { color: "#ffffff", fontFamily: "Inter_700Bold", fontSize: 13 },
    catFilter: { marginBottom: 14 },
    catFilterContent: { gap: 8, paddingRight: 8 },
    catChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    catChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    empty: { alignItems: "center", paddingVertical: 32, gap: 8 },
    emptyText: { fontSize: 16, fontFamily: "Inter_500Medium" },
    emptySubtext: { fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
