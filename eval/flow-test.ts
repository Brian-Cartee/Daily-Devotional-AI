/**
 * Philip Flow Timing Test
 *
 * Measures end-to-end latency at every step of a Talk It Through conversation.
 * This tests the mechanics of the conversation flow, not the quality of responses.
 *
 * Usage:
 *   cd eval && npx tsx flow-test.ts                    # local server
 *   cd eval && npx tsx flow-test.ts --target live      # production
 *   cd eval && npx tsx flow-test.ts --situation "..."  # custom situation
 */

import fs from "fs";
import path from "path";

// ── Config ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const TARGET_LIVE = args.includes("--target") && args[args.indexOf("--target") + 1] === "live";
const CUSTOM_SITUATION = args.includes("--situation") ? args[args.indexOf("--situation") + 1] : null;

const BASE_URL = TARGET_LIVE
  ? "https://www.shepherdspathai.com"
  : "http://localhost:8080";

const SESSION_ID = `flow-test-${Date.now()}`;

const TEST_SITUATION = CUSTOM_SITUATION ?? "I've been carrying something heavy for months and I don't know who to talk to about it.";
const TEST_PHASE2_REPLY = "I needed someone to say that. Keep going.";

// ── Colors ─────────────────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};
const bold   = (s: string) => `${c.bold}${s}${c.reset}`;
const dim    = (s: string) => `${c.dim}${s}${c.reset}`;
const green  = (s: string) => `${c.green}${s}${c.reset}`;
const yellow = (s: string) => `${c.yellow}${s}${c.reset}`;
const red    = (s: string) => `${c.red}${s}${c.reset}`;
const cyan   = (s: string) => `${c.cyan}${s}${c.reset}`;
const mag    = (s: string) => `${c.magenta}${s}${c.reset}`;

// ── Timing helpers ─────────────────────────────────────────────────────────

interface TimingResult {
  label: string;
  ttfb: number;       // time to first byte (ms)
  total: number;      // total duration (ms)
  bytes: number;
  text?: string;
  error?: string;
  verdict: "fast" | "ok" | "slow" | "error";
}

function verdictColor(v: TimingResult["verdict"], s: string): string {
  if (v === "fast")  return green(s);
  if (v === "ok")    return yellow(s);
  if (v === "slow")  return red(s);
  return red(s);
}

function scoreLatency(ttfb: number, label: string): TimingResult["verdict"] {
  // Thresholds calibrated to conversational feel:
  // < 1.5s = fast (user barely notices)
  // < 3.0s = ok   (noticeable but acceptable)
  // >= 3.0s = slow (breaks conversational flow)
  if (label.includes("TTS") || label.includes("tts")) {
    // TTS: user waits for audio to start
    if (ttfb < 800)  return "fast";
    if (ttfb < 1500) return "ok";
    return "slow";
  }
  if (ttfb < 1500) return "fast";
  if (ttfb < 3000) return "ok";
  return "slow";
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

async function timedFetch(
  label: string,
  url: string,
  init: RequestInit,
  opts: { collectBody?: boolean; firstByteOnly?: boolean } = {}
): Promise<TimingResult> {
  const t0 = performance.now();
  let ttfb = 0;
  let total = 0;
  let bytes = 0;
  let text = "";
  let error: string | undefined;

  try {
    const res = await fetch(url, init);
    ttfb = performance.now() - t0;

    if (!res.ok) {
      const body = await res.text();
      total = performance.now() - t0;
      return {
        label,
        ttfb,
        total,
        bytes: body.length,
        error: `HTTP ${res.status}: ${body.slice(0, 120)}`,
        verdict: "error",
      };
    }

    if (!res.body) {
      total = performance.now() - t0;
      return { label, ttfb, total, bytes: 0, verdict: scoreLatency(ttfb, label) };
    }

    const reader = res.body.getReader();
    let firstByteReceived = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (!firstByteReceived) {
        ttfb = performance.now() - t0;
        firstByteReceived = true;
        if (opts.firstByteOnly) {
          // Just measure TTFB then drain quietly
          reader.cancel();
          break;
        }
      }

      bytes += value?.byteLength ?? 0;
      if (opts.collectBody && value) {
        text += new TextDecoder().decode(value, { stream: true });
      }
    }

    total = performance.now() - t0;
  } catch (err: any) {
    total = performance.now() - t0;
    return { label, ttfb, total, bytes: 0, error: err.message, verdict: "error" };
  }

  return {
    label,
    ttfb,
    total,
    bytes,
    text: text.trim() || undefined,
    verdict: scoreLatency(ttfb, label),
  };
}

function printResult(r: TimingResult) {
  const ttfbStr  = `TTFB: ${Math.round(r.ttfb).toString().padStart(5)}ms`;
  const totalStr = `Total: ${Math.round(r.total).toString().padStart(5)}ms`;
  const sizeStr  = r.bytes > 0 ? `  ${(r.bytes / 1024).toFixed(1)}KB` : "";
  const label    = r.label.padEnd(36);

  if (r.verdict === "error") {
    console.log(`  ${red("ERR")}  ${label}  ${red(r.error ?? "unknown error")}`);
    return;
  }

  const icon = r.verdict === "fast" ? green("▶") : r.verdict === "ok" ? yellow("▶") : red("▶");
  console.log(`  ${icon}  ${label}  ${verdictColor(r.verdict, ttfbStr)}  ${dim(totalStr)}${dim(sizeStr)}`);

  if (r.text) {
    const preview = r.text.slice(0, 120).replace(/\n/g, " ");
    console.log(`       ${dim(`"${preview}${r.text.length > 120 ? "…" : ""}"`)}` );
  }
}

// ── Steps ──────────────────────────────────────────────────────────────────

async function stepHealthCheck(): Promise<boolean> {
  console.log(`\n${bold("① Health Check")}  ${dim(BASE_URL)}`);
  const r = await timedFetch(
    "/api/health",
    `${BASE_URL}/api/health`,
    {},
    { collectBody: true }
  );
  printResult(r);
  if (r.error) return false;
  try {
    const health = JSON.parse(r.text ?? "{}");
    const openai = health.services?.openai;
    if (!openai?.ok) {
      console.log(`  ${red("✗")} OpenAI: ${openai?.message ?? "not configured"}`);
      return false;
    }
    console.log(`  ${green("✓")} OpenAI: ${openai.message}`);
  } catch { /* not JSON */ }
  return true;
}

async function stepPhase1(): Promise<string | null> {
  console.log(`\n${bold("② Phase 1 — Philip's opening response")}`);
  console.log(dim(`   Situation: "${TEST_SITUATION.slice(0, 80)}…"`));

  const r = await timedFetch(
    "/api/guidance/phase1  (text stream)",
    `${BASE_URL}/api/guidance/phase1`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation: TEST_SITUATION,
        sessionId: SESSION_ID,
        daysWithApp: 30,
        isPro: true,
      }),
    },
    { collectBody: true }
  );
  printResult(r);
  return r.text ?? null;
}

async function stepPhase1TTS(phase1Text: string): Promise<void> {
  console.log(`\n${bold("③ Phase 1 TTS — audio generation")}`);
  console.log(dim(`   Text (${phase1Text.split(" ").length} words): "${phase1Text.slice(0, 80)}…"`));

  // This is the blob path — full response must arrive before audio starts
  const r = await timedFetch(
    "/api/tts  (blob — full wait)",
    `${BASE_URL}/api/tts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: phase1Text,
        voice: "onyx",
        scope: "guidance",
        sessionId: SESSION_ID,
        isPro: true,
      }),
    },
    { firstByteOnly: false }
  );
  printResult(r);

  if (r.bytes > 0) {
    const audioDurationEstimate = (r.bytes / 1024 / 16) * 1000; // ~16KB/s for mp3 at 128kbps
    console.log(`  ${dim(`   ~${(audioDurationEstimate / 1000).toFixed(1)}s of audio`)}`);
  }

  // Also test TTFB specifically — for streaming this would be when audio starts playing
  const rTtfb = await timedFetch(
    "/api/tts  (TTFB — when audio could start)",
    `${BASE_URL}/api/tts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: phase1Text,
        voice: "onyx",
        scope: "guidance",
        sessionId: SESSION_ID,
        isPro: true,
      }),
    },
    { firstByteOnly: true }
  );
  printResult(rTtfb);
}

async function stepBridgeTTS(): Promise<void> {
  console.log(`\n${bold("④ Bridge phrase TTS — 'Give me a moment with that.'")}`);
  console.log(dim("   Spoken while user is expected to reply to Philip's question"));

  const bridges = [
    "Give me a moment with that.",
    "I'm sitting with what you shared.",
  ];

  for (const bridge of bridges) {
    const r = await timedFetch(
      `"${bridge}"`,
      `${BASE_URL}/api/tts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: bridge,
          voice: "onyx",
          scope: "guidance",
          sessionId: SESSION_ID,
          isPro: true,
        }),
      },
      { firstByteOnly: true }
    );
    printResult(r);
  }
}

async function stepPhase2(phase1Text: string): Promise<string | null> {
  console.log(`\n${bold("⑤ Phase 2 — Philip's 'What I'm hearing' response")}`);
  console.log(dim(`   User reply: "${TEST_PHASE2_REPLY}"`));

  const r = await timedFetch(
    "/api/guidance/response  (text — full wait)",
    `${BASE_URL}/api/guidance/response`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation: TEST_SITUATION,
        messages: [
          { role: "user", content: TEST_SITUATION },
          { role: "assistant", content: phase1Text },
          { role: "user", content: TEST_PHASE2_REPLY },
        ],
        sessionId: SESSION_ID,
        daysWithApp: 30,
        isPro: true,
        phase1Response: phase1Text,
        phase1UserReply: TEST_PHASE2_REPLY,
      }),
    },
    { collectBody: true }
  );
  printResult(r);
  return r.text ?? null;
}

async function stepPhase2TTS(phase2Text: string): Promise<void> {
  console.log(`\n${bold("⑥ Phase 2 TTS — audio generation")}`);
  console.log(dim(`   Text (${phase2Text.split(" ").length} words): "${phase2Text.slice(0, 80)}…"`));

  const r = await timedFetch(
    "/api/tts  (blob — full wait)",
    `${BASE_URL}/api/tts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: phase2Text,
        voice: "onyx",
        scope: "guidance",
        sessionId: SESSION_ID,
        isPro: true,
      }),
    }
  );
  printResult(r);

  const rTtfb = await timedFetch(
    "/api/tts  (TTFB — when audio could start)",
    `${BASE_URL}/api/tts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: phase2Text,
        voice: "onyx",
        scope: "guidance",
        sessionId: SESSION_ID,
        isPro: true,
      }),
    },
    { firstByteOnly: true }
  );
  printResult(rTtfb);

  // NEW: streaming endpoint — this is what the app now uses
  const rStream = await timedFetch(
    "/api/tts/stream  (TTFB — streaming path)",
    `${BASE_URL}/api/tts/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: phase2Text, sessionId: SESSION_ID, isPro: true }),
    },
    { firstByteOnly: true }
  );
  printResult(rStream);
}

// ── Summary ────────────────────────────────────────────────────────────────

function printSummary(timings: {
  phase1Api: number;
  phase1Tts: number;
  phase1TtsTtfb: number;
  phase2Api: number;
  phase2Tts: number;
  phase2TtsTtfb: number;
}) {
  console.log(`\n${bold("─────────────────────────────────────────────────────────────────")}`);
  console.log(bold("CONVERSATION FLOW — FELT LATENCY BREAKDOWN"));
  console.log(bold("─────────────────────────────────────────────────────────────────"));

  // What the user actually waits for
  const userSpeaks_to_PhilipStarts = timings.phase1Api + timings.phase1TtsTtfb;
  const Philip1Ends_to_Philip2Starts = timings.phase2Api + timings.phase2TtsTtfb;

  const row = (label: string, ms: number, note: string) => {
    const verdict = ms < 1500 ? green : ms < 3000 ? yellow : red;
    console.log(`  ${verdict(`${Math.round(ms).toString().padStart(5)}ms`)}  ${label.padEnd(42)}  ${dim(note)}`);
  };

  row("Phase 1 API (text generation)",    timings.phase1Api,     "GPT-4o → text");
  row("Phase 1 TTS TTFB (audio start)",   timings.phase1TtsTtfb, "ElevenLabs → first audio byte");
  console.log();
  row("Phase 2 API (text generation)",    timings.phase2Api,     "GPT-4o → text (includes retry check)");
  row("Phase 2 TTS TTFB (audio start)",   timings.phase2TtsTtfb, "ElevenLabs → first audio byte");
  console.log();

  console.log(bold("  FELT LATENCY (what the user actually waits for):"));
  const verdict1 = userSpeaks_to_PhilipStarts < 2000 ? green : userSpeaks_to_PhilipStarts < 4000 ? yellow : red;
  const verdict2 = Philip1Ends_to_Philip2Starts < 2000 ? green : Philip1Ends_to_Philip2Starts < 4000 ? yellow : red;
  console.log(`  ${verdict1(`${Math.round(userSpeaks_to_PhilipStarts).toString().padStart(5)}ms`)}  User stops speaking → Philip starts speaking (Phase 1)`);
  console.log(`  ${verdict2(`${Math.round(Philip1Ends_to_Philip2Starts).toString().padStart(5)}ms`)}  User replies → Philip's Phase 2 starts speaking`);

  console.log();
  if (userSpeaks_to_PhilipStarts > 4000 || Philip1Ends_to_Philip2Starts > 4000) {
    console.log(red("  ✗ BROKEN  — latency exceeds conversational threshold (4s)"));
    console.log(red("            Users experience this as abandonment, not thinking."));
  } else if (userSpeaks_to_PhilipStarts > 2000 || Philip1Ends_to_Philip2Starts > 2000) {
    console.log(yellow("  ⚠ CLUNKY  — noticeable lag; acceptable but not conversational"));
    console.log(yellow("            Target: under 2s felt latency for natural conversation."));
  } else {
    console.log(green("  ✓ SMOOTH  — within conversational threshold"));
  }

  console.log();
  console.log(dim("  Key bottleneck to watch: Phase 2 TTS TTFB"));
  console.log(dim("  Phase 1 uses WebSocket streaming (fast). Phase 2 uses blob TTS (full wait)."));
  console.log(dim("  Migrating Phase 2 to WebSocket streaming would cut Phase 2 TTFB by ~60-70%."));
  console.log(bold("─────────────────────────────────────────────────────────────────"));
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${bold(cyan("Philip Flow Timing Test"))}`);
  console.log(dim(`Target: ${BASE_URL}`));
  console.log(dim(`Session: ${SESSION_ID}`));
  console.log(dim("─".repeat(65)));
  console.log(dim("Legend: ") + green("▶ fast (<1.5s)") + "  " + yellow("▶ ok (<3s)") + "  " + red("▶ slow (≥3s)"));

  // ① Health
  const healthy = await stepHealthCheck();
  if (!healthy) {
    console.log(red("\nServer not healthy — aborting flow test."));
    process.exit(1);
  }

  // ② Phase 1 text
  const phase1Text = await stepPhase1();
  if (!phase1Text) {
    console.log(red("\nPhase 1 failed — cannot continue."));
    process.exit(1);
  }
  const phase1ApiTime = 0; // captured inside timedFetch above — re-measure below for summary

  // ③ Phase 1 TTS
  await stepPhase1TTS(phase1Text);

  // ④ Bridge phrases
  await stepBridgeTTS();

  // ⑤ Phase 2 text
  const phase2Text = await stepPhase2(phase1Text);
  if (!phase2Text) {
    console.log(red("\nPhase 2 failed — cannot continue."));
    process.exit(1);
  }

  // ⑥ Phase 2 TTS
  await stepPhase2TTS(phase2Text);

  // ── Re-run key steps to get clean timing for summary ────────────────────
  console.log(`\n${bold("⑦ Re-measuring for summary (fresh — no cache warmth)")} ${dim("...")}`);

  const t0 = performance.now();
  const p1Again = await timedFetch("Phase 1 API", `${BASE_URL}/api/guidance/phase1`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ situation: TEST_SITUATION, sessionId: `${SESSION_ID}-b`, daysWithApp: 30, isPro: true }),
  }, { collectBody: true });

  const p1TtsAgain = await timedFetch("Phase 1 TTS TTFB", `${BASE_URL}/api/tts`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: p1Again.text ?? phase1Text, voice: "onyx", scope: "guidance", sessionId: `${SESSION_ID}-b`, isPro: true }),
  }, { firstByteOnly: true });

  const p2Again = await timedFetch("Phase 2 API", `${BASE_URL}/api/guidance/response`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation: TEST_SITUATION,
      messages: [
        { role: "user", content: TEST_SITUATION },
        { role: "assistant", content: p1Again.text ?? phase1Text },
        { role: "user", content: TEST_PHASE2_REPLY },
      ],
      sessionId: `${SESSION_ID}-b`, daysWithApp: 30, isPro: true,
      phase1Response: p1Again.text ?? phase1Text,
      phase1UserReply: TEST_PHASE2_REPLY,
    }),
  }, { collectBody: true });

  const p2TtsAgain = await timedFetch("Phase 2 TTS TTFB", `${BASE_URL}/api/tts`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: p2Again.text ?? phase2Text, voice: "onyx", scope: "guidance", sessionId: `${SESSION_ID}-b`, isPro: true }),
  }, { firstByteOnly: true });

  printSummary({
    phase1Api:     p1Again.total,
    phase1Tts:     p1TtsAgain.total,
    phase1TtsTtfb: p1TtsAgain.ttfb,
    phase2Api:     p2Again.total,
    phase2Tts:     p2TtsAgain.total,
    phase2TtsTtfb: p2TtsAgain.ttfb,
  });
}

main().catch(err => {
  console.error(red(err.message));
  process.exit(1);
});
