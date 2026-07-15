/**
 * Provider-neutral latency stage schema for Philip Voice Lab pipeline timing.
 *
 * Used to persist comparable timestamps for chained vs future realtime/hybrid
 * benchmarks. Does not call paid providers.
 */

export const LATENCY_PIPELINE_SCHEMA_VERSION = "philip-latency-pipeline-v1";

/**
 * Build a normalized latency stages object from turn timings.
 * Missing fields stay null — never invent values.
 *
 * @param {object} t
 */
export function buildLatencyStages(t = {}) {
  return {
    schemaVersion: LATENCY_PIPELINE_SCHEMA_VERSION,
    vadCloseAt: t.vadCloseAt ?? null,
    userSpeechEndAt: t.userSpeechEndAt ?? null,
    utteranceMs: t.utteranceMs ?? null,
    audioBytes: t.audioBytes ?? null,
    uploadStartAt: t.uploadStartAt ?? null,
    uploadEndAt: t.uploadEndAt ?? null,
    sttProviderStartAt: t.sttStartAt ?? t.sttProviderStartAt ?? null,
    sttProviderEndAt: t.sttEndAt ?? t.sttProviderEndAt ?? null,
    sttMs: t.sttMs ?? null,
    modelRequestStartAt: t.guidanceStartAt ?? t.modelRequestStartAt ?? null,
    modelFirstTokenAt: t.modelFirstTokenAt ?? null,
    modelCompletionAt: t.guidanceEndAt ?? t.modelCompletionAt ?? null,
    guidanceMs: t.guidanceMs ?? null,
    timeToFirstTokenMs:
      t.timeToFirstTokenMs ??
      (t.modelFirstTokenAt != null && (t.guidanceStartAt ?? t.modelRequestStartAt) != null
        ? Math.max(0, t.modelFirstTokenAt - (t.guidanceStartAt ?? t.modelRequestStartAt))
        : null),
    ttsRequestStartAt: t.ttsStartAt ?? t.ttsRequestStartAt ?? null,
    ttsFirstAudioAt: t.ttsFirstAudioAt ?? t.firstAudioAt ?? null,
    ttsEndAt: t.ttsEndAt ?? null,
    ttsMs: t.ttsMs ?? null,
    audioPublishStartAt: t.firstAudioAt ?? t.audioPublishStartAt ?? null,
    audioPublishEndAt: t.playbackCompleteAt ?? t.audioPublishEndAt ?? null,
    estimatedAudibleStartAt: t.firstAudioAt ?? null,
    estimatedAudibleEndAt:
      t.estimatedAudibleEndAt ??
      (t.firstAudioAt != null && t.pcmDurationMs != null
        ? t.firstAudioAt + t.pcmDurationMs
        : t.playbackCompleteAt ?? null),
    nextUserSpeechStartAt: t.nextUserSpeechStartAt ?? null,
    speechEndToFirstAudioMs: t.speechEndToFirstAudioMs ?? null,
    overlapOrInterruption: Boolean(t.overlapOrInterruption),
    interruptionKind: t.interruptionKind ?? null,
    discardReason: t.discardReason ?? null,
    // Clarity: publish timestamp ≠ proven on-device ear start
    firstAudioMeans: "agent_publish_start_not_proven_ear",
  };
}
