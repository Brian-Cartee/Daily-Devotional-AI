import { FACTUAL_CURRENTNESS_TOOL } from "../src/tools/factualCurrentness.mjs";
import { CRISIS_TOOL } from "../src/tools/hardContracts.mjs";
import { PHILIP_REALTIME_QUALITY_INSTRUCTIONS } from "../phase2b/config.mjs";

export const IPHONE_LAB_LIMITS = Object.freeze({
  model: "gpt-realtime-2.1",
  voice: "cedar",
  // Official post-processing speed multiplier (0.25–1.5, default 1.0):
  // https://developers.openai.com/api/reference — session.audio.output.speed
  outputSpeed: 0.9,
  transcriptionModel: "gpt-4o-mini-transcribe",
  maximumDurationMs: 115_000,
  absoluteSpendUsd: 1,
  sessionReserveUsd: 0.75,
  stopBufferUsd: 0.1,
  profile: "philip-lab",
  bundleIdentifier: "com.shepherdspath.app.philip-lab",
  easChargeCapUsd: 5,
});

export function isIphoneRealtimeArmed() {
  return process.env.ALLOW_IPHONE_REALTIME === "1";
}

const IPHONE_ADDENDUM = [
  "",
  "IPHONE REALTIME RESEARCH PROTOTYPE",
  "You are speaking with Brian on his iPhone through the isolated Philip Realtime Lab.",
  "Keep replies brief and speakable: usually one or two short sentences, about 20 to 35 words.",
  "Speak calmly and without hurry; let pauses land between thoughts.",
  "Preserve faith restraint, pray completely through Amen when explicitly asked,",
  "refuse hard-conduct help, and escalate crisis via crisis_safety_protocol.",
  "Never guess current-changing facts; call factual_currentness or admit the limit.",
  "Sessions here are short. If told the session is nearly over, finish the current thought,",
  "then close warmly in one sentence without adding a new question.",
].join("\n");

export const IPHONE_LAB_INSTRUCTIONS =
  `${PHILIP_REALTIME_QUALITY_INSTRUCTIONS}\n${IPHONE_ADDENDUM}`;

export const IPHONE_LAB_REALTIME_SESSION = Object.freeze({
  type: "realtime",
  model: IPHONE_LAB_LIMITS.model,
  output_modalities: ["audio"],
  instructions: IPHONE_LAB_INSTRUCTIONS,
  audio: {
    input: {
      transcription: {
        model: IPHONE_LAB_LIMITS.transcriptionModel,
        language: "en",
        // Neutral guidance only. The previous identity/topic vocabulary
        // ("Philip, Shepherd's Path, Brian, caregiving, Scripture…") was
        // echoed verbatim into transcripts of short noisy audio in genuine
        // session iphone-lab-1784427478402-1, corrupting evidence. Transcripts
        // are observability-only and never re-enter the conversation.
        prompt: "Transcribe exactly what is spoken, keeping fillers and self-corrections.",
      },
      turn_detection: {
        type: "semantic_vad",
        eagerness: "auto",
        create_response: true,
        interrupt_response: true,
      },
    },
    output: {
      voice: IPHONE_LAB_LIMITS.voice,
      speed: IPHONE_LAB_LIMITS.outputSpeed,
    },
  },
  tools: [FACTUAL_CURRENTNESS_TOOL, CRISIS_TOOL],
  tool_choice: "auto",
});

export function sanitizedIphoneLabConfig() {
  return {
    endpoint: "POST /api/iphone-realtime/session → OpenAI /v1/realtime/calls",
    transport: "native WebRTC via @livekit/react-native-webrtc (no LiveKit Cloud)",
    authentication: "server-side bearer only; iPhone receives SDP answer",
    session: {
      ...IPHONE_LAB_REALTIME_SESSION,
      instructions: "[compact realtime Philip identity; omitted from public status]",
    },
    limits: IPHONE_LAB_LIMITS,
    privacy: {
      audioRecording: false,
      audioPersistence: false,
      transcriptPersistence: "sanitized local research evidence only",
    },
  };
}
