import { EventEmitter } from "node:events";
import { CLIENT_EVENTS, SERVER_EVENTS, makeEvent } from "../events.mjs";
import { COMPACT_PHILIP_REALTIME_INSTRUCTIONS } from "../instructions/compactPhilip.mjs";
import { FACTUAL_CURRENTNESS_TOOL } from "../tools/factualCurrentness.mjs";
import { CRISIS_TOOL } from "../tools/hardContracts.mjs";
import { mockPcmChunk } from "../audio/duplexInterface.mjs";

/**
 * Provider-neutral mock Realtime transport.
 * Emits GA-shaped events; no network; no paid calls.
 *
 * Timing values are synthetic and must not be reported as measured provider latency.
 */

export function defaultRealtimeSessionConfig({ instructions } = {}) {
  return {
    type: "realtime",
    model: "gpt-realtime-2.1",
    instructions: instructions || COMPACT_PHILIP_REALTIME_INSTRUCTIONS,
    audio: {
      input: {
        format: { type: "audio/pcm", rate: 24000 },
        turn_detection: {
          type: "semantic_vad",
          // Official docs also support server_vad; semantic_vad preferred for natural conversation.
          create_response: true,
          interrupt_response: true,
        },
        transcription: { model: "gpt-4o-mini-transcribe" },
      },
      output: {
        format: { type: "audio/pcm", rate: 24000 },
        voice: "marin",
      },
    },
    tools: [FACTUAL_CURRENTNESS_TOOL, CRISIS_TOOL],
    tool_choice: "auto",
  };
}

export class MockRealtimeProvider extends EventEmitter {
  constructor({
    sessionId = `mock-rt-${Date.now()}`,
    speechEndToFirstAudioMs = 420,
    interruptionStopMs = 80,
    failNextResponse = false,
    holdOpenAfterFirstAudio = false,
  } = {}) {
    super();
    this.sessionId = sessionId;
    this.config = null;
    this.connected = false;
    this.speechEndToFirstAudioMs = speechEndToFirstAudioMs;
    this.interruptionStopMs = interruptionStopMs;
    this.failNextResponse = failNextResponse;
    this.holdOpenAfterFirstAudio = holdOpenAfterFirstAudio;
    this.activeResponseId = null;
    this.cancelledResponseId = null;
    this.heldTranscript = null;
    this.itemSeq = 0;
    this.responseSeq = 0;
    this.pendingUserText = null;
    this.clock = 0;
  }

  connect(config) {
    this.config = { ...defaultRealtimeSessionConfig(), ...config };
    this.connected = true;
    this.emit(
      "event",
      makeEvent(SERVER_EVENTS.SESSION_CREATED, {
        session: { id: this.sessionId, ...this.config },
      }, this.now()),
    );
    return { sessionId: this.sessionId };
  }

  send(clientEvent) {
    if (!this.connected) throw new Error("mock_provider_not_connected");
    const type = clientEvent.type;

    if (type === CLIENT_EVENTS.SESSION_UPDATE) {
      this.config = { ...this.config, ...(clientEvent.session || {}) };
      this.emit("event", makeEvent(SERVER_EVENTS.SESSION_UPDATED, { session: this.config }, this.now()));
      return;
    }

    if (type === CLIENT_EVENTS.INPUT_AUDIO_APPEND) {
      return;
    }

    if (type === CLIENT_EVENTS.INPUT_AUDIO_COMMIT || type === "local.user_speech_commit") {
      this.pendingUserText = clientEvent.transcript || this.pendingUserText || "";
      const itemId = `item_user_${++this.itemSeq}`;
      this.emit(
        "event",
        makeEvent(SERVER_EVENTS.SPEECH_STOPPED, { item_id: itemId, audio_end_ms: this.now() }, this.now()),
      );
      this.emit(
        "event",
        makeEvent(
          SERVER_EVENTS.TRANSCRIPT_DONE,
          { item_id: itemId, transcript: this.pendingUserText },
          this.now(),
        ),
      );
      if (this.config?.audio?.input?.turn_detection?.create_response !== false) {
        this.#startResponse({ userText: this.pendingUserText, itemId });
      }
      return;
    }

    if (type === CLIENT_EVENTS.RESPONSE_CREATE) {
      this.#startResponse({
        userText: clientEvent.transcript || this.pendingUserText || "",
        forcedText: clientEvent.forcedText,
        toolResultSpeech: clientEvent.toolResultSpeech,
      });
      return;
    }

    if (type === CLIENT_EVENTS.RESPONSE_CANCEL || type === CLIENT_EVENTS.OUTPUT_AUDIO_CLEAR) {
      const responseId = this.activeResponseId;
      this.cancelledResponseId = responseId;
      this.activeResponseId = null;
      this.advance(this.interruptionStopMs);
      this.emit(
        "event",
        makeEvent(
          SERVER_EVENTS.RESPONSE_CANCELLED,
          { response_id: responseId, reason: "client_cancel" },
          this.now(),
        ),
      );
      return;
    }

    if (type === CLIENT_EVENTS.CONVERSATION_ITEM_TRUNCATE) {
      this.emit(
        "event",
        makeEvent("conversation.item.truncated", { item_id: clientEvent.item_id }, this.now()),
      );
      return;
    }

    if (type === "local.simulate_speech_started") {
      this.emit(
        "event",
        makeEvent(SERVER_EVENTS.SPEECH_STARTED, { audio_start_ms: this.now() }, this.now()),
      );
      return;
    }

    if (type === "local.inject_provider_error") {
      this.emit(
        "event",
        makeEvent(
          SERVER_EVENTS.ERROR,
          {
            error: {
              type: "server_error",
              code: clientEvent.code || "mock_generation_failed",
              message: clientEvent.message || "Mock provider generation failed",
            },
          },
          this.now(),
        ),
      );
      return;
    }
  }

  disconnect() {
    this.connected = false;
    this.activeResponseId = null;
  }

  now() {
    return this.clock;
  }

  advance(ms) {
    this.clock += Number(ms);
  }

  #startResponse({ userText, forcedText, toolResultSpeech } = {}) {
    if (this.failNextResponse) {
      this.failNextResponse = false;
      this.emit(
        "event",
        makeEvent(
          SERVER_EVENTS.ERROR,
          {
            error: {
              type: "server_error",
              code: "mock_generation_failed",
              message: "Mock provider refused to generate a response",
            },
          },
          this.now(),
        ),
      );
      return;
    }

    const responseId = `resp_${++this.responseSeq}`;
    this.activeResponseId = responseId;
    const speechEndAt = this.now();
    this.emit("event", makeEvent(SERVER_EVENTS.RESPONSE_CREATED, { response_id: responseId }, this.now()));

    this.advance(this.speechEndToFirstAudioMs);
    if (this.cancelledResponseId === responseId) return;

    const text =
      forcedText ||
      toolResultSpeech ||
      this.#scriptedReply(userText);

    const firstChunkAt = this.now();
    this.emit(
      "event",
      makeEvent(
        SERVER_EVENTS.RESPONSE_AUDIO_DELTA,
        {
          response_id: responseId,
          delta: mockPcmChunk(`${responseId}:0`),
          first_audible: true,
          speech_end_at: speechEndAt,
          first_audible_at: firstChunkAt,
        },
        firstChunkAt,
      ),
    );
    this.emit(
      "event",
      makeEvent(
        SERVER_EVENTS.RESPONSE_TRANSCRIPT_DELTA,
        { response_id: responseId, delta: text },
        this.now(),
      ),
    );

    if (this.holdOpenAfterFirstAudio) {
      this.heldTranscript = text;
      return;
    }

    this.#finishResponse(responseId, text);
  }

  #finishResponse(responseId, text) {
    this.advance(180);
    if (this.cancelledResponseId === responseId || this.activeResponseId !== responseId) return;

    this.emit(
      "event",
      makeEvent(SERVER_EVENTS.RESPONSE_AUDIO_DONE, { response_id: responseId }, this.now()),
    );
    this.emit(
      "event",
      makeEvent(
        SERVER_EVENTS.RESPONSE_DONE,
        {
          response_id: responseId,
          response: {
            id: responseId,
            status: "completed",
            output: [{ type: "message", content: [{ type: "output_audio", transcript: text }] }],
            usage: {
              input_token_details: { text_tokens: 40, audio_tokens: 80 },
              output_token_details: { text_tokens: 35, audio_tokens: 90 },
            },
          },
          transcript: text,
        },
        this.now(),
      ),
    );
    this.activeResponseId = null;
    this.heldTranscript = null;
  }

  #scriptedReply(userText) {
    const t = String(userText || "").toLowerCase();
    if (!t.trim()) return "I'm here with you.";
    if (/i'?m back|re-?enter|again/.test(t) && !/gotta go|goodbye|talk later/.test(t)) {
      return "Welcome back. What would be useful to pick up?";
    }
    if (/\b(hi|hello|hey)\b/.test(t) && t.length < 40) {
      return "Good to hear you. How are you doing today?";
    }
    if (/full plate|work|mother|health|rest/.test(t) && /faith|prayer|jesus|church/.test(t)) {
      return "That is a heavy plate — work, your mother, your health, rest, and faith all at once. Which of those is pressing hardest right now?";
    }
    if (/mother|mom|leukemia|plans|communicat/.test(t)) {
      return "I hear you about your mother and how uncertain the communication feels. What feels most unsettled in that?";
    }
    if (/^yeah\.?$|^ok\.?$|^okay\.?$|^mm+hm+\.?$|^right\.?$/i.test(t.trim())) {
      return "I'm with you. Take your time.";
    }
    if (/world cup|score|who won|bracket/.test(t)) {
      return "TOOL:factual_currentness";
    }
    if (/bible|scripture|reading|devotion/.test(t) && !/pray|pray for|prayer/.test(t)) {
      return "It sounds like Scripture has been part of how you are staying grounded. What has been landing for you lately?";
    }
    if (/oh,? by the way/i.test(t) || /by the way\.\.\./i.test(t)) {
      return "Go ahead — I'm listening for the rest of that.";
    }
    if (/bye|goodbye|talk later|gotta go|have to go/.test(t)) {
      return "Take care. I'm glad we talked — come back whenever you want.";
    }
    return "I'm with you in what you just shared. What matters most in it for you?";
  }
}
