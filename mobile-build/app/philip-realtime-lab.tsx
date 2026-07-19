import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  type AppStateStatus,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  PHILIP_REALTIME_LAB_MAX_DURATION_MS,
  PHILIP_REALTIME_LAB_MODEL,
  PHILIP_REALTIME_LAB_VOICE,
  isPhilipRealtimeLabEnabled,
  philipRealtimeLabBaseUrl,
} from "@/lib/philipRealtimeLabConfig";
import {
  fetchRealtimeLabAccess,
  type RealtimeLabReadiness,
} from "@/lib/philipRealtimeLabApi";
import {
  prepareRealtimeAudioSession,
  releaseRealtimeAudioSession,
} from "@/lib/philipRealtimeAudioSession";
import {
  PhilipRealtimeLabSession,
  type RealtimeLabEvidence,
} from "@/lib/philipRealtimeLabSession";
import { loadLiveKitReactNativeWebRtc } from "@/lib/philipRealtimeWebRtc";

const GOLD = "#D4880E";
const BG = "#0d0612";

function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function PhilipRealtimeLabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const enabled = isPhilipRealtimeLabEnabled();
  const sessionRef = useRef<PhilipRealtimeLabSession | null>(null);

  const [micState, setMicState] = useState("not tested");
  const [connectionState, setConnectionState] = useState("idle");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([
    "Realtime Research Prototype — unpaid local UI ready.",
  ]);
  const [evidence, setEvidence] = useState<RealtimeLabEvidence | null>(null);
  const [webrtcOk, setWebrtcOk] = useState<boolean | null>(null);
  const [readiness, setReadiness] = useState<RealtimeLabReadiness | null>(null);
  const [readinessFailure, setReadinessFailure] = useState<string | null>(null);

  const labUrlConfigured = Boolean(philipRealtimeLabBaseUrl());

  const appendLog = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-80), line]);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const probe = loadLiveKitReactNativeWebRtc();
    setWebrtcOk(probe.ok);
    if (!probe.ok) {
      setError(probe.error);
      appendLog(`WebRTC probe failed: ${probe.error}`);
    } else {
      appendLog("Native WebRTC package available (@livekit/react-native-webrtc).");
    }
  }, [enabled, appendLog]);

  const refreshReadiness = useCallback(async () => {
    if (!labUrlConfigured) {
      setReadiness(null);
      setReadinessFailure("Realtime Lab is not configured: missing server URL");
      return null;
    }
    try {
      const access = await fetchRealtimeLabAccess();
      setReadiness(access.readiness);
      setReadinessFailure(null);
      appendLog(
        `Realtime server ready · runtime ${access.readiness.runtime} · armed=${access.readiness.armed}.`,
      );
      return access;
    } catch (err) {
      const message = String((err as Error)?.message || err);
      setReadiness(null);
      setReadinessFailure(`Realtime readiness failed: ${message}`);
      appendLog(`Realtime readiness failed: ${message}`);
      return null;
    }
  }, [appendLog, labUrlConfigured]);

  useEffect(() => {
    if (enabled && webrtcOk === true) void refreshReadiness();
  }, [enabled, refreshReadiness, webrtcOk]);

  useEffect(() => {
    const endForLifecycle = (reason: string) => {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) void session.end("stopped", reason);
    };
    const onAppState = (next: AppStateStatus) => {
      if (next !== "active") endForLifecycle(`app_state_${next}`);
    };
    const subscription = AppState.addEventListener("change", onAppState);
    return () => {
      subscription.remove();
      endForLifecycle("screen_navigation");
      void releaseRealtimeAudioSession();
    };
  }, []);

  const onTestMic = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setMicState("denied");
        setError("Microphone permission denied.");
        appendLog("Microphone permission denied.");
        Alert.alert(
          "Microphone access needed",
          "Enable the microphone in Settings to use Philip Realtime Lab.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
      setMicState("granted");
      setError(null);
      appendLog("Microphone permission granted (local unpaid check).");
    } catch (err) {
      const message = String((err as Error)?.message || err);
      setMicState("error");
      setError(message);
      appendLog(`Microphone check failed: ${message}`);
    }
  }, [appendLog]);

  const onStart = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone access needed",
          "Philip Realtime Lab needs your microphone. Enable it in Settings, then try Start again.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => void Linking.openSettings() },
          ],
        );
        setMicState("denied");
        setBusy(false);
        return;
      }
      setMicState("granted");
      const access = await refreshReadiness();
      if (!access) throw new Error("realtime_readiness_unavailable");
      if (!access.readiness.armed) throw new Error("realtime_server_disarmed");
      if (!access.readiness.sessionAvailable) throw new Error("realtime_session_already_consumed");
      await prepareRealtimeAudioSession();

      const session = new PhilipRealtimeLabSession((patch) => {
        if (patch.micState) setMicState(patch.micState);
        if (patch.connectionState) setConnectionState(patch.connectionState);
        if (typeof patch.listening === "boolean") setListening(patch.listening);
        if (typeof patch.speaking === "boolean") setSpeaking(patch.speaking);
        if (typeof patch.elapsedMs === "number") setElapsedMs(patch.elapsedMs);
        if (patch.logLine) appendLog(patch.logLine);
        if (patch.error !== undefined) setError(patch.error);
        if (patch.evidence) setEvidence(patch.evidence);
      });
      sessionRef.current = session;
      await session.startConversation(access.token);
    } catch (err) {
      const message = String((err as Error)?.message || err);
      setError(`Realtime connection failed: ${message}`);
      appendLog(`Realtime connection failed: ${message}`);
      setConnectionState("failed");
      try {
        await sessionRef.current?.emergencyStop();
      } catch {}
      sessionRef.current = null;
    } finally {
      setBusy(false);
    }
  }, [appendLog, busy, refreshReadiness]);

  const onEnd = useCallback(async () => {
    setBusy(true);
    try {
      const result = await sessionRef.current?.end("completed", "manual_end");
      if (result) setEvidence(result);
      sessionRef.current = null;
      setConnectionState("closed");
    } catch (err) {
      setError(String((err as Error)?.message || err));
    } finally {
      setBusy(false);
    }
  }, []);

  const onEmergency = useCallback(async () => {
    setBusy(true);
    try {
      const result = await sessionRef.current?.emergencyStop();
      if (result) setEvidence(result);
      sessionRef.current = null;
      setConnectionState("stopped");
      appendLog("Emergency Stop.");
    } catch (err) {
      setError(String((err as Error)?.message || err));
    } finally {
      setBusy(false);
    }
  }, [appendLog]);

  const canStart = useMemo(() => {
    return (
      enabled &&
      webrtcOk === true &&
      labUrlConfigured &&
      !busy &&
      connectionState !== "running" &&
      connectionState !== "connecting" &&
      connectionState !== "connected" &&
      connectionState !== "ready" &&
      readiness?.armed === true &&
      readiness.sessionAvailable === true
    );
  }, [enabled, webrtcOk, labUrlConfigured, busy, connectionState, readiness]);

  if (!enabled) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>
          Philip Realtime Lab is only available in the isolated philip-lab build.
        </Text>
        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Realtime Research Prototype</Text>
        <Text style={styles.title}>Philip Realtime Lab</Text>
        <Text style={styles.subtitle}>
          Native OpenAI Realtime WebRTC on this iPhone. No fallback or substitute runtime.
          Voice: {PHILIP_REALTIME_LAB_VOICE}. Model: {PHILIP_REALTIME_LAB_MODEL}. Max{" "}
          {Math.round(PHILIP_REALTIME_LAB_MAX_DURATION_MS / 1000)}s.
        </Text>
        <Text style={styles.meta}>
          Runtime: {readiness?.runtime || "not ready"} · server:{" "}
          {readiness ? "reachable" : "unavailable"} · armed:{" "}
          {readiness ? String(readiness.armed) : "unknown"} · sessions used:{" "}
          {readiness?.sessionsUsed ?? "unknown"}
        </Text>

        <View style={styles.flagRow}>
          <Text style={styles.flag}>mic: {micState}</Text>
          <Text style={styles.flag}>connection: {connectionState}</Text>
          <Text style={[styles.flag, listening && styles.flagOn]}>
            listening: {listening ? "yes" : "no"}
          </Text>
          <Text style={[styles.flag, speaking && styles.flagOn]}>
            Philip speaking: {speaking ? "yes" : "no"}
          </Text>
        </View>

        <Text style={styles.elapsed}>{formatElapsed(elapsedMs)}</Text>

        {connectionState === "ready" ? (
          <View style={styles.readyBox}>
            <Text style={styles.readyText}>Philip is ready — speak whenever you like.</Text>
          </View>
        ) : null}

        {connectionState === "connecting" || connectionState === "connected" ? (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingText}>Connecting… one moment before you speak.</Text>
          </View>
        ) : null}

        {!labUrlConfigured ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Lab server URL is not configured yet. You can still open this screen and test
              microphone permission. Start Conversation stays disabled until
              EXPO_PUBLIC_PHILIP_REALTIME_LAB_URL points at the isolated lab route.
            </Text>
          </View>
        ) : null}

        {readinessFailure ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{readinessFailure}</Text>
          </View>
        ) : null}

        {readiness && !readiness.armed ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Realtime Lab is reachable but disarmed. Start remains disabled; no provider call can
              occur.
            </Text>
          </View>
        ) : null}

        {webrtcOk === false ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Existing native WebRTC package is insufficient or unavailable. Do not add another
              package automatically. {error}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable style={styles.secondaryBtn} onPress={() => void onTestMic()} disabled={busy}>
          <Text style={styles.secondaryBtnText}>Test Microphone Permission</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => void refreshReadiness()}
          disabled={busy}
        >
          <Text style={styles.secondaryBtnText}>Refresh Realtime Readiness</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryBtn, !canStart && styles.primaryBtnDisabled]}
          onPress={() => void onStart()}
          disabled={!canStart}
        >
          <Text style={styles.primaryBtnText}>Start Conversation</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => void onEnd()}
          disabled={!sessionRef.current || busy}
        >
          <Text style={styles.secondaryBtnText}>End Conversation</Text>
        </Pressable>

        <Pressable style={styles.dangerBtn} onPress={() => void onEmergency()} disabled={busy}>
          <Text style={styles.dangerBtnText}>Emergency Stop</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>

        <Text style={styles.meta}>
          Platform: {Platform.OS}. No raw audio is recorded. Est. cost: $
          {evidence?.estimatedCostUsd ?? 0}.
        </Text>

        <Text style={styles.logTitle}>Lab log</Text>
        <View style={styles.logBox}>
          {log.map((line, index) => (
            <Text key={`${index}-${line.slice(0, 12)}`} style={styles.logLine}>
              {line}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, gap: 12 },
  eyebrow: { color: GOLD, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
  title: { color: "#f4efe6", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "#c0a8cc", fontSize: 14, lineHeight: 20 },
  flagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flag: {
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#d8c8e4",
    fontSize: 12,
  },
  flagOn: { borderColor: GOLD, color: GOLD },
  elapsed: { color: "#fff", fontSize: 34, fontVariant: ["tabular-nums"], marginVertical: 4 },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: "#0d0612", fontWeight: "800", fontSize: 16 },
  secondaryBtn: {
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#f4efe6", fontWeight: "600" },
  dangerBtn: {
    backgroundColor: "#8d3636",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerBtnText: { color: "#fff", fontWeight: "800" },
  errorBox: {
    backgroundColor: "rgba(141,54,54,0.25)",
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: "#ffb4b4", lineHeight: 20 },
  readyBox: {
    backgroundColor: "rgba(212,136,14,0.16)",
    borderColor: GOLD,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  readyText: { color: GOLD, fontWeight: "700", fontSize: 15 },
  pendingBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 12,
  },
  pendingText: { color: "#c0a8cc" },
  meta: { color: "#9b87a8", fontSize: 12 },
  logTitle: { color: "#f4efe6", fontWeight: "700", marginTop: 8 },
  logBox: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 10,
    padding: 10,
    minHeight: 160,
  },
  logLine: { color: "#c0a8cc", fontSize: 12, marginBottom: 4 },
});
