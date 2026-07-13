/**
 * Temporary Voice Lab runtime verification logs.
 * Enable: PHILIP_VOICE_LAB_RUNTIME_VERIFY=true
 */

export function isRuntimeVerifyEnabled() {
  const raw = process.env.PHILIP_VOICE_LAB_RUNTIME_VERIFY?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function inferResponseModel(endpoint, lane) {
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
 *   runtimeHeaders?: ReturnType<import("./guidanceClient.mjs").parsePhilipResponseHeaders> | null;
 *   timing?: {
 *     utteranceMs: number;
 *     vadReason: string;
 *     sttMs: number;
 *     guidanceMs: number;
 *     ttsMs: number;
 *     playbackMs: number;
 *     totalTurnMs: number;
 *     replyChars: number;
 *     earlyMic: boolean;
 *   };
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

  const lane = h?.lane ?? (ctx.endpoint.includes("phase1") ? "phase1" : "unknown");
  const fullRuntime = ctx.endpoint === "/api/guidance/response";
  const t = ctx.timing;

  const lines = [
    "",
    `VOICE TURN #${ctx.voiceTurnNumber}`,
    "",
    "Endpoint:",
    ctx.endpoint,
    "",
    "Conversation Mode:",
    ctx.conversationMode,
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
    "Planner Source:",
    h?.plannerSource ?? "n/a",
    "",
    "Identity Kernel:",
    h?.identityKernelMode ?? "n/a",
    "",
    "Context Mode:",
    h?.contextMode ?? "n/a",
    "",
    "Memory Policy:",
    h?.memoryPolicy ?? "n/a",
    "",
    "Mind Stage:",
    h?.mindStage ?? "n/a",
    "",
    "Latency:",
    `${ctx.latencyMs}ms (guidance only)`,
    "",
    ...(t ? [
      "── Turn timing ──",
      `User speech: ${t.utteranceMs}ms (${t.vadReason})`,
      `STT: ${t.sttMs}ms`,
      `Guidance: ${t.guidanceMs}ms`,
      `TTS fetch: ${t.ttsMs}ms`,
      `Time to first audio: ${t.timeToFirstAudioMs != null ? `${t.timeToFirstAudioMs}ms` : "n/a"}`,
      `Playback (agent): ${t.playbackMs}ms${t.asyncPlayback ? " (async — mic unblocks after first frame)" : " (sync)"}`,
      `Total turn (agent loop): ${t.totalTurnMs}ms`,
      `Reply length: ${t.replyChars} chars`,
      `Playback generation: ${t.playbackGeneration ?? "—"}`,
      "",
    ] : []),
    "Response Model:",
    inferResponseModel(ctx.endpoint, lane),
    "",
    "Streaming:",
    ctx.endpoint === "/api/guidance/response" ? "Buffered (HTTP stream → full body)" : "No (single response)",
    "",
    "── Routing flags ──",
    `Two-phase bridge: ${ctx.twoPhaseBridge ? "YES" : "no"}`,
    `Follow-up mode: ${ctx.followUpMode ? "YES" : "no"}`,
    "",
    "── Runtime subsystems ──",
    `Session Mind updated: ${sessionMindUpdated ? "YES" : "no"} (v${h?.mindVersion ?? "—"}, source=${h?.stateSource ?? "n/a"})`,
    `Memory Orchestrator: ${memoryOrchestratorRan ? "YES" : "no"} (retrievalChars=${h?.memoryRetrievalChars ?? 0})`,
    `Planner executed: ${plannerRan ? "YES" : "no"}`,
    `Anti-Repetition gates: ${antiRepetitionRan ? "YES" : "no"}${gates.length ? ` [${gates.join(", ")}]` : ""}`,
    "",
    fullRuntime ? "✅ Full Philip Runtime Active" : "⚠️ Legacy Phase1 Only",
    "",
  ];

  console.log(lines.join("\n"));
}
