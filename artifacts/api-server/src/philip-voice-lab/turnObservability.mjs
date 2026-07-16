/**
 * Per-turn observability sink for the Philip Voice Lab.
 *
 * Persists one JSON line per conversational turn under the isolated lab log
 * directory. Captures transcript, response, intent, runtime/lane/engine, the
 * conversation-state transition, Front Door / contribution decision labels,
 * per-stage latency, and the VAD boundary reason.
 *
 * Never records secrets, tokens, credentials, or hidden chain-of-thought.
 * Writes are best-effort and must never break a live turn.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLatencyStages, LATENCY_PIPELINE_SCHEMA_VERSION } from "./latencyPipeline.mjs";
import { PHILIP_VOICE_GENOME_VERSION } from "./compactGenome.mjs";
import { CONTRIBUTION_CONTRACT_VERSION } from "./contributionContract.mjs";

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
 * Scrub secrets from error messages. Never include stacks with env dumps.
 * @param {unknown} err
 * @param {{ httpStatus?: number|null }} [hints]
 */
export function normalizeTurnFailureError(err, hints = {}) {
  const name = err && typeof err === "object" && "name" in err ? String(err.name || "Error") : "Error";
  let message = err && typeof err === "object" && "message" in err
    ? String(err.message || "")
    : String(err || "unknown error");
  message = message
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[^"'\\s]+/gi, "api_key=[redacted]")
    .replace(/x-philip-lab-secret["']?\s*[:=]\s*["']?[^"'\\s]+/gi, "x-philip-lab-secret=[redacted]")
    .slice(0, 400);

  let httpStatus = hints.httpStatus ?? null;
  const statusMatch = message.match(/\b(?:turn|guidance|tts|transcribe)\s+(\d{3})\b/i)
    || message.match(/\b(\d{3}):\s/);
  if (httpStatus == null && statusMatch) {
    httpStatus = Number(statusMatch[1]);
  }

  let code = null;
  if (err && typeof err === "object" && "code" in err && err.code != null) {
    code = String(err.code).slice(0, 64);
  } else if (/ctx is not defined/i.test(message)) {
    code = "ReferenceError_ctx_undefined";
  } else if (httpStatus != null) {
    code = `http_${httpStatus}`;
  }

  return {
    name: name.slice(0, 64),
    code,
    message,
    httpStatus: Number.isFinite(httpStatus) ? httpStatus : null,
  };
}

async function appendTurnRecord(conversationId, record) {
  try {
    const dir = logDir();
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(turnLogFile(conversationId), JSON.stringify(record) + "\n", "utf8");
  } catch (err) {
    console.error("[philip-voice-lab] turn observation write failed:", err);
  }
}

/**
 * Persist turn observation. Accepts legacy fields plus optional `decision` /
 * `contribution` / `latencyStages` blobs.
 */
export async function recordTurnObservation(obs) {
  const decision = obs.decision && typeof obs.decision === "object" ? obs.decision : {};
  const meta = obs.meta && typeof obs.meta === "object" ? obs.meta : {};
  const merged = { ...meta, ...decision };

  const record = {
    ts: new Date().toISOString(),
    turnOutcome: obs.turnOutcome || "turn_complete",
    conversationId: obs.conversationId,
    sessionId: obs.sessionId,
    voiceTurnNumber: obs.voiceTurnNumber,
    turnAttemptId: obs.turnAttemptId ?? obs.voiceTurnNumber ?? null,
    transcript: obs.transcript,
    responseText: obs.responseText,
    intent: obs.intent,
    conduct: obs.conduct ?? null,
    lane: obs.lane,
    engine: obs.engine,
    runtimeVersion: obs.runtimeVersion,
    genomeVersion: obs.genomeVersion ?? merged.genomeVersion ?? "philip-voice-genome-v1",
    promptVersion: obs.promptVersion ?? merged.promptVersion ?? null,
    contributionContractVersion:
      obs.contributionContractVersion ?? merged.contributionContractVersion ?? null,
    stateTransition: obs.stateTransition,
    reopened: obs.reopened,
    personalMeaning: obs.personalMeaning,
    faithOffered: obs.faithOffered,
    pendingPrayerOfferBefore: Boolean(obs.pendingPrayerOfferBefore),
    pendingPrayerOfferAfter: Boolean(obs.pendingPrayerOfferAfter),
    shortAnswerGate: Boolean(obs.shortAnswerGate),
    vadReason: obs.vadReason,
    latency: obs.latency,
    latencyStages: obs.latencyStages || buildLatencyStages(obs.latency || {}),
    // Front Door + contribution decision labels (no secrets / no CoT)
    conversationalActs: merged.conversationalActs ?? null,
    orderMode: merged.orderMode ?? null,
    reciprocalDetected: merged.reciprocalDetected ?? null,
    reciprocalAnswered: merged.reciprocalAnswered ?? null,
    relationalDetailDetected: merged.relationalDetailDetected ?? null,
    caregivingDetected: merged.caregivingDetected ?? null,
    descriptiveFaith: merged.descriptiveFaith ?? null,
    activityCompletion: merged.activityCompletion ?? null,
    contributionType: merged.contributionType ?? null,
    contributionFunction: merged.contributionFunction ?? null,
    meaningfulDetailSelected: merged.meaningfulDetailSelected ?? null,
    contextDetailUsed: merged.contextDetailUsed ?? null,
    contributionPresent: merged.contributionPresent ?? null,
    newPropositionDetected: merged.newPropositionDetected ?? null,
    genericPraiseRisk: merged.genericPraiseRisk ?? null,
    appraisalOnlyRisk: merged.appraisalOnlyRisk ?? null,
    genericRelationalSentimentRisk: merged.genericRelationalSentimentRisk ?? null,
    interviewQuestionRisk: merged.interviewQuestionRisk ?? null,
    paraphraseOnlyRisk: merged.paraphraseOnlyRisk ?? null,
    scheduleInventoryRisk: merged.scheduleInventoryRisk ?? null,
    unnecessaryQuestionRisk: merged.unnecessaryQuestionRisk ?? null,
    unsupportedStruggleRisk: merged.unsupportedStruggleRisk ?? null,
    forcedFaithRisk: merged.forcedFaithRisk ?? null,
    contributionQualityPassed: merged.contributionQualityPassed ?? null,
    contributionFailReasons: merged.contributionFailReasons ?? null,
    contributionEngineVersion: merged.contributionEngineVersion ?? obs.contributionEngineVersion ?? null,
    schemaValid: merged.schemaValid ?? null,
    faithPosture: merged.faithPosture ?? null,
    questionNeeded: merged.questionNeeded ?? null,
    warrantedContributionPresent: merged.warrantedContributionPresent ?? null,
    relationalAnchorTypes: merged.relationalAnchorTypes ?? null,
    shadowGatePassed: merged.shadowGatePassed ?? null,
    shadowGateFailReasons: merged.shadowGateFailReasons ?? null,
    contributionQualityShadow: merged.contributionQualityShadow ?? null,
    privatePlanLogged: merged.privatePlanLogged ?? false,
    generationLatencyMs: merged.generationLatencyMs ?? obs.latency?.generationLatencyMs ?? null,
    deepRoutingReason: merged.deepRoutingReason ?? null,
    weightyDescriptiveFaith: merged.weightyDescriptiveFaith ?? null,
    caregivingTreatedRelationally: merged.caregivingTreatedRelationally ?? null,
    relationalAnchorsUsed: merged.relationalAnchorsUsed ?? null,
    sentOffBefore: merged.sentOffBefore ?? null,
    sentOffAfter: merged.sentOffAfter ?? merged.sentOff ?? null,
    sentOffTransition: merged.sentOffTransition ?? null,
    routedDeep: merged.routedDeep ?? null,
    relationalAnchors: merged.relationalAnchors ?? null,
  };
  await appendTurnRecord(obs.conversationId, record);
  return record;
}

/**
 * Persist a failed turn attempt. Distinct from turn_complete — never invents
 * response/TTS/playback success fields.
 *
 * @param {object} obs
 */
export async function recordFailedTurnObservation(obs) {
  const failure = normalizeTurnFailureError(obs.error, { httpStatus: obs.httpStatus });
  const transcript = obs.transcript != null ? String(obs.transcript) : null;
  const micResumeAt = obs.micResumeAt ?? null;
  const latency = {
    sttMs: obs.sttMs ?? null,
    guidanceMs: obs.guidanceMs ?? null,
    ttsMs: null,
    playbackMs: null,
    totalTurnMs: obs.totalTurnMs ?? null,
    utteranceMs: obs.utteranceMs ?? null,
    audioBytes: obs.audioBytes ?? null,
    userSpeechEndAt: obs.userSpeechEndAt ?? null,
    vadCloseAt: obs.vadCloseAt ?? null,
    sttStartAt: obs.sttStartAt ?? null,
    sttEndAt: obs.sttEndAt ?? null,
    guidanceStartAt: obs.guidanceStartAt ?? null,
    guidanceEndAt: obs.guidanceEndAt ?? null,
    modelFirstTokenAt: null,
    ttsStartAt: null,
    ttsEndAt: null,
    firstAudioAt: null,
    playbackCompleteAt: null,
    pcmDurationMs: null,
    speechEndToFirstAudioMs: null,
    nextUserSpeechStartAt: null,
    overlapOrInterruption: Boolean(obs.overlapOrInterruption),
    interruptionKind: obs.interruptionKind ?? null,
    discardReason: obs.discardReason ?? null,
    micResumeAt,
  };

  const record = {
    ts: new Date().toISOString(),
    turnOutcome: "turn_failed",
    conversationId: obs.conversationId,
    sessionId: obs.sessionId,
    voiceTurnNumber: obs.voiceTurnNumber ?? null,
    turnAttemptId: obs.turnAttemptId ?? obs.voiceTurnNumber ?? null,
    transcript,
    transcriptChars: transcript != null ? transcript.length : obs.transcriptChars ?? null,
    utteranceMs: obs.utteranceMs ?? null,
    vadReason: obs.vadReason ?? null,
    failureStage: obs.failureStage || "unknown",
    error: failure,
    httpStatus: failure.httpStatus,
    intent: obs.intent ?? null,
    lane: obs.lane ?? null,
    engine: obs.engine ?? null,
    runtimeVersion: obs.runtimeVersion ?? "candidate-front-door-1.1",
    genomeVersion: obs.genomeVersion ?? PHILIP_VOICE_GENOME_VERSION,
    contributionContractVersion: obs.contributionContractVersion ?? CONTRIBUTION_CONTRACT_VERSION,
    relationalAnchorsUsed: obs.relationalAnchorsUsed ?? null,
    relationalAnchors: obs.relationalAnchors ?? null,
    sentOffBefore: obs.sentOffBefore ?? null,
    sentOffAfter: obs.sentOffAfter ?? null,
    ttsStarted: false,
    audioPublished: false,
    responseText: null,
    micResumeAt,
    latency,
    latencyStages: {
      ...buildLatencyStages(latency),
      schemaVersion: LATENCY_PIPELINE_SCHEMA_VERSION,
      micResumeAt,
      failureStage: obs.failureStage || "unknown",
    },
  };

  await appendTurnRecord(obs.conversationId, record);
  return record;
}
