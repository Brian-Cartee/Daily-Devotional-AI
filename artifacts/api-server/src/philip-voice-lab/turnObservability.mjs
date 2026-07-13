/**
 * Per-turn observability sink for the Philip Voice Lab.
 *
 * Persists one JSON line per conversational turn under the isolated lab log
 * directory. Captures transcript, response, intent, runtime/lane/engine, the
 * conversation-state transition, per-stage latency, and the VAD boundary reason.
 *
 * Never records secrets, tokens, or credentials. Writes are best-effort and must
 * never break a live turn.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function logDir() {
  return (
    process.env.PHILIP_VOICE_LAB_LOG_DIR ||
    path.resolve(__dirname, "../../server/philip-voice-lab")
  );
}

/** @param {string} conversationId */
function turnLogFile(conversationId) {
  const safe = String(conversationId || "session").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return path.join(logDir(), `${safe}.turns.jsonl`);
}

/**
 * @param {{
 *   conversationId: string;
 *   sessionId: string;
 *   voiceTurnNumber: number;
 *   transcript: string;
 *   responseText: string;
 *   intent: string;
 *   conduct?: string|null;
 *   lane: string;
 *   engine: string|null;
 *   runtimeVersion: string;
 *   stateTransition: string;
 *   reopened: boolean;
 *   personalMeaning: boolean;
 *   faithOffered: boolean;
 *   vadReason: string;
 *   latency: { sttMs: number; guidanceMs: number; ttsMs: number; playbackMs: number; totalTurnMs: number; utteranceMs: number };
 * }} obs
 */
export async function recordTurnObservation(obs) {
  const record = {
    ts: new Date().toISOString(),
    conversationId: obs.conversationId,
    sessionId: obs.sessionId,
    voiceTurnNumber: obs.voiceTurnNumber,
    transcript: obs.transcript,
    responseText: obs.responseText,
    intent: obs.intent,
    conduct: obs.conduct ?? null,
    lane: obs.lane,
    engine: obs.engine,
    runtimeVersion: obs.runtimeVersion,
    stateTransition: obs.stateTransition,
    reopened: obs.reopened,
    personalMeaning: obs.personalMeaning,
    faithOffered: obs.faithOffered,
    vadReason: obs.vadReason,
    latency: obs.latency,
  };
  try {
    const dir = logDir();
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(turnLogFile(obs.conversationId), JSON.stringify(record) + "\n", "utf8");
  } catch (err) {
    console.error("[philip-voice-lab] turn observation write failed:", err);
  }
  return record;
}
