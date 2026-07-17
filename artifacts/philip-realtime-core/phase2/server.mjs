import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PHASE2_LIMITS,
  SANITIZED_REALTIME_SESSION,
  sanitizedPreflightConfig,
} from "./config.mjs";
import { getPhase2Scenario } from "./scenarios.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, "..");
const PUBLIC_ROOT = path.join(HERE, "public");
const TEMP_AUDIO_ROOT = path.join(PACKAGE_ROOT, "tmp", "phase2-audio");
const EVIDENCE_ROOT = path.join(PACKAGE_ROOT, "evidence", "phase2");
const LEDGER_PATH = path.join(EVIDENCE_ROOT, "attempt-ledger.json");
const MAX_BODY_BYTES = 5 * 1024 * 1024;

function emptyLedger() {
  return {
    schemaVersion: 1,
    model: PHASE2_LIMITS.model,
    maximumAttempts: PHASE2_LIMITS.maxAttempts,
    absoluteSpendUsd: PHASE2_LIMITS.absoluteSpendUsd,
    attempts: [],
    cumulativeEstimatedCostUsd: 0,
  };
}

async function loadLedger() {
  try {
    return JSON.parse(await readFile(LEDGER_PATH, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return emptyLedger();
    throw error;
  }
}

async function saveLedger(ledger) {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeFile(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`, {
    mode: 0o600,
  });
}

async function readBody(req, { asText = false } = {}) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("request_body_too_large");
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return asText ? buffer.toString("utf8") : buffer;
}

function json(res, status, value, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  res.end(`${JSON.stringify(value, null, 2)}\n`);
}

function text(res, status, value, contentType = "text/plain; charset=utf-8", headers = {}) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    ...headers,
  });
  res.end(value);
}

function safeFixtureName(urlPath) {
  const name = path.basename(urlPath);
  if (!/^[a-z0-9-]+\.wav$/i.test(name)) return null;
  return name;
}

async function serveStatic(req, res, pathname) {
  if (pathname.startsWith("/fixtures/")) {
    const name = safeFixtureName(pathname);
    if (!name) return text(res, 400, "invalid fixture");
    try {
      const wav = await readFile(path.join(TEMP_AUDIO_ROOT, name));
      res.writeHead(200, {
        "content-type": "audio/wav",
        "cache-control": "no-store",
      });
      res.end(wav);
    } catch {
      text(res, 404, "fixture not found");
    }
    return;
  }

  const file = pathname === "/" ? "index.html" : path.basename(pathname);
  if (!["index.html", "app.mjs"].includes(file)) return text(res, 404, "not found");
  try {
    const contents = await readFile(path.join(PUBLIC_ROOT, file));
    text(
      res,
      200,
      contents,
      file.endsWith(".mjs")
        ? "text/javascript; charset=utf-8"
        : "text/html; charset=utf-8",
    );
  } catch {
    text(res, 404, "not found");
  }
}

async function reserveAttempt(sessionNumber) {
  const scenario = getPhase2Scenario(sessionNumber);
  const ledger = await loadLedger();
  if (ledger.attempts.length >= PHASE2_LIMITS.maxAttempts) {
    throw new Error("three_session_attempt_cap_reached");
  }
  if (
    ledger.cumulativeEstimatedCostUsd + PHASE2_LIMITS.sessionReserveUsd >
    PHASE2_LIMITS.absoluteSpendUsd
  ) {
    throw new Error("provider_spend_reservation_would_exceed_cap");
  }

  const attempt = {
    attemptId: `phase2-${Date.now()}-${ledger.attempts.length + 1}`,
    ordinal: ledger.attempts.length + 1,
    requestedSessionNumber: Number(sessionNumber),
    scenario: scenario.name,
    model: PHASE2_LIMITS.model,
    attemptedAt: new Date().toISOString(),
    status: "attempted",
    success: false,
    maxDurationMs: scenario.maxDurationMs,
    reservedUsd: PHASE2_LIMITS.sessionReserveUsd,
    estimatedCostUsd: 0,
  };
  ledger.attempts.push(attempt);
  await saveLedger(ledger); // Count before the provider request, including failures.
  return { attempt, scenario, ledger };
}

async function updateAttempt(attemptId, patch) {
  const ledger = await loadLedger();
  const attempt = ledger.attempts.find((item) => item.attemptId === attemptId);
  if (!attempt) throw new Error("attempt_not_found");
  Object.assign(attempt, patch);
  ledger.cumulativeEstimatedCostUsd = Number(
    ledger.attempts
      .reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0)
      .toFixed(6),
  );
  await saveLedger(ledger);
  return { ledger, attempt };
}

async function createRealtimeCall(req, res, sessionNumber) {
  if (!process.env.OPENAI_API_KEY) {
    return json(res, 412, { error: "OPENAI_API_KEY is not present" });
  }

  const sdp = await readBody(req, { asText: true });
  if (!sdp.startsWith("v=0")) return json(res, 400, { error: "invalid SDP offer" });

  let reserved;
  try {
    reserved = await reserveAttempt(sessionNumber);
  } catch (error) {
    return json(res, 409, { error: error.message });
  }

  const { attempt, scenario } = reserved;
  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", JSON.stringify(SANITIZED_REALTIME_SESSION));

  try {
    const providerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Safety-Identifier": "philip-realtime-phase2-neutral-synthetic",
      },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    const answer = await providerResponse.text();
    if (!providerResponse.ok) {
      await updateAttempt(attempt.attemptId, {
        status: "provider_rejected",
        failureCategory: "authentication_or_protocol",
        providerStatus: providerResponse.status,
        finishedAt: new Date().toISOString(),
      });
      return json(res, providerResponse.status, {
        error: "realtime call rejected",
        providerStatus: providerResponse.status,
        attemptId: attempt.attemptId,
        providerBodySanitized: answer.slice(0, 300),
      });
    }
    await updateAttempt(attempt.attemptId, {
      status: "transport_connected",
      providerStatus: providerResponse.status,
    });
    text(res, 200, answer, "application/sdp", {
      "x-phase2-attempt-id": attempt.attemptId,
      "x-phase2-attempt-ordinal": String(attempt.ordinal),
      "x-phase2-max-duration-ms": String(scenario.maxDurationMs),
      "x-phase2-remaining-budget-usd": String(
        PHASE2_LIMITS.absoluteSpendUsd - reserved.ledger.cumulativeEstimatedCostUsd,
      ),
    });
  } catch (error) {
    await updateAttempt(attempt.attemptId, {
      status: "transport_failed",
      failureCategory: "transport",
      failureMessage: String(error.message || error).slice(0, 300),
      finishedAt: new Date().toISOString(),
    });
    json(res, 502, {
      error: "realtime transport failed",
      attemptId: attempt.attemptId,
      message: String(error.message || error).slice(0, 300),
    });
  }
}

async function persistEvidence(req, res) {
  const evidence = JSON.parse(await readBody(req, { asText: true }));
  if (!evidence.attemptId) return json(res, 400, { error: "attemptId required" });
  const safe = {
    ...evidence,
    apiKey: undefined,
    ephemeralCredential: undefined,
    rawAudio: undefined,
  };
  const resultPath = path.join(EVIDENCE_ROOT, `${evidence.attemptId}.json`);
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeFile(resultPath, `${JSON.stringify(safe, null, 2)}\n`, { mode: 0o600 });
  const { ledger } = await updateAttempt(evidence.attemptId, {
    status: evidence.status || "completed",
    success: evidence.status === "completed",
    durationMs: evidence.durationMs,
    estimatedCostUsd: Number(evidence.estimatedCostUsd || 0),
    finishedAt: new Date().toISOString(),
    evidenceFile: path.relative(PACKAGE_ROOT, resultPath),
    stopReason: evidence.stopReason || null,
  });
  json(res, 200, {
    saved: true,
    evidenceFile: path.relative(PACKAGE_ROOT, resultPath),
    cumulativeEstimatedCostUsd: ledger.cumulativeEstimatedCostUsd,
  });
}

export async function startPhase2Server({ port = 0 } = {}) {
  await mkdir(TEMP_AUDIO_ROOT, { recursive: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  if (!(await loadLedger()).schemaVersion) await saveLedger(emptyLedger());

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
      if (req.method === "GET" && url.pathname === "/api/preflight") {
        const sessionNumber = Number(url.searchParams.get("session"));
        return json(res, 200, {
          config: sanitizedPreflightConfig(),
          scenario: getPhase2Scenario(sessionNumber),
          ledger: await loadLedger(),
          apiKeyPresent: Boolean(process.env.OPENAI_API_KEY),
        });
      }
      if (req.method === "GET" && url.pathname === "/api/ledger") {
        return json(res, 200, await loadLedger());
      }
      if (req.method === "POST" && url.pathname === "/api/session") {
        return createRealtimeCall(req, res, Number(url.searchParams.get("session")));
      }
      if (req.method === "POST" && url.pathname === "/api/evidence") {
        return persistEvidence(req, res);
      }
      if (req.method === "GET") return serveStatic(req, res, url.pathname);
      text(res, 404, "not found");
    } catch (error) {
      json(res, 500, { error: String(error.message || error).slice(0, 500) });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const address = server.address();
  return {
    server,
    port: address.port,
    origin: `http://127.0.0.1:${address.port}`,
    ledgerPath: LEDGER_PATH,
    tempAudioRoot: TEMP_AUDIO_ROOT,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const running = await startPhase2Server({ port: Number(process.env.PORT || 4317) });
  console.log(`PHASE2_SERVER_READY ${running.origin}`);
}
