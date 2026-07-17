/**
 * Provider-neutral event vocabulary aligned to OpenAI Realtime GA shapes.
 * Official refs:
 * - https://platform.openai.com/docs/guides/realtime
 * - https://platform.openai.com/docs/guides/realtime-webrtc
 * - https://platform.openai.com/docs/guides/realtime-conversations
 */

export const CLIENT_EVENTS = Object.freeze({
  SESSION_UPDATE: "session.update",
  INPUT_AUDIO_APPEND: "input_audio_buffer.append",
  INPUT_AUDIO_COMMIT: "input_audio_buffer.commit",
  INPUT_AUDIO_CLEAR: "input_audio_buffer.clear",
  OUTPUT_AUDIO_CLEAR: "output_audio_buffer.clear",
  RESPONSE_CREATE: "response.create",
  RESPONSE_CANCEL: "response.cancel",
  CONVERSATION_ITEM_CREATE: "conversation.item.create",
  CONVERSATION_ITEM_TRUNCATE: "conversation.item.truncate",
});

export const SERVER_EVENTS = Object.freeze({
  SESSION_CREATED: "session.created",
  SESSION_UPDATED: "session.updated",
  SPEECH_STARTED: "input_audio_buffer.speech_started",
  SPEECH_STOPPED: "input_audio_buffer.speech_stopped",
  TRANSCRIPT_DELTA: "conversation.item.input_audio_transcription.delta",
  TRANSCRIPT_DONE: "conversation.item.input_audio_transcription.completed",
  RESPONSE_CREATED: "response.created",
  RESPONSE_AUDIO_DELTA: "response.output_audio.delta",
  RESPONSE_AUDIO_DONE: "response.output_audio.done",
  RESPONSE_TRANSCRIPT_DELTA: "response.output_audio_transcript.delta",
  RESPONSE_DONE: "response.done",
  RESPONSE_CANCELLED: "response.cancelled",
  FUNCTION_CALL_ARGS_DONE: "response.function_call_arguments.done",
  ERROR: "error",
  RATE_LIMITS: "rate_limits.updated",
});

export const LOCAL_EVENTS = Object.freeze({
  FIRST_AUDIBLE: "local.first_audible",
  PLAYBACK_STOPPED: "local.playback_stopped",
  BARGE_IN: "local.barge_in",
  RECOVERY_SPOKEN: "local.recovery_spoken",
  BUDGET_STOP: "local.budget_stop",
  SILENT_TURN_PREVENTED: "local.silent_turn_prevented",
  GATE_METRIC: "local.gate_metric",
});

export function makeEvent(type, payload = {}, ts = Date.now()) {
  return {
    type,
    ts,
    ...payload,
  };
}
