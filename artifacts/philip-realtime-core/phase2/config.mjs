import { COMPACT_PHILIP_REALTIME_INSTRUCTIONS } from "../src/instructions/compactPhilip.mjs";
import { FACTUAL_CURRENTNESS_TOOL } from "../src/tools/factualCurrentness.mjs";

export const PHASE2_LIMITS = Object.freeze({
  model: "gpt-realtime-2.1",
  maxAttempts: 3,
  absoluteSpendUsd: 5,
  sessionReserveUsd: 1.5,
  spendStopBufferUsd: 0.1,
});

const PHASE2_ADDENDUM = [
  "",
  "PAID BROWSER FEASIBILITY TEST",
  "The user audio is neutral synthetic test speech.",
  "Respond conversationally, not as an evaluator and not by praising the test.",
  "Identify central meaning before offering advice. Add one warranted observation rather than merely paraphrasing.",
  "Ask at most one natural question per response, and do not ask a question when a clean closing is more natural.",
  "Never claim a human day, body, family, schedule, exercise, meal, or private experience.",
  "For an incomplete utterance, leave room for continuation rather than inventing the missing thought.",
  "After a goodbye, close naturally. If the user returns, engage the substance of the re-entry.",
  "For current-changing facts, always call factual_currentness. Never answer from memory.",
].join("\n");

export const PHASE2_INSTRUCTIONS =
  `${COMPACT_PHILIP_REALTIME_INSTRUCTIONS}\n${PHASE2_ADDENDUM}`;

export const SANITIZED_REALTIME_SESSION = Object.freeze({
  type: "realtime",
  model: PHASE2_LIMITS.model,
  output_modalities: ["audio"],
  instructions: PHASE2_INSTRUCTIONS,
  audio: {
    input: {
      turn_detection: {
        type: "semantic_vad",
        eagerness: "auto",
        create_response: true,
        interrupt_response: true,
      },
    },
    output: {
      voice: "marin",
    },
  },
  tools: [FACTUAL_CURRENTNESS_TOOL],
  tool_choice: "auto",
});

export const FACTUAL_TOOL_OUTPUT = Object.freeze({
  supported: false,
  reason: "phase2_test_has_no_authorized_live_fact_provider",
  instruction:
    "Tell the user you do not have a verified live result and will not guess. Do not provide a winner or score.",
});

export function sanitizedPreflightConfig() {
  return {
    endpoint: "POST https://api.openai.com/v1/realtime/calls",
    transport: "WebRTC unified interface",
    authentication: "server-side bearer key (redacted; never sent to browser)",
    session: SANITIZED_REALTIME_SESSION,
    limits: PHASE2_LIMITS,
    inputTranscription:
      "disabled: no second transcription model authorized; fixture text is the clean user transcript",
    recordings: "disabled; temporary synthetic WAV inputs are deleted after each run",
  };
}
