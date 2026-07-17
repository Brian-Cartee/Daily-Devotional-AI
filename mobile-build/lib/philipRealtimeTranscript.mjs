/**
 * Apply asynchronous input-transcription events by item_id. Completion order
 * is not assumed to match speech-turn order.
 */
export function applyInputTranscriptEvent(turns, event, atMs) {
  const type = String(event?.type || "");
  if (
    type !== "conversation.item.input_audio_transcription.delta" &&
    type !== "conversation.item.input_audio_transcription.completed"
  ) {
    return { handled: false, turn: null, completed: false };
  }
  const itemId = String(event.item_id || "");
  const turn =
    turns.find((candidate) => candidate.itemId === itemId) ||
    turns[turns.length - 1] ||
    null;
  if (!turn) return { handled: true, turn: null, completed: false };

  turn.itemId = itemId || turn.itemId;
  if (type.endsWith(".delta")) {
    turn.inputTranscriptDeltas =
      String(turn.inputTranscriptDeltas || "") + String(event.delta || "");
    turn.inputTranscriptStatus = "streaming";
    return { handled: true, turn, completed: false };
  }

  turn.inputTranscript =
    String(event.transcript || "").trim() || String(turn.inputTranscriptDeltas || "");
  turn.inputTranscriptStatus = "completed";
  turn.inputTranscriptCompletedAtMs = atMs;
  if (turn.speechStoppedAtMs != null) {
    turn.speechEndToTranscriptCompleteMs = atMs - Number(turn.speechStoppedAtMs);
  }
  return { handled: true, turn, completed: true };
}
