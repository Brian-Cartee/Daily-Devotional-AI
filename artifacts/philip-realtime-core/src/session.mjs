import { CLIENT_EVENTS, SERVER_EVENTS, LOCAL_EVENTS, makeEvent } from "./events.mjs";
import { DuplexAudioInterface, mockPcmChunk } from "./audio/duplexInterface.mjs";
import {
  COMPACT_PHILIP_REALTIME_INSTRUCTIONS,
  instructionObservability,
  REALTIME_CORE_INSTRUCTION_VERSION,
} from "./instructions/compactPhilip.mjs";
import { detectHardContracts } from "./tools/hardContracts.mjs";
import {
  handleFactualCurrentness,
  looksLikeCurrentFactQuestion,
} from "./tools/factualCurrentness.mjs";
import { SessionObservability } from "./observability/sessionLog.mjs";
import { BudgetGuard, estimateSessionCostUsd } from "./observability/costModel.mjs";
import { MockRealtimeProvider, defaultRealtimeSessionConfig } from "./transport/mockProvider.mjs";

/**
 * Conversation state for a native realtime Philip session.
 * No Front Door / G-lite / contribution-gate ordinary path.
 */
export class ConversationState {
  constructor() {
    this.items = [];
    this.status = "idle";
    this.lastUserText = null;
    this.lastAssistantText = null;
    this.awaitingContinuation = false;
  }

  addUser(text, meta = {}) {
    const item = { role: "user", text, ts: Date.now(), ...meta };
    this.items.push(item);
    this.lastUserText = text;
    this.status = "user_turn";
    return item;
  }

  addAssistant(text, meta = {}) {
    const item = { role: "assistant", text, ts: Date.now(), ...meta };
    this.items.push(item);
    this.lastAssistantText = text;
    this.status = "assistant_turn";
    this.awaitingContinuation = false;
    return item;
  }

  markAwaitingContinuation() {
    this.awaitingContinuation = true;
    this.status = "awaiting_continuation";
  }

  snapshot() {
    return {
      status: this.status,
      itemCount: this.items.length,
      lastUserText: this.lastUserText,
      lastAssistantText: this.lastAssistantText,
      awaitingContinuation: this.awaitingContinuation,
      items: [...this.items],
    };
  }
}

/**
 * Phase 1 realtime core session harness.
 */
export class PhilipRealtimeSession {
  constructor({
    sessionId = `philip-rt-${Date.now()}`,
    provider,
    hardCapUsd = 0.75,
    speechEndToFirstAudioMs = 420,
    interruptionStopMs = 80,
  } = {}) {
    this.sessionId = sessionId;
    this.provider =
      provider ||
      new MockRealtimeProvider({
        sessionId,
        speechEndToFirstAudioMs,
        interruptionStopMs,
      });
    this.state = new ConversationState();
    this.obs = new SessionObservability({ sessionId });
    this.budget = new BudgetGuard({ hardCapUsd });
    this.audio = new DuplexAudioInterface({
      onPlaybackState: (s) => {
        this.obs.record(makeEvent(LOCAL_EVENTS.FIRST_AUDIBLE, s));
      },
    });
    this.connected = false;
    this.pendingSpeechEndAt = null;
    this.activeAssistantItemId = null;
    this.closed = false;
    this.instructionMeta = instructionObservability();

    this.provider.on("event", (evt) => this.#onProviderEvent(evt));
  }

  connect() {
    if (this.closed) throw new Error("session_closed");
    const config = defaultRealtimeSessionConfig({
      instructions: COMPACT_PHILIP_REALTIME_INSTRUCTIONS,
    });
    this.provider.connect(config);
    this.provider.send({
      type: CLIENT_EVENTS.SESSION_UPDATE,
      session: config,
    });
    this.connected = true;
    this.obs.record(
      makeEvent("local.session_connected", {
        sessionId: this.sessionId,
        instructionVersion: REALTIME_CORE_INSTRUCTION_VERSION,
        turnDetection: config.audio.input.turn_detection,
      }),
    );
    return {
      sessionId: this.sessionId,
      instructionVersion: REALTIME_CORE_INSTRUCTION_VERSION,
      turnDetection: config.audio.input.turn_detection,
    };
  }

  /**
   * Commit a user utterance (mock path: transcript known; audio chunk also streamed).
   */
  commitUserSpeech(transcript, { audioLabel = "user" } = {}) {
    this.#assertOpen();
    this.#assertBudget();

    const text = String(transcript || "");
    this.audio.pushOutboundPcm(mockPcmChunk(audioLabel), this.provider.now?.() ?? Date.now());
    this.pendingSpeechEndAt = this.provider.now?.() ?? Date.now();

    const hard = detectHardContracts(text);
    if (hard.kind) {
      this.state.addUser(text, { hardContract: hard.kind });
      this.obs.addTranscript({ role: "user", text, meta: { hardContract: hard.kind } });
      this.#speakLocalRecoveryOrContract(hard.spokenResponse, {
        reason: hard.kind,
        hardContract: true,
      });
      return { handled: "hard_contract", kind: hard.kind };
    }

    if (looksLikeCurrentFactQuestion(text)) {
      this.state.addUser(text, { tool: "factual_currentness" });
      this.obs.addTranscript({ role: "user", text });
      this.obs.counters.toolCalls += 1;
      const tool = handleFactualCurrentness({ query: text, domain: "sports" });
      this.#speakLocalRecoveryOrContract(tool.spokenBoundary, {
        reason: "factual_currentness",
        toolResult: tool,
      });
      return { handled: "tool", tool: "factual_currentness", tool };
    }

    this.state.addUser(text);
    this.obs.addTranscript({ role: "user", text });
    if (/(by the way\.\.\.|oh,? by the way\.\.\.)$/i.test(text.trim()) || /…$/.test(text.trim())) {
      this.state.markAwaitingContinuation();
    }

    this.provider.send({
      type: CLIENT_EVENTS.INPUT_AUDIO_APPEND,
      audio: mockPcmChunk(audioLabel),
    });
    this.provider.send({
      type: CLIENT_EVENTS.INPUT_AUDIO_COMMIT,
      transcript: text,
    });

    return { handled: "provider" };
  }

  /**
   * Simulate barge-in while assistant audio is playing.
   */
  bargeIn({ userPartial = "wait" } = {}) {
    this.#assertOpen();
    const start = this.provider.now?.() ?? Date.now();
    this.provider.send({ type: "local.simulate_speech_started" });
    this.provider.send({ type: CLIENT_EVENTS.RESPONSE_CANCEL });
    this.provider.send({
      type: CLIENT_EVENTS.CONVERSATION_ITEM_TRUNCATE,
      item_id: this.activeAssistantItemId || "item_assistant_active",
      content_index: 0,
      audio_end_ms: 0,
    });
    const stop = this.audio.cancelPlayback(this.provider.now?.() ?? Date.now());
    const elapsed = (this.provider.now?.() ?? Date.now()) - start;
    this.obs.markInterruptionStop(elapsed);
    this.obs.counters.bargeIns += 1;
    this.obs.record(
      makeEvent(LOCAL_EVENTS.BARGE_IN, {
        userPartial,
        elapsedMs: elapsed,
        wasPlaying: stop.wasPlaying,
      }),
    );
    this.obs.record(makeEvent(LOCAL_EVENTS.PLAYBACK_STOPPED, { elapsedMs: elapsed }));
    this.audio.resumeAcceptingInbound();
    return { elapsedMs: elapsed, wasPlaying: stop.wasPlaying };
  }

  /**
   * Inject a provider failure mid-turn; harness must speak recovery (no silent turn).
   */
  injectProviderError(message = "generation failed during disclosure") {
    this.#assertOpen();
    this.provider.send({
      type: "local.inject_provider_error",
      message,
      code: "mock_generation_failed",
    });
  }

  requestResponse(forcedText) {
    this.#assertOpen();
    this.#assertBudget();
    this.provider.send({
      type: CLIENT_EVENTS.RESPONSE_CREATE,
      forcedText,
    });
  }

  close() {
    this.provider.disconnect();
    this.connected = false;
    this.closed = true;
    this.obs.record(makeEvent("local.session_closed", { sessionId: this.sessionId }));
  }

  costEstimate() {
    return estimateSessionCostUsd(this.obs.usage);
  }

  report() {
    const cost = this.costEstimate();
    return {
      sessionId: this.sessionId,
      instruction: this.instructionMeta,
      conversation: this.state.snapshot(),
      audio: this.audio.snapshot(),
      observability: this.obs.snapshot(),
      cost,
      budget: {
        hardCapUsd: this.budget.hardCapUsd,
        stopped: this.budget.stopped,
        stopReason: this.budget.stopReason,
        evaluation: this.budget.evaluate(cost.usd),
      },
    };
  }

  #assertOpen() {
    if (!this.connected || this.closed) throw new Error("session_not_open");
  }

  #assertBudget() {
    const cost = this.costEstimate();
    const evalResult = this.budget.evaluate(cost.usd);
    if (!evalResult.allowed) {
      this.obs.record(makeEvent(LOCAL_EVENTS.BUDGET_STOP, evalResult));
      throw new Error(`budget_stop:${evalResult.reason}`);
    }
  }

  #speakLocalRecoveryOrContract(text, meta = {}) {
    const speechEndAt = this.provider.now?.() ?? Date.now();
    this.pendingSpeechEndAt = speechEndAt;
    // Local/harness speech path for hard contracts, tools, and recovery — still audible.
    this.audio.resumeAcceptingInbound();
    const firstAt = speechEndAt + 50;
    if (typeof this.provider.advance === "function") this.provider.advance(50);
    this.audio.pushInboundPcm(mockPcmChunk("local-contract"), firstAt);
    this.obs.markSpeechEndToFirstAudio(50);
    this.audio.markPlaybackComplete(firstAt + 100);
    this.state.addAssistant(text, meta);
    this.obs.addTranscript({ role: "assistant", text, meta });
    this.obs.addUsage({
      textInputTokens: 20,
      textOutputTokens: Math.ceil(text.length / 4),
      audioInputTokens: 40,
      audioOutputTokens: 60,
    });
    if (meta.reason === "provider_error" || meta.recovery) {
      this.obs.counters.recoverySpoken += 1;
      this.obs.record(makeEvent(LOCAL_EVENTS.RECOVERY_SPOKEN, { text, ...meta }));
      this.obs.record(makeEvent(LOCAL_EVENTS.SILENT_TURN_PREVENTED, { text }));
    }
    if (meta.toolResult && meta.toolResult.supported === false) {
      // Boundary speech is correct; fabricating would increment unsupportedCurrentFactClaims.
    }
    this.#checkForcedFaith(text, meta);
  }

  #checkForcedFaith(text, meta = {}) {
    if (meta.hardContract) return;
    const faithPivot =
      /\b(let us pray|shall we pray|turn to (jesus|god|scripture)|as your (pastor|minister))\b/i.test(
        text,
      );
    if (faithPivot) {
      this.obs.counters.forcedFaithPivots += 1;
    }
  }

  #onProviderEvent(evt) {
    this.obs.record(evt);

    if (evt.type === SERVER_EVENTS.ERROR) {
      this.obs.counters.providerErrors += 1;
      // Hard rule: no silent failed turns.
      this.#speakLocalRecoveryOrContract(
        "I lost the last moment there. I'm still with you — would you say that part again?",
        { reason: "provider_error", recovery: true, error: evt.error },
      );
      return;
    }

    if (evt.type === SERVER_EVENTS.RESPONSE_AUDIO_DELTA) {
      this.activeAssistantItemId = evt.response_id;
      this.audio.pushInboundPcm(evt.delta, evt.ts);
      if (evt.first_audible && evt.speech_end_at != null && evt.first_audible_at != null) {
        this.obs.markSpeechEndToFirstAudio(evt.first_audible_at - evt.speech_end_at);
      } else if (this.pendingSpeechEndAt != null) {
        this.obs.markSpeechEndToFirstAudio(evt.ts - this.pendingSpeechEndAt);
        this.pendingSpeechEndAt = null;
      }
      return;
    }

    if (evt.type === SERVER_EVENTS.RESPONSE_AUDIO_DONE) {
      this.audio.markPlaybackComplete(evt.ts);
      return;
    }

    if (evt.type === SERVER_EVENTS.RESPONSE_DONE) {
      const text = evt.transcript || "";
      if (text === "TOOL:factual_currentness") {
        this.obs.counters.toolCalls += 1;
        const tool = handleFactualCurrentness({
          query: this.state.lastUserText || "",
          domain: "sports",
        });
        this.#speakLocalRecoveryOrContract(tool.spokenBoundary, {
          reason: "factual_currentness",
          toolResult: tool,
        });
        return;
      }
      if (!text.trim()) {
        // Should never happen: treat empty completion as failure and recover.
        this.obs.counters.silentFailedTurns += 1;
        this.#speakLocalRecoveryOrContract(
          "I blanked for a second. I'm here — please say that again.",
          { reason: "empty_response", recovery: true },
        );
        return;
      }
      this.state.addAssistant(text, { responseId: evt.response_id });
      this.obs.addTranscript({ role: "assistant", text, meta: { responseId: evt.response_id } });
      this.#checkForcedFaith(text);
      const usage = evt.response?.usage;
      if (usage) {
        this.obs.addUsage({
          textInputTokens: usage.input_token_details?.text_tokens || 0,
          audioInputTokens: usage.input_token_details?.audio_tokens || 0,
          textOutputTokens: usage.output_token_details?.text_tokens || 0,
          audioOutputTokens: usage.output_token_details?.audio_tokens || 0,
        });
      }
      const cost = this.costEstimate();
      const budgetEval = this.budget.evaluate(cost.usd);
      if (budgetEval.stopped) {
        this.obs.record(makeEvent(LOCAL_EVENTS.BUDGET_STOP, budgetEval));
      }
      return;
    }

    if (evt.type === SERVER_EVENTS.RESPONSE_CANCELLED) {
      this.audio.cancelPlayback(evt.ts);
      return;
    }

    if (evt.type === SERVER_EVENTS.TRANSCRIPT_DONE) {
      // Already captured on commit in Phase 1 mock path.
      return;
    }
  }
}

export function createPhilipRealtimeSession(opts = {}) {
  return new PhilipRealtimeSession(opts);
}
