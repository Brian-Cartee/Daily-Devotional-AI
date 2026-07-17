import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AudioSession,
  LiveKitRoom,
  useConnectionState,
  useIOSAudioManagement,
  useParticipants,
  useRoomContext,
} from "@livekit/react-native";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import type { RemoteAudioTrack, RemoteParticipant, RemoteTrack, Room } from "livekit-client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isPhilipVoiceLabEnabled } from "@/lib/philipVoiceLabFlags";
import type { PhilipVoiceLabSession } from "@/lib/philipVoiceLabApi";
import { preparePhilipVoiceLabSession } from "@/lib/philipVoiceLabSession";
import {
  createClientTimeline,
  type ClientTimelineRecorder,
} from "@/lib/philipVoiceLabClientTimeline";
import { playPhilipReplyLocally, stopPhilipLocalPlayback } from "@/lib/philipVoiceLabLocalPlayback";

const GATE_B_TIMELINE_PREFIX = "gate_b_client_";

const GOLD = "#D4880E";
const BG = "#0d0612";

async function ensureLabMicrophoneAccess(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) {
    Alert.alert(
      "Microphone access needed",
      "Philip Voice Lab needs your microphone before it can connect. Enable it in Settings, then tap Connect again.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );
    return false;
  }
  return true;
}

async function prepareLiveKitAudioSession(): Promise<void> {
  await AudioSession.setDefaultRemoteAudioTrackVolume(1.0);
  await AudioSession.configureAudio({
    ios: { defaultOutput: "speaker" },
  });
}

function startAgentAudioTrack(track: RemoteTrack): void {
  if (track.kind !== Track.Kind.Audio) return;
  try {
    track.start();
    const audioTrack = track as RemoteAudioTrack;
    audioTrack.setVolume(1.0);
  } catch {
    // Track may already be started.
  }
}

function startExistingAgentTracks(room: Room): void {
  for (const participant of room.remoteParticipants.values()) {
    if (!participant.identity.startsWith("agent-")) continue;
    for (const pub of participant.audioTrackPublications.values()) {
      if (pub.track) startAgentAudioTrack(pub.track);
    }
  }
}

function GateBSessionBridge({
  recorder,
  onConnectionState,
  onAgentAudio,
  onPhilipReply,
  onPlaybackStatus,
  sessionId,
}: {
  recorder: ClientTimelineRecorder;
  onConnectionState?: (state: ConnectionState) => void;
  onAgentAudio?: (active: boolean) => void;
  onPhilipReply?: (active: boolean) => void;
  onPlaybackStatus?: (message: string | null) => void;
  sessionId: string;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const playbackMarkedRef = useRef(false);

  useIOSAudioManagement(room, true);

  useEffect(() => {
    recorder.mark("client_session_start");
  }, [recorder]);

  useEffect(() => {
    onConnectionState?.(connectionState);
    if (connectionState === ConnectionState.Connected) {
      recorder.mark("client_room_connected");
      void (async () => {
        try {
          await AudioSession.selectAudioOutput("force_speaker");
          await room.startAudio();
          startExistingAgentTracks(room);
        } catch {
          // LiveKit may already have audio running.
        }
      })();
    }
    if (connectionState === ConnectionState.Disconnected) {
      recorder.mark("client_room_disconnected");
      onAgentAudio?.(false);
    }
  }, [connectionState, recorder, onConnectionState, onAgentAudio, room]);

  useEffect(() => {
    if (!room) return;

    const onData = (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== "philip-gate-b") return;
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
        recorder.ingestAgentPayload(parsed);
        if (parsed.phase === "playback_cancel") {
          recorder.mark("client_playback_cancel", {
            generation: parsed.playbackGeneration,
            reason: parsed.reason,
          });
          void stopPhilipLocalPlayback();
          onPhilipReply?.(false);
          onPlaybackStatus?.("Philip interrupted — listening");
          return;
        }
        if (parsed.phase === "turn_complete") {
          recorder.mark("client_turn_complete_received");
          onPhilipReply?.(true);
          playbackMarkedRef.current = false;
          const phase1Text =
            (typeof parsed.phase1Text === "string" && parsed.phase1Text) ||
            (() => {
              const timeline = parsed.timeline as { turns?: Array<{ phase1Text?: string; phase1Preview?: string }> } | undefined;
              const last = timeline?.turns?.at(-1);
              return last?.phase1Text || last?.phase1Preview || "";
            })();
          if (phase1Text) {
            recorder.mark("client_local_playback_start");
            onPlaybackStatus?.("Fetching Philip's voice…");
            void playPhilipReplyLocally(phase1Text, sessionId).then((result) => {
              if (result.ok) {
                onPlaybackStatus?.("Playing Philip through speaker (local fallback)");
              } else {
                recorder.mark("client_local_playback_error", { reason: result.reason });
                onPlaybackStatus?.(`Playback failed: ${result.reason}`);
              }
            }).finally(() => {
              recorder.mark("client_local_playback_end");
              onPhilipReply?.(false);
            });
          } else {
            onPlaybackStatus?.("Philip replied but no text in turn_complete payload");
            setTimeout(() => onPhilipReply?.(false), 8000);
          }
        }
      } catch {
        recorder.mark("client_data_parse_error");
      }
    };

    const onTrack = (
      track: RemoteTrack,
      _pub: unknown,
      participant: RemoteParticipant,
    ) => {
      if (track.kind !== Track.Kind.Audio) return;
      if (!participant.identity.startsWith("agent-")) return;
      startAgentAudioTrack(track);
      recorder.mark("client_agent_audio_subscribed");
      onAgentAudio?.(true);
      if (!playbackMarkedRef.current) {
        playbackMarkedRef.current = true;
        recorder.mark("client_playback_start");
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.TrackSubscribed, onTrack);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.TrackSubscribed, onTrack);
    };
  }, [room, recorder, onAgentAudio, onPhilipReply, onPlaybackStatus, sessionId]);

  return null;
}

function connectionLabel(state: ConnectionState, agentPresent: boolean): string {
  switch (state) {
    case ConnectionState.Connecting:
      return "Connecting to room…";
    case ConnectionState.Connected:
      return agentPresent ? "Connected — speak when ready" : "Connected — waiting for agent";
    case ConnectionState.Reconnecting:
      return "Reconnecting…";
    case ConnectionState.Disconnected:
      return "Disconnected";
    default:
      return "Idle";
  }
}

function RoomDiagnostics({
  roomName,
  connectionState,
  agentPresent,
}: {
  roomName: string;
  connectionState: ConnectionState;
  agentPresent: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Room</Text>
      <Text style={styles.mono}>{roomName}</Text>
      <Text style={styles.statusLine}>{connectionLabel(connectionState, agentPresent)}</Text>
      <Text style={styles.meta}>
        {agentPresent ? "Agent joined" : "Waiting for agent"}
      </Text>
      <Text style={styles.hint}>
        Speak naturally. The agent listens for a pause, transcribes, runs phase1 + TTS, then
        plays Philip&apos;s reply. Mic resumes after playback.
      </Text>
    </View>
  );
}

function LiveKitAudioSession({
  timelineRecorder,
  onConnectionState,
  onAgentPresent,
  onAgentAudio,
  onPhilipReply,
  onPlaybackStatus,
  sessionId,
}: {
  timelineRecorder: ClientTimelineRecorder | null;
  onConnectionState: (state: ConnectionState) => void;
  onAgentPresent: (present: boolean) => void;
  onAgentAudio: (active: boolean) => void;
  onPhilipReply: (active: boolean) => void;
  onPlaybackStatus: (message: string | null) => void;
  sessionId: string;
}) {
  const participants = useParticipants();
  const agentPresent = participants.some((p) => p.identity.startsWith("agent-"));

  useEffect(() => {
    onAgentPresent(agentPresent);
  }, [agentPresent, onAgentPresent]);

  return timelineRecorder ? (
    <GateBSessionBridge
      recorder={timelineRecorder}
      onConnectionState={onConnectionState}
      onAgentAudio={onAgentAudio}
      onPhilipReply={onPhilipReply}
      onPlaybackStatus={onPlaybackStatus}
      sessionId={sessionId}
    />
  ) : null;
}

function LiveKitLabFallback({
  error,
  resetError,
  onReset,
}: {
  error: Error;
  resetError: () => void;
  onReset: () => void;
}) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>LiveKit error: {error.message}</Text>
      <Pressable
        style={styles.secondaryBtn}
        onPress={() => {
          resetError();
          onReset();
        }}
      >
        <Text style={styles.secondaryBtnText}>Try Connect again</Text>
      </Pressable>
    </View>
  );
}

export default function PhilipVoiceLabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const enabled = isPhilipVoiceLabEnabled();

  const [connect, setConnect] = useState(false);
  const [credentials, setCredentials] = useState<PhilipVoiceLabSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineRecorder, setTimelineRecorder] = useState<ClientTimelineRecorder | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  );
  const [agentPresent, setAgentPresent] = useState(false);
  const [agentAudioActive, setAgentAudioActive] = useState(false);
  const [philipReplying, setPhilipReplying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<string | null>(null);
  const [roomMounted, setRoomMounted] = useState(false);

  useEffect(() => {
    if (!enabled) {
      router.replace("/");
    }
  }, [enabled, router]);

  useEffect(() => {
    return () => {
      void AudioSession.stopAudioSession();
      void stopPhilipLocalPlayback();
    };
  }, []);

  const resetConnection = useCallback(() => {
    setConnect(false);
    setCredentials(null);
    setSessionId(null);
    setTimelineRecorder(null);
    setConnectionState(ConnectionState.Disconnected);
    setAgentPresent(false);
    setAgentAudioActive(false);
    setPhilipReplying(false);
    setPlaybackStatus(null);
    setRoomMounted(false);
  }, []);

  useEffect(() => {
    if (!credentials || !connect) {
      setRoomMounted(false);
      return;
    }
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (!cancelled) setRoomMounted(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [credentials, connect]);

  const onConnect = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const micOk = await ensureLabMicrophoneAccess();
      if (!micOk) return;

      await prepareLiveKitAudioSession();

      const prepared = await preparePhilipVoiceLabSession();
      setSessionId(prepared.sessionId);
      setCredentials(prepared.credentials);
      const recorder = createClientTimeline(
        prepared.credentials.roomName,
        prepared.sessionId,
      );
      recorder.mark("client_connect_requested");
      setTimelineRecorder(recorder);
      setConnect(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setConnect(false);
      setCredentials(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const finishSession = useCallback(async () => {
    const creds = credentials;
    const sid = sessionId;
    const recorder = timelineRecorder;
    setConnect(false);
    setCredentials(null);
    setSessionId(null);
    setError(null);
    setTimelineRecorder(null);

    if (!creds || !sid || !recorder) return;
    recorder.mark("client_session_end");
    await AsyncStorage.setItem(
      `${GATE_B_TIMELINE_PREFIX}${creds.roomName}`,
      JSON.stringify(recorder.toJSON()),
    );
    router.push({
      pathname: "/philip-voice-eval",
      params: {
        conversationId: creds.roomName,
        sessionId: sid,
        roomName: creds.roomName,
      },
    });
  }, [credentials, sessionId, timelineRecorder, router]);

  const onDisconnect = useCallback(() => {
    void finishSession();
  }, [finishSession]);

  if (!enabled) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Internal spike · Legacy LiveKit path</Text>
        <Text style={styles.title}>Philip Voice Lab</Text>
        <Text style={styles.subtitle}>
          Gate B: speak → rate immediately after disconnect. Proving Philip, not LiveKit.
          The separate Philip Realtime Lab uses OpenAI Realtime WebRTC and does not replace this screen.
        </Text>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push("/philip-realtime-lab")}
        >
          <Text style={styles.secondaryBtnText}>Open Philip Realtime Lab</Text>
        </Pressable>

        {sessionId ? (
          <Text style={styles.meta}>Session: {sessionId.slice(0, 24)}…</Text>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!connect || !credentials ? (
          <Pressable
            style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
            onPress={onConnect}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#0d0612" />
            ) : (
              <Text style={styles.primaryBtnText}>Connect to lab room</Text>
            )}
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryBtn} onPress={onDisconnect}>
            <Text style={styles.secondaryBtnText}>Disconnect</Text>
          </Pressable>
        )}

        {credentials && connect ? (
          <RoomDiagnostics
            roomName={credentials.roomName}
            connectionState={connectionState}
            agentPresent={agentPresent}
          />
        ) : null}

        {agentAudioActive ? (
          <Text style={styles.agentAudioHint}>Agent audio track connected</Text>
        ) : null}

        {philipReplying ? (
          <Text style={styles.agentAudioHint}>Philip is speaking…</Text>
        ) : null}

        {playbackStatus ? (
          <Text style={styles.playbackStatus}>{playbackStatus}</Text>
        ) : null}

        <Pressable style={styles.closeBtn} onPress={() => router.replace("/")}>
          <Text style={styles.closeBtnText}>Back to app</Text>
        </Pressable>
      </ScrollView>

      {credentials && connect && roomMounted ? (
        <ErrorBoundary
          FallbackComponent={({ error, resetError }) => (
            <LiveKitLabFallback
              error={error}
              resetError={resetError}
              onReset={resetConnection}
            />
          )}
        >
          <View style={styles.liveKitHost} pointerEvents="box-none">
            <LiveKitRoom
              serverUrl={credentials.url}
              token={credentials.token}
              connect={connect}
              audio
              video={false}
              onError={(e) => setError(e.message)}
            >
              <LiveKitAudioSession
                timelineRecorder={timelineRecorder}
                onConnectionState={setConnectionState}
                onAgentPresent={setAgentPresent}
                onAgentAudio={setAgentAudioActive}
                onPhilipReply={setPhilipReplying}
                onPlaybackStatus={setPlaybackStatus}
                sessionId={sessionId ?? ""}
              />
            </LiveKitRoom>
          </View>
        </ErrorBoundary>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  liveKitHost: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 8,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    lineHeight: 22,
  },
  meta: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
  card: {
    backgroundColor: "rgba(212,136,14,0.08)",
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  mono: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  statusLine: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    lineHeight: 19,
  },
  agentAudioHint: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  playbackStatus: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#0d0612",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  closeBtn: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 10,
  },
  closeBtnText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: "rgba(220,38,38,0.12)",
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    lineHeight: 20,
  },
});
