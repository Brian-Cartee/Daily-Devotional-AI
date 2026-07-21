import {
  PHILIP_REALTIME_LAB_CLOSING_NOTICE_MS,
  PHILIP_REALTIME_LAB_MAX_DURATION_MS,
  PHILIP_REALTIME_LAB_MODEL,
  PHILIP_REALTIME_LAB_SPEND_CAP_USD,
  PHILIP_REALTIME_LAB_VOICE,
  assertIsolatedRealtimeLabUrl,
  philipRealtimeLabBaseUrl,
} from "@/lib/philipRealtimeLabConfig";
import {
  captureRealtimeAudioRouteSnapshot,
  releaseRealtimeAudioSession,
} from "@/lib/philipRealtimeAudioSession";
import {
  buildClosingNoticeEvent,
  closingNoticeDelayMs,
} from "@/lib/philipRealtimeClosingNotice.mjs";
import {
  assistantAudioPlayedMs,
  buildAudioRouteDiagnosticsEvent,
  buildConversationReadyDiagnosticsEvent,
  buildInterruptionDiagnostics,
  sanitizeAudioRouteSnapshot,
  snapshotLocalMicrophoneTrack,
  snapshotReadinessFlags,
} from "@/lib/philipRealtimeDiagnostics.mjs";
import {
  OPENING_HALF_DUPLEX_FAILSAFE_MS,
  buildOpeningHalfDuplexFailedEvent,
  buildOpeningHalfDuplexRestoredEvent,
  buildOpeningHalfDuplexStartedEvent,
  buildOpeningHalfDuplexTimeoutEvent,
  buildTurnDetectionUpdate,
  canAnnounceConversationReady,
  decideHalfDuplexRestoreLatch,
  decideHalfDuplexStart,
  emptyOpeningHalfDuplexLatch,
  isLocalMicrophoneReadyForConversation,
  isLocalMicrophoneTransmissionDisabled,
  setLocalMicrophoneTransmitting,
  snapshotMicTransmissionState,
  snapshotOpeningHalfDuplexLatch,
} from "@/lib/philipRealtimeOpeningHalfDuplex.mjs";
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

type LocalMicTrack = {
  id?: string;
  enabled?: boolean;
  muted?: boolean;
  readyState?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  stop?: () => void;
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
  /** True while opening half-duplex mute is active (UI: Philip is responding…). */
  openingHalfDuplex?: boolean;
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
  private microphoneTrack: LocalMicTrack | null = null;
  private microphonePublished = false;
  private assistantAudioStartedAtMs: number | null = null;
  private firstAssistantAudioDiagnosticsRecorded = false;
  /** Opening half-duplex: mute local mic for first assistant response only. */
  private firstUserTurnCompleted = false;
  private halfDuplexActive = false;
  private halfDuplexConsumed = false;
  private halfDuplexFailed = false;
  private halfDuplexStartedAtMs: number | null = null;
  private halfDuplexResponseId: string | null = null;
  private halfDuplexFailSafeTimer: ReturnType<typeof setTimeout> | null = null;
  private firstResponseTerminal = false;
  private firstAudioStarted = false;
  private firstAudioStopped = false;
  private firstResponseStatus: string | null = null;
  private halfDuplexRestorationCompleted = false;
  private bargeInRestorationSent = false;
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

  private async recordAudioRouteDiagnostics(
    reason:
      | "readiness"
      | "first_assistant_audio"
      | "output_cleared"
      | "output_stopped"
      | "interruption",
    extra: { assistantAudioPlayedMs?: number | null } = {},
  ) {
    const atMs = Date.now();
    let route: Record<string, unknown>;
    try {
      route = sanitizeAudioRouteSnapshot(await captureRealtimeAudioRouteSnapshot(reason));
    } catch (error) {
      route = sanitizeAudioRouteSnapshot({
        available: false,
        note: `capture_failed:${String((error as Error)?.message || error).slice(0, 120)}`,
      });
    }
    this.evidence.events.push(
      buildAudioRouteDiagnosticsEvent({
        atMs,
        reason,
        audioRoute: route,
        assistantAudioPlayedMs: extra.assistantAudioPlayedMs,
      }),
    );
    return route;
  }

  private clearHalfDuplexFailSafeTimer() {
    if (this.halfDuplexFailSafeTimer) {
      clearTimeout(this.halfDuplexFailSafeTimer);
      this.halfDuplexFailSafeTimer = null;
    }
  }

  private resetOpeningHalfDuplexState() {
    this.clearHalfDuplexFailSafeTimer();
    this.firstUserTurnCompleted = false;
    this.halfDuplexActive = false;
    this.halfDuplexConsumed = false;
    this.halfDuplexFailed = false;
    this.halfDuplexStartedAtMs = null;
    this.halfDuplexResponseId = null;
    const latch = emptyOpeningHalfDuplexLatch();
    this.firstResponseTerminal = latch.firstResponseTerminal;
    this.firstAudioStarted = latch.firstAudioStarted;
    this.firstAudioStopped = latch.firstAudioStopped;
    this.firstResponseStatus = latch.firstResponseStatus as string | null;
    this.halfDuplexRestorationCompleted = latch.restorationCompleted;
    this.bargeInRestorationSent = false;
  }

  private latchSnapshot() {
    return snapshotOpeningHalfDuplexLatch({
      firstResponseTerminal: this.firstResponseTerminal,
      firstAudioStarted: this.firstAudioStarted,
      firstAudioStopped: this.firstAudioStopped,
      firstResponseStatus: this.firstResponseStatus,
      restorationCompleted: this.halfDuplexRestorationCompleted,
      halfDuplexActive: this.halfDuplexActive,
      halfDuplexResponseId: this.halfDuplexResponseId,
    });
  }

  private tryRestoreOpeningHalfDuplexFromLatch(
    reason: string,
    extras: { clearedWhileDisabled?: boolean; forceCleanup?: boolean } = {},
  ) {
    const decision = decideHalfDuplexRestoreLatch({
      halfDuplexActive: this.halfDuplexActive,
      restorationCompleted: this.halfDuplexRestorationCompleted,
      firstResponseTerminal: this.firstResponseTerminal,
      firstAudioStarted: this.firstAudioStarted,
      firstAudioStopped: this.firstAudioStopped,
      completed: this.completed,
      clearedWhileDisabled: !!extras.clearedWhileDisabled,
      forceCleanup: !!extras.forceCleanup,
    });
    if (
      decision === "restore_no_audio" ||
      decision === "restore_after_playback" ||
      decision === "restore_abnormal_clear" ||
      decision === "restore_cleanup"
    ) {
      this.restoreOpeningHalfDuplex(
        reason,
        this.halfDuplexResponseId,
        this.firstResponseStatus,
      );
    }
    return decision;
  }

  private sendTurnDetectionUpdate(interruptResponse: boolean, createResponse = true) {
    if (!this.dc || this.dc.readyState !== "open") return false;
    try {
      this.send(
        buildTurnDetectionUpdate({
          interruptResponse,
          createResponse,
        }),
      );
      return true;
    } catch (error) {
      this.evidence.providerErrors.push({
        atMs: Date.now(),
        type: "opening_half_duplex_session_update",
        message: String((error as Error)?.message || error).slice(0, 200),
      });
      return false;
    }
  }

  private publicationState(): "published" | "not_published" {
    return this.microphonePublished ? "published" : "not_published";
  }

  /**
   * First assistant response.created after the first completed user turn:
   * disable local mic transmission before any assistant audio can start.
   */
  private beginOpeningHalfDuplex(atMs: number, responseId: string | null) {
    const decision = decideHalfDuplexStart({
      conversationallyReady: this.conversationallyReady,
      firstUserTurnCompleted: this.firstUserTurnCompleted,
      halfDuplexConsumed: this.halfDuplexConsumed,
      halfDuplexActive: this.halfDuplexActive,
      assistantAudioAlreadyStarted: this.speaking || this.assistantAudioStartedAtMs != null,
      openingFailed: this.halfDuplexFailed,
      completed: this.completed,
    });
    if (decision === "noop") return;
    if (decision === "fail_too_late") {
      this.failOpeningHalfDuplex("opening_half_duplex_too_late_audio_already_started", responseId);
      return;
    }

    const result = setLocalMicrophoneTransmitting(
      this.microphoneTrack,
      false,
      this.publicationState(),
    );
    if (!result.ok || !isLocalMicrophoneTransmissionDisabled(result.after)) {
      this.failOpeningHalfDuplex(
        result.reason || "opening_half_duplex_mute_failed",
        responseId,
        result.after,
      );
      return;
    }

    this.halfDuplexActive = true;
    this.halfDuplexConsumed = true;
    this.halfDuplexStartedAtMs = atMs;
    this.halfDuplexResponseId = responseId;
    this.firstResponseTerminal = false;
    this.firstAudioStarted = false;
    this.firstAudioStopped = false;
    this.firstResponseStatus = null;
    this.halfDuplexRestorationCompleted = false;
    this.evidence.events.push(
      buildOpeningHalfDuplexStartedEvent({
        atMs,
        reason: "first_response_created",
        responseId,
        trackBefore: result.before,
        trackAfter: result.after,
        failsafeMs: OPENING_HALF_DUPLEX_FAILSAFE_MS,
      }),
    );
    this.emit({
      openingHalfDuplex: true,
      micState: "opening_response",
      listening: false,
      speaking: false,
    });
    this.log("Philip is responding…");

    // Fail-safe starts at response.created so every path is bounded.
    this.clearHalfDuplexFailSafeTimer();
    this.halfDuplexFailSafeTimer = setTimeout(() => {
      if (this.halfDuplexRestorationCompleted || this.completed) return;
      if (!this.halfDuplexActive) return;
      const responseId = this.halfDuplexResponseId;
      const startedAt = this.halfDuplexStartedAtMs;
      const atMs = Date.now();
      const latchAtTimeout = this.latchSnapshot();
      this.clearHalfDuplexFailSafeTimer();

      // Restore microphone first; never leave it disabled. Do not create another
      // response or session — only re-enable the local track, then end cleanly.
      const restore = setLocalMicrophoneTransmitting(
        this.microphoneTrack,
        true,
        this.publicationState(),
      );
      const mic = snapshotLocalMicrophoneTrack(
        this.microphoneTrack,
        this.publicationState(),
      );
      const micVerifiedReady = isLocalMicrophoneReadyForConversation(mic);
      this.halfDuplexActive = false;
      this.halfDuplexRestorationCompleted = true;
      this.halfDuplexStartedAtMs = null;
      this.emit({ openingHalfDuplex: false, micState: micVerifiedReady ? "open" : "error" });

      this.evidence.events.push(
        buildOpeningHalfDuplexTimeoutEvent({
          atMs,
          reason: "failsafe_timeout",
          responseId,
          trackAfterRestore: restore.after,
          micVerifiedReady,
          elapsedMsFromHalfDuplexStart:
            startedAt == null ? null : Math.max(0, atMs - startedAt),
          failsafeMs: OPENING_HALF_DUPLEX_FAILSAFE_MS,
          latch: latchAtTimeout,
        }),
      );
      this.log(
        micVerifiedReady
          ? "Opening half-duplex timed out — microphone restored."
          : "Opening half-duplex timed out — microphone restore incomplete.",
      );
      if (!this.completed) {
        void this.end(
          micVerifiedReady ? "stopped" : "failed",
          "opening_half_duplex_timeout",
        );
      }
    }, OPENING_HALF_DUPLEX_FAILSAFE_MS);
  }

  private restoreOpeningHalfDuplex(
    reason: string,
    responseId: string | null,
    responseStatus: string | null,
  ) {
    if (this.halfDuplexRestorationCompleted) return;
    if (!this.halfDuplexActive && reason !== "session_cleanup") return;
    this.clearHalfDuplexFailSafeTimer();
    const startedAt = this.halfDuplexStartedAtMs;
    const atMs = Date.now();
    const latchBefore = this.latchSnapshot();

    const result = setLocalMicrophoneTransmitting(
      this.microphoneTrack,
      true,
      this.publicationState(),
    );
    const mic = snapshotLocalMicrophoneTrack(
      this.microphoneTrack,
      this.publicationState(),
    );
    const micReady = isLocalMicrophoneReadyForConversation(mic);
    if (!result.ok || !micReady) {
      this.halfDuplexActive = false;
      this.halfDuplexRestorationCompleted = true;
      this.evidence.events.push(
        buildOpeningHalfDuplexFailedEvent({
          atMs,
          reason: `opening_half_duplex_restore_failed:${result.reason || "mic_not_ready"}`,
          responseId,
          trackState: result.after,
          latch: latchBefore,
        }),
      );
      this.emit({
        openingHalfDuplex: false,
        micState: "error",
        error: "realtime_opening_half_duplex_restore_failed",
      });
      if (!this.completed) void this.end("failed", "opening_half_duplex_restore_failed");
      return;
    }

    let interruptResponseRestored = false;
    if (!this.bargeInRestorationSent && this.dc?.readyState === "open") {
      this.bargeInRestorationSent = true;
      interruptResponseRestored = this.sendTurnDetectionUpdate(true, true);
    }

    this.halfDuplexActive = false;
    this.halfDuplexRestorationCompleted = true;
    this.halfDuplexStartedAtMs = null;
    this.evidence.events.push(
      buildOpeningHalfDuplexRestoredEvent({
        atMs,
        reason,
        responseId,
        responseStatus,
        trackAfter: result.after,
        elapsedMsFromHalfDuplexStart:
          startedAt == null ? null : Math.max(0, atMs - startedAt),
        interruptResponseRestored,
        latch: latchBefore,
      }),
    );
    this.listening = false;
    this.emit({
      openingHalfDuplex: false,
      micState: "open",
      listening: true,
      speaking: false,
    });
    this.log("Listening…");
  }

  private failOpeningHalfDuplex(
    reason: string,
    responseId: string | null = null,
    trackState: Record<string, unknown> | null = null,
  ) {
    if (this.halfDuplexFailed || this.completed) return;
    this.halfDuplexFailed = true;
    this.clearHalfDuplexFailSafeTimer();
    // Always try to re-enable the mic before failing the session.
    setLocalMicrophoneTransmitting(this.microphoneTrack, true, this.publicationState());
    this.halfDuplexActive = false;
    this.halfDuplexRestorationCompleted = true;
    this.evidence.events.push(
      buildOpeningHalfDuplexFailedEvent({
        atMs: Date.now(),
        reason,
        responseId,
        trackState:
          trackState ||
          snapshotMicTransmissionState(this.microphoneTrack, this.publicationState()),
        latch: this.latchSnapshot(),
      }),
    );
    this.emit({
      connectionState: "failed",
      openingHalfDuplex: false,
      micState: "error",
      error: `realtime_opening_half_duplex_failed:${reason}`,
    });
    this.log(`Opening half-duplex failed (${reason}).`);
    void this.end("failed", reason);
  }

  /**
   * Conversational readiness requires transport, provider session, remote audio,
   * and a live published unmuted microphone. Opening half-duplex begins later,
   * on the first response.created after the first user turn.
   */
  private maybeMarkConversationallyReady() {
    if (this.conversationallyReady || this.completed || this.halfDuplexFailed) return;
    const mic = snapshotLocalMicrophoneTrack(
      this.microphoneTrack,
      this.microphonePublished ? "published" : "not_published",
    );
    const micReady = isLocalMicrophoneReadyForConversation(mic);
    if (
      !canAnnounceConversationReady({
        dataChannelReady: this.dataChannelReady,
        providerSessionCreated: this.providerSessionCreated,
        remoteAudioReady: this.remoteAudioReady,
        micReady,
        openingFailed: this.halfDuplexFailed,
      })
    ) {
      if (
        this.dataChannelReady &&
        this.providerSessionCreated &&
        this.remoteAudioReady &&
        !micReady
      ) {
        this.evidence.events.push({
          type: "conversation_ready_blocked_mic",
          atMs: Date.now(),
          itemId: null,
          microphone: mic,
          audioRecorded: false,
          audioPersisted: false,
        });
      }
      return;
    }
    this.conversationallyReady = true;
    const atMs = Date.now();
    this.evidence.events.push({ type: "conversation_ready", atMs, itemId: null });
    this.emit({ connectionState: "ready", listening: true, micState: "open" });
    this.log("Philip is ready — speak whenever you like.");
    void this.recordConversationReadyDiagnostics(atMs);
  }

  private async recordConversationReadyDiagnostics(atMs: number) {
    const mic = snapshotLocalMicrophoneTrack(
      this.microphoneTrack,
      this.microphonePublished ? "published" : "not_published",
    );
    const readinessFlags = snapshotReadinessFlags({
      dataChannelReady: this.dataChannelReady,
      providerSessionCreated: this.providerSessionCreated,
      remoteAudioReady: this.remoteAudioReady,
      conversationallyReady: this.conversationallyReady,
    });
    let audioRoute: Record<string, unknown>;
    try {
      audioRoute = sanitizeAudioRouteSnapshot(await captureRealtimeAudioRouteSnapshot("readiness"));
    } catch (error) {
      audioRoute = sanitizeAudioRouteSnapshot({
        available: false,
        note: `capture_failed:${String((error as Error)?.message || error).slice(0, 120)}`,
      });
    }
    this.evidence.events.push(
      buildConversationReadyDiagnosticsEvent({
        atMs,
        mic,
        readinessFlags,
        audioRoute,
      }),
    );
    // Also emit the shared route event so readiness/first-audio/clear share one schema.
    this.evidence.events.push(
      buildAudioRouteDiagnosticsEvent({
        atMs,
        reason: "readiness",
        audioRoute,
      }),
    );
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
    if (type === "session.updated") {
      // No opening-protection ack gate; half-duplex starts later on response.created.
      return;
    }
    if (type === "input_audio_buffer.speech_started") {
      // Local mic is disabled during opening half-duplex; any speech_started here
      // cannot come from our transmitted track and must not cancel Philip or flip UI.
      if (this.halfDuplexActive) {
        const turn = {
          turnNumber: this.evidence.turns.length + 1,
          speechStartedAtMs: atMs,
          itemId: event.item_id || null,
        };
        this.evidence.turns.push(turn);
        const mic = snapshotMicTransmissionState(
          this.microphoneTrack,
          this.publicationState(),
        );
        this.evidence.events.push({
          type: "speech_started_during_opening_half_duplex",
          atMs,
          itemId: event.item_id || null,
          micTransmission: mic,
          note: "ignored_for_bargein_local_mic_disabled",
          audioRecorded: false,
          audioPersisted: false,
        });
        this.log(`VAD speech_started during opening half-duplex · turn ${turn.turnNumber} (ignored).`);
        return;
      }

      this.listening = true;
      this.emit({ listening: true });
      const turn = {
        turnNumber: this.evidence.turns.length + 1,
        speechStartedAtMs: atMs,
        itemId: event.item_id || null,
      };
      this.evidence.turns.push(turn);

      const duringAssistantAudio = this.speaking;
      void (async () => {
        let audioRoute: Record<string, unknown> | null = null;
        try {
          audioRoute = sanitizeAudioRouteSnapshot(
            await captureRealtimeAudioRouteSnapshot("interruption"),
          );
        } catch {
          audioRoute = sanitizeAudioRouteSnapshot({
            available: false,
            note: "speech_started_route_failed",
          });
        }
        const tagged = buildInterruptionDiagnostics({
          detectedAtMs: atMs,
          duringAssistantAudio,
          assistantAudioStartedAtMs: this.assistantAudioStartedAtMs,
          audioRoute,
        });
        this.evidence.events.push({
          type: "speech_started_diagnostics",
          atMs,
          itemId: event.item_id || null,
          duringAssistantAudio: tagged.duringAssistantAudio,
          openingBargeInDeferred: false,
          assistantAudioPlayedBeforeInterruptMs: tagged.assistantAudioPlayedBeforeInterruptMs,
          audioRoute: tagged.audioRoute,
          audioRecorded: false,
          audioPersisted: false,
        });
        if (duringAssistantAudio) {
          this.evidence.interruptions.push(tagged);
          this.evidence.events.push(
            buildAudioRouteDiagnosticsEvent({
              atMs,
              reason: "interruption",
              audioRoute,
              assistantAudioPlayedMs: tagged.assistantAudioPlayedBeforeInterruptMs,
            }),
          );
          this.log("Barge-in: speech while Philip audible.");
        }
      })();
      this.log(`VAD speech_started · turn ${turn.turnNumber}`);
      return;
    }
    if (type === "input_audio_buffer.speech_stopped") {
      this.listening = false;
      this.lastSpeechStoppedAtMs = atMs;
      this.emit({ listening: false });
      const turn = this.evidence.turns[this.evidence.turns.length - 1];
      if (turn) turn.speechStoppedAtMs = atMs;
      // First completed user turn unlocks half-duplex on the next response.created.
      if (this.conversationallyReady && !this.firstUserTurnCompleted && !this.halfDuplexConsumed) {
        this.firstUserTurnCompleted = true;
        this.evidence.events.push({
          type: "opening_first_user_turn_completed",
          atMs,
          itemId: turn?.itemId || null,
          audioRecorded: false,
          audioPersisted: false,
        });
      }
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
      // If mute did not run before first audio, fail safely — do not pretend protection.
      if (
        this.firstUserTurnCompleted &&
        !this.halfDuplexConsumed &&
        !this.halfDuplexFailed &&
        !this.completed
      ) {
        this.failOpeningHalfDuplex(
          "opening_half_duplex_missed_before_audio",
          typeof this.currentResponse?.responseId === "string"
            ? this.currentResponse.responseId
            : null,
        );
        return;
      }
      this.speaking = true;
      this.assistantAudioStartedAtMs = atMs;
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
      // Protected first output: keep mic disabled; do not restore on later response.done alone.
      // Correlation: while halfDuplexActive the local mic is muted, so this buffer belongs
      // to the protected first response (provider buffer events lack reliable response ids).
      if (this.halfDuplexActive && !this.firstAudioStarted && !this.halfDuplexRestorationCompleted) {
        this.firstAudioStarted = true;
      }
      if (!this.firstAssistantAudioDiagnosticsRecorded) {
        this.firstAssistantAudioDiagnosticsRecorded = true;
        const mic = snapshotMicTransmissionState(
          this.microphoneTrack,
          this.publicationState(),
        );
        this.evidence.events.push({
          type: "first_assistant_audio_with_mic_state",
          atMs,
          itemId: null,
          halfDuplexActive: this.halfDuplexActive,
          micTransmission: mic,
          audioRecorded: false,
          audioPersisted: false,
        });
        void this.recordAudioRouteDiagnostics("first_assistant_audio");
      }
      return;
    }
    if (type === "output_audio_buffer.stopped" || type === "output_audio_buffer.cleared") {
      const playedMs = assistantAudioPlayedMs(this.assistantAudioStartedAtMs, atMs);
      this.speaking = false;
      this.emit({ speaking: false });
      const interruption = this.evidence.interruptions[this.evidence.interruptions.length - 1];
      if (interruption && interruption.assistantStoppedAtMs == null && interruption.duringAssistantAudio) {
        interruption.assistantStoppedAtMs = atMs;
        interruption.interruptionToAudioStoppedMs = Math.max(
          0,
          atMs - Number(interruption.detectedAtMs || atMs),
        );
        if (interruption.assistantAudioPlayedBeforeInterruptMs == null && playedMs != null) {
          interruption.assistantAudioPlayedBeforeInterruptMs = playedMs;
        }
        this.log(`Barge-in audio stop: ${interruption.interruptionToAudioStoppedMs}ms`);
      }
      const reason = type === "output_audio_buffer.cleared" ? "output_cleared" : "output_stopped";
      void this.recordAudioRouteDiagnostics(reason, { assistantAudioPlayedMs: playedMs });
      this.assistantAudioStartedAtMs = null;

      if (type === "output_audio_buffer.cleared" && this.halfDuplexActive) {
        const mic = snapshotMicTransmissionState(
          this.microphoneTrack,
          this.publicationState(),
        );
        const micConfirmedDisabled = isLocalMicrophoneTransmissionDisabled(mic);
        this.evidence.events.push({
          type: "opening_cleared_while_mic_disabled",
          atMs,
          itemId: null,
          responseId: this.halfDuplexResponseId,
          micTransmission: mic,
          micConfirmedDisabled,
          note: "abnormal_opening_failure_no_retry_no_auto_allowance",
          latch: this.latchSnapshot(),
          audioRecorded: false,
          audioPersisted: false,
        });
        if (micConfirmedDisabled) {
          // Cleared is not successful playback completion. Restore mic and end cleanly.
          this.tryRestoreOpeningHalfDuplexFromLatch("opening_cleared_while_mic_disabled", {
            clearedWhileDisabled: true,
          });
          if (!this.completed) {
            void this.end("failed", "opening_cleared_while_mic_disabled");
          }
        }
        return;
      }

      if (
        type === "output_audio_buffer.stopped" &&
        this.halfDuplexActive &&
        this.firstAudioStarted &&
        !this.firstAudioStopped &&
        !this.halfDuplexRestorationCompleted
      ) {
        this.firstAudioStopped = true;
        this.tryRestoreOpeningHalfDuplexFromLatch("first_response_playback_stopped");
      }
      return;
    }
    if (type === "response.created") {
      const responseId =
        (event.response as { id?: string } | undefined)?.id ||
        (typeof event.response_id === "string" ? event.response_id : null);
      this.currentResponse = {
        responseId,
        createdAtMs: atMs,
        transcriptDeltas: "",
      };
      this.beginOpeningHalfDuplex(atMs, responseId);
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
      const responseId =
        typeof response.id === "string"
          ? response.id
          : typeof this.currentResponse?.responseId === "string"
            ? this.currentResponse.responseId
            : null;
      const status = typeof response.status === "string" ? response.status : null;
      const done = {
        ...(this.currentResponse || {}),
        responseId,
        doneAtMs: atMs,
        status,
        transcript,
        usage: response.usage || null,
      };
      this.evidence.responses.push(done);
      if (transcript) this.log(`Philip: ${transcript}`);
      this.currentResponse = null;

      // Matching protected first response: latch terminal; do NOT restore on done alone
      // once audio has started (Build 256 defect).
      const matchesProtected =
        this.halfDuplexActive &&
        !this.halfDuplexRestorationCompleted &&
        (!this.halfDuplexResponseId ||
          !responseId ||
          String(responseId) === String(this.halfDuplexResponseId));
      if (matchesProtected && !this.firstResponseTerminal) {
        this.firstResponseTerminal = true;
        this.firstResponseStatus = status;
        const restoreReason =
          status === "cancelled" || status === "incomplete"
            ? `first_response_terminal:${status}`
            : !this.firstAudioStarted
              ? "first_response_terminal_no_audio"
              : this.firstAudioStopped
                ? "first_response_playback_complete"
                : "first_response_terminal_hold_for_playback";
        const decision = this.tryRestoreOpeningHalfDuplexFromLatch(restoreReason);
        if (decision === "hold_until_audio_stopped") {
          this.evidence.events.push({
            type: "opening_half_duplex_hold_for_playback",
            atMs,
            itemId: null,
            responseId,
            responseStatus: status,
            latch: this.latchSnapshot(),
            note: "response_done_is_not_playback_complete",
            audioRecorded: false,
            audioPersisted: false,
          });
          // Keep UI on "Philip is responding…" — do not emit Listening yet.
        }
      }
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
      if (this.halfDuplexActive && !this.halfDuplexRestorationCompleted) {
        this.tryRestoreOpeningHalfDuplexFromLatch(
          `provider_error:${String(err.code || err.type || "unknown")}`,
          { forceCleanup: true },
        );
      }
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
    this.dataChannelReady = false;
    this.providerSessionCreated = false;
    this.remoteAudioReady = false;
    this.conversationallyReady = false;
    this.microphoneTrack = null;
    this.microphonePublished = false;
    this.assistantAudioStartedAtMs = null;
    this.firstAssistantAudioDiagnosticsRecorded = false;
    this.resetOpeningHalfDuplexState();
    this.remoteAudioTrackId = null;
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
    this.microphoneTrack = microphoneTrack;
    this.pc.addTrack(microphoneTrack, this.localStream);
    this.microphonePublished = true;
    this.evidence.connection.localMicrophoneTrackCount = 1;
    this.evidence.connection.localMicrophoneTrackId = microphoneTrack.id || null;
    this.evidence.connection.localMicrophoneTrackState = microphoneTrack.readyState || "live";
    this.evidence.connection.localMicrophoneTrackEnabled =
      typeof microphoneTrack.enabled === "boolean" ? microphoneTrack.enabled : null;
    this.evidence.connection.localMicrophoneTrackMuted =
      typeof microphoneTrack.muted === "boolean" ? microphoneTrack.muted : null;
    this.evidence.connection.localMicrophonePublished = true;
    microphoneTrack.addEventListener?.("unmute", () => {
      this.evidence.events.push({
        type: "microphone_track_unmuted",
        atMs: Date.now(),
        trackId: microphoneTrack.id || null,
      });
      this.emit({ micState: "open" });
      this.maybeMarkConversationallyReady();
    });
    microphoneTrack.addEventListener?.("mute", () => {
      this.evidence.events.push({
        type: "microphone_track_muted",
        atMs: Date.now(),
        trackId: microphoneTrack.id || null,
      });
      this.emit({ micState: "muted" });
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
    // Always restore mic transmission before tearing down tracks.
    if (this.halfDuplexActive || this.microphoneTrack) {
      setLocalMicrophoneTransmitting(
        this.microphoneTrack,
        true,
        this.publicationState(),
      );
    }
    this.clearHalfDuplexFailSafeTimer();
    this.halfDuplexActive = false;
    this.resetOpeningHalfDuplexState();
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
    this.microphoneTrack = null;
    this.microphonePublished = false;
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
      openingHalfDuplex: false,
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
