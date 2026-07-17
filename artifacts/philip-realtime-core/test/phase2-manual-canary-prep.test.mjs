import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createElapsedTimer,
  createLocalSpeechSilenceDetector,
  rmsFromTimeDomain,
  ATTEMPT3_PAID_LIMITS,
} from "../phase2/localVad.mjs";
import { startPhase2Server } from "../phase2/server.mjs";
import { readFile } from "node:fs/promises";

function sineFrame(amplitude, length = 2048) {
  const samples = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    const wave = Math.sin((i / length) * Math.PI * 8) * amplitude;
    samples[i] = Math.max(0, Math.min(255, Math.round(128 + wave * 127)));
  }
  return samples;
}

function quietFrame(length = 2048) {
  return new Uint8Array(length).fill(128);
}

describe("Phase 2 unpaid manual canary preparation", () => {
  it("pins Attempt 3 paid limits without consuming them", () => {
    assert.equal(ATTEMPT3_PAID_LIMITS.model, "gpt-realtime-2.1");
    assert.equal(ATTEMPT3_PAID_LIMITS.attemptOrdinal, 3);
    assert.equal(ATTEMPT3_PAID_LIMITS.maxAttempts, 3);
    assert.ok(ATTEMPT3_PAID_LIMITS.maxDurationMs < 120_000);
    assert.equal(ATTEMPT3_PAID_LIMITS.absoluteSpendUsd, 5);
  });

  it("detects speech energy and 1.5s silence locally", () => {
    const detector = createLocalSpeechSilenceDetector({
      silenceDurationMs: 1500,
      pollIntervalMs: 50,
    });
    assert.ok(rmsFromTimeDomain(sineFrame(0.4)) > 0.02);
    assert.equal(detector.ingestTimeDomain(sineFrame(0.5), 0), "speech");
    assert.equal(detector.speaking, true);
    assert.equal(detector.ingestTimeDomain(quietFrame(), 100), null);
    assert.equal(detector.ingestTimeDomain(quietFrame(), 1599), null);
    assert.equal(detector.ingestTimeDomain(quietFrame(), 1600), "silence");
    assert.equal(detector.speaking, false);
  });

  it("elapsed timer supports emergency stop semantics", () => {
    let now = 1000;
    const timer = createElapsedTimer(() => now);
    timer.start();
    now = 2500;
    assert.equal(timer.elapsedMs(), 1500);
    timer.stop();
    now = 9000;
    assert.equal(timer.elapsedMs(), 1500);
    assert.equal(timer.running, false);
  });

  it("manual page keeps Begin disabled and documents prep banner", async () => {
    const html = await readFile(
      new URL("../phase2/public/manual-canary.html", import.meta.url),
      "utf8",
    );
    const js = await readFile(
      new URL("../phase2/public/manual-canary.mjs", import.meta.url),
      "utf8",
    );
    assert.ok(html.includes("Attempt 3 of 3 — paid connection not started"));
    assert.ok(html.includes('id="beginRealtime"'));
    assert.ok(html.includes("disabled"));
    assert.ok(html.includes("Emergency Stop"));
    assert.ok(html.includes("Test Microphone Locally"));
    assert.ok(js.includes("hardDisablePaidStart"));
    assert.ok(js.includes("enablePaidStart"));
    assert.ok(js.includes("beginRealtimeCanary"));
    assert.ok(js.includes("provider_request_blocked_until_begin") || js.includes("browser_must_not_hold_standard_api_key"));
    assert.ok(js.includes("getUserMedia"));
    assert.ok(js.includes("real_microphone_live"));
  });

  it("rejects /api/session in prep mode without counting an attempt", async () => {
    delete process.env.ALLOW_ATTEMPT3;
    const running = await startPhase2Server();
    try {
      const before = await fetch(`${running.origin}/api/ledger`).then((r) => r.json());
      const response = await fetch(`${running.origin}/api/session?session=1`, {
        method: "POST",
        headers: { "content-type": "application/sdp" },
        body: "v=0\r\n",
      });
      assert.equal(response.status, 423);
      const body = await response.json();
      assert.equal(body.attemptCounted, false);
      assert.equal(body.providerCalled, false);
      const after = await fetch(`${running.origin}/api/ledger`).then((r) => r.json());
      assert.equal(after.attempts.length, before.attempts.length);
      const prep = await fetch(`${running.origin}/api/prep-status`).then((r) => r.json());
      assert.equal(prep.attempt3Armed, false);
      assert.equal(prep.prepOnly, true);
      assert.ok(String(prep.banner).includes("paid connection not started") || String(prep.banner).includes("Attempt 3"));
    } finally {
      await running.close();
    }
  });

  it("serves the manual canary page and local VAD module", async () => {
    const running = await startPhase2Server();
    try {
      const page = await fetch(`${running.origin}/manual-canary`);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.ok(html.includes("Test Microphone Locally"));
      const vad = await fetch(`${running.origin}/localVad.mjs`);
      assert.equal(vad.status, 200);
      const vadText = await vad.text();
      assert.ok(vadText.includes("createLocalSpeechSilenceDetector"));
      const script = await fetch(`${running.origin}/manual-canary.mjs`);
      assert.equal(script.status, 200);
    } finally {
      await running.close();
    }
  });

  it("documents two-minute timeout and stop for Attempt 3 hardening", async () => {
    const js = await readFile(
      new URL("../phase2/public/manual-canary.mjs", import.meta.url),
      "utf8",
    );
    const cfg = await readFile(new URL("../phase2/config.mjs", import.meta.url), "utf8");
    assert.ok(js.includes("ATTEMPT3_PAID_LIMITS"));
    assert.ok(js.includes("Emergency Stop") || js.includes("emergencyStop"));
    assert.ok(cfg.includes("attempt3MaxDurationMs: 115_000"));
    assert.ok(cfg.includes("ALLOW_ATTEMPT3"));
  });
});
