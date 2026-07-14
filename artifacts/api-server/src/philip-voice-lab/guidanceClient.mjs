/**
 * Voice Lab → /api/guidance/response client (mirrors web guidanceConversationCore payloads).
 */

function apiBase() {
  return (process.env.PHILIP_VOICE_LAB_API_BASE || "http://127.0.0.1:8080").replace(/\/$/, "");
}

/** Candidate guidance brain base — the isolated lab service (:3101), NOT production. */
function guidanceApiBase() {
  return (
    process.env.PHILIP_VOICE_LAB_GUIDANCE_API_BASE ||
    process.env.PHILIP_VOICE_LAB_API_BASE ||
    "http://127.0.0.1:8080"
  ).replace(/\/$/, "");
}

/**
 * Media base for TTS only. Defaults to the production API on loopback (:3001).
 * Guidance-scope TTS skips customer listen policy; see callTts / roomLoop.
 */
export function mediaApiBase() {
  return (
    process.env.PHILIP_VOICE_LAB_MEDIA_API_BASE ||
    process.env.PHILIP_VOICE_LAB_GUIDANCE_API_BASE ||
    process.env.PHILIP_VOICE_LAB_API_BASE ||
    "http://127.0.0.1:3001"
  ).replace(/\/$/, "");
}

/**
 * Isolated lab STT base. Defaults to the lab API (:3101), NOT production :3001,
 * so private tests do not consume customer guidance-transcribe budgets.
 */
export function sttApiBase() {
  return (
    process.env.PHILIP_VOICE_LAB_STT_API_BASE ||
    process.env.PHILIP_VOICE_LAB_GUIDANCE_API_BASE ||
    process.env.PHILIP_VOICE_LAB_API_BASE ||
    "http://127.0.0.1:3101"
  ).replace(/\/$/, "");
}

export function labSecret() {
  return process.env.PHILIP_VOICE_LAB_SECRET?.trim() || "";
}

/**
 * Call the isolated candidate guidance brain (Conversation Front Door) on :3101.
 * @param {{ transcript: string; firstName?: string; state?: object|null; conversationId: string; sessionId: string }} opts
 * @returns {Promise<{ text: string; intent: string; lane: string; engine: string|null; reopened: boolean; personalMeaning: boolean; faithOffered: boolean; state: object; meta: object; httpStatus: number }>}
 */
export async function callCandidateGuidanceTurn(opts) {
  const secret = labSecret();
  const res = await fetch(`${guidanceApiBase()}/api/internal/philip-voice/guidance/turn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "X-Philip-Lab-Secret": secret } : {}),
    },
    body: JSON.stringify({
      transcript: opts.transcript,
      firstName: opts.firstName || undefined,
      state: opts.state ?? undefined,
      conversationId: opts.conversationId,
      sessionId: opts.sessionId,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`candidate guidance turn ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = JSON.parse(text);
  return { ...data, httpStatus: res.status };
}

const HEADER = {
  lane: "X-Philip-Lane",
  planner: "X-Philip-Planner-Source",
  kernel: "X-Philip-Identity-Kernel",
  context: "X-Philip-Context-Mode",
  memory: "X-Philip-Memory-Policy",
  mindStage: "X-Philip-Mind-Stage",
  mindVersion: "X-Philip-Mind-Version",
  stateSource: "X-Philip-State-Source",
  gates: "X-Philip-Gates",
  runtime: "X-Philip-Runtime-Version",
  conversationId: "X-Philip-Conversation-Id",
  canonicalTurns: "X-Philip-Canonical-Turns",
  memoryChars: "X-Philip-Memory-Retrieval-Chars",
  phase1Included: "X-Philip-Phase1-Included",
  questionsAsked: "X-Philip-Questions-Asked",
};

export function parsePhilipResponseHeaders(res) {
  const gatesRaw = res.headers.get(HEADER.gates) ?? "";
  const mindVersionRaw = res.headers.get(HEADER.mindVersion);
  return {
    lane: res.headers.get(HEADER.lane) ?? null,
    plannerSource: res.headers.get(HEADER.planner) ?? null,
    identityKernelMode: res.headers.get(HEADER.kernel) ?? null,
    contextMode: res.headers.get(HEADER.context) ?? null,
    memoryPolicy: res.headers.get(HEADER.memory) ?? null,
    mindStage: res.headers.get(HEADER.mindStage) ?? null,
    mindVersion: mindVersionRaw ? Number(mindVersionRaw) : null,
    stateSource: res.headers.get(HEADER.stateSource) ?? null,
    gates: gatesRaw ? gatesRaw.split(",").filter(Boolean) : [],
    runtimeVersion: res.headers.get(HEADER.runtime) ?? null,
    conversationId: res.headers.get(HEADER.conversationId) ?? null,
    canonicalHistoryTurns: Number(res.headers.get(HEADER.canonicalTurns) ?? "") || null,
    memoryRetrievalChars: Number(res.headers.get(HEADER.memoryChars) ?? "") || null,
    phase1Included: res.headers.get(HEADER.phase1Included) === "true",
    questionsAskedCount: Number(res.headers.get(HEADER.questionsAsked) ?? "") || null,
    safetyLevel: res.headers.get("X-Guidance-Safety") ?? null,
  };
}

async function readResponseText(res) {
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

/**
 * @param {{
 *   situation: string;
 *   messages: Array<{ role: string; content: string }>;
 *   sessionId: string;
 *   conversationId: string;
 *   phase1Response?: string;
 *   phase1UserReply?: string;
 *   turnEventContent?: string;
 *   daysWithApp?: number;
 *   isPro?: boolean;
 * }} opts
 */
export async function callGuidanceResponse(opts) {
  const body = {
    situation: opts.situation,
    messages: opts.messages,
    sessionId: opts.sessionId,
    conversationId: opts.conversationId,
    companionMode: "philip",
    guidanceMode: "encouraging",
    daysWithApp: opts.daysWithApp ?? 1,
    isPro: opts.isPro ?? false,
    philipVoiceLab: true,
  };

  if (opts.phase1Response?.trim()) body.phase1Response = opts.phase1Response.trim();
  if (opts.phase1UserReply?.trim()) body.phase1UserReply = opts.phase1UserReply.trim();
  if (opts.turnEventContent?.trim()) {
    body.turnEvent = {
      role: "user",
      content: opts.turnEventContent.trim(),
      clientTurnId: `voice-lab-${Date.now()}`,
    };
  }

  const res = await fetch(`${guidanceApiBase()}/api/guidance/response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const headers = parsePhilipResponseHeaders(res);
  const text = await readResponseText(res);

  if (!res.ok) {
    throw new Error(`guidance/response ${res.status}: ${text.slice(0, 200)}`);
  }

  return { text: text.trim(), headers, httpStatus: res.status };
}
