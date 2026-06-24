/**
 * Philip Turing Test
 *
 * Uses Claude Opus to simultaneously:
 *  1. Play a real user in full 8-12 exchange conversations with Philip
 *  2. Evaluate Philip's quality per exchange
 *
 * Usage:
 *   cd eval && npx tsx philip-turing-test.ts                         # 5 scenarios, live server
 *   cd eval && npx tsx philip-turing-test.ts --scenario grief-01     # single scenario
 *   cd eval && npx tsx philip-turing-test.ts --category grief        # one category
 *   cd eval && npx tsx philip-turing-test.ts --count 20              # 20 random scenarios
 *   cd eval && npx tsx philip-turing-test.ts --exchanges 12          # longer conversations
 *   cd eval && npx tsx philip-turing-test.ts --local                 # local server
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SCENARIOS, type Scenario } from "./scenarios.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const FILTER_ID       = args.includes("--scenario")  ? args[args.indexOf("--scenario")  + 1] : null;
const FILTER_CATEGORY = args.includes("--category")  ? args[args.indexOf("--category")  + 1] : null;
const MAX_COUNT       = args.includes("--count")     ? parseInt(args[args.indexOf("--count")     + 1]) : 5;
const MAX_EXCHANGES   = args.includes("--exchanges") ? parseInt(args[args.indexOf("--exchanges") + 1]) : 10;
const USE_LOCAL       = args.includes("--local");

const BASE_URL = USE_LOCAL
  ? "http://localhost:8080"
  : "https://www.shepherdspathai.com";

const SESSION_ID = `turing-${Date.now()}`;

// ── Types ───────────────────────────────────────────────────────────────────

interface ExchangeScore {
  exchangeNum: number;
  userMessage: string;
  philipResponse: string;
  curiosity: number;       // 0-10: Did Philip learn something new about this person?
  specificity: number;     // 0-10: Did Philip use their exact words back? Not generic?
  patternBreak: number;    // 0-10: Did Philip avoid the same conversational move as last time?
  illusionHold: boolean;   // Does this still feel like a human?
  pullScore: number;       // 0-10: Do you want to keep talking?
  chatbotPhrase: string | null; // Any phrase that broke the spell ("I understand", etc.)
  notes: string;
}

interface ConversationResult {
  scenario: Scenario;
  exchanges: ExchangeScore[];
  transcript: Array<{ role: "user" | "philip"; text: string }>;
  engagementCheck: string;  // After exchange 3: "Are you more engaged than when you started?"
  finalVerdict: string;     // Claude's overall assessment
  passedTuringTest: boolean;
  avgScore: number;
  durationMs: number;
  error?: string;
}

// ── Colors ──────────────────────────────────────────────────────────────────

const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yel   = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan  = (s: string) => `\x1b[36m${s}\x1b[0m`;
const mag   = (s: string) => `\x1b[35m${s}\x1b[0m`;

// ── API Calls ────────────────────────────────────────────────────────────────

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

async function callPhilipPhase1(situation: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/guidance/phase1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation,
      sessionId: SESSION_ID,
      companionMode: "philip",
      daysWithApp: 3,
      isPro: true,
    }),
  });
  if (!res.ok) throw new Error(`Phase1 HTTP ${res.status}: ${await res.text()}`);
  return collectStream(res);
}

async function callPhilipResponse(
  situation: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  phase1Response: string,
  phase1UserReply: string,
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/guidance/response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation,
      messages,
      sessionId: SESSION_ID,
      companionMode: "philip",
      guidanceMode: "encouraging",
      daysWithApp: 3,
      isPro: true,
      phase1Response,
      phase1UserReply,
    }),
  });
  if (!res.ok) throw new Error(`Response HTTP ${res.status}: ${await res.text()}`);
  return collectStream(res);
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
  // Format history as context in a single user message (API requires messages end with user role)
  const historyText = conversationHistory.map(m =>
    `${m.role === "user" ? "YOU" : "PHILIP"}: ${m.content}`
  ).join("\n\n");

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 200,
    thinking: { type: "adaptive" },
    system: `${USER_SIM_SYSTEM}\n\nYour situation: "${scenario.situation}"\nCategory: ${scenario.category}\nDescription: ${scenario.description}`,
    messages: [{
      role: "user",
      content: `Here is the conversation so far:\n\n${historyText}\n\nNow write your next reply to Philip. Stay in character. Under 40 words.`,
    }],
  });

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
  const prevContext = previousPhilipResponses.length > 0
    ? `\n\nPrevious Philip responses (for pattern detection):\n${previousPhilipResponses.slice(-3).map((r, i) => `[${i + 1}] "${r.slice(0, 120)}..."`).join("\n")}`
    : "";

  const prompt = `Exchange #${exchangeNum}

Original situation: "${scenario.situation}"

User said: "${userMessage}"

Philip responded: "${philipResponse}"
${prevContext}

Score this response:
{
  "curiosity": <0-10, did Philip actually learn something new about this person?>,
  "specificity": <0-10, did Philip use their exact words/details instead of being generic?>,
  "patternBreak": <0-10, did Philip do something different from his previous moves? (10 if first exchange)>,
  "illusionHold": <true/false, does this still feel like a human could have said it?>,
  "pullScore": <0-10, after reading this, do you want to keep talking?>,
  "chatbotPhrase": <"exact phrase that broke the spell" or null>,
  "notes": <one sentence on the most important thing Philip did right or wrong>
}`;

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 500,
    thinking: { type: "adaptive" },
    system: JUDGE_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  let raw = "";
  for (const block of response.content) {
    if (block.type === "text") raw = block.text.trim();
  }

  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
    return parsed as JudgeExchangeResult;
  } catch {
    return {
      curiosity: 5, specificity: 5, patternBreak: 5,
      illusionHold: true, pullScore: 5,
      chatbotPhrase: null,
      notes: "Parse error — scored defaults",
    };
  }
}

// ── Engagement Check (after exchange 3) ────────────────────────────────────

async function checkEngagement(
  client: Anthropic,
  scenario: Scenario,
  transcript: Array<{ role: "user" | "philip"; text: string }>,
): Promise<string> {
  const transcriptText = transcript.map(t =>
    `${t.role === "user" ? "YOU" : "PHILIP"}: ${t.text}`
  ).join("\n\n");

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 200,
    thinking: { type: "adaptive" },
    system: `You are the user in this conversation. You've been talking with Philip, a pastoral AI. Answer honestly as yourself — the person with this situation.`,
    messages: [{
      role: "user",
      content: `Here is your conversation so far:\n\n${transcriptText}\n\nHonest question: Are you more engaged and open now than when you started? And why or why not? (2-3 sentences)`,
    }],
  });

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
  const avgCuriosity  = (exchanges.reduce((s, e) => s + e.curiosity,    0) / exchanges.length).toFixed(1);
  const avgSpec       = (exchanges.reduce((s, e) => s + e.specificity,  0) / exchanges.length).toFixed(1);
  const avgPull       = (exchanges.reduce((s, e) => s + e.pullScore,    0) / exchanges.length).toFixed(1);
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

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 600,
    thinking: { type: "adaptive" },
    system: "You are a senior evaluator assessing whether a pastoral AI can pass as a human. Be precise and ruthlessly honest.",
    messages: [{ role: "user", content: prompt }],
  });

  let raw = "";
  for (const block of response.content) {
    if (block.type === "text") raw = block.text.trim();
  }

  const passed = raw.includes("VERDICT: PASS");
  return { verdict: raw, passed };
}

// ── Run One Full Conversation ────────────────────────────────────────────────

async function runConversation(client: Anthropic, scenario: Scenario): Promise<ConversationResult> {
  const start = Date.now();
  const transcript: Array<{ role: "user" | "philip"; text: string }> = [];
  const exchanges: ExchangeScore[] = [];
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  const previousPhilipResponses: string[] = [];

  try {
    // === Exchange 1: Phase 1 ===
    transcript.push({ role: "user", text: scenario.situation });
    messages.push({ role: "user", content: scenario.situation });

    const phase1Response = await callPhilipPhase1(scenario.situation);
    transcript.push({ role: "philip", text: phase1Response });
    messages.push({ role: "assistant", content: phase1Response });

    const score1 = await judgeExchange(client, scenario, 1, scenario.situation, phase1Response, []);
    exchanges.push({ exchangeNum: 1, userMessage: scenario.situation, philipResponse: phase1Response, ...score1 });
    previousPhilipResponses.push(phase1Response);

    const phase1UserReply_initial = phase1Response; // captured for API call

    // === Exchanges 2+ ===
    for (let i = 2; i <= MAX_EXCHANGES; i++) {
      // Simulate user reply
      const userReply = await simulateUserReply(client, scenario, messages);
      transcript.push({ role: "user", text: userReply });

      // Push user reply — Philip receives the FULL history including this message
      messages.push({ role: "user", content: userReply });

      // Call Philip with all messages including the latest user reply
      const philipReply = await callPhilipResponse(
        scenario.situation,
        messages,
        phase1Response,
        exchanges.length >= 2 ? exchanges[1].userMessage : userReply,
      );
      transcript.push({ role: "philip", text: philipReply });
      messages.push({ role: "assistant", content: philipReply });

      // Score this exchange
      const score = await judgeExchange(client, scenario, i, userReply, philipReply, previousPhilipResponses);
      exchanges.push({ exchangeNum: i, userMessage: userReply, philipResponse: philipReply, ...score });
      previousPhilipResponses.push(philipReply);

      // Engagement check after exchange 3
      let engagementCheck = "";
      if (i === 3) {
        engagementCheck = await checkEngagement(client, scenario, transcript);
        process.stdout.write(`\n  ${cyan("→ Engagement check:")} ${engagementCheck.slice(0, 100)}...\n`);
      }
    }

    // Mid-conversation engagement check (done at exchange 3, stored separately)
    const engagementCheck = await checkEngagement(client, scenario, transcript);
    const { verdict, passed } = await getFinalVerdict(client, scenario, exchanges, transcript, engagementCheck);

    const avgScore = exchanges.reduce((s, e) => s + (e.curiosity + e.specificity + e.pullScore) / 3, 0) / exchanges.length;

    return {
      scenario,
      exchanges,
      transcript,
      engagementCheck,
      finalVerdict: verdict,
      passedTuringTest: passed,
      avgScore,
      durationMs: Date.now() - start,
    };

  } catch (err: any) {
    return {
      scenario,
      exchanges,
      transcript,
      engagementCheck: "",
      finalVerdict: `Error: ${err.message}`,
      passedTuringTest: false,
      avgScore: 0,
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}

// ── HTML Report ───────────────────────────────────────────────────────────────

function buildHtmlReport(results: ConversationResult[]): string {
  const passed = results.filter(r => r.passedTuringTest).length;
  const total  = results.length;
  const passRate = Math.round((passed / total) * 100);
  const avgScore = (results.reduce((s, r) => s + r.avgScore, 0) / total).toFixed(1);
  const scoreColor = passRate >= 70 ? "#4ade80" : passRate >= 50 ? "#facc15" : "#f87171";

  const resultSections = results.map((r, ri) => {
    const rp = r.passedTuringTest;
    const exchangeRows = r.exchanges.map(e => {
      const avg = ((e.curiosity + e.specificity + e.pullScore) / 3).toFixed(1);
      const illusion = e.illusionHold ? "✓" : `<span style="color:#f87171">✗ BROKE</span>`;
      const chatbot = e.chatbotPhrase ? `<span style="color:#f87171">"${e.chatbotPhrase}"</span>` : "none";
      return `
        <tr>
          <td style="color:#888">#${e.exchangeNum}</td>
          <td style="font-style:italic;color:#ccc">${e.userMessage.slice(0, 80)}${e.userMessage.length > 80 ? "…" : ""}</td>
          <td>${e.philipResponse.slice(0, 120)}${e.philipResponse.length > 120 ? "…" : ""}</td>
          <td>${e.curiosity}/10</td>
          <td>${e.specificity}/10</td>
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

    return `
      <div style="background:#111;border:1px solid ${rp ? "#166534" : "#7f1d1d"};border-radius:12px;padding:24px;margin-bottom:32px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
          <span style="font-size:20px;font-weight:700;color:${rp ? "#4ade80" : "#f87171"}">${rp ? "PASS" : "FAIL"}</span>
          <span style="color:#a78bfa;font-weight:600">${r.scenario.id}</span>
          <span style="color:#666">${r.scenario.category}</span>
          <span style="color:#555;font-size:12px">${r.durationMs}ms</span>
        </div>
        <div style="color:#999;font-style:italic;margin-bottom:16px">"${r.scenario.situation}"</div>

        <h3 style="color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:16px 0 8px">Exchange Scores</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <tr style="color:#666">
            <th>#</th><th>User</th><th>Philip</th>
            <th>Curiosity</th><th>Specificity</th><th>Pull</th><th>Avg</th>
            <th>Illusion</th><th>Chatbot Phrase</th><th>Notes</th>
          </tr>
          ${exchangeRows}
        </table>

        <h3 style="color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:20px 0 8px">Engagement Check (after exchange 3)</h3>
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
<div class="meta">Target: <strong>${USE_LOCAL ? "local" : "live"}</strong> · ${MAX_EXCHANGES} exchanges/conversation · Run: ${new Date().toISOString()}</div>

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
    <div class="stat-label">Avg Quality Score</div>
  </div>
</div>

${resultSections}
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load env
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

  // Pick scenarios
  let pool = SCENARIOS;
  if (FILTER_ID)       pool = pool.filter(s => s.id === FILTER_ID);
  else if (FILTER_CATEGORY) pool = pool.filter(s => s.category.includes(FILTER_CATEGORY));

  // Shuffle and cap
  pool = pool.sort(() => Math.random() - 0.5).slice(0, MAX_COUNT);

  const target = USE_LOCAL ? `local (${BASE_URL})` : `live (${BASE_URL})`;
  console.log("\n" + bold("Philip Turing Test"));
  console.log(dim(`${pool.length} scenarios · ${MAX_EXCHANGES} exchanges each · ${target}`));
  console.log(dim("─".repeat(80)));

  const results: ConversationResult[] = [];

  for (let i = 0; i < pool.length; i++) {
    const scenario = pool[i];
    console.log(`\n[${i + 1}/${pool.length}] ${cyan(scenario.id)} ${dim(scenario.category)}`);
    console.log(dim(`  "${scenario.situation.slice(0, 80)}..."`));

    const result = await runConversation(client, scenario);
    results.push(result);

    const verdict = result.passedTuringTest ? green("PASS") : red("FAIL");
    const avg = result.avgScore.toFixed(1);
    console.log(`  ${verdict} avg=${avg} ${dim(`${result.durationMs}ms`)}`);

    if (result.error) {
      console.log(`  ${red("Error:")} ${result.error}`);
    } else {
      // Print per-exchange summary
      for (const ex of result.exchanges) {
        const avg3 = ((ex.curiosity + ex.specificity + ex.pullScore) / 3).toFixed(1);
        const illusion = ex.illusionHold ? "" : red(" [BROKE]");
        const chatbot  = ex.chatbotPhrase ? yel(` [!${ex.chatbotPhrase}]`) : "";
        console.log(dim(`  #${ex.exchangeNum} avg=${avg3}${illusion}${chatbot} — ${ex.notes.slice(0, 70)}`));
      }
    }
  }

  // Summary
  const passed   = results.filter(r => r.passedTuringTest).length;
  const total    = results.length;
  const passRate = Math.round((passed / total) * 100);
  const avgScore = (results.reduce((s, r) => s + r.avgScore, 0) / total).toFixed(1);

  console.log("\n" + dim("─".repeat(80)));
  const rateColor = passRate >= 70 ? green : passRate >= 50 ? yel : red;
  console.log(bold(`Turing Result: ${rateColor(passRate + "%")} pass  |  ${passed}/${total}  |  avg score ${avgScore}/10`));

  // Write HTML report
  const reportDir = path.resolve(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, `turing-test-${Date.now()}.html`);
  fs.writeFileSync(reportFile, buildHtmlReport(results));
  console.log("\n" + green(`Report: file://${reportFile}`));

  // Write JSON
  const jsonFile = path.join(reportDir, `turing-test-latest.json`);
  fs.writeFileSync(jsonFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    target,
    maxExchanges: MAX_EXCHANGES,
    passRate,
    avgScore: Number(avgScore),
    passed,
    total,
    results: results.map(r => ({
      id: r.scenario.id,
      category: r.scenario.category,
      passed: r.passedTuringTest,
      avgScore: r.avgScore,
      exchanges: r.exchanges.length,
      engagementCheck: r.engagementCheck,
      verdict: r.finalVerdict,
    })),
  }, null, 2));
}

main().catch(err => {
  console.error(red(err.message));
  process.exit(1);
});
