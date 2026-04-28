import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import {
  fetchSermonSession,
  summarizeSermonSession,
  askSermon,
  type SermonSessionDetail,
} from "@/lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}

function ScriptureChip({
  ref: scriptureRef,
  colors,
}: {
  ref: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.scriptureChip, { backgroundColor: colors.muted }]}>
      <Text style={[styles.scriptureChipText, { color: colors.secondary }]}>{scriptureRef}</Text>
    </View>
  );
}

function ProGate({
  colors,
  onUpgrade,
}: {
  colors: ReturnType<typeof useColors>;
  onUpgrade: () => void;
}) {
  const gold = colors.secondary;
  return (
    <View style={[styles.proGate, { backgroundColor: colors.card, borderColor: gold + "44" }]}>
      <Feather name="lock" size={22} color={gold} />
      <Text style={[styles.proGateTitle, { color: colors.foreground }]}>Pro Feature</Text>
      <Text style={[styles.proGateText, { color: colors.mutedForeground }]}>
        Upgrade to unlock the full transcript, AI summary, key points, and the ability to ask questions about this message.
      </Text>
      <TouchableOpacity
        style={[styles.proGateButton, { backgroundColor: gold }]}
        onPress={onUpgrade}
        accessibilityRole="button"
      >
        <Text style={styles.proGateButtonText}>Unlock with Pro</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SermonDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isSubscribed } = useSubscription();

  const [session, setSession] = useState<SermonSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const gold = colors.secondary;

  useEffect(() => {
    if (!id) return;
    fetchSermonSession(parseInt(id)).then((data) => {
      setSession(data);
      setLoading(false);
    });
  }, [id]);

  const handleSummarize = async () => {
    if (!session) return;
    if (!session.transcript) {
      Alert.alert("No transcript", "A transcript is needed to generate an AI summary.");
      return;
    }
    setIsSummarizing(true);
    try {
      const updated = await summarizeSermonSession(session.id);
      setSession(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Summarization failed. Please try again.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAsk = async () => {
    if (!session || !question.trim()) return;
    Keyboard.dismiss();
    setIsAsking(true);
    setAnswer("");
    try {
      const ans = await askSermon(session.id, question.trim());
      setAnswer(ans);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to answer your question. Please try again.");
    } finally {
      setIsAsking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Session not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasKeyPoints = session.keyPoints && session.keyPoints.length > 0;
  const hasTranscript = !!session.transcript;
  const hasApplication = !!session.application;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Session title + meta */}
        <Text style={[styles.sessionTitle, { color: colors.foreground }]}>{session.title}</Text>
        <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
          {formatDate(session.startedAt)}
          {session.durationSeconds ? `  ·  ${formatDuration(session.durationSeconds)}` : ""}
        </Text>

        {/* Scriptures */}
        {session.scriptures.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: gold }]}>
              {session.scriptures.length} Scripture{session.scriptures.length !== 1 ? "s" : ""} Detected
            </Text>
            <View style={styles.chipRow}>
              {session.scriptures.map((ref, i) => (
                <ScriptureChip key={i} ref={ref} colors={colors} />
              ))}
            </View>
          </View>
        )}

        {/* Key Points (Pro) */}
        {isSubscribed ? (
          hasKeyPoints ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Key Points</Text>
              {session.keyPoints.map((point, i) => (
                <View key={i} style={styles.keyPointRow}>
                  <View style={[styles.keyPointDot, { backgroundColor: gold }]} />
                  <Text style={[styles.keyPointText, { color: colors.foreground }]}>{point}</Text>
                </View>
              ))}
            </View>
          ) : hasTranscript ? (
            <TouchableOpacity
              style={[styles.summarizeButton, { backgroundColor: colors.card, borderColor: gold + "44" }]}
              onPress={handleSummarize}
              disabled={isSummarizing}
              activeOpacity={0.8}
            >
              {isSummarizing ? (
                <ActivityIndicator color={gold} size="small" />
              ) : (
                <Feather name="cpu" size={16} color={gold} />
              )}
              <Text style={[styles.summarizeText, { color: gold }]}>
                {isSummarizing ? "Generating summary..." : "Generate AI Summary"}
              </Text>
            </TouchableOpacity>
          ) : null
        ) : (
          <ProGate colors={colors} onUpgrade={() => router.push("/subscription")} />
        )}

        {/* Application (Pro) */}
        {isSubscribed && hasApplication && (
          <View style={[styles.applicationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Personal Application</Text>
            <Text style={[styles.applicationText, { color: colors.foreground }]}>{session.application}</Text>
          </View>
        )}

        {/* Transcript (Pro) */}
        {isSubscribed && hasTranscript && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.transcriptToggle}
              onPress={() => setShowTranscript((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Full Transcript</Text>
              <Feather
                name={showTranscript ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            {showTranscript && (
              <View style={[styles.transcriptBox, { backgroundColor: colors.muted }]}>
                <Text style={[styles.transcriptText, { color: colors.foreground }]}>
                  {session.transcript}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Ask the Sermon (Pro) */}
        {isSubscribed && (
          <View style={[styles.askSection, { borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Ask the Sermon</Text>
            <Text style={[styles.askHint, { color: colors.mutedForeground }]}>
              Ask anything about what your pastor shared today
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                ref={inputRef}
                style={[styles.askInput, { color: colors.foreground }]}
                placeholder="e.g. What did the pastor say about grace?"
                placeholderTextColor={colors.mutedForeground}
                value={question}
                onChangeText={setQuestion}
                returnKeyType="send"
                onSubmitEditing={handleAsk}
                multiline={false}
              />
              <TouchableOpacity
                onPress={handleAsk}
                disabled={isAsking || !question.trim()}
                style={[
                  styles.askSendBtn,
                  {
                    backgroundColor: question.trim() ? colors.primary : colors.muted,
                    opacity: isAsking ? 0.6 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ask question"
              >
                {isAsking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="arrow-up" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            {answer ? (
              <View style={[styles.answerBox, { backgroundColor: colors.muted }]}>
                <Text style={[styles.answerText, { color: colors.foreground }]}>{answer}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: { marginBottom: 16 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  sessionTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.4, marginBottom: 6 },
  sessionMeta: { fontSize: 14, marginBottom: 28 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scriptureChip: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  scriptureChipText: { fontSize: 14, fontWeight: "700" },
  keyPointRow: { flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" },
  keyPointDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  keyPointText: { flex: 1, fontSize: 15, lineHeight: 22 },
  summarizeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  summarizeText: { fontSize: 15, fontWeight: "600" },
  applicationCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  applicationText: { fontSize: 15, lineHeight: 22, fontStyle: "italic" },
  transcriptToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transcriptBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  transcriptText: { fontSize: 14, lineHeight: 22 },
  askSection: {
    borderTopWidth: 1,
    paddingTop: 24,
    marginTop: 8,
    gap: 8,
  },
  askHint: { fontSize: 13, marginBottom: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  askInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  askSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  answerBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  answerText: { fontSize: 15, lineHeight: 23 },
  proGate: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  proGateTitle: { fontSize: 17, fontWeight: "700" },
  proGateText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  proGateButton: {
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  proGateButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
