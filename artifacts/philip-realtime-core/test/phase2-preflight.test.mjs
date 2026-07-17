import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  PHASE2_LIMITS,
  SANITIZED_REALTIME_SESSION,
  sanitizedPreflightConfig,
} from "../phase2/config.mjs";
import { startPhase2Server } from "../phase2/server.mjs";
import { PHASE2_SCENARIOS } from "../phase2/scenarios.mjs";

describe("Phase 2 paid-session preflight (no provider calls)", () => {
  it("pins the only authorized model and official WebRTC session shape", () => {
    assert.equal(SANITIZED_REALTIME_SESSION.type, "realtime");
    assert.equal(SANITIZED_REALTIME_SESSION.model, "gpt-realtime-2.1");
    assert.deepEqual(SANITIZED_REALTIME_SESSION.output_modalities, ["audio"]);
    assert.equal(
      SANITIZED_REALTIME_SESSION.audio.input.turn_detection.type,
      "semantic_vad",
    );
    assert.equal(
      SANITIZED_REALTIME_SESSION.audio.input.turn_detection.interrupt_response,
      true,
    );
    assert.equal(PHASE2_LIMITS.maxAttempts, 3);
    assert.equal(PHASE2_LIMITS.absoluteSpendUsd, 5);
  });

  it("uses server-side authentication and does not configure another model", () => {
    const config = sanitizedPreflightConfig();
    assert.equal(config.authentication.includes("never sent to browser"), true);
    assert.equal(config.inputTranscription.startsWith("disabled"), true);
    assert.equal(config.recordings.startsWith("disabled"), true);
    assert.equal(JSON.stringify(config).includes("OPENAI_API_KEY"), false);
    assert.equal(JSON.stringify(config).includes("gpt-4o-mini-transcribe"), false);
  });

  it("hard-stops before authorized duration ceilings", () => {
    assert.equal(PHASE2_SCENARIOS[1].maxDurationMs, 115_000);
    assert.equal(PHASE2_SCENARIOS[2].maxDurationMs, 295_000);
    assert.equal(PHASE2_SCENARIOS[3].maxDurationMs, 295_000);
  });

  it("has transcript, timing, interruption, errors, usage, cost, and teardown logging", async () => {
    const app = await readFile(
      new URL("../phase2/public/app.mjs", import.meta.url),
      "utf8",
    );
    for (const required of [
      "cleanUserTranscript",
      "speechEndToFirstAudibleMs",
      "interruptionToAudioStoppedMs",
      "providerErrors",
      "addUsage",
      "estimatedCostUsd",
      "pc?.close()",
      "audioRecorded: false",
    ]) {
      assert.ok(app.includes(required), `missing Phase 2 logging/guard: ${required}`);
    }
  });

  it("refuses a paid attempt before counting when the key is absent", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const running = await startPhase2Server();
    try {
      const response = await fetch(`${running.origin}/api/session?session=1`, {
        method: "POST",
        headers: { "content-type": "application/sdp" },
        body: "v=0\r\n",
      });
      assert.equal(response.status, 412);
      const ledger = await fetch(`${running.origin}/api/ledger`).then((r) => r.json());
      assert.equal(ledger.attempts.length, 0);
    } finally {
      await running.close();
      if (original) process.env.OPENAI_API_KEY = original;
    }
  });
});
