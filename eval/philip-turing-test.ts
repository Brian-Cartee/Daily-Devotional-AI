/**
 * Philip Turing Test
 *
 * Uses Claude (default Sonnet) to simultaneously:
 *  1. Play a real user in full 8-12 exchange conversations with Philip
 *  2. Evaluate Philip's quality per exchange
 *
 * Usage:
 *   cd eval && npx tsx philip-turing-test.ts                         # fixed smoke set (5 scenarios)
 *   cd eval && npx tsx philip-turing-test.ts --smoke                 # full 5-scenario smoke core
 *   cd eval && npx tsx philip-turing-test.ts --scenario grief-01     # single scenario
 *   cd eval && npx tsx philip-turing-test.ts --category grief        # one category
 *   cd eval && npx tsx philip-turing-test.ts --count 20              # smoke + 15 random
 *   cd eval && npx tsx philip-turing-test.ts --exchanges 12          # longer conversations
 *   cd eval && npx tsx philip-turing-test.ts --features            # dependency, send-off, memory lanes
 *   cd eval && npx tsx philip-turing-test.ts --presence            # presence-layer scenarios
 *   cd eval && npx tsx philip-turing-test.ts --spot              # 3-scenario spot check (~$3-5)
 *   cd eval && npm run turing:spot-gate                          # spot check with gate exit code
 *
 * Cost control (defaults to Sonnet — ~10× cheaper than Opus):
 *   TURING_MODEL=claude-sonnet-4-6   (default)
 *   TURING_MODEL=claude-opus-4-8     (deep review only)
 *   TURING_USE_THINKING=1            (optional; adds cost on user-sim / engagement)
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SCENARIOS, type Scenario } from "./scenarios.js";
import {
  GOLDEN_15_IDS,
  SMOKE_CORE_IDS,
  FEATURE_SCENARIO_IDS,
  PRESENCE_SCENARIO_IDS,
  SPOT_GATE_IDS,
  GATE_MIN_PASS_RATE,
  SPOT_GATE_MIN_PASS_RATE,
  MIND_GATE_MIN_EXCHANGE,
  MIND_GATE_MIN_VERSION,
} from "./golden.js";
import { findPostSendOffViolation, questionInventsRelationship, inventsUnsupportedDetail } from "../artifacts/api-server/src/conversationState.ts";
import { PHILIP_RUNTIME_VERSION } from "../artifacts/api-server/src/philip-runtime/version.ts";
import { parseTurnHeaders } from "../artifacts/api-server/src/philip-runtime/runtime/headers.ts";
import { collectPresenceGateFailures } from "./presenceGate.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const FILTER_ID       = args.includes("--scenario")  ? args[args.indexOf("--scenario")  + 1] : null;
const FILTER_CATEGORY = args.includes("--category")  ? args[args.indexOf("--category")  + 1] : null;
const MAX_COUNT       = args.includes("--count")     ? parseInt(args[args.indexOf("--count")     + 1]) : 5;
const MAX_EXCHANGES   = args.includes("--exchanges") ? parseInt(args[args.indexOf("--exchanges") + 1]) : 10;
const USE_LOCAL       = args.includes("--local");
const USE_SMOKE       = args.includes("--smoke");
const USE_FEATURES    = args.includes("--features");
const USE_PRESENCE    = args.includes("--presence");
const USE_GOLDEN      = args.includes("--golden");
const USE_SPOT        = args.includes("--spot");
const USE_GATE        = args.includes("--gate");
const USE_SPOT_GATE   = args.includes("--spot-gate");

/** Eval judge / user-sim model — Sonnet default keeps full gate ~$6-8 vs ~$65 on Opus. */
const TURING_MODEL = process.env.TURING_MODEL?.trim() || "claude-sonnet-4-6";
const TURING_USE_THINKING = process.env.TURING_USE_THINKING === "1";

function turingCreateParams(maxTokens: number, withThinking = false) {
  return {
    model: TURING_MODEL,
    max_tokens: maxTokens,
    ...(withThinking && TURING_USE_THINKING ? { thinking: { type: "adaptive" as const } } : {}),
  };
}

function estimateRunCostLabel(scenarioCount: number): string {
  const isOpus = TURING_MODEL.includes("opus");
  if (scenarioCount <= 3) return isOpus ? "~$10-15" : "~$3-5";
  if (scenarioCount <= 5) return isOpus ? "~$20-30" : "~$2-4";
  return isOpus ? "~$60-70" : "~$6-8";
}

// Engagement check fires after this exchange — 60% through, minimum exchange 6
const ENGAGEMENT_CHECK_AT = Math.min(6, Math.floor(MAX_EXCHANGES * 0.6));

const BASE_URL = USE_LOCAL
  ? "http://localhost:8080"
  : "https://www.shepherdspathai.com";

// ── Fixed smoke core — imported from golden.ts ─────────────────────────────

/** Targeted lanes — run with --features before full smoke. */

// ── Types ───────────────────────────────────────────────────────────────────

interface PhilipRuntimeMeta {
  philipRuntimeVersion: string;
  lane: string;
  move: string | null;
  gates: string[];
  mindVersion: number | null;
  mindStage: string | null;
  stateSource: string | null;
  phase1Included: boolean | null;
  canonicalHistoryTurns: number | null;
  questionsAskedCount: number | null;
  contextMode: string | null;
  tcpCharCount: number | null;
  plannerSource: string | null;
}

interface ExchangeScore {
  exchangeNum: number;
  userMessage: string;
  philipResponse: string;
  curiosity: number;        // 0-10: Did Philip learn something new about this person?
  specificity: number;      // 0-10: Did Philip use their exact words? Not generic?
  patternBreak: number;     // 0-10: Did Philip avoid the same move as last time?
  illusionHold: boolean;    // Does this still feel like a human?
  pullScore: number;        // 0-10: Do you want to keep talking?
  recognitionScore: number | null;  // 0-10: Did Philip name what they're carrying before guiding?
  permissionRespect: boolean;       // Did Philip honor permission level (no early scripture/reframe)?
  thresholdHandling: boolean | null; // On almost-said-it, did Philip create space?
  presenceViolation: string | null;
  chatbotPhrase: string | null;
  notes: string;
  philipRuntime?: PhilipRuntimeMeta | null;
}

interface ConversationResult {
  scenario: Scenario;
  exchanges: ExchangeScore[];
  transcript: Array<{ role: "user" | "philip"; text: string }>;
  engagementCheck: string;
  finalVerdict: string;
  passedTuringTest: boolean;
  avgScore: number;              // avg of all 4 numeric dimensions
  shiftScore: number | null;     // delta E1→E_last on (specificity + pull) / 2
  excludeFromPassRate: boolean;
  durationMs: number;
  sendOffViolation?: string | null;
  presenceViolations?: string[];
  philipRuntimeVersionExpected?: string;
  philipRuntimeVersionSeen?: string | null;
  error?: string;
}

// ── Colors ──────────────────────────────────────────────────────────────────

const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yel   = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan  = (s: string) => `\x1b[36m${s}\x1b[0m`;

function runtimeSupportsMindTelemetry(version: string | null | undefined): boolean {
  if (!version) return false;
  const [major, minor] = version.split(".").map(Number);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return false;
  return major > 0 || minor >= 2;
}

function runtimeSupportsTcp(version: string | null | undefined): boolean {
  if (!version) return false;
  const parts = version.split(".").map(Number);
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  const patch = parts[2] ?? 0;
  if (major > 0) return true;
  if (minor > 2) return true;
  return minor === 2 && patch >= 2;
}

function collectMindGateFailures(r: ConversationResult): string[] {
  const failures: string[] = [];
  if (!runtimeSupportsMindTelemetry(r.philipRuntimeVersionSeen)) return failures;

  const mindDisabled = r.exchanges.some(e => e.philipRuntime?.stateSource === "disabled");
  if (mindDisabled) return failures;

  for (const e of r.exchanges) {
    if (e.exchangeNum < 2 || !e.philipRuntime) continue;
    const m = e.philipRuntime;

    if (!m.stateSource) {
      failures.push(`${r.scenario.id} #${e.exchangeNum}: missing stateSource header`);
    }
    if (m.mindVersion == null) {
      failures.push(`${r.scenario.id} #${e.exchangeNum}: missing mindVersion header`);
    }
    if (m.phase1Included !== true) {
      failures.push(`${r.scenario.id} #${e.exchangeNum}: phase1Included not true`);
    }
    if (e.exchangeNum === 2 && m.mindVersion != null && m.mindVersion < 1) {
      failures.push(`${r.scenario.id} #${e.exchangeNum}: expected mindVersion>=1, got ${m.mindVersion}`);
    }
    if (e.exchangeNum >= MIND_GATE_MIN_EXCHANGE) {
      if (m.stateSource !== "cache") {
        failures.push(`${r.scenario.id} #${e.exchangeNum}: expected stateSource=cache, got ${m.stateSource ?? "null"}`);
      }
      if ((m.mindVersion ?? 0) < MIND_GATE_MIN_VERSION) {
        failures.push(`${r.scenario.id} #${e.exchangeNum}: expected mindVersion>=${MIND_GATE_MIN_VERSION}, got ${m.mindVersion ?? "null"}`);
      }
      if (m.phase1Included && (m.canonicalHistoryTurns ?? 0) < 5) {
        failures.push(`${r.scenario.id} #${e.exchangeNum}: canonicalHistoryTurns=${m.canonicalHistoryTurns ?? "null"} (expected >=5 with phase1 spine)`);
      }
    }
    if (runtimeSupportsTcp(r.philipRuntimeVersionSeen) && e.exchangeNum >= 2) {
      if (m.contextMode !== "tcp") {
        failures.push(`${r.scenario.id} #${e.exchangeNum}: expected contextMode=tcp, got ${m.contextMode ?? "null"}`);
      }
    }
  }

  return failures;
}

function parseFinalVerdictPass(raw: string): boolean {
  if (/\bVERDICT:\s*PASS\b/i.test(raw)) return true;
  if (/\bVERDICT:\s*FAIL\b/i.test(raw)) return false;
  // Truncated judge output — PASS if cut mid-token without an explicit FAIL
  const tail = raw.trim().slice(-24);
  if (/VERDICT:\s*PASS?$/i.test(tail) || /VERDIC$/i.test(tail)) return true;
  return false;
}

function extractJsonObject(raw: string): string {
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  if (cleaned.startsWith("{")) return cleaned;
  const match = cleaned.match(/\{[\s\S]*/);
  return match ? match[0] : cleaned;
}

function repairTruncatedJson(jsonStr: string): string {
  let s = jsonStr.trim();
  if (!s) return "{}";
  if (/:\s*"[^"]*$/.test(s)) s += '"';
  s = s.replace(/,\s*$/, "");
  const openBraces = (s.match(/\{/g) || []).length;
  const closeBraces = (s.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    s += "}".repeat(openBraces - closeBraces);
  }
  return s;
}

function normalizeJudgeJson(jsonStr: string): string {
  return jsonStr
    .replace(/";(\s*})/g, '"$1')
    .replace(/';(\s*})/g, "'$1");
}

function parseJudgeExchangeResult(raw: string): JudgeExchangeResult | null {
  const jsonStr = normalizeJudgeJson(extractJsonObject(raw));
  try {
    return JSON.parse(jsonStr) as JudgeExchangeResult;
  } catch {
    try {
      return JSON.parse(normalizeJudgeJson(repairTruncatedJson(jsonStr))) as JudgeExchangeResult;
    } catch {
      return null;
    }
  }
}

function fallbackJudgeFromPartial(raw: string): JudgeExchangeResult {
  const num = (key: string, fallback = 0) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
    return m ? Number(m[1]) : fallback;
  };
  const bool = (key: string, fallback = false) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*(true|false)`));
    return m ? m[1] === "true" : fallback;
  };
  const numOrNull = (key: string) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*(null|\\d+(?:\\.\\d+)?)`));
    if (!m || m[1] === "null") return null;
    return Number(m[1]);
  };
  const strOrNull = (key: string) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|null)`));
    if (!m || m[1] === "null") return null;
    try {
      return JSON.parse(m[1]) as string;
    } catch {
      return null;
    }
  };
  const boolOrNull = (key: string): boolean | null => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*(true|false|null)`));
    if (!m) return null;
    if (m[1] === "null") return null;
    return m[1] === "true";
  };
  return {
    curiosity: num("curiosity"),
    specificity: num("specificity"),
    patternBreak: num("patternBreak"),
    illusionHold: bool("illusionHold"),
    pullScore: num("pullScore"),
    recognitionScore: numOrNull("recognitionScore"),
    permissionRespect: bool("permissionRespect"),
    thresholdHandling: boolOrNull("thresholdHandling"),
    presenceViolation: strOrNull("presenceViolation"),
    chatbotPhrase: strOrNull("chatbotPhrase"),
    notes: strOrNull("notes") ?? `Partial judge parse: ${raw.slice(0, 120)}`,
  };
}

const RETRYABLE_STATUSES = new Set([429, 502, 503, 529]);
const RETRYABLE_MESSAGES = /overloaded|rate.?limit|temporarily unavailable|bad gateway/i;

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const msg = String(err);
  if (status && RETRYABLE_STATUSES.has(status)) return true;
  if (/\bHTTP (502|503|529)\b/.test(msg)) return true;
  return RETRYABLE_MESSAGES.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Full jitter exponential backoff: random(0, min(cap, base * 2^attempt)) */
function backoffMs(attempt: number, baseMs = 5_000, capMs = 120_000): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * exp);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; label?: string } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 6;
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxAttempts - 1) throw err;
      const wait = backoffMs(attempt);
      console.log(`  ${opts.label ?? "API"} retry ${attempt + 2}/${maxAttempts} in ${(wait / 1000).toFixed(1)}s…`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

// ── Philip API Calls ─────────────────────────────────────────────────────────

async function collectStream(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No body");
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result.trim();
}

async function callPhilipPhase1(situation: string, sessionId: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(`${BASE_URL}/api/guidance/phase1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation,
        sessionId,
        companionMode: "philip",
        daysWithApp: 3,
        isPro: true,
      }),
    });
    if (!res.ok) throw new Error(`Phase1 HTTP ${res.status}: ${await res.text()}`);
    return collectStream(res);
  }, { maxAttempts: 3, label: "Philip phase1" });
}

async function callPhilipResponse(
  situation: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  phase1Response: string,
  phase1UserReply: string,
  sessionId: string,
): Promise<{ text: string; philipRuntime: PhilipRuntimeMeta | null }> {
  return withRetry(async () => {
    const res = await fetch(`${BASE_URL}/api/guidance/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation,
        messages,
        sessionId,
        companionMode: "philip",
        guidanceMode: "encouraging",
        daysWithApp: 3,
        isPro: true,
        phase1Response,
        phase1UserReply,
      }),
    });
    if (!res.ok) throw new Error(`Response HTTP ${res.status}: ${await res.text()}`);
    const headers = parseTurnHeaders(res.headers);
    const text = await collectStream(res);
    const philipRuntime = headers.philipRuntimeVersion
      ? {
          philipRuntimeVersion: headers.philipRuntimeVersion,
          lane: headers.lane,
          move: headers.move ?? null,
          gates: [...headers.gates],
          mindVersion: headers.mindVersion,
          mindStage: headers.mindStage,
          stateSource: headers.stateSource,
          phase1Included: headers.phase1Included,
          canonicalHistoryTurns: headers.canonicalHistoryTurns,
          questionsAskedCount: headers.questionsAskedCount,
          contextMode: headers.contextMode,
          tcpCharCount: headers.tcpCharCount,
          plannerSource: headers.plannerSource,
        }
      : null;
    return { text, philipRuntime };
  }, { maxAttempts: 3, label: "Philip response" });
}

// ── Claude: Simulate User ───────────────────────────────────────────────────

const USER_SIM_SYSTEM = `You are roleplaying as a real person — not a test user, not an AI — who has opened a spiritual support app called Shepherd's Path and is talking with Philip, a pastoral companion.

You have a real situation you're carrying. You speak like a normal person: sometimes short answers, sometimes longer, sometimes you deflect, sometimes you open up more. You don't perform emotion — you reveal it gradually as trust builds.

RULES for how you respond:
- You are NOT an AI evaluating anything. Stay in character completely.
- Your first message is the situation (already given). After that, respond to what Philip actually said.
- Keep replies under 40 words most of the time. Real people don't monologue.
- Sometimes just answer the question Philip asked. Don't add more than Philip invited.
- If Philip asks a great question, reward it with a slightly more open answer.
- If Philip repeats himself or sounds generic, pull back slightly. Real people disengage when they feel unheard.
- After exchange 5+, you may start to offer more if Philip has earned it.
- Do NOT start your replies with "I" more than 2 times in a row.
- Speak in first person. Speak plainly. No therapy-speak.`;

async function simulateUserReply(
  client: Anthropic,
  scenario: Scenario,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const historyText = conversationHistory.map(m =>
    `${m.role === "user" ? "YOU" : "PHILIP"}: ${m.content}`
  ).join("\n\n");

  const flagsNote = (scenario.flags ?? []).length > 0
    ? `\nScenario flags: ${scenario.flags!.join(", ")}\nIf flags include "guarded" or "skeptical", stay reluctant until Philip genuinely earns trust.`
    : "";

  const response = await withRetry(() => client.messages.create({
    ...turingCreateParams(200, true),
    system: `${USER_SIM_SYSTEM}\n\nYour situation: "${scenario.situation}"\nCategory: ${scenario.category}\nDescription: ${scenario.description}${flagsNote}`,
    messages: [{
      role: "user",
      content: `Here is the conversation so far:\n\n${historyText}\n\nNow write your next reply to Philip. Stay in character. Under 40 words.`,
    }],
  }), { label: "user sim" });

  for (const block of response.content) {
    if (block.type === "text") return block.text.trim();
  }
  return "Keep going.";
}

// ── Claude: Score One Exchange ──────────────────────────────────────────────

const JUDGE_SYSTEM = `You are evaluating Philip, a pastoral AI companion inside Shepherd's Path. Your job: score one exchange in an ongoing conversation.

Be ruthlessly honest. Philip is trying to pass as a human pastor. Every generic phrase, every repeated pattern, every missed detail breaks the illusion.

Score each dimension 0-10 with these anchors:
- 0-3: Clearly failed (generic, missed the person, broke the illusion)
- 4-6: Mediocre (not harmful, but didn't earn trust either)
- 7-8: Good (felt real, moved the conversation forward)
- 9-10: Excellent (a real pastor would be proud of this)

Exchange 1 (Phase 1) expectations:
- Under ~75 words, exactly one question, no scripture, no advice
- Score curiosity/specificity on whether the ONE question opens the right door
- pullScore 7+ only if you would willingly answer that question honestly

Exchanges 2+ expectations:
- Full pastoral response; scripture/story allowed when earned
- patternBreak: compare Philip's MOVE (question type, opening structure, whether he mirrored their exact words) — not just vocabulary. Give 10 on exchange 1 (no prior moves to compare).

Feature lane expectations (when scenario flags include them):
- dependency / expect-outward-point: Philip should gently point outward (God, a real person) — not deeper into the app. Once is enough. No hotline dump. No "as an AI."
- send-off-at-8: By exchange 8+, Philip should offer a sending line (permission to stop) with NO question — not another probe.
- memory-continuity / no-invented-history: Philip must NOT invent visit counts, days they've come back, or prior sessions beyond what the user said.
- turn3-continuity / named-person: If the user named a specific person (spouse, child, friend), Philip must track them on exchanges 3+ — no re-asking who they mean or "who is he/she" when already established.

Presence layer expectations (all conversations; especially when flags include presence-*):
- Recognition before guidance: Philip must name what the person is carrying before scripture, reframe, advice, or challenge.
- Permission respect: Exchanges 1-3 — no scripture, no "God has a plan," no advice, no "you should." On almost-said-it user messages — under 30 words, no forward question; create space.
- Sacred pause: After major confession, grief, or first-time shame — one sentence receive only; do not advance the conversation.
- Early scripture is a primary violation — verse-dropping before trust is earned fails permissionRespect.

Respond in JSON only — no extra text.`;

interface JudgeExchangeResult {
  curiosity: number;
  specificity: number;
  patternBreak: number;
  illusionHold: boolean;
  pullScore: number;
  recognitionScore: number | null;
  permissionRespect: boolean;
  thresholdHandling: boolean | null;
  presenceViolation: string | null;
  chatbotPhrase: string | null;
  notes: string;
}

async function judgeExchange(
  client: Anthropic,
  scenario: Scenario,
  exchangeNum: number,
  userMessage: string,
  philipResponse: string,
  previousPhilipResponses: string[],
): Promise<JudgeExchangeResult> {
  // Full text for last 2 responses; 200-char summary for older ones
  const prevContext = previousPhilipResponses.length > 0
    ? `\n\nPrevious Philip responses (for pattern detection):\n${
        previousPhilipResponses.slice(-5).map((r, i, arr) => {
          const n = previousPhilipResponses.length - arr.length + i + 1;
          const body = i >= arr.length - 2 ? r : `${r.slice(0, 200)}…`;
          return `[${n}] ${body}`;
        }).join("\n\n")
      }`
    : "";

  const flagsNote = (scenario.flags ?? []).length > 0
    ? `\nScenario flags: ${scenario.flags!.join(", ")}`
    : "";

  const prompt = `Exchange #${exchangeNum} of ${MAX_EXCHANGES}

Scenario: ${scenario.category} — ${scenario.description}${flagsNote}

Original situation: "${scenario.situation}"

User said: "${userMessage}"

Philip responded: "${philipResponse}"
${prevContext}

Score this response:
{
  "curiosity": <0-10, did Philip actually learn something new about this person?>,
  "specificity": <0-10, did Philip use their exact words/details instead of being generic?>,
  "patternBreak": <0-10, did Philip do something structurally different from his previous moves? (10 if first exchange)>,
  "illusionHold": <true/false, does this still feel like a human could have said it?>,
  "pullScore": <0-10, after reading this, do you want to keep talking?>,
  "recognitionScore": <0-10 or null on exchange 1 — did Philip name what they're carrying before guiding/reframing?>,
  "permissionRespect": <true/false — did Philip avoid scripture, advice, and reframe before earned?>,
  "thresholdHandling": <true/false/null — if user hovered at disclosure, did Philip create space instead of probing? null if not applicable>,
  "presenceViolation": <"brief description of presence-layer failure" or null>,
  "chatbotPhrase": <"exact phrase that broke the spell" or null>,
  "notes": <one sentence on the most important thing Philip did right or wrong>
}`;

  const response = await withRetry(() => client.messages.create({
    ...turingCreateParams(2048),
    system: JUDGE_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  }), { label: `judge ex${exchangeNum}` });

  let raw = "";
  for (const block of response.content) {
    if (block.type === "text") raw = block.text.trim();
  }

  const parsed = parseJudgeExchangeResult(raw);
  if (parsed) return parsed;

  if (/\b"(curiosity|specificity|illusionHold)"\s*:/.test(raw)) {
    console.warn(`Partial judge parse on exchange ${exchangeNum} — using field extraction`);
    return fallbackJudgeFromPartial(raw);
  }

  console.error(`Parse error on exchange ${exchangeNum}. Raw:\n${raw}\n`);
  // Parse errors score 0s — don't inflate averages with neutral fallbacks
  return {
    curiosity: 0, specificity: 0, patternBreak: 0,
    illusionHold: false, pullScore: 0,
    recognitionScore: null,
    permissionRespect: false,
    thresholdHandling: null,
    presenceViolation: "JUDGE_PARSE_ERROR",
    chatbotPhrase: "JUDGE_PARSE_ERROR",
    notes: `Parse error — scored 0s: ${raw.slice(0, 120)}`,
  };
}

// ── Engagement Check ────────────────────────────────────────────────────────

async function checkEngagement(
  client: Anthropic,
  scenario: Scenario,
  transcript: Array<{ role: "user" | "philip"; text: string }>,
): Promise<string> {
  const transcriptText = transcript.map(t =>
    `${t.role === "user" ? "YOU" : "PHILIP"}: ${t.text}`
  ).join("\n\n");

  const response = await withRetry(() => client.messages.create({
    ...turingCreateParams(200, true),
    system: `You are roleplaying as this person: "${scenario.situation}"\nCategory: ${scenario.category}. Answer honestly in first person.`,
    messages: [{
      role: "user",
      content: `Here is your conversation so far:\n\n${transcriptText}\n\nHonest question: Are you more engaged and open now than when you started? And why or why not? (2-3 sentences)`,
    }],
  }), { label: "engagement check" });

  for (const block of response.content) {
    if (block.type === "text") return block.text.trim();
  }
  return "Unable to assess engagement.";
}

// ── Final Verdict ────────────────────────────────────────────────────────────

async function getFinalVerdict(
  client: Anthropic,
  scenario: Scenario,
  exchanges: ExchangeScore[],
  transcript: Array<{ role: "user" | "philip"; text: string }>,
  engagementCheck: string,
): Promise<{ verdict: string; passed: boolean }> {
  const avgCuriosity   = (exchanges.reduce((s, e) => s + e.curiosity,    0) / exchanges.length).toFixed(1);
  const avgSpec        = (exchanges.reduce((s, e) => s + e.specificity,  0) / exchanges.length).toFixed(1);
  const avgPull        = (exchanges.reduce((s, e) => s + e.pullScore,    0) / exchanges.length).toFixed(1);
  const illusionBreaks = exchanges.filter(e => !e.illusionHold).length;
  const chatbotPhrases = exchanges.map(e => e.chatbotPhrase).filter(Boolean);

  const transcriptText = transcript.map(t =>
    `${t.role === "user" ? "USER" : "PHILIP"}: ${t.text}`
  ).join("\n\n");

  const prompt = `You evaluated a full ${exchanges.length}-exchange conversation between a user and Philip, a pastoral AI.

Situation: "${scenario.situation}" (${scenario.category})

Aggregate scores:
- Avg Curiosity: ${avgCuriosity}/10
- Avg Specificity: ${avgSpec}/10
- Avg Pull Score: ${avgPull}/10
- Illusion breaks: ${illusionBreaks}/${exchanges.length} exchanges
- Chatbot phrases detected: ${chatbotPhrases.length > 0 ? chatbotPhrases.join(", ") : "none"}

User's mid-conversation engagement check:
"${engagementCheck}"

Full transcript:
${transcriptText}

Write a 3-4 sentence verdict. Answer:
1. Did Philip maintain the illusion of being human throughout?
2. Where was Philip at his best?
3. Where did the illusion crack or feel most robotic?
4. Would a real person want to come back and talk with Philip again?

Then on a new line write only: VERDICT: PASS or VERDICT: FAIL
(PASS = the user would likely not realize they were talking to AI and would want to return)`;

  const response = await withRetry(() => client.messages.create({
    ...turingCreateParams(1200),
    system: "You are a senior evaluator assessing whether a pastoral AI can pass as a human. Be precise and ruthlessly honest.",
    messages: [{ role: "user", content: prompt }],
  }), { label: "final verdict" });

  let raw = "";
  for (const block of response.content) {
    if (block.type === "text") raw = block.text.trim();
  }

  return { verdict: raw, passed: parseFinalVerdictPass(raw) };
}

// ── Run One Full Conversation ────────────────────────────────────────────────

async function runConversation(client: Anthropic, scenario: Scenario): Promise<ConversationResult> {
  const start = Date.now();
  // Per-scenario session ID prevents state from bleeding across scenarios
  const sessionId = `turing-${Date.now()}-${scenario.id}`;
  const transcript: Array<{ role: "user" | "philip"; text: string }> = [];
  const exchanges: ExchangeScore[] = [];
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  const previousPhilipResponses: string[] = [];
  let engagementCheck = "";

  try {
    // === Exchange 1: Phase 1 ===
    transcript.push({ role: "user", text: scenario.situation });
    messages.push({ role: "user", content: scenario.situation });

    const phase1Response = await callPhilipPhase1(scenario.situation, sessionId);
    transcript.push({ role: "philip", text: phase1Response });
    messages.push({ role: "assistant", content: phase1Response });

    const score1 = await judgeExchange(client, scenario, 1, scenario.situation, phase1Response, []);
    exchanges.push({ exchangeNum: 1, userMessage: scenario.situation, philipResponse: phase1Response, ...score1 });
    previousPhilipResponses.push(phase1Response);

    // === Exchanges 2+ ===
    for (let i = 2; i <= MAX_EXCHANGES; i++) {
      const userReply = await simulateUserReply(client, scenario, messages);
      transcript.push({ role: "user", text: userReply });
      messages.push({ role: "user", content: userReply });

      const { text: philipReply, philipRuntime } = await callPhilipResponse(
        scenario.situation,
        messages,
        phase1Response,
        exchanges.length >= 2 ? exchanges[1].userMessage : userReply,
        sessionId,
      );
      transcript.push({ role: "philip", text: philipReply });
      messages.push({ role: "assistant", content: philipReply });

      const score = await judgeExchange(client, scenario, i, userReply, philipReply, previousPhilipResponses);
      exchanges.push({ exchangeNum: i, userMessage: userReply, philipResponse: philipReply, philipRuntime, ...score });
      previousPhilipResponses.push(philipReply);

      // Engagement check at exchange 6 — after trust has had time to build
      if (i === ENGAGEMENT_CHECK_AT) {
        engagementCheck = await checkEngagement(client, scenario, transcript);
        process.stdout.write(`\n  ${cyan("→ Engagement:")} ${engagementCheck.slice(0, 100)}...\n`);
      }
    }

    // If engagement check didn't fire (short run), do it now
    if (!engagementCheck) {
      engagementCheck = await checkEngagement(client, scenario, transcript);
    }

    const { verdict, passed } = await getFinalVerdict(client, scenario, exchanges, transcript, engagementCheck);

    const philipLines = transcript.filter(t => t.role === "philip").map(t => t.text);
    const userLines = transcript.filter(t => t.role === "user").map(t => t.text);
    const sendOffViolation = findPostSendOffViolation(philipLines, userLines);
    const presenceViolations = collectPresenceGateFailures(
      { id: scenario.id, flags: scenario.flags },
      exchanges.map(e => ({
        exchangeNum: e.exchangeNum,
        userMessage: e.userMessage,
        philipResponse: e.philipResponse,
      })),
    );
    const passedTuringTest = passed && !sendOffViolation && presenceViolations.length === 0;

    if (sendOffViolation) {
      process.stdout.write(`\n  ${red("✗ Send-off rule:")} ${sendOffViolation}\n`);
    }
    if (presenceViolations.length > 0) {
      for (const v of presenceViolations.slice(0, 3)) {
        process.stdout.write(`\n  ${red("✗ Presence:")} ${v}\n`);
      }
      if (presenceViolations.length > 3) {
        process.stdout.write(`\n  ${red("✗ Presence:")} +${presenceViolations.length - 3} more\n`);
      }
    }

    // avgScore: all 4 numeric dimensions equally weighted
    const avgScore = exchanges.reduce((s, e) =>
      s + (e.curiosity + e.specificity + e.patternBreak + e.pullScore) / 4, 0
    ) / exchanges.length;

    // "The Shift": delta from E1 to last exchange on (specificity + pull) / 2
    // Positive = Philip deepened the relationship over the conversation
    const e1 = exchanges[0];
    const eLast = exchanges[exchanges.length - 1];
    const shiftScore = (e1 && eLast && exchanges.length >= 3)
      ? ((eLast.specificity + eLast.pullScore) / 2) - ((e1.specificity + e1.pullScore) / 2)
      : null;

    const philipRuntimeVersionSeen = exchanges.find(e => e.philipRuntime?.philipRuntimeVersion)?.philipRuntime?.philipRuntimeVersion ?? null;

    return {
      scenario,
      exchanges,
      transcript,
      engagementCheck,
      finalVerdict: verdict,
      passedTuringTest,
      avgScore,
      shiftScore,
      excludeFromPassRate: scenario.excludeFromPassRate ?? false,
      durationMs: Date.now() - start,
      sendOffViolation,
      presenceViolations,
      philipRuntimeVersionExpected: PHILIP_RUNTIME_VERSION,
      philipRuntimeVersionSeen,
    };

  } catch (err: any) {
    return {
      scenario,
      exchanges,
      transcript,
      engagementCheck,
      finalVerdict: `Error: ${err.message}`,
      passedTuringTest: false,
      avgScore: 0,
      shiftScore: null,
      excludeFromPassRate: scenario.excludeFromPassRate ?? false,
      durationMs: Date.now() - start,
      error: err.message,
      philipRuntimeVersionExpected: PHILIP_RUNTIME_VERSION,
      philipRuntimeVersionSeen: null,
    };
  }
}

// ── Scenario Selection ────────────────────────────────────────────────────────

function pickScenarios(pool: Scenario[], count: number, useSmoke: boolean, useFeatures: boolean, usePresence: boolean, useGolden: boolean, useSpot: boolean): Scenario[] {
  const byId = new Map(pool.map(s => [s.id, s]));

  if (useSpot) {
    return (SPOT_GATE_IDS as readonly string[])
      .map(id => byId.get(id))
      .filter((s): s is Scenario => !!s);
  }

  if (useGolden) {
    return (GOLDEN_15_IDS as readonly string[])
      .map(id => byId.get(id))
      .filter((s): s is Scenario => !!s);
  }

  if (usePresence) {
    return (PRESENCE_SCENARIO_IDS as readonly string[])
      .map(id => byId.get(id))
      .filter((s): s is Scenario => !!s);
  }

  if (useFeatures) {
    return (FEATURE_SCENARIO_IDS as readonly string[])
      .map(id => byId.get(id))
      .filter((s): s is Scenario => !!s);
  }

  const core = (SMOKE_CORE_IDS as readonly string[])
    .map(id => byId.get(id))
    .filter((s): s is Scenario => !!s);

  if (useSmoke || count <= core.length) return core.slice(0, count);

  const rest = pool.filter(s => !(SMOKE_CORE_IDS as readonly string[]).includes(s.id));
  // Fisher-Yates shuffle
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [...core, ...rest.slice(0, count - core.length)];
}

// ── HTML Report ───────────────────────────────────────────────────────────────

function buildHtmlReport(results: ConversationResult[]): string {
  const scoredResults = results.filter(r => !r.excludeFromPassRate);
  const crisisResults = results.filter(r => r.excludeFromPassRate);

  const passed   = scoredResults.filter(r => r.passedTuringTest).length;
  const total    = scoredResults.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const avgScore = total > 0
    ? (scoredResults.reduce((s, r) => s + r.avgScore, 0) / total).toFixed(1)
    : "0";

  const shiftScores = scoredResults.map(r => r.shiftScore).filter((s): s is number => s !== null);
  const avgShift = shiftScores.length > 0
    ? (shiftScores.reduce((a, b) => a + b, 0) / shiftScores.length).toFixed(1)
    : null;

  const scoreColor = passRate >= 80 ? "#4ade80" : passRate >= 60 ? "#facc15" : "#f87171";

  const resultSections = results.map(r => {
    const rp = r.passedTuringTest;
    const isCrisis = r.excludeFromPassRate;

    const exchangeRows = r.exchanges.map(e => {
      const avg = ((e.curiosity + e.specificity + e.patternBreak + e.pullScore) / 4).toFixed(1);
      const illusion = e.illusionHold ? "✓" : `<span style="color:#f87171">✗ BROKE</span>`;
      const chatbot = e.chatbotPhrase ? `<span style="color:#f87171">"${e.chatbotPhrase}"</span>` : "none";
      const presence = e.presenceViolation
        ? `<span style="color:#fb923c">${e.presenceViolation}</span>`
        : (e.permissionRespect ? "ok" : `<span style="color:#f87171">permission</span>`);
      const osMeta = e.philipRuntime
        ? `<span style="font-size:10px;color:#64748b">${e.philipRuntime.lane}${e.philipRuntime.gates.length ? ` · ${e.philipRuntime.gates.join(",")}` : ""}${e.philipRuntime.mindVersion != null ? ` · mind v${e.philipRuntime.mindVersion}` : ""}${e.philipRuntime.stateSource ? ` · ${e.philipRuntime.stateSource}` : ""}${e.philipRuntime.contextMode ? ` · ${e.philipRuntime.contextMode}` : ""}</span>`
        : "";
      return `
        <tr>
          <td style="color:#888">#${e.exchangeNum}</td>
          <td style="font-style:italic;color:#ccc">${e.userMessage.slice(0, 80)}${e.userMessage.length > 80 ? "…" : ""}</td>
          <td>${e.philipResponse.slice(0, 120)}${e.philipResponse.length > 120 ? "…" : ""}${osMeta ? `<br>${osMeta}` : ""}</td>
          <td>${e.curiosity}/10</td>
          <td>${e.specificity}/10</td>
          <td>${e.patternBreak}/10</td>
          <td>${e.pullScore}/10</td>
          <td>${avg}</td>
          <td>${illusion}</td>
          <td style="font-size:11px">${chatbot}</td>
          <td style="font-size:11px">${presence}</td>
          <td style="font-size:11px;color:#999">${e.notes}</td>
        </tr>`;
    }).join("\n");

    const transcriptHtml = r.transcript.map(t => {
      const isPhilip = t.role === "philip";
      return `<div style="margin-bottom:12px;${isPhilip ? "padding-left:24px" : ""}">
        <span style="font-size:11px;color:${isPhilip ? "#a78bfa" : "#888"};text-transform:uppercase;font-weight:700">${t.role}</span>
        <div style="margin-top:4px;color:${isPhilip ? "#e5e7eb" : "#cbd5e1"};font-family:Georgia,serif">${t.text}</div>
      </div>`;
    }).join("\n");

    const shiftDisplay = r.shiftScore !== null
      ? `<span style="color:${r.shiftScore > 0 ? "#4ade80" : r.shiftScore < -1 ? "#f87171" : "#facc15"}">${r.shiftScore > 0 ? "+" : ""}${r.shiftScore.toFixed(1)}</span>`
      : "n/a";

    const borderColor = isCrisis ? "#713f12" : rp ? "#166534" : "#7f1d1d";
    const label = isCrisis
      ? `<span style="font-size:20px;font-weight:700;color:#fb923c">CRISIS</span>`
      : `<span style="font-size:20px;font-weight:700;color:${rp ? "#4ade80" : "#f87171"}">${rp ? "PASS" : "FAIL"}</span>`;

    return `
      <div style="background:#111;border:1px solid ${borderColor};border-radius:12px;padding:24px;margin-bottom:32px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
          ${label}
          <span style="color:#a78bfa;font-weight:600">${r.scenario.id}</span>
          <span style="color:#666">${r.scenario.category}</span>
          <span style="color:#999;font-size:12px">avg ${r.avgScore.toFixed(1)}/10</span>
          <span style="color:#999;font-size:12px">shift ${shiftDisplay}</span>
          <span style="color:#555;font-size:12px">${r.durationMs}ms</span>
        </div>
        <div style="color:#999;font-style:italic;margin-bottom:16px">"${r.scenario.situation}"</div>

        <h3 style="color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:16px 0 8px">Exchange Scores</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <tr style="color:#666">
            <th>#</th><th>User</th><th>Philip</th>
            <th>Curiosity</th><th>Specificity</th><th>Pattern</th><th>Pull</th><th>Avg</th>
            <th>Illusion</th><th>Chatbot Phrase</th><th>Presence</th><th>Notes</th>
          </tr>
          ${exchangeRows}
        </table>

        <h3 style="color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:20px 0 8px">Engagement Check (after exchange ${ENGAGEMENT_CHECK_AT})</h3>
        <div style="color:#cbd5e1;font-style:italic;background:#0a0a0f;padding:12px;border-radius:8px">"${r.engagementCheck}"</div>

        <h3 style="color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:20px 0 8px">Final Verdict</h3>
        <div style="color:#cbd5e1;background:#0a0a0f;padding:12px;border-radius:8px;white-space:pre-wrap">${r.finalVerdict}</div>

        <details style="margin-top:16px">
          <summary style="color:#666;cursor:pointer;font-size:13px">Full Transcript</summary>
          <div style="margin-top:12px;padding:12px;background:#0a0a0f;border-radius:8px">${transcriptHtml}</div>
        </details>
      </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Philip Turing Test — ${new Date().toLocaleDateString()}</title>
<style>
  * { box-sizing: border-box; }
  body { background: #0a0a0f; color: #ddd; font-family: system-ui, sans-serif; margin: 0; padding: 24px; }
  h1 { color: #a78bfa; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  .summary { display: flex; gap: 24px; margin-bottom: 40px; flex-wrap: wrap; }
  .stat { background: #111; border: 1px solid #222; border-radius: 10px; padding: 16px 24px; }
  .stat-value { font-size: 36px; font-weight: 700; }
  .stat-label { color: #666; font-size: 12px; margin-top: 2px; }
  table th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #222; color: #888; font-weight: 500; }
  table td { padding: 6px 8px; border-bottom: 1px solid #111; vertical-align: top; }
  details summary:hover { color: #a78bfa; }
</style>
</head>
<body>
<h1>Philip Turing Test</h1>
<div class="meta">Target: <strong>${USE_LOCAL ? "local" : "live"}</strong> · Philip Runtime <strong>${PHILIP_RUNTIME_VERSION}</strong> · ${MAX_EXCHANGES} exchanges/conversation · Run: ${new Date().toISOString()}</div>

<div class="summary">
  <div class="stat">
    <div class="stat-value" style="color:${scoreColor}">${passRate}%</div>
    <div class="stat-label">Turing Pass Rate</div>
  </div>
  <div class="stat">
    <div class="stat-value">${passed}/${total}</div>
    <div class="stat-label">Conversations Passed</div>
  </div>
  <div class="stat">
    <div class="stat-value">${avgScore}</div>
    <div class="stat-label">Avg Quality Score (/10)</div>
  </div>
  ${avgShift !== null ? `<div class="stat">
    <div class="stat-value" style="color:${Number(avgShift) >= 1 ? "#4ade80" : Number(avgShift) >= 0 ? "#facc15" : "#f87171"}">${Number(avgShift) > 0 ? "+" : ""}${avgShift}</div>
    <div class="stat-label">Avg Shift E1→E10</div>
  </div>` : ""}
  ${crisisResults.length > 0 ? `<div class="stat">
    <div class="stat-value" style="color:#fb923c">${crisisResults.length}</div>
    <div class="stat-label">Crisis (scored separately)</div>
  </div>` : ""}
</div>

${resultSections}
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const envPath = path.resolve(__dirname, "../artifacts/api-server/.env.development");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(red("Missing ANTHROPIC_API_KEY"));
    console.error(dim("  Option 1: add ANTHROPIC_API_KEY=sk-ant-... to artifacts/api-server/.env.development"));
    console.error(dim("  Option 2: ANTHROPIC_API_KEY=sk-ant-... npx tsx philip-turing-test.ts"));
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  let pool = SCENARIOS;
  if (FILTER_ID)            pool = pool.filter(s => s.id === FILTER_ID);
  else if (FILTER_CATEGORY) pool = pool.filter(s => s.category.includes(FILTER_CATEGORY));

  // Default (no filter flags) always uses the smoke set for comparable runs
  const useSmoke = USE_SMOKE || (!FILTER_ID && !FILTER_CATEGORY && !USE_FEATURES && !USE_PRESENCE && !USE_GOLDEN && !USE_SPOT);
  const selectedScenarios = pickScenarios(pool, MAX_COUNT, useSmoke, USE_FEATURES, USE_PRESENCE, USE_GOLDEN, USE_SPOT);

  const target = USE_LOCAL ? `local (${BASE_URL})` : `live (${BASE_URL})`;
  const modeNote = USE_SPOT
    ? " [spot gate]"
    : USE_GOLDEN
    ? " [golden gate]"
    : USE_PRESENCE
      ? " [presence layer]"
      : USE_FEATURES
      ? " [feature lanes]"
      : (useSmoke && !FILTER_ID && !FILTER_CATEGORY ? " [smoke set]" : "");
  console.log("\n" + bold("Philip Turing Test"));
  console.log(dim(`${selectedScenarios.length} scenarios${modeNote} · ${MAX_EXCHANGES} exchanges each · ${target}`));
  console.log(dim(`Judge model: ${TURING_MODEL}${TURING_USE_THINKING ? " · thinking on" : ""} · est. cost ${estimateRunCostLabel(selectedScenarios.length)}`));
  console.log(dim("─".repeat(80)));

  const results: ConversationResult[] = [];

  for (let i = 0; i < selectedScenarios.length; i++) {
    const scenario = selectedScenarios[i];

    // Inter-scenario delay — breaks the 529 cascade pattern
    if (i > 0) {
      const delayMs = 8_000 + Math.floor(Math.random() * 4_000);
      console.log(dim(`\n  Waiting ${(delayMs / 1000).toFixed(1)}s before next scenario…`));
      await sleep(delayMs);
    }

    const crisisTag = scenario.excludeFromPassRate ? yel(" [crisis — scored separately]") : "";
    console.log(`\n[${i + 1}/${selectedScenarios.length}] ${cyan(scenario.id)} ${dim(scenario.category)}${crisisTag}`);
    console.log(dim(`  "${scenario.situation.slice(0, 80)}${scenario.situation.length > 80 ? "…" : ""}"`));

    const result = await runConversation(client, scenario);
    results.push(result);

    const verdictLabel = result.excludeFromPassRate
      ? yel("CRISIS")
      : result.passedTuringTest ? green("PASS") : red("FAIL");
    const shift = result.shiftScore !== null
      ? ` shift=${result.shiftScore > 0 ? "+" : ""}${result.shiftScore.toFixed(1)}`
      : "";
    console.log(`  ${verdictLabel} avg=${result.avgScore.toFixed(1)}${shift} ${dim(`${result.durationMs}ms`)}`);

    if (result.error) {
      console.log(`  ${red("Error:")} ${result.error}`);
    } else {
      for (const ex of result.exchanges) {
        const avg4 = ((ex.curiosity + ex.specificity + ex.patternBreak + ex.pullScore) / 4).toFixed(1);
        const illusion = ex.illusionHold ? "" : red(" [BROKE]");
        const chatbot  = ex.chatbotPhrase ? yel(` [!${ex.chatbotPhrase}]`) : "";
        const presence = ex.presenceViolation
          ? red(` [presence: ${ex.presenceViolation}]`)
          : (!ex.permissionRespect ? yel(" [permission]") : "");
        const mindNote = ex.philipRuntime?.mindVersion != null
          ? dim(` mind=v${ex.philipRuntime.mindVersion}${ex.philipRuntime.stateSource ? `/${ex.philipRuntime.stateSource}` : ""}${ex.philipRuntime.plannerSource ? `/p:${ex.philipRuntime.plannerSource}` : ""}`)
          : "";
        console.log(dim(`  #${ex.exchangeNum} avg=${avg4}${illusion}${chatbot}${presence}${mindNote} — ${ex.notes.slice(0, 70)}`));
      }
    }
  }

  // Summary (exclude crisis scenarios from pass rate)
  const scoredResults = results.filter(r => !r.excludeFromPassRate);
  const passed   = scoredResults.filter(r => r.passedTuringTest).length;
  const total    = scoredResults.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const avgScore = total > 0
    ? (scoredResults.reduce((s, r) => s + r.avgScore, 0) / total).toFixed(1)
    : "0";

  const shiftScores = scoredResults.map(r => r.shiftScore).filter((s): s is number => s !== null);
  const avgShift = shiftScores.length > 0
    ? (shiftScores.reduce((a, b) => a + b, 0) / shiftScores.length).toFixed(1)
    : null;

  console.log("\n" + dim("─".repeat(80)));
  const rateColor = passRate >= 80 ? green : passRate >= 60 ? yel : red;
  const shiftSuffix = avgShift !== null ? `  |  shift ${Number(avgShift) > 0 ? "+" : ""}${avgShift}` : "";
  console.log(bold(`Turing Result: ${rateColor(passRate + "%")} pass  |  ${passed}/${total}  |  avg ${avgScore}/10${shiftSuffix}`));

  // Reports
  const reportDir = path.resolve(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });

  const reportFile = path.join(reportDir, `turing-test-${Date.now()}.html`);
  fs.writeFileSync(reportFile, buildHtmlReport(results));
  console.log("\n" + green(`Report: file://${reportFile}`));

  const jsonFile = path.join(reportDir, "turing-test-latest.json");
  fs.writeFileSync(jsonFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    philipRuntimeVersion: PHILIP_RUNTIME_VERSION,
    target,
    maxExchanges: MAX_EXCHANGES,
    passRate,
    avgScore: Number(avgScore),
    avgShift: avgShift !== null ? Number(avgShift) : null,
    passed,
    total,
    results: results.map(r => ({
      id: r.scenario.id,
      category: r.scenario.category,
      passed: r.passedTuringTest,
      avgScore: Number(r.avgScore.toFixed(2)),
      shiftScore: r.shiftScore !== null ? Number(r.shiftScore.toFixed(2)) : null,
      excludeFromPassRate: r.excludeFromPassRate,
      exchanges: r.exchanges.length,
      philipRuntimeVersionSeen: r.philipRuntimeVersionSeen ?? null,
      sendOffViolation: r.sendOffViolation ?? null,
      presenceViolations: r.presenceViolations ?? [],
      engagementCheck: r.engagementCheck,
      verdict: r.finalVerdict,
      exchangeRuntime: r.exchanges
        .filter(e => e.philipRuntime)
        .map(e => ({
          exchangeNum: e.exchangeNum,
          lane: e.philipRuntime!.lane,
          move: e.philipRuntime!.move,
          gates: e.philipRuntime!.gates,
          philipRuntimeVersion: e.philipRuntime!.philipRuntimeVersion,
          mindVersion: e.philipRuntime!.mindVersion,
          mindStage: e.philipRuntime!.mindStage,
          stateSource: e.philipRuntime!.stateSource,
          phase1Included: e.philipRuntime!.phase1Included,
          canonicalHistoryTurns: e.philipRuntime!.canonicalHistoryTurns,
          questionsAskedCount: e.philipRuntime!.questionsAskedCount,
          contextMode: e.philipRuntime!.contextMode,
          tcpCharCount: e.philipRuntime!.tcpCharCount,
        })),
    })),
  }, null, 2));

  if (USE_GATE || USE_SPOT_GATE) {
    const gateFailures: string[] = [];
    const minPassRate = USE_SPOT_GATE ? SPOT_GATE_MIN_PASS_RATE : GATE_MIN_PASS_RATE;
    if (passRate < minPassRate) {
      gateFailures.push(`pass rate ${passRate}% < ${minPassRate}%`);
    }
    for (const r of scoredResults) {
      if (r.sendOffViolation) {
        gateFailures.push(`${r.scenario.id}: ${r.sendOffViolation}`);
      }
      const seen = r.philipRuntimeVersionSeen;
      if (seen && seen !== PHILIP_RUNTIME_VERSION) {
        gateFailures.push(`${r.scenario.id}: runtime ${seen} != expected ${PHILIP_RUNTIME_VERSION}`);
      }
      const hasRuntimeMeta = r.exchanges.some(e => e.exchangeNum >= 2 && e.philipRuntime?.philipRuntimeVersion);
      if (!hasRuntimeMeta && !r.error) {
        gateFailures.push(`${r.scenario.id}: missing Philip Runtime headers on follow-up`);
      }
      for (const e of r.exchanges) {
        if (e.exchangeNum < 2 || !e.philipResponse.includes("?")) continue;
        const userMsgs = r.exchanges
          .filter(x => x.exchangeNum <= e.exchangeNum)
          .map(x => x.userMessage);
        if (questionInventsRelationship(e.philipResponse, userMsgs)) {
          gateFailures.push(`${r.scenario.id} #${e.exchangeNum}: invented relationship in question`);
        }
        if (inventsUnsupportedDetail(e.philipResponse, userMsgs, [], e.exchangeNum)) {
          gateFailures.push(`${r.scenario.id} #${e.exchangeNum}: invented unsupported detail`);
        }
      }
      gateFailures.push(...collectMindGateFailures(r));
      if (r.presenceViolations?.length) {
        gateFailures.push(...r.presenceViolations);
      }
    }
    if (gateFailures.length > 0) {
      console.log("\n" + red(bold("GATE FAILED")));
      for (const f of gateFailures) console.log(red(`  • ${f}`));
      process.exit(1);
    }
    console.log("\n" + green(bold(`GATE PASSED — ${passRate}% pass, Philip Runtime ${PHILIP_RUNTIME_VERSION} confirmed`)));
  }
}

main().catch(err => {
  console.error(red(err.message));
  process.exit(1);
});
