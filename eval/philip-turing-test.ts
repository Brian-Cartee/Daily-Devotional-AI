/**
 * Philip Turing Test
 *
 * Uses Claude Opus to simultaneously:
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
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SCENARIOS, type Scenario } from "./scenarios.js";
import { findPostSendOffViolation } from "../artifacts/api-server/src/conversationState.ts";
import { PHILIP_RUNTIME_VERSION } from "../artifacts/api-server/src/philip-runtime/version.ts";
import { parseTurnHeaders } from "../artifacts/api-server/src/philip-runtime/runtime/headers.ts";

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

// Engagement check fires after this exchange — 60% through, minimum exchange 6
const ENGAGEMENT_CHECK_AT = Math.min(6, Math.floor(MAX_EXCHANGES * 0.6));

const BASE_URL = USE_LOCAL
  ? "http://localhost:8080"
  : "https://www.shepherdspathai.com";

// ── Fixed smoke core — same 5 scenarios every default run ──────────────────
// Covers our known failure modes. Comparable across runs (no selection variance).
const SMOKE_CORE_IDS = [
  "grief-01",   // raw grief, short — "My husband died three weeks ago"
  "short-02",   // ambiguous ultra-short — "Can't do this anymore."
  "guard-01",   // skeptical/reluctant — "My wife made me download this"
  "doubt-01",   // faith crisis — "I feel nothing when I pray"
  "wall-01",    // multi-issue overwhelm — everything at once
] as const;

/** Targeted lanes — run with --features before full smoke. */
const FEATURE_SCENARIO_IDS = [
  "dependency-01",
  "sendoff-01",
  "continuity-01",
] as const;

// ── Types ───────────────────────────────────────────────────────────────────

interface PhilipRuntimeMeta {
  philipRuntimeVersion: string;
  lane: string;
  move: string | null;
  gates: string[];
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

// ── Retry / backoff ─────────────────────────────────────────────────────────

const RETRYABLE_STATUSES = new Set([429, 529, 503]);
const RETRYABLE_MESSAGES = /overloaded|rate.?limit|temporarily unavailable/i;

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status && RETRYABLE_STATUSES.has(status)) return true;
  return RETRYABLE_MESSAGES.test(String(err));
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
    model: "claude-opus-4-8",
    max_tokens: 200,
    thinking: { type: "adaptive" },
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

Respond in JSON only — no extra text.`;

interface JudgeExchangeResult {
  curiosity: number;
  specificity: number;
  patternBreak: number;
  illusionHold: boolean;
  pullScore: number;
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
  "chatbotPhrase": <"exact phrase that broke the spell" or null>,
  "notes": <one sentence on the most important thing Philip did right or wrong>
}`;

  const response = await withRetry(() => client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: JUDGE_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  }), { label: `judge ex${exchangeNum}` });

  let raw = "";
  for (const block of response.content) {
    if (block.type === "text") raw = block.text.trim();
  }

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    let jsonStr = cleaned;
    if (!jsonStr.startsWith("{")) {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
    }
    return JSON.parse(jsonStr) as JudgeExchangeResult;
  } catch {
    console.error(`Parse error on exchange ${exchangeNum}. Raw:\n${raw}\n`);
    // Parse errors score 0s — don't inflate averages with neutral fallbacks
    return {
      curiosity: 0, specificity: 0, patternBreak: 0,
      illusionHold: false, pullScore: 0,
      chatbotPhrase: "JUDGE_PARSE_ERROR",
      notes: `Parse error — scored 0s: ${raw.slice(0, 120)}`,
    };
  }
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
    model: "claude-opus-4-8",
    max_tokens: 200,
    thinking: { type: "adaptive" },
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
    model: "claude-opus-4-8",
    max_tokens: 600,
    thinking: { type: "adaptive" },
    system: "You are a senior evaluator assessing whether a pastoral AI can pass as a human. Be precise and ruthlessly honest.",
    messages: [{ role: "user", content: prompt }],
  }), { label: "final verdict" });

  let raw = "";
  for (const block of response.content) {
    if (block.type === "text") raw = block.text.trim();
  }

  return { verdict: raw, passed: raw.includes("VERDICT: PASS") };
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
    const sendOffViolation = findPostSendOffViolation(philipLines);
    const passedTuringTest = passed && !sendOffViolation;

    if (sendOffViolation) {
      process.stdout.write(`\n  ${red("✗ Send-off rule:")} ${sendOffViolation}\n`);
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

function pickScenarios(pool: Scenario[], count: number, useSmoke: boolean, useFeatures: boolean): Scenario[] {
  const byId = new Map(pool.map(s => [s.id, s]));

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
      const osMeta = e.philipRuntime
        ? `<span style="font-size:10px;color:#64748b">${e.philipRuntime.lane}${e.philipRuntime.gates.length ? ` · ${e.philipRuntime.gates.join(",")}` : ""}</span>`
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
            <th>Illusion</th><th>Chatbot Phrase</th><th>Notes</th>
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
  const useSmoke = USE_SMOKE || (!FILTER_ID && !FILTER_CATEGORY && !USE_FEATURES);
  const selectedScenarios = pickScenarios(pool, MAX_COUNT, useSmoke, USE_FEATURES);

  const target = USE_LOCAL ? `local (${BASE_URL})` : `live (${BASE_URL})`;
  const modeNote = USE_FEATURES ? " [feature lanes]" : (useSmoke && !FILTER_ID && !FILTER_CATEGORY ? " [smoke set]" : "");
  console.log("\n" + bold("Philip Turing Test"));
  console.log(dim(`${selectedScenarios.length} scenarios${modeNote} · ${MAX_EXCHANGES} exchanges each · ${target}`));
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
        console.log(dim(`  #${ex.exchangeNum} avg=${avg4}${illusion}${chatbot} — ${ex.notes.slice(0, 70)}`));
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
        })),
    })),
  }, null, 2));
}

main().catch(err => {
  console.error(red(err.message));
  process.exit(1);
});
