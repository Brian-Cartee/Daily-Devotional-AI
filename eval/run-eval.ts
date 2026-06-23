/**
 * Philip Eval Runner
 *
 * Usage:
 *   cd eval && npx tsx run-eval.ts                           # local server (port 3001)
 *   cd eval && npx tsx run-eval.ts --target live             # production
 *   cd eval && npx tsx run-eval.ts --filter grief            # one category
 *   cd eval && npx tsx run-eval.ts --id grief-01             # single scenario
 *   cd eval && npx tsx run-eval.ts --phase response          # test full response instead of phase1
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { SCENARIOS, type Scenario } from "./scenarios.js";
import { judgeResponse, type JudgeResult } from "./judge.js";

// ── Config ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const TARGET_LIVE = args.includes("--target") && args[args.indexOf("--target") + 1] === "live";
const FILTER_CATEGORY = args.includes("--filter") ? args[args.indexOf("--filter") + 1] : null;
const FILTER_ID = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;
const PHASE = args.includes("--phase") ? args[args.indexOf("--phase") + 1] : "phase1";
const CONCURRENCY = 4;  // parallel calls

const BASE_URL = TARGET_LIVE
  ? "https://www.shepherdspathai.com"
  : "http://localhost:3001";

const EVAL_SESSION_ID = `eval-${Date.now()}`;

// ── Helpers ────────────────────────────────────────────────────────────────

function color(code: number, text: string) {
  return `\x1b[${code}m${text}\x1b[0m`;
}
const green = (t: string) => color(32, t);
const red = (t: string) => color(31, t);
const yellow = (t: string) => color(33, t);
const dim = (t: string) => color(2, t);
const bold = (t: string) => color(1, t);

/** Collect a streaming text/plain SSE response into a string. */
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

/** Call /api/guidance/phase1 and return Philip's streamed text. */
async function callPhase1(situation: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/guidance/phase1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation,
      sessionId: EVAL_SESSION_ID,
      companionMode: "philip",
      daysWithApp: 3,
      isPro: true,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return collectStream(res);
}

/** Call /api/guidance/response and return Philip's full response. */
async function callResponse(situation: string, phase1Text: string): Promise<string> {
  const messages = [
    { role: "user" as const, content: situation },
    { role: "assistant" as const, content: phase1Text },
    { role: "user" as const, content: "Yes, keep going." },
  ];
  const res = await fetch(`${BASE_URL}/api/guidance/response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation,
      messages,
      sessionId: EVAL_SESSION_ID,
      companionMode: "philip",
      guidanceMode: "encouraging",
      daysWithApp: 3,
      isPro: true,
      phase1Response: phase1Text,
      phase1UserReply: "Yes, keep going.",
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return collectStream(res);
}

// ── Run one scenario ────────────────────────────────────────────────────────

interface EvalResult {
  scenario: Scenario;
  philipResponse: string;
  judge: JudgeResult;
  error?: string;
  durationMs: number;
}

async function runScenario(client: OpenAI, scenario: Scenario): Promise<EvalResult> {
  const start = Date.now();
  try {
    let philipResponse: string;
    if (PHASE === "response") {
      const p1 = await callPhase1(scenario.situation);
      philipResponse = await callResponse(scenario.situation, p1);
    } else {
      philipResponse = await callPhase1(scenario.situation);
    }
    const judge = await judgeResponse(client, scenario.situation, philipResponse, scenario.flags ?? []);
    return { scenario, philipResponse, judge, durationMs: Date.now() - start };
  } catch (err: any) {
    return {
      scenario,
      philipResponse: "",
      judge: { pass: false, score: 0, issues: [err.message], notes: "Error calling API", raw: "" },
      error: err.message,
      durationMs: Date.now() - start,
    };
  }
}

// ── Concurrency pool ────────────────────────────────────────────────────────

async function runPool<T>(items: T[], fn: (item: T) => Promise<EvalResult>, concurrency: number): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      const result = await fn(items[i]);
      results[i] = result;
      // Print inline progress
      const { scenario, philipResponse, judge, error, durationMs } = result;
      const statusIcon = error ? yellow("ERR") : judge.pass ? green("PASS") : red("FAIL");
      const scoreStr = judge.pass ? green(`${judge.score}/10`) : red(`${judge.score}/10`);
      process.stdout.write(`  [${String(i + 1).padStart(2)}/${items.length}] ${statusIcon} ${scoreStr} ${dim(scenario.id.padEnd(16))} ${dim(scenario.category.padEnd(24))} ${dim(`${durationMs}ms`)}\n`);
      if (!judge.pass && judge.issues.length) {
        judge.issues.forEach(issue => process.stdout.write(`           ${red("↳")} ${issue}\n`));
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── HTML report ─────────────────────────────────────────────────────────────

function buildHtmlReport(results: EvalResult[], phase: string, target: string): string {
  const passed = results.filter(r => r.judge.pass).length;
  const total = results.length;
  const avgScore = (results.reduce((s, r) => s + r.judge.score, 0) / total).toFixed(1);
  const passRate = Math.round((passed / total) * 100);

  const categoryMap: Record<string, EvalResult[]> = {};
  for (const r of results) {
    const cat = r.scenario.category;
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(r);
  }

  const categoryRows = Object.entries(categoryMap).map(([cat, catResults]) => {
    const catPassed = catResults.filter(r => r.judge.pass).length;
    const catAvg = (catResults.reduce((s, r) => s + r.judge.score, 0) / catResults.length).toFixed(1);
    const pct = Math.round((catPassed / catResults.length) * 100);
    const color = pct >= 80 ? "#4ade80" : pct >= 60 ? "#facc15" : "#f87171";
    return `<tr><td>${cat}</td><td>${catPassed}/${catResults.length}</td><td style="color:${color}">${pct}%</td><td>${catAvg}/10</td></tr>`;
  }).join("\n");

  const detailRows = results.map((r, i) => {
    const bg = r.judge.pass ? "#0d2818" : "#2a0d0d";
    const statusBadge = r.judge.pass
      ? `<span style="color:#4ade80;font-weight:700">PASS</span>`
      : `<span style="color:#f87171;font-weight:700">FAIL</span>`;
    const issues = r.judge.issues.length
      ? `<div style="color:#f87171;font-size:12px;margin-top:6px">${r.judge.issues.map(i => `⚠ ${i}`).join("<br>")}</div>`
      : "";
    const flags = (r.scenario.flags ?? []).map(f => `<span style="background:#1e1040;color:#a78bfa;padding:1px 6px;border-radius:4px;font-size:11px">${f}</span>`).join(" ");
    return `
      <tr style="background:${bg}" id="row-${i}">
        <td style="color:#888;font-size:11px">${r.scenario.id}</td>
        <td>${statusBadge}</td>
        <td style="font-weight:700">${r.judge.score}/10</td>
        <td><em style="color:#ccc">"${r.scenario.situation.slice(0, 90)}${r.scenario.situation.length > 90 ? "…" : ""}"</em><br><span style="color:#666;font-size:11px">${flags}</span></td>
        <td style="font-family:Georgia,serif;font-size:13px;color:#ddd">${r.philipResponse || '<em style="color:#666">error</em>'}${issues}</td>
        <td style="font-size:12px;color:#999">${r.judge.notes}</td>
        <td style="color:#555;font-size:11px">${r.durationMs}ms</td>
      </tr>`;
  }).join("\n");

  const scoreColor = passRate >= 85 ? "#4ade80" : passRate >= 65 ? "#facc15" : "#f87171";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Philip Eval — ${new Date().toLocaleDateString()}</title>
<style>
  * { box-sizing: border-box; }
  body { background: #0a0a0f; color: #ddd; font-family: system-ui, sans-serif; margin: 0; padding: 24px; }
  h1 { color: #a78bfa; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  .summary { display: flex; gap: 24px; margin-bottom: 32px; flex-wrap: wrap; }
  .stat { background: #111; border: 1px solid #222; border-radius: 10px; padding: 16px 24px; }
  .stat-value { font-size: 36px; font-weight: 700; }
  .stat-label { color: #666; font-size: 12px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; border-bottom: 1px solid #222; color: #888; font-weight: 500; }
  td { padding: 10px 12px; border-bottom: 1px solid #111; vertical-align: top; }
  h2 { color: #888; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 40px; }
  .pass-rate { color: ${scoreColor}; }
</style>
</head>
<body>
<h1>Philip Eval Report</h1>
<div class="meta">Phase: <strong>${phase}</strong> · Target: <strong>${target}</strong> · Run: ${new Date().toISOString()}</div>

<div class="summary">
  <div class="stat">
    <div class="stat-value pass-rate">${passRate}%</div>
    <div class="stat-label">Pass Rate</div>
  </div>
  <div class="stat">
    <div class="stat-value">${passed}/${total}</div>
    <div class="stat-label">Passed</div>
  </div>
  <div class="stat">
    <div class="stat-value">${avgScore}</div>
    <div class="stat-label">Avg Score / 10</div>
  </div>
</div>

<h2>By Category</h2>
<table>
  <tr><th>Category</th><th>Passed</th><th>Pass Rate</th><th>Avg Score</th></tr>
  ${categoryRows}
</table>

<h2>All Scenarios</h2>
<table>
  <tr>
    <th>ID</th><th>Result</th><th>Score</th>
    <th style="width:260px">User Input</th>
    <th>Philip's Response</th>
    <th style="width:180px">Notes</th>
    <th>Time</th>
  </tr>
  ${detailRows}
</table>
</body>
</html>`;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Load OpenAI key from api-server env
  const envPath = path.resolve(import.meta.dirname, "../artifacts/api-server/.env.development");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(red("Missing OPENAI_API_KEY — looked in api-server/.env.development"));
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  // Filter scenarios
  let scenarios = SCENARIOS;
  if (FILTER_ID) scenarios = scenarios.filter(s => s.id === FILTER_ID);
  else if (FILTER_CATEGORY) scenarios = scenarios.filter(s => s.category.includes(FILTER_CATEGORY));

  const target = TARGET_LIVE ? `live (${BASE_URL})` : `local (${BASE_URL})`;

  console.log("\n" + bold("Philip Eval Runner"));
  console.log(dim(`Phase: ${PHASE} · Target: ${target} · Scenarios: ${scenarios.length} · Concurrency: ${CONCURRENCY}`));
  console.log(dim("─".repeat(80)));

  const results = await runPool(scenarios, s => runScenario(client, s), CONCURRENCY);

  // Summary
  const passed = results.filter(r => r.judge.pass).length;
  const total = results.length;
  const avgScore = (results.reduce((s, r) => s + r.judge.score, 0) / total).toFixed(1);
  const passRate = Math.round((passed / total) * 100);

  console.log("\n" + dim("─".repeat(80)));
  console.log(bold(`Results: ${passRate >= 80 ? green(String(passRate) + "%") : passRate >= 60 ? yellow(String(passRate) + "%") : red(String(passRate) + "%")} pass  |  ${passed}/${total}  |  avg score ${avgScore}/10`));

  // Failures summary
  const failures = results.filter(r => !r.judge.pass);
  if (failures.length) {
    console.log("\n" + bold(red("Failures:")));
    for (const f of failures) {
      console.log(`  ${red("✗")} ${f.scenario.id.padEnd(16)} ${dim(f.scenario.description)}`);
      for (const issue of f.judge.issues) console.log(`    ${dim("↳")} ${red(issue)}`);
    }
  }

  // Write HTML report
  const reportDir = path.resolve(import.meta.dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, `philip-eval-${Date.now()}.html`);
  const html = buildHtmlReport(results, PHASE, target);
  fs.writeFileSync(reportFile, html);
  console.log("\n" + green(`Report: file://${reportFile}`));

  // Write JSON for CI diffing
  const jsonFile = path.join(reportDir, `philip-eval-latest.json`);
  fs.writeFileSync(jsonFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    phase: PHASE,
    target,
    passRate,
    avgScore: Number(avgScore),
    passed,
    total,
    results: results.map(r => ({
      id: r.scenario.id,
      category: r.scenario.category,
      pass: r.judge.pass,
      score: r.judge.score,
      issues: r.judge.issues,
    })),
  }, null, 2));

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(red(err.message));
  process.exit(1);
});
