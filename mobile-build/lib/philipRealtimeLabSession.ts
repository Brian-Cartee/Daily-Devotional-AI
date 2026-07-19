import {
  PHILIP_REALTIME_LAB_CLOSING_NOTICE_MS,
  PHILIP_REALTIME_LAB_MAX_DURATION_MS,
  PHILIP_REALTIME_LAB_MODEL,
  PHILIP_REALTIME_LAB_SPEND_CAP_USD,
  PHILIP_REALTIME_LAB_VOICE,
  assertIsolatedRealtimeLabUrl,
  philipRealtimeLabBaseUrl,
} from "@/lib/philipRealtimeLabConfig";
import { releaseRealtimeAudioSession } from "@/lib/philipRealtimeAudioSession";
import {
  buildClosingNoticeEvent,
  closingNoticeDelayMs,
} from "@/lib/philipRealtimeClosingNotice.mjs";
import { applyInputTranscriptEvent } from "@/lib/philipRealtimeTranscript.mjs";
import { acceptSingleRemoteAudioTrack } from "@/lib/philipRealtimeTrackPolicy.mjs";
import {
  createPeerConnectionForOpenAi,
  loadLiveKitReactNativeWebRtc,
  type WebRtcPrimitives,
} from "@/lib/philipRealtimeWebRtc";

export type RealtimeLabEvidence = {
  schemaVersion: 1;
  phase: "iphone-realtime-lab";
  model: string;
  voice: string;
  transport: "native WebRTC @livekit/react-native-webrtc";
  liveKitCloud: false;
  audioRecorded: false;
  audioPersisted: false;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number;
  status: string;
  stopReason: string | null;
  sessionId: string | null;
  connection: Record<string, unknown>;
  events: Array<Record<string, unknown>>;
  turns: Array<Record<string, unknown>>;
  responses: Array<Record<string, unknown>>;
  interruptions: Array<Record<string, unknown>>;
  providerErrors: Array<Record<string, unknown>>;
  tools: Array<Record<string, unknown>>;
  usage: Record<string, number>;
  estimatedCostUsd: number;
};

type Listener = (patch: {
  connectionState?: string;
  iceState?: string;
  micState?: string;
  listening?: boolean;
  speaking?: boolean;
  elapsedMs?: number;
  logLine?: string;
  error?: string | null;
  evidence?: RealtimeLabEvidence;
}) => void;

const PRICING = {
  textInput: 4,
  cachedTextInput: 0.4,
  audioInput: 32,
  cachedAudioInput: 0.4,
  textOutput: 24,
  audioOutput: 64,
};

function emptyEvidence(): RealtimeLabEvidence {
  return {
    schemaVersion: 1,
    phase: "iphone-realtime-lab",
    model: PHILIP_REALTIME_LAB_MODEL,
    voice: PHILIP_REALTIME_LAB_VOICE,
    transport: "native WebRTC @livekit/react-native-webrtc",
    liveKitCloud: false,
    audioRecorded: false,
    audioPersisted: false,
    startedAt: null,
    endedAt: null,
    durationMs: 0,
    status: "idle",
    stopReason: null,
    sessionId: null,
    connection: {},
    events: [],
    turns: [],
    responses: [],
    interruptions: [],
    providerErrors: [],
    tools: [],
    usage: {
      textInputTokens: 0,
      cachedTextInputTokens: 0,
      audioInputTokens: 0,
      cachedAudioInputTokens: 0,
      textOutputTokens: 0,
      audioOutputTokens: 0,
    },
    estimatedCostUsd: 0,
  };
}

export class PhilipRealtimeLabSession {
  private primitives: WebRtcPrimitives | null = null;
  private pc: ReturnType<typeof createPeerConnectionForOpenAi> | null = null;
  private dc: {
    readyState?: string;
    send: (s: string) => void;
    close?: () => void;
    onopen?: (() => void) | null;
    onclose?: (() => void) | null;
    onmessage?: ((e: { data: string }) => void) | null;
  } | null = null;
  private localStream:
    | Awaited<ReturnType<WebRtcPrimitives["mediaDevices"]["getUserMedia"]>>
    | null = null;
  private evidence = emptyEvidence();
  private startedAtMs: number | null = null;
  private hardStopTimer: ReturnType<typeof setTimeout> | null = null;
  private closingNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private completed = false;
  private speaking = false;
  private listening = false;
  private dataChannelReady = false;
  private providerSessionCreated = false;
  private remoteAudioReady = false;
  private conversationallyReady = false;
  private currentResponse: Record<string, unknown> | null = null;
  private lastSpeechStoppedAtMs: number | null = null;
  private runtimeToken: string | null = null;
  private remoteAudioTrackId: string | null = null;
  private listener: Listener;

  constructor(listener: Listener) {
    this.listener = listener;
  }

  getEvidence() {
    return this.evidence;
  }

  private emit(patch: Parameters<Listener>[0]) {
    this.listener(patch);
  }

  private log(line: string) {
    this.emit({ logLine: line });
  }

  private recomputeCost() {
    const u = this.evidence.usage;
    const usd =
      (u.textInputTokens * PRICING.textInput +
        u.cachedTextInputTokens * PRICING.cachedTextInput +
        u.audioInputTokens * PRICING.audioInput +
        u.cachedAudioInputTokens * PRICING.cachedAudioInput +
        u.textOutputTokens * PRICING.textOutput +
        u.audioOutputTokens * PRICING.audioOutput) /
      1_000_000;
    this.evidence.estimatedCostUsd = Number(usd.toFixed(6));
  }

  private addUsage(usage: Record<string, unknown> = {}) {
    const input = (usage.input_token_details || {}) as Record<string, number>;
    const cached = (input.cached_tokens_details || {}) as Record<string, number>;
    const output = (usage.output_token_details || {}) as Record<string, number>;
    const cachedText = Number(cached.text_tokens || 0);
    const cachedAudio = Number(cached.audio_tokens || 0);
    this.evidence.usage.textInputTokens += Math.max(0, Number(input.text_tokens || 0) - cachedText);
    this.evidence.usage.cachedTextInputTokens += cachedText;
    this.evidence.usage.audioInputTokens += Math.max(0, Number(input.audio_tokens || 0) - cachedAudio);
    this.evidence.usage.cachedAudioInputTokens += cachedAudio;
    this.evidence.usage.textOutputTokens += Number(output.text_tokens || 0);
    this.evidence.usage.audioOutputTokens += Number(output.audio_tokens || 0);
    this.recomputeCost();
    if (
      this.evidence.estimatedCostUsd >=
      PHILIP_REALTIME_LAB_SPEND_CAP_USD - 0.1
    ) {
      void this.end("budget_stop", "spend_cap_buffer");
    }
  }

  private send(event: object) {
    if (!this.dc || this.dc.readyState !== "open") {
      throw new Error("data_channel_not_open");
    }
    this.dc.send(JSON.stringify(event));
  }

  /**
   * Conversational readiness requires the data channel, the provider session,
   * and the remote audio path together. Genuine session
   * iphone-lab-1784427478402-1 showed the "speak" invitation landing before
   * the data channel opened, so the invitation now waits for all three.
   * No artificial delay is added after readiness.
   */
  private maybeMarkConversationallyReady() {
    if (this.conversationallyReady || this.completed) return;
    if (!this.dataChannelReady || !this.providerSessionCreated || !this.remoteAudioReady) return;
    this.conversationallyReady = true;
    this.evidence.events.push({ type: "conversation_ready", atMs: Date.now(), itemId: null });
    this.emit({ connectionState: "ready" });
    this.log("Philip is ready — speak whenever you like.");
  }

  /**
   * Non-forcing near-limit context: adds a system item the model will see on
   * its next turn. Never cancels active audio and never triggers a response.
   */
  private sendClosingNotice() {
    if (this.completed) return;
    try {
      this.send(buildClosingNoticeEvent());
      this.evidence.events.push({ type: "closing_notice_sent", atMs: Date.now(), itemId: null });
      this.log("Near-limit closing notice sent (context only).");
    } catch {
      // Data channel not open; the hard stop remains the safety boundary.
    }
  }

  private handleToolCall(item: { name?: string; call_id?: string; arguments?: string }) {
    if (item.name === "factual_currentness") {
      const output = {
        supported: false,
        reason: "iphone_lab_no_live_fact_provider",
        instruction: "Say you do not have a verified live result and will not guess.",
      };
      this.evidence.tools.push({ atMs: Date.now(), name: item.name, callId: item.call_id, output });
      this.send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: item.call_id,
          output: JSON.stringify(output),
        },
      });
      this.send({ type: "response.create" });
      return;
    }
    if (item.name === "crisis_safety_protocol") {
      const output = {
        handled: true,
        spokenResponse:
          "I hear how heavy this is. Please get immediate help now — if you are in the U.S., call or text 988.",
      };
      this.evidence.tools.push({ atMs: Date.now(), name: item.name, callId: item.call_id, output });
      this.send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: item.call_id,
          output: JSON.stringify(output),
        },
      });
      this.send({ type: "response.create" });
    }
  }

  private handleProviderEvent(event: Record<string, unknown>) {
    const atMs = Date.now();
    const type = String(event.type || "");
    if (
      [
        "session.created",
        "session.updated",
        "input_audio_buffer.speech_started",
        "input_audio_buffer.speech_stopped",
        "output_audio_buffer.started",
        "output_audio_buffer.stopped",
        "output_audio_buffer.cleared",
        "response.created",
        "response.done",
        "conversation.item.input_audio_transcription.completed",
        "conversation.item.truncated",
        "error",
      ].includes(type)
    ) {
      this.evidence.events.push({ type, atMs, itemId: event.item_id || null });
    }

    if (type === "session.created") {
      this.providerSessionCreated = true;
      this.log("Provider session created.");
      this.maybeMarkConversationallyReady();
      return;
    }
    if (type === "input_audio_buffer.speech_started") {
      this.listening = true;
      this.emit({ listening: true });
      const turn = {
        turnNumber: this.evidence.turns.length + 1,
        speechStartedAtMs: atMs,
        itemId: event.item_id || null,
      };
      this.evidence.turns.push(turn);
      if (this.speaking) {
        this.evidence.interruptions.push({
          detectedAtMs: atMs,
          assistantWasAudible: true,
        });
        this.log("Barge-in: speech while Philip audible.");
      }
      this.log(`VAD speech_started · turn ${turn.turnNumber}`);
      return;
    }
    if (type === "input_audio_buffer.speech_stopped") {
      this.listening = false;
      this.lastSpeechStoppedAtMs = atMs;
      this.emit({ listening: false });
      const turn = this.evidence.turns[this.evidence.turns.length - 1];
      if (turn) turn.speechStoppedAtMs = atMs;
      this.log("VAD speech_stopped");
      return;
    }
    if (type.startsWith("conversation.item.input_audio_transcription.")) {
      const result = applyInputTranscriptEvent(this.evidence.turns, event, atMs);
      if (result.completed && result.turn) {
        this.log(`Brian: ${result.turn.inputTranscript || "[empty transcript]"}`);
      }
      return;
    }
    if (type === "output_audio_buffer.started") {
      this.speaking = true;
      this.emit({ speaking: true });
      if (this.currentResponse && this.currentResponse.audioStartAtMs == null) {
        this.currentResponse.audioStartAtMs = atMs;
        if (this.lastSpeechStoppedAtMs != null) {
          this.currentResponse.speechEndToFirstAudibleMs = atMs - this.lastSpeechStoppedAtMs;
          this.log(
            `Speech-end → first audible: ${this.currentResponse.speechEndToFirstAudibleMs}ms`,
          );
        }
      }
      return;
    }
    if (type === "output_audio_buffer.stopped" || type === "output_audio_buffer.cleared") {
      this.speaking = false;
      this.emit({ speaking: false });
      const interruption = this.evidence.interruptions[this.evidence.interruptions.length - 1];
      if (interruption && interruption.assistantStoppedAtMs == null) {
        interruption.assistantStoppedAtMs = atMs;
        interruption.interruptionToAudioStoppedMs = Math.max(
          0,
          atMs - Number(interruption.detectedAtMs || atMs),
        );
        this.log(`Barge-in audio stop: ${interruption.interruptionToAudioStoppedMs}ms`);
      }
      return;
    }
    if (type === "response.created") {
      this.currentResponse = {
        responseId: (event.response as { id?: string } | undefined)?.id || null,
        createdAtMs: atMs,
        transcriptDeltas: "",
      };
      return;
    }
    if (type === "response.output_audio_transcript.delta") {
      if (!this.currentResponse) {
        this.currentResponse = { transcriptDeltas: "", createdAtMs: atMs };
      }
      this.currentResponse.transcriptDeltas =
        String(this.currentResponse.transcriptDeltas || "") + String(event.delta || "");
      return;
    }
    if (type === "response.done") {
      const response = (event.response || {}) as Record<string, unknown>;
      this.addUsage((response.usage || {}) as Record<string, unknown>);
      const functionCalls = ((response.output || []) as Array<Record<string, unknown>>).filter(
        (item) => item.type === "function_call",
      );
      for (const item of functionCalls) this.handleToolCall(item as { name?: string; call_id?: string; arguments?: string });
      const transcript =
        ((response.output || []) as Array<{ content?: Array<{ transcript?: string; text?: string }> }>)
          .flatMap((item) => item.content || [])
          .map((content) => content.transcript || content.text || "")
          .join("")
          .trim() || String(this.currentResponse?.transcriptDeltas || "");
      const done = {
        ...(this.currentResponse || {}),
        responseId: response.id || this.currentResponse?.responseId,
        doneAtMs: atMs,
        status: response.status,
        transcript,
        usage: response.usage || null,
      };
      this.evidence.responses.push(done);
      if (transcript) this.log(`Philip: ${transcript}`);
      this.currentResponse = null;
      return;
    }
    if (type === "error") {
      const err = (event.error || {}) as Record<string, unknown>;
      this.evidence.providerErrors.push({
        atMs,
        type: err.type || null,
        code: err.code || null,
        message: err.message || null,
      });
      this.emit({ error: String(err.message || err.code || "provider_error") });
      this.log(`Provider error: ${err.code || err.type || "unknown"}`);
    }
  }

  async startConversation(runtimeToken: string) {
    if (this.completed || this.pc) throw new Error("session_already_active");
    const loaded = loadLiveKitReactNativeWebRtc();
    if (!loaded.ok) {
      throw new Error(loaded.error);
    }
    this.primitives = loaded.primitives;
    this.evidence = emptyEvidence();
    this.evidence.status = "connecting";
    this.evidence.startedAt = new Date().toISOString();
    this.startedAtMs = Date.now();
    this.runtimeToken = runtimeToken;
    this.emit({ micState: "requesting", error: null, evidence: this.evidence });

    const baseUrl = philipRealtimeLabBaseUrl();
    if (!baseUrl) throw new Error("lab_server_url_not_configured");
    assertIsolatedRealtimeLabUrl(baseUrl);
    if (!this.runtimeToken) throw new Error("realtime_runtime_token_missing");

    this.localStream = await this.primitives.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });
    this.emit({ micState: "open" });
    this.log("Microphone open.");

    this.pc = createPeerConnectionForOpenAi(this.primitives);
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState || "unknown";
      this.evidence.connection.peerConnectionState = state;
      this.emit({
        connectionState: this.conversationallyReady && state === "connected" ? "ready" : state,
      });
      this.log(`Peer connection: ${state}`);
      if (!this.completed && (state === "failed" || state === "disconnected")) {
        void this.end("failed", `peer_connection_${state}`);
      }
    };
    this.pc.ontrack = (event) => {
      const track = event.track;
      const decision = acceptSingleRemoteAudioTrack(this.remoteAudioTrackId, track);
      if (!decision.accepted) {
        if (decision.reason !== "duplicate_audio") return;
        this.evidence.providerErrors.push({
          atMs: Date.now(),
          type: "duplicate_remote_audio_track",
          message: `Stopped duplicate remote audio track ${String(track?.id || "unknown")}`,
        });
        this.log("Realtime failure: duplicate remote audio track stopped.");
        return;
      }
      const trackId = decision.trackId;
      this.remoteAudioTrackId = trackId;
      this.log("Remote audio track received (single stream).");
      this.evidence.connection.remoteTrackReceived = true;
      this.evidence.connection.remoteAudioTrackId = trackId;
      this.remoteAudioReady = true;
      this.maybeMarkConversationallyReady();
      track?.addEventListener?.("mute", () => {
        this.evidence.events.push({ type: "remote_track_muted", atMs: Date.now(), trackId });
      });
      track?.addEventListener?.("unmute", () => {
        this.evidence.events.push({ type: "remote_track_unmuted", atMs: Date.now(), trackId });
      });
      track?.addEventListener?.("ended", () => {
        this.evidence.events.push({ type: "remote_track_ended", atMs: Date.now(), trackId });
        if (!this.completed) void this.end("failed", "remote_audio_track_ended");
      });
    };

    const localAudioTracks = this.localStream.getAudioTracks();
    if (localAudioTracks.length !== 1) {
      throw new Error(`expected_one_microphone_track_received_${localAudioTracks.length}`);
    }
    const microphoneTrack = localAudioTracks[0];
    this.pc.addTrack(microphoneTrack, this.localStream);
    this.evidence.connection.localMicrophoneTrackCount = 1;
    this.evidence.connection.localMicrophoneTrackId = microphoneTrack.id || null;
    this.evidence.connection.localMicrophoneTrackState = microphoneTrack.readyState || "live";
    microphoneTrack.addEventListener?.("mute", () => {
      this.evidence.events.push({
        type: "microphone_track_muted",
        atMs: Date.now(),
        trackId: microphoneTrack.id || null,
      });
      this.emit({ micState: "muted" });
    });
    microphoneTrack.addEventListener?.("unmute", () => {
      this.evidence.events.push({
        type: "microphone_track_unmuted",
        atMs: Date.now(),
        trackId: microphoneTrack.id || null,
      });
      this.emit({ micState: "open" });
    });
    microphoneTrack.addEventListener?.("ended", () => {
      this.evidence.events.push({
        type: "microphone_track_ended",
        atMs: Date.now(),
        trackId: microphoneTrack.id || null,
      });
      if (!this.completed) void this.end("failed", "microphone_track_ended");
    });

    this.dc = this.pc.createDataChannel("oai-events") as typeof this.dc;
    if (this.dc) {
      this.dc.onopen = () => {
        this.evidence.connection.dataChannelOpenedAtMs = Date.now();
        this.dataChannelReady = true;
        this.log("Realtime data channel open.");
        this.maybeMarkConversationallyReady();
      };
      this.dc.onclose = () => {
        this.evidence.connection.dataChannelClosedAtMs = Date.now();
        if (!this.completed) void this.end("failed", "data_channel_closed");
      };
      this.dc.onmessage = (message) => {
        try {
          this.handleProviderEvent(JSON.parse(String(message.data)));
        } catch (error) {
          this.evidence.providerErrors.push({
            atMs: Date.now(),
            type: "client_event_handler",
            message: String((error as Error).message || error),
          });
        }
      };
    }

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.evidence.connection.offerCreatedAtMs = Date.now();
    this.log("Posting SDP offer to lab-only server…");

    const response = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: {
        "content-type": "application/sdp",
        Authorization: `Bearer ${this.runtimeToken}`,
      },
      body: offer.sdp || "",
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`session_create_failed:${response.status}:${body.slice(0, 180)}`);
    }
    this.evidence.sessionId = response.headers.get("x-iphone-lab-session-id");
    const answerSdp = await response.text();
    await this.pc.setRemoteDescription(
      new this.primitives.RTCSessionDescription({ type: "answer", sdp: answerSdp }),
    );
    this.evidence.status = "running";
    this.evidence.connection.answerAppliedAtMs = Date.now();
    this.emit({ connectionState: this.pc.connectionState || "connecting", evidence: this.evidence });
    this.log("Transport connected. Preparing Philip…");

    this.hardStopTimer = setTimeout(() => {
      void this.end("duration_stop", "two_minute_hard_stop");
    }, PHILIP_REALTIME_LAB_MAX_DURATION_MS);
    // Give the model a chance to close naturally before the hard stop. This is
    // context only: it never cancels an active response or forces a new one.
    this.closingNoticeTimer = setTimeout(() => {
      this.sendClosingNotice();
    }, closingNoticeDelayMs(PHILIP_REALTIME_LAB_MAX_DURATION_MS, PHILIP_REALTIME_LAB_CLOSING_NOTICE_MS));
    this.elapsedTimer = setInterval(() => {
      if (this.startedAtMs == null) return;
      this.emit({ elapsedMs: Date.now() - this.startedAtMs });
    }, 250);
  }

  async end(status = "completed", stopReason = "manual_end") {
    if (this.completed) return this.evidence;
    const runtimeToken = this.runtimeToken;
    this.completed = true;
    this.evidence.status = status;
    this.evidence.stopReason = stopReason;
    this.evidence.endedAt = new Date().toISOString();
    this.evidence.durationMs = Math.max(
      0,
      Date.now() - (this.startedAtMs || Date.now()),
    );
    this.recomputeCost();
    if (this.hardStopTimer) clearTimeout(this.hardStopTimer);
    if (this.closingNoticeTimer) clearTimeout(this.closingNoticeTimer);
    if (this.elapsedTimer) clearInterval(this.elapsedTimer);
    try {
      if (this.dc?.readyState === "open") {
        this.send({ type: "response.cancel" });
        this.send({ type: "output_audio_buffer.clear" });
      }
    } catch {}
    try {
      this.dc?.close?.();
    } catch {}
    try {
      this.pc?.close();
    } catch {}
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) track.stop();
    }
    this.pc = null;
    this.dc = null;
    this.localStream = null;
    this.remoteAudioTrackId = null;
    this.runtimeToken = null;
    try {
      await releaseRealtimeAudioSession();
    } catch (error) {
      this.evidence.providerErrors.push({
        atMs: Date.now(),
        type: "audio_session_teardown",
        message: String((error as Error)?.message || error),
      });
    }
    this.speaking = false;
    this.listening = false;
    this.emit({
      connectionState: "closed",
      micState: "closed",
      speaking: false,
      listening: false,
      evidence: this.evidence,
    });

    const baseUrl = philipRealtimeLabBaseUrl();
    if (baseUrl && runtimeToken && this.evidence.sessionId) {
      try {
        assertIsolatedRealtimeLabUrl(baseUrl);
        await fetch(`${baseUrl}/evidence`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${runtimeToken}`,
          },
          body: JSON.stringify(this.evidence),
        });
        this.log("Evidence saved to lab server.");
      } catch (error) {
        this.log(`Evidence save skipped: ${String((error as Error).message || error)}`);
      }
    }
    this.log(`Finished (${stopReason}). Est. $${this.evidence.estimatedCostUsd}`);
    return this.evidence;
  }

  async emergencyStop() {
    return this.end("stopped", "emergency_stop");
  }
}
