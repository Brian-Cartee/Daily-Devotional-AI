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
import { buildLatencyStages } from "./latencyPipeline.mjs";

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
 * Persist turn observation. Accepts legacy fields plus optional `decision` /
 * `contribution` / `latencyStages` blobs.
 */
export async function recordTurnObservation(obs) {
  const decision = obs.decision && typeof obs.decision === "object" ? obs.decision : {};
  const meta = obs.meta && typeof obs.meta === "object" ? obs.meta : {};
  const merged = { ...meta, ...decision };

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
  try {
    const dir = logDir();
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(turnLogFile(obs.conversationId), JSON.stringify(record) + "\n", "utf8");
  } catch (err) {
    console.error("[philip-voice-lab] turn observation write failed:", err);
  }
  return record;
}
