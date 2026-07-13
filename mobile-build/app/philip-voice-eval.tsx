import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isPhilipVoiceLabEnabled } from "@/lib/philipVoiceLabFlags";
import {
  GATE_B_SCENARIOS,
  fetchConversationLog,
  submitGateBEvaluation,
  uploadClientTimeline,
  type GateBEvaluationPayload,
} from "@/lib/philipVoiceLabEvalApi";

const GOLD = "#D4880E";
const BG = "#0d0612";

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreBtns}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            style={[styles.scoreBtn, value === n && styles.scoreBtnActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.scoreBtnText, value === n && styles.scoreBtnTextActive]}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreBtns}>
        <Pressable
          style={[styles.ynBtn, value === true && styles.scoreBtnActive]}
          onPress={() => onChange(true)}
        >
          <Text style={[styles.scoreBtnText, value === true && styles.scoreBtnTextActive]}>Yes</Text>
        </Pressable>
        <Pressable
          style={[styles.ynBtn, value === false && styles.scoreBtnActive]}
          onPress={() => onChange(false)}
        >
          <Text style={[styles.scoreBtnText, value === false && styles.scoreBtnTextActive]}>No</Text>
        </Pressable>
      </View>
    </View>
  );
}

const GATE_B_TIMELINE_PREFIX = "gate_b_client_";

function formatMetrics(log: Record<string, unknown> | null): string {
  if (!log) return "Agent timeline not on server yet — check agent logs.";
  const turns = (log.turns as Array<{ metrics?: Record<string, number> }>) || [];
  if (!turns.length) return "No turns recorded.";
  return turns
    .map((t, i) => {
      const m = t.metrics || {};
      const total = m.totalLatencyMs ?? "—";
      const stt = m.sttMs ?? "—";
      const p1 = m.phase1Ms ?? "—";
      const tts = m.ttsMs ?? "—";
      const pub = m.publishMs ?? "—";
      return `Turn ${i + 1}: total ${total}ms (STT ${stt} · P1 ${p1} · TTS ${tts} · pub ${pub})`;
    })
    .join("\n");
}

export default function PhilipVoiceEvalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    conversationId?: string;
    sessionId?: string;
    roomName?: string;
  }>();

  const enabled = isPhilipVoiceLabEnabled();
  const conversationId = params.conversationId?.trim() || "";
  const sessionId = params.sessionId?.trim() || "";
  const roomName = params.roomName?.trim() || conversationId;

  const [clientTimeline, setClientTimeline] = useState<
    ReturnType<import("@/lib/philipVoiceLabClientTimeline").ClientTimelineRecorder["toJSON"]> | undefined
  >(undefined);

  const [scenarioTag, setScenarioTag] = useState<string>("");
  const [latency, setLatency] = useState(0);
  const [audioQuality, setAudioQuality] = useState(0);
  const [reliability, setReliability] = useState(0);
  const [feltPresent, setFeltPresent] = useState(0);
  const [computerOrPerson, setComputerOrPerson] = useState(0);
  const [understoodMe, setUnderstoodMe] = useState(0);
  const [wouldTalkAgain, setWouldTalkAgain] = useState<boolean | null>(null);
  const [pointedTowardGod, setPointedTowardGod] = useState<boolean | null>(null);
  const [faithfulToCanon, setFaithfulToCanon] = useState<boolean | null>(null);
  const [provedPhilip, setProvedPhilip] = useState<boolean | null>(null);
  const [immersionBreak, setImmersionBreak] = useState("");
  const [agentLog, setAgentLog] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) router.replace("/");
  }, [enabled, router]);

  useEffect(() => {
    if (!conversationId) return;
    void AsyncStorage.getItem(`${GATE_B_TIMELINE_PREFIX}${conversationId}`)
      .then((raw) => {
        if (!raw) return;
        try {
          setClientTimeline(JSON.parse(raw));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    void fetchConversationLog(conversationId)
      .then(setAgentLog)
      .catch(() => setAgentLog(null));
  }, [conversationId]);

  const valid =
    latency > 0 &&
    audioQuality > 0 &&
    reliability > 0 &&
    feltPresent > 0 &&
    computerOrPerson > 0 &&
    understoodMe > 0 &&
    wouldTalkAgain !== null &&
    pointedTowardGod !== null &&
    faithfulToCanon !== null &&
    provedPhilip !== null &&
    immersionBreak.trim().length > 0;

  const onSubmit = useCallback(async () => {
    if (!valid || !conversationId || !sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const payload: GateBEvaluationPayload = {
        conversationId,
        sessionId,
        roomName,
        scenarioTag: scenarioTag || undefined,
        technical: { latency, audioQuality, reliability },
        human: {
          feltPresent,
          computerOrPerson,
          understoodMe,
          wouldTalkAgain: wouldTalkAgain === true,
        },
        canonical: {
          pointedTowardGod: pointedTowardGod === true,
          faithfulToCanon: faithfulToCanon === true,
          provedPhilip: provedPhilip === true,
        },
        immersionBreak: immersionBreak.trim(),
      };
      await submitGateBEvaluation(payload);
      if (clientTimeline) {
        try {
          const { slimClientTimelineForUpload } = await import("@/lib/philipVoiceLabClientTimeline");
          await uploadClientTimeline(conversationId, slimClientTimelineForUpload(clientTimeline));
        } catch {
          // Ratings saved — timeline merge is best-effort for long sessions.
        }
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [
    valid,
    conversationId,
    sessionId,
    roomName,
    scenarioTag,
    latency,
    audioQuality,
    reliability,
    feltPresent,
    computerOrPerson,
    understoodMe,
    wouldTalkAgain,
    pointedTowardGod,
    faithfulToCanon,
    provedPhilip,
    immersionBreak,
    clientTimeline,
  ]);

  if (!enabled) return null;

  if (done) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.center}>
          <Text style={styles.title}>Evaluation saved</Text>
          <Text style={styles.subtitle}>Gate B — conversation #{conversationId.slice(-8)}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/philip-voice-lab")}>
            <Text style={styles.primaryBtnText}>Start another conversation</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Gate B — rate this conversation</Text>
        <Text style={styles.title}>Philip Test Harness</Text>
        <Text style={styles.subtitle}>
          Score immediately while the experience is fresh. Required before the next session.
        </Text>

        <Text style={styles.section}>Scenario (optional)</Text>
        <View style={styles.chipRow}>
          {GATE_B_SCENARIOS.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, scenarioTag === s && styles.chipActive]}
              onPress={() => setScenarioTag(s)}
            >
              <Text style={[styles.chipText, scenarioTag === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Agent timeline (from server)</Text>
        <Text style={styles.mono}>{formatMetrics(agentLog)}</Text>

        <Text style={styles.section}>Technical</Text>
        <ScoreRow label="Latency (1–5)" value={latency} onChange={setLatency} />
        <ScoreRow label="Audio quality (1–5)" value={audioQuality} onChange={setAudioQuality} />
        <ScoreRow label="Reliability (1–5)" value={reliability} onChange={setReliability} />

        <Text style={styles.section}>Human</Text>
        <ScoreRow label="Did Philip feel present? (1–5)" value={feltPresent} onChange={setFeltPresent} />
        <ScoreRow
          label="Computer or person? (1=computer, 5=person)"
          value={computerOrPerson}
          onChange={setComputerOrPerson}
        />
        <ScoreRow label="Did he understand me? (1–5)" value={understoodMe} onChange={setUnderstoodMe} />
        <YesNoRow label="Would I talk to him again?" value={wouldTalkAgain} onChange={setWouldTalkAgain} />

        <Text style={styles.section}>Canonical</Text>
        <YesNoRow
          label="Did Philip point me toward God, not himself?"
          value={pointedTowardGod}
          onChange={setPointedTowardGod}
        />
        <YesNoRow
          label="Did he remain faithful to the Canon?"
          value={faithfulToCanon}
          onChange={setFaithfulToCanon}
        />
        <YesNoRow label='Did this conversation "prove Philip"?' value={provedPhilip} onChange={setProvedPhilip} />

        <Text style={styles.section}>What broke immersion? *</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Required — be specific: wait, tone, wrong question, audio glitch, felt robotic…"
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={immersionBreak}
          onChangeText={setImmersionBreak}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, (!valid || busy) && styles.primaryBtnDisabled]}
          onPress={onSubmit}
          disabled={!valid || busy}
        >
          {busy ? (
            <ActivityIndicator color="#0d0612" />
          ) : (
            <Text style={styles.primaryBtnText}>Save evaluation</Text>
          )}
        </Pressable>

        <Pressable style={styles.skipBtn} onPress={() => router.replace("/philip-voice-lab")}>
          <Text style={styles.skipText}>Skip (not recommended)</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  eyebrow: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 22 },
  section: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 12,
  },
  mono: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Menlo",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: "rgba(212,136,14,0.2)", borderColor: GOLD },
  chipText: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  chipTextActive: { color: GOLD },
  scoreRow: { gap: 8 },
  scoreLabel: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  scoreBtns: { flexDirection: "row", gap: 8 },
  scoreBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  ynBtn: {
    minWidth: 64,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  scoreBtnActive: { backgroundColor: GOLD, borderColor: GOLD },
  scoreBtnText: { color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  scoreBtnTextActive: { color: "#0d0612" },
  textArea: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 12,
    color: "#fff",
    fontSize: 15,
    textAlignVertical: "top",
  },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#0d0612", fontSize: 16, fontWeight: "700" },
  skipBtn: { alignItems: "center", paddingVertical: 12 },
  skipText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  error: { color: "#fca5a5", fontSize: 14 },
});
