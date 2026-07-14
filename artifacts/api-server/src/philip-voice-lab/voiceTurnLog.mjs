/**
 * Temporary Voice Lab runtime verification logs.
 * Enable: PHILIP_VOICE_LAB_RUNTIME_VERIFY=true
 */

export function isRuntimeVerifyEnabled() {
  const raw = process.env.PHILIP_VOICE_LAB_RUNTIME_VERIFY?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  // Complete lab runtime verification is on by default; explicitly opt out to silence.
  return true;
}

function inferResponseModel(endpoint, lane, engine) {
  if (engine) return engine;
  if (endpoint === "/api/guidance/phase1") return "GPT-4o (phase1)";
  if (!lane || lane === "presence_hold") return "mechanical";
  if (lane === "two_phase" || lane === "first_response") return "GPT-4o";
  return "Claude";
}

function gateHit(gates, patterns) {
  return gates.some((g) => patterns.some((p) => g.includes(p)));
}

/**
 * @param {{
 *   voiceTurnNumber: number;
 *   endpoint: string;
 *   conversationMode: string;
 *   messagesLength: number;
 *   sessionId: string;
 *   conversationId: string;
 *   twoPhaseBridge: boolean;
 *   followUpMode: boolean;
 *   latencyMs: number;
 *   runtimeHeaders?: object | null;
 *   pendingPrayerOfferBefore?: boolean;
 *   pendingPrayerOfferAfter?: boolean;
 *   shortAnswerGate?: boolean;
 *   genomeVersion?: string;
 *   timing?: object;
 * }} ctx
 */
export function logVoiceTurnVerification(ctx) {
  if (!isRuntimeVerifyEnabled()) return;

  const h = ctx.runtimeHeaders;
  const gates = h?.gates ?? [];
  const plannerRan = !!(h?.plannerSource && h.plannerSource !== "none");
  const sessionMindUpdated = h?.mindVersion != null && h.mindVersion > 0;
  const memoryOrchestratorRan =
    h?.memoryPolicy === "stage" || (h?.memoryRetrievalChars ?? 0) > 0;
  const antiRepetitionRan =
    gateHit(gates, ["question_count_retry", "mechanical_construction", "repetition"])
    || (h?.questionsAskedCount != null && h.questionsAskedCount > 0);

  const lane = ctx.lane ?? h?.lane ?? (ctx.endpoint.includes("phase1") ? "phase1" : "unknown");
  const isCandidateFrontDoor =
    ctx.endpoint === "/api/internal/philip-voice/guidance/turn";
  const t = ctx.timing;
  const genome = ctx.genomeVersion ?? h?.genomeVersion ?? "thin-front-door-candidate";
  const runtimeLabel = h?.runtimeLabel ?? "Philip Voice Lab Candidate";

  const lines = [
    "",
    `VOICE TURN #${ctx.voiceTurnNumber}`,
    "",
    "Runtime:",
    runtimeLabel,
    "",
    "Conversation Mode:",
    ctx.conversationMode?.includes("Front Door") ? "Front Door" : ctx.conversationMode,
    "",
    "Endpoint:",
    ctx.endpoint,
    "",
    "Genome version:",
    genome,
    "",
    "messages.length:",
    String(ctx.messagesLength),
    "",
    "SessionId:",
    ctx.sessionId,
    "",
    "ConversationId:",
    ctx.conversationId,
    "",
    "Pipeline Lane:",
    lane,
    "",
    "Intent:",
    ctx.intent ?? "n/a",
    "",
    "Engine:",
    ctx.engine ?? "n/a",
    "",
    "Conversation State:",
    ctx.stateTransition ?? "n/a",
    "",
    "pendingPrayerOffer before→after:",
    `${ctx.pendingPrayerOfferBefore ? "yes" : "no"} → ${ctx.pendingPrayerOfferAfter ? "yes" : "no"}`,
    "",
    "contextual short-answer handling used:",
    ctx.shortAnswerGate ? "yes" : "no",
    "",
    "Reopened after goodbye:",
    ctx.reopened ? "YES" : "no",
    "",
    "Planner Source:",
    h?.plannerSource ?? "n/a (not active on candidate)",
    "",
    "Identity Kernel:",
    h?.identityKernelMode ?? "n/a (not active on candidate)",
    "",
    "Context Mode:",
    h?.contextMode ?? "n/a (not active on candidate)",
    "",
    "Memory Policy:",
    h?.memoryPolicy ?? "n/a (not active on candidate)",
    "",
    "Mind Stage:",
    h?.mindStage ?? "n/a (not active on candidate)",
    "",
    "Latency:",
    `${ctx.latencyMs}ms (guidance only)`,
    "",
    ...(t ? [
      "── Turn timing ──",
      `User speech end→VAD close: ${t.userSpeechEndAt != null && t.vadCloseAt != null ? `${Math.max(0, t.vadCloseAt - t.userSpeechEndAt)}ms` : "n/a"}`,
      `User speech: ${t.utteranceMs}ms (${t.vadReason})`,
      `STT: ${t.sttMs}ms`,
      `Guidance: ${t.guidanceMs}ms`,
      `TTS fetch: ${t.ttsMs}ms`,
      `Speech end → first audio: ${t.speechEndToFirstAudioMs != null ? `${t.speechEndToFirstAudioMs}ms` : t.timeToFirstAudioMs != null ? `${t.timeToFirstAudioMs}ms` : "n/a"}`,
      `Playback (agent publish): ${t.playbackMs}ms${t.asyncPlayback ? " (async — mic unblocks after first frame)" : " (detached publish)"}`,
      `Total turn (agent loop): ${t.totalTurnMs}ms`,
      `Reply length: ${t.replyChars} chars`,
      `Playback generation: ${t.playbackGeneration ?? "—"}`,
      "",
    ] : []),
    "Response Model:",
    inferResponseModel(ctx.endpoint, lane, ctx.engine),
    "",
    "Streaming:",
    ctx.endpoint === "/api/guidance/response" ? "Buffered (HTTP stream → full body)" : "No (single response)",
    "",
    "── Routing flags ──",
    `Two-phase bridge: ${ctx.twoPhaseBridge ? "YES" : "no"}`,
    `Follow-up mode: ${ctx.followUpMode ? "YES" : "no"}`,
    "",
    "── Runtime subsystems ──",
    `Session Mind updated: ${sessionMindUpdated ? "YES" : "no"} (v${h?.mindVersion ?? "—"}, source=${h?.stateSource ?? "front_door"})`,
    `Memory Orchestrator: ${memoryOrchestratorRan ? "YES" : "no"} (retrievalChars=${h?.memoryRetrievalChars ?? 0})`,
    `Planner executed: ${plannerRan ? "YES" : "no"}`,
    `Anti-Repetition gates: ${antiRepetitionRan ? "YES" : "no"}${gates.length ? ` [${gates.join(", ")}]` : ""}`,
    "",
    isCandidateFrontDoor
      ? "✅ Philip Voice Lab Candidate — Front Door (production Mind/Planner/Memory not active)"
      : "⚠️ Non-candidate endpoint",
    "",
  ];

  console.log(lines.join("\n"));
}
