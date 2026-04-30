import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { analyzePrayerChunk, savePrayerRecording, type PrayerReflection } from "@/lib/api";
import { useSubscription } from "@/lib/revenuecat";

const { width: SW } = Dimensions.get("window");
const CHUNK_MS = 20_000;
const DEEP_PURPLE = "#0c0618";
const SOFT_GOLD = "#D4880E";
const GLOW_GOLD = "#E8A820";

function formatElapsed(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

type Phase = "idle" | "recording" | "processing" | "reflection";

export default function PrayerLiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { isSubscribed } = useSubscription();

  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [themes, setThemes] = useState<string[]>([]);
  const [fullTranscript, setFullTranscript] = useState("");
  const [reflection, setReflection] = useState<PrayerReflection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeepNudge, setShowDeepNudge] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const seenThemesRef = useRef<Set<string>>(new Set());
  const transcriptRef = useRef("");
  const elapsedRef = useRef(0);

  const breatheAnim = useRef(new Animated.Value(1)).current;
  const breatheLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const reflectionFade = useRef(new Animated.Value(0)).current;

  const startBreathe = () => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.06, duration: 2800, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
      ])
    );
    breatheLoopRef.current = loop;
    loop.start();
  };

  const stopBreathe = () => {
    breatheLoopRef.current?.stop();
    breatheLoopRef.current = null;
    breatheAnim.setValue(1);
  };

  const addThemes = (incoming: string[]) => {
    incoming.forEach((t) => {
      const key = t.toLowerCase().trim();
      if (!seenThemesRef.current.has(key)) {
        seenThemesRef.current.add(key);
        setThemes((prev) => [...prev, t]);
      }
    });
  };

  const processChunk = useCallback(async (uri: string) => {
    try {
      const result = await analyzePrayerChunk(uri, "audio/mp4");
      if (result.text) {
        transcriptRef.current = transcriptRef.current
          ? transcriptRef.current + " " + result.text
          : result.text;
        setFullTranscript(transcriptRef.current);
      }
      addThemes(result.themes);
    } catch (err) {
      console.warn("Prayer chunk error:", err);
    }
  }, []);

  const startChunk = useCallback(async () => {
    if (!isRecordingRef.current) return;
    try {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HighQuality,
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
      });
      await rec.startAsync();
      recordingRef.current = rec;
      chunkTimerRef.current = setTimeout(async () => {
        if (!isRecordingRef.current) return;
        try {
          await rec.stopAndUnloadAsync();
          recordingRef.current = null;
          const uri = rec.getURI();
          if (uri) processChunk(uri);
        } catch {}
        startChunk();
      }, CHUNK_MS);
    } catch (err) {
      console.warn("Start chunk error:", err);
    }
  }, [processChunk]);

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    if (chunkTimerRef.current) { clearTimeout(chunkTimerRef.current); chunkTimerRef.current = null; }
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (rec) {
      try {
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        if (uri) await processChunk(uri);
      } catch {}
    }
    stopBreathe();
  }, [processChunk]);

  const startPraying = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone Access Needed",
          "Please allow microphone access to use Prayer Mode.",
          [{ text: "OK" }]
        );
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      isRecordingRef.current = true;
      setPhase("recording");
      startBreathe();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      elapsedTimerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
      await startChunk();
    } catch {
      Alert.alert("Error", "Could not start recording. Please try again.");
    }
  }, [startChunk]);

  const endPrayer = useCallback(async () => {
    await stopRecording();
    const transcript = transcriptRef.current;
    if (!transcript.trim()) {
      Alert.alert("Nothing recorded", "We didn't catch any audio. Please try again.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }
    setPhase("processing");
    setIsSaving(true);
    try {
      const result = await savePrayerRecording({
        sessionId: sessionId || "",
        transcript,
        themes: Array.from(seenThemesRef.current),
        durationSeconds: elapsedRef.current,
      });
      setReflection(result);
      setPhase("reflection");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.timing(reflectionFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      // Deep-session trigger: real prayer (>60s) by a free user
      if (!isSubscribed && elapsedRef.current >= 60) {
        setShowDeepNudge(true);
      }
    } catch {
      Alert.alert("Error", "Could not save your prayer. Please try again.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setIsSaving(false);
    }
  }, [stopRecording, sessionId, reflectionFade, router]);

  const handleDiscard = () => {
    if (phase === "recording") {
      Alert.alert("Stop praying?", "Your prayer will not be saved.", [
        { text: "Keep praying", style: "cancel" },
        { text: "Stop", style: "destructive", onPress: async () => { await stopRecording(); router.back(); } },
      ]);
    } else {
      router.back();
    }
  };

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      breatheLoopRef.current?.stop();
    };
  }, []);

  const isListening = phase === "recording";
  const isProcessing = phase === "processing";
  const isReflection = phase === "reflection";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleDiscard} style={styles.topBarBtn} accessibilityRole="button">
          <Feather name="x" size={22} color="rgba(255,255,255,0.55)" />
        </TouchableOpacity>
        {isListening && (
          <Text style={styles.elapsedText}>{formatElapsed(elapsed)}</Text>
        )}
        {isListening && (
          <TouchableOpacity
            style={styles.endBtn}
            onPress={endPrayer}
            accessibilityRole="button"
            accessibilityLabel="End prayer"
          >
            <Text style={styles.endBtnText}>Done</Text>
          </TouchableOpacity>
        )}
        {!isListening && <View style={{ flex: 1 }} />}
      </View>

      {/* Main content */}
      {!isReflection ? (
        <View style={styles.prayArea}>
          {/* Breathing mic circle */}
          <View style={styles.micOuter}>
            {isListening && (
              <Animated.View
                style={[
                  styles.breatheRing,
                  { transform: [{ scale: breatheAnim }], borderColor: SOFT_GOLD + "55" },
                ]}
              />
            )}
            <TouchableOpacity
              style={[
                styles.micCircle,
                {
                  backgroundColor: isListening ? SOFT_GOLD + "22" : "rgba(255,255,255,0.06)",
                  borderColor: isListening ? SOFT_GOLD : "rgba(255,255,255,0.18)",
                },
              ]}
              onPress={isListening ? endPrayer : startPraying}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isListening ? "End prayer" : "Start praying"}
            >
              {isProcessing ? (
                <ActivityIndicator color={SOFT_GOLD} size="large" />
              ) : (
                <Feather
                  name="mic"
                  size={36}
                  color={isListening ? GLOW_GOLD : "rgba(255,255,255,0.4)"}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Prompt text */}
          <Text style={styles.promptTitle}>
            {isProcessing ? "Preparing your reflection..." : isListening ? "Speak your heart to God" : "Prayer Mode"}
          </Text>
          {!isListening && !isProcessing && (
            <Text style={styles.promptSub}>
              Tap the mic and pray aloud. Your words will be{"\n"}reflected back with scripture.
            </Text>
          )}

          {/* Live themes */}
          {isListening && themes.length > 0 && (
            <View style={styles.themesArea}>
              <Text style={styles.themesLabel}>You're praying about</Text>
              <View style={styles.themeChips}>
                {themes.map((t, i) => (
                  <View key={i} style={styles.themeChip}>
                    <Text style={styles.themeChipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Start button */}
          {!isListening && !isProcessing && (
            <View style={styles.startArea}>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={startPraying}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Begin praying"
              >
                <Text style={styles.startBtnText}>Begin Praying</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* Reflection view */
        <Animated.View style={[styles.reflectionContainer, { opacity: reflectionFade }]}>
          <ScrollView
            style={styles.reflectionScroll}
            contentContainerStyle={[styles.reflectionContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.godHeard}>God heard this.</Text>

            {reflection?.scriptureRef && (
              <View style={styles.scriptureCard}>
                <Text style={styles.scriptureRef}>{reflection.scriptureRef}</Text>
                {reflection.scriptureText ? (
                  <Text style={styles.scriptureText}>"{reflection.scriptureText}"</Text>
                ) : null}
              </View>
            )}

            {reflection?.reflection && (
              <Text style={styles.reflectionText}>{reflection.reflection}</Text>
            )}

            {reflection && reflection.themes.length > 0 && (
              <View style={styles.themesSection}>
                <Text style={styles.themesLabel}>What you brought</Text>
                <View style={styles.themeChips}>
                  {reflection.themes.map((t, i) => (
                    <View key={i} style={styles.themeChip}>
                      <Text style={styles.themeChipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Deep-session Pro nudge — contextual, after a real prayer */}
            {showDeepNudge && (
              <View style={styles.deepNudge}>
                <Text style={styles.deepNudgeTitle}>This is exactly what Pro is built for.</Text>
                <Text style={styles.deepNudgeBody}>
                  Uninterrupted guidance and a complete record of every prayer moment — whenever you need it.
                </Text>
                <View style={styles.deepNudgeActions}>
                  <TouchableOpacity
                    style={styles.deepNudgeBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowDeepNudge(false); router.push("/subscription"); }}
                  >
                    <Text style={styles.deepNudgeBtnText}>Go Pro</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDeepNudge(false)}>
                    <Text style={styles.deepNudgeDismiss}>Not now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.doneBtnText}>Return to Prayer</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DEEP_PURPLE },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  topBarBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  elapsedText: {
    flex: 1,
    textAlign: "center",
    color: "rgba(255,255,255,0.4)",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  endBtn: {
    backgroundColor: SOFT_GOLD,
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  endBtnText: { color: "#1a0a00", fontWeight: "700", fontSize: 14 },
  prayArea: {
    flex: 1,
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  micOuter: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  breatheRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  micCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  promptTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  promptSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  themesArea: {
    marginTop: 36,
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  themesLabel: {
    color: SOFT_GOLD,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  themeChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  themeChip: {
    backgroundColor: "rgba(212, 136, 14, 0.15)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(212, 136, 14, 0.3)",
  },
  themeChipText: { color: GLOW_GOLD, fontSize: 14, fontWeight: "600" },
  startArea: { position: "absolute", bottom: 48, left: 0, right: 0, paddingHorizontal: 32 },
  startBtn: {
    backgroundColor: SOFT_GOLD,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  startBtnText: { color: "#1a0a00", fontSize: 17, fontWeight: "700" },
  reflectionContainer: { flex: 1 },
  reflectionScroll: { flex: 1 },
  reflectionContent: { paddingHorizontal: 28, paddingTop: 24, gap: 24 },
  godHeard: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 8,
  },
  scriptureCard: {
    backgroundColor: "rgba(212, 136, 14, 0.1)",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 136, 14, 0.25)",
    gap: 10,
  },
  scriptureRef: { color: GLOW_GOLD, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  scriptureText: { color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 26, fontStyle: "italic" },
  reflectionText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
  },
  themesSection: { alignItems: "center", gap: 10 },
  doneBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  doneBtnText: { color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: "600" },
  deepNudge: {
    backgroundColor: "rgba(122, 1, 141, 0.18)",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(122, 1, 141, 0.35)",
    gap: 10,
  },
  deepNudgeTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700", textAlign: "center" },
  deepNudgeBody: { color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 20, textAlign: "center" },
  deepNudgeActions: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginTop: 4 },
  deepNudgeBtn: {
    backgroundColor: "#7A018D",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  deepNudgeBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  deepNudgeDismiss: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
});
