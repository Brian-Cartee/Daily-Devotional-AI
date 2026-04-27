import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { Audio } from "expo-av";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { analyzeSermonChunk, saveSermonSession } from "@/lib/api";

const { width: SW } = Dimensions.get("window");

const CHUNK_DURATION_MS = 20_000;
const GOLD = "#D4880E";
const GOLD_GLOW = "#E09A1A";

type ChunkStatus = "idle" | "recording" | "processing";

interface ScriptureEntry {
  ref: string;
  id: string;
  anim: Animated.Value;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function SermonLiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [chunkStatus, setChunkStatus] = useState<ChunkStatus>("idle");
  const [isListening, setIsListening] = useState(false);
  const [scriptures, setScriptures] = useState<ScriptureEntry[]>([]);
  const [allScriptures, setAllScriptures] = useState<string[]>([]);
  const [fullTranscript, setFullTranscript] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenScripturesRef = useRef<Set<string>>(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const scrollRef = useRef<ScrollView>(null);
  const isListeningRef = useRef(false);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseOpacity.setValue(0.6);
    pulseAnim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.22, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoopRef.current = loop;
    loop.start();
  };

  const stopPulse = () => {
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
      pulseLoopRef.current = null;
    }
    pulseAnim.setValue(1);
    pulseOpacity.setValue(0);
  };

  const addScripture = useCallback((ref: string) => {
    const normalised = ref.trim();
    if (seenScripturesRef.current.has(normalised)) return;
    seenScripturesRef.current.add(normalised);
    setAllScriptures((prev) => [...prev, normalised]);
    const anim = new Animated.Value(0);
    const entry: ScriptureEntry = { ref: normalised, id: normalised + Date.now(), anim };
    setScriptures((prev) => [entry, ...prev]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(anim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
  }, []);

  const processChunk = useCallback(async (uri: string) => {
    try {
      setChunkStatus("processing");
      const result = await analyzeSermonChunk(uri, "audio/mp4");
      if (result.text) {
        setFullTranscript((prev) => (prev ? prev + " " + result.text : result.text));
      }
      result.scriptures.forEach(addScripture);
    } catch (err) {
      console.warn("Chunk processing failed:", err);
    } finally {
      if (isListeningRef.current) setChunkStatus("recording");
    }
  }, [addScripture]);

  const startChunk = useCallback(async () => {
    if (!isListeningRef.current) return;
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
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 64000,
        },
      });
      await rec.startAsync();
      recordingRef.current = rec;
      setChunkStatus("recording");

      chunkTimerRef.current = setTimeout(async () => {
        if (!isListeningRef.current) return;
        try {
          await rec.stopAndUnloadAsync();
          recordingRef.current = null;
          const uri = rec.getURI();
          if (uri) {
            processChunk(uri);
          }
        } catch {}
        startChunk();
      }, CHUNK_DURATION_MS);
    } catch (err) {
      console.warn("Could not start chunk recording:", err);
    }
  }, [processChunk]);

  const stopCurrentChunk = useCallback(async () => {
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (rec) {
      try {
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        if (uri) await processChunk(uri);
      } catch {}
    }
  }, [processChunk]);

  const startListening = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone Access",
          "Please allow microphone access in Settings to use Sermon Mode.",
          [{ text: "OK" }]
        );
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      isListeningRef.current = true;
      setIsListening(true);
      startPulse();
      elapsedTimerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await startChunk();
    } catch (err) {
      Alert.alert("Error", "Could not start recording. Please try again.");
    }
  }, [startChunk]);

  const stopListening = useCallback(async () => {
    isListeningRef.current = false;
    setIsListening(false);
    stopPulse();
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    await stopCurrentChunk();
    setChunkStatus("idle");
  }, [stopCurrentChunk]);

  const handleEndSession = useCallback(async () => {
    await stopListening();
    if (allScriptures.length === 0 && !fullTranscript) {
      Alert.alert(
        "No content detected",
        "No scriptures or speech were detected. Try again in a noisier environment.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveSermonSession({
        sessionId: sessionId || "",
        title: "Sermon — " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        scriptures: Array.from(seenScripturesRef.current),
        transcript: fullTranscript || undefined,
        durationSeconds: elapsed,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/sermon-detail", params: { id: saved.id } });
    } catch (err) {
      Alert.alert("Error", "Failed to save your sermon session. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [stopListening, allScriptures, fullTranscript, sessionId, elapsed, router]);

  const handleDiscard = () => {
    Alert.alert(
      "Discard Session",
      "Are you sure you want to discard this session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            await stopListening();
            router.back();
          },
        },
      ]
    );
  };

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const statusText =
    chunkStatus === "processing"
      ? "Detecting scriptures..."
      : isListening
      ? "Listening..."
      : "Ready to listen";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={isListening ? handleDiscard : () => router.back()}
          style={styles.topBarBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="x" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <Text style={styles.elapsedText}>{formatElapsed(elapsed)}</Text>

        {(isListening || allScriptures.length > 0) && (
          <TouchableOpacity
            style={[styles.endButton, isSaving && { opacity: 0.6 }]}
            onPress={handleEndSession}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="End session"
          >
            <Text style={styles.endButtonText}>{isSaving ? "Saving..." : "End"}</Text>
          </TouchableOpacity>
        )}
        {!isListening && allScriptures.length === 0 && (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Mic area */}
      <View style={styles.micArea}>
        {/* Outer pulse ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
              borderColor: GOLD_GLOW,
            },
          ]}
        />
        {/* Mic button */}
        <TouchableOpacity
          style={[
            styles.micButton,
            {
              backgroundColor: isListening ? GOLD : "rgba(255,255,255,0.1)",
              borderColor: isListening ? GOLD_GLOW : "rgba(255,255,255,0.3)",
            },
          ]}
          onPress={isListening ? handleEndSession : startListening}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isListening ? "End session" : "Start listening"}
        >
          <Feather
            name={isListening ? "mic" : "mic-off"}
            size={34}
            color={isListening ? "#1a0a00" : "rgba(255,255,255,0.6)"}
          />
        </TouchableOpacity>

        {/* Status text */}
        <Text style={styles.statusText}>{statusText}</Text>
        {!isListening && allScriptures.length === 0 && (
          <Text style={styles.statusHint}>
            Tap the mic and hold your phone near a speaker or microphone
          </Text>
        )}
      </View>

      {/* Scripture stream */}
      <View style={styles.scriptureArea}>
        {allScriptures.length === 0 && isListening && (
          <Text style={styles.scriptureHint}>
            Scriptures will appear here as they're mentioned
          </Text>
        )}

        {allScriptures.length > 0 && (
          <>
            <Text style={styles.scriptureAreaLabel}>
              {allScriptures.length} scripture{allScriptures.length !== 1 ? "s" : ""} detected
            </Text>
            <ScrollView
              ref={scrollRef}
              style={styles.scriptureScroll}
              contentContainerStyle={styles.scriptureScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {scriptures.map((entry) => (
                <Animated.View
                  key={entry.id}
                  style={[
                    styles.scriptureCard,
                    {
                      opacity: entry.anim,
                      transform: [
                        {
                          translateY: entry.anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [12, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.scriptureGlow} />
                  <Text style={styles.scriptureRef}>{entry.ref}</Text>
                </Animated.View>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {/* Start button if not yet listening */}
      {!isListening && allScriptures.length === 0 && (
        <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={styles.bigStartButton}
            onPress={startListening}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Start listening"
          >
            <Text style={styles.bigStartText}>Start Listening</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080510",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  elapsedText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
  },
  endButton: {
    backgroundColor: GOLD,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  endButtonText: {
    color: "#1a0a00",
    fontWeight: "700",
    fontSize: 14,
  },
  micArea: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 32,
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    top: 40 - 34,
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 2,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    marginTop: 20,
    fontWeight: "500",
  },
  statusHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    maxWidth: SW * 0.7,
    lineHeight: 18,
  },
  scriptureArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scriptureHint: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  scriptureAreaLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  scriptureScroll: {
    flex: 1,
  },
  scriptureScrollContent: {
    gap: 8,
    paddingBottom: 20,
  },
  scriptureCard: {
    borderRadius: 12,
    backgroundColor: "rgba(212, 136, 14, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(212, 136, 14, 0.35)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  scriptureGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: GOLD,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  scriptureRef: {
    color: "#E09A1A",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  bottomArea: {
    paddingHorizontal: 24,
  },
  bigStartButton: {
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  bigStartText: {
    color: "#1a0a00",
    fontSize: 18,
    fontWeight: "700",
  },
});
