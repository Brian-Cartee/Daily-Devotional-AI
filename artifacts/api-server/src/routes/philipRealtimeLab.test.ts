import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import express from "express";

test("isolated Realtime routes remain authenticated and disarmed before provider access", async () => {
  const evidenceDir = await mkdtemp(path.join(os.tmpdir(), "iphone-realtime-route-"));
  process.env.PHILIP_REALTIME_LAB_EVIDENCE_DIR = evidenceDir;
  process.env.PHILIP_VOICE_LAB_SECRET = "fake-internal-lab-secret";
  delete process.env.ALLOW_IPHONE_REALTIME;
  delete process.env.OPENAI_API_KEY;

  const { registerPhilipRealtimeLabRoutes } = await import("./philipRealtimeLab");
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  registerPhilipRealtimeLabRoutes(app);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const root = `http://127.0.0.1:${address.port}/api/internal/philip-voice/realtime`;

  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://api.openai.com/")) providerCalls += 1;
    return originalFetch(input, init);
  };

  try {
    const rejectedToken = await fetch(`${root}/token`, {
      method: "POST",
      headers: { "X-Philip-Lab-Secret": "wrong" },
    });
    assert.equal(rejectedToken.status, 401);

    const tokenResponse = await fetch(`${root}/token`, {
      method: "POST",
      headers: { "X-Philip-Lab-Secret": "fake-internal-lab-secret" },
    });
    assert.equal(tokenResponse.status, 200);
    const tokenBody = (await tokenResponse.json()) as {
      token: string;
      model: string;
      voice: string;
    };
    assert.ok(tokenBody.token);
    assert.equal(tokenBody.model, "gpt-realtime-2.1");
    assert.equal(tokenBody.voice, "cedar");

    const status = await fetch(`${root}/status`, {
      headers: { Authorization: `Bearer ${tokenBody.token}` },
    });
    assert.equal(status.status, 200);
    const readiness = (await status.json()) as Record<string, unknown>;
    assert.equal(readiness.runtime, "isolated-philip-lab-api");
    assert.equal(readiness.armed, false);
    assert.equal(readiness.sessionsUsed, 0);
    assert.equal(readiness.cumulativeEstimatedCostUsd, 0);
    assert.equal(readiness.productionApi, false);
    assert.equal(readiness.liveKitCloud, false);
    assert.equal(readiness.model, "gpt-realtime-2.1");
    assert.equal(readiness.voice, "cedar");
    assert.equal(readiness.inputTranscriptionModel, "gpt-4o-mini-transcribe");

    const denied = await fetch(`${root}/session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenBody.token}`,
        "content-type": "application/sdp",
      },
      body: "v=0\r\n",
    });
    assert.equal(denied.status, 423);
    assert.deepEqual(await denied.json(), {
      error: "iphone_realtime_not_armed",
      sessionCounted: false,
      providerCalled: false,
    });
    assert.equal(providerCalls, 0);

    const ledgerPath = path.join(evidenceDir, "session-ledger.json");
    await assert.rejects(readFile(ledgerPath), /ENOENT/);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(evidenceDir, { recursive: true, force: true });
  }
});
