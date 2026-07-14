/**
 * Isolated Philip Voice Lab STT helper (Whisper via OPENAI_API_KEY).
 * Does not import or alter production /api/guidance/transcribe.
 */
import {
  checkLabSttAllowance,
  labSttLimitsFromEnv,
  recordLabSttUsage,
  snapshotLabSttUsage,
} from "./labSttBudget.mjs";

const ALLOWED_MIME = new Set([
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "application/octet-stream",
]);

/**
 * Estimate PCM WAV duration from RIFF header when present; else bytes ≈ 16-bit mono 48kHz.
 * @param {Buffer} buffer
 * @returns {number} milliseconds
 */
export function estimateAudioDurationMs(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (buf.length >= 44 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE") {
    const byteRate = buf.readUInt32LE(28) || 0;
    const dataSize = Math.max(0, buf.length - 44);
    if (byteRate > 0) return Math.round((dataSize / byteRate) * 1000);
  }
  // Fallback: 16-bit mono 48kHz (~room loop default)
  const bytesPerSec = 48000 * 2;
  return Math.round((buf.length / bytesPerSec) * 1000);
}

export function validateLabAudioFile(file, limits = labSttLimitsFromEnv()) {
  if (!file?.buffer?.length) {
    return { ok: false, status: 400, code: "no_audio", message: "No audio provided" };
  }
  if (file.buffer.length > limits.maxFileBytes) {
    return {
      ok: false,
      status: 413,
      code: "philip_voice_lab_stt_file_too_large",
      message: `Audio exceeds ${limits.maxFileBytes} byte lab cap.`,
    };
  }
  const mime = String(file.mimetype || "").toLowerCase().split(";")[0].trim();
  if (mime && !ALLOWED_MIME.has(mime)) {
    return {
      ok: false,
      status: 415,
      code: "philip_voice_lab_stt_unsupported_type",
      message: `Unsupported audio type: ${mime}`,
    };
  }
  return { ok: true, mime: mime || "audio/wav" };
}

/**
 * Transcribe for the isolated lab. Caller must already authenticate with lab secret.
 * @returns {Promise<{ ok: true; text: string; usage: object; utteranceMs: number; tagged: string } | { ok: false; status: number; code: string; message: string; usage?: object }>}
 */
export async function transcribeLabUtterance({
  file,
  sessionId,
  conversationId,
  openaiClient,
  limits = labSttLimitsFromEnv(),
} = {}) {
  const checked = validateLabAudioFile(file, limits);
  if (!checked.ok) return checked;

  const utteranceMs = estimateAudioDurationMs(file.buffer);
  const allowance = checkLabSttAllowance({ sessionId, utteranceMs, limits });
  if (!allowance.ok) return allowance;

  if (!openaiClient) {
    return {
      ok: false,
      status: 503,
      code: "philip_voice_lab_stt_not_configured",
      message: "OPENAI_API_KEY is not configured for lab transcription.",
      usage: snapshotLabSttUsage({ sessionId }),
    };
  }

  const filename = file.originalname || "utterance.wav";
  const audioFile = new File([file.buffer], filename, { type: checked.mime });
  const transcription = await openaiClient.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "en",
  });

  const usage = recordLabSttUsage({ sessionId, utteranceMs });
  console.log(
    "[philip-lab-stt]",
    JSON.stringify({
      tag: "philip-voice-lab-stt",
      event: "transcribe_ok",
      sessionId: String(sessionId || "").slice(0, 80),
      conversationId: String(conversationId || "").slice(0, 80),
      utteranceMs,
      textChars: (transcription.text || "").trim().length,
      usage,
    }),
  );

  return {
    ok: true,
    text: String(transcription.text || "").trim(),
    usage,
    utteranceMs,
    tagged: "philip-voice-lab-stt",
  };
}
