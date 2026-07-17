import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PHASE2_LIMITS,
  SANITIZED_REALTIME_SESSION,
  sanitizedPreflightConfig,
  isAttempt3Armed,
} from "./config.mjs";
import { getPhase2Scenario } from "./scenarios.mjs";
import { scrubSecrets } from "./loadCredential.mjs";
import { ATTEMPT3_PAID_LIMITS } from "./localVad.mjs";

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

  if (pathname === "/localVad.mjs") {
    try {
      const contents = await readFile(path.join(HERE, "localVad.mjs"));
      return text(res, 200, contents, "text/javascript; charset=utf-8");
    } catch {
      return text(res, 404, "not found");
    }
  }

  const route =
    pathname === "/" || pathname === "/manual" || pathname === "/manual-canary"
      ? "manual-canary.html"
      : path.basename(pathname);
  const allowed = new Set([
    "index.html",
    "app.mjs",
    "manual-canary.html",
    "manual-canary.mjs",
  ]);
  if (!allowed.has(route)) return text(res, 404, "not found");
  try {
    const contents = await readFile(path.join(PUBLIC_ROOT, route));
    text(
      res,
      200,
      contents,
      route.endsWith(".mjs")
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

function resolveServerApiKey() {
  const value = process.env.OPENAI_API_KEY;
  if (!value || !String(value).trim()) {
    return { ok: false, error: "OPENAI_API_KEY is not present" };
  }
  const trimmed = String(value).trim();
  // Refuse the Session 1 local-loader failure mode before any provider call.
  if (trimmed === "OPENAI_API_KEY" || trimmed.startsWith("OPENAI_API_KEY=")) {
    return {
      ok: false,
      error: "OPENAI_API_KEY looks like a malformed local env assignment, not a secret",
    };
  }
  return { ok: true, value: trimmed };
}

function buildBearerAuthorization(apiKey) {
  // Construct exactly once. Official docs use Authorization: Bearer <standard key>.
  return `Bearer ${apiKey}`;
}

async function createRealtimeCall(req, res, sessionNumber) {
  if (!isAttempt3Armed()) {
    // Prep mode: never count an attempt and never call the provider.
    return json(res, 423, {
      error: "attempt3_not_armed",
      message:
        "Unpaid preparation mode. Set ALLOW_ATTEMPT3=1 only after Brian explicitly authorizes Attempt 3.",
      attemptCounted: false,
      providerCalled: false,
    });
  }

  const key = resolveServerApiKey();
  if (!key.ok) {
    return json(res, 412, { error: key.error });
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
  const authorization = buildBearerAuthorization(key.value);

  try {
    const providerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: authorization,
        "OpenAI-Safety-Identifier": "philip-realtime-phase2-neutral-synthetic",
      },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    const answer = await providerResponse.text();
    if (!providerResponse.ok) {
      let providerErrorType = null;
      let providerErrorCode = null;
      try {
        const parsed = JSON.parse(answer);
        providerErrorType = parsed?.error?.type || null;
        providerErrorCode = parsed?.error?.code || null;
      } catch {
        // Provider may return SDP/text on success paths; failures are often JSON.
      }
      await updateAttempt(attempt.attemptId, {
        status: "provider_rejected",
        failureCategory: "authentication_or_protocol",
        providerStatus: providerResponse.status,
        providerErrorType,
        providerErrorCode,
        providerRequestId: providerResponse.headers.get("x-request-id") || null,
        providerHost: "api.openai.com",
        providerPath: "/v1/realtime/calls",
        finishedAt: new Date().toISOString(),
      });
      return json(res, providerResponse.status, {
        error: "realtime call rejected",
        providerStatus: providerResponse.status,
        providerErrorType,
        providerErrorCode,
        attemptId: attempt.attemptId,
        providerBodySanitized: scrubSecrets(answer.slice(0, 300)),
      });
    }
    await updateAttempt(attempt.attemptId, {
      status: "transport_connected",
      providerStatus: providerResponse.status,
      providerRequestId: providerResponse.headers.get("x-request-id") || null,
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
          apiKeyPresent: (() => {
            const value = process.env.OPENAI_API_KEY;
            if (!value || !String(value).trim()) return false;
            const trimmed = String(value).trim();
            if (trimmed === "OPENAI_API_KEY" || trimmed.startsWith("OPENAI_API_KEY=")) {
              return false;
            }
            return true;
          })(),
          prepOnly: !isAttempt3Armed(),
          attempt3Armed: isAttempt3Armed(),
          attempt3Limits: ATTEMPT3_PAID_LIMITS,
        });
      }
      if (req.method === "GET" && url.pathname === "/api/prep-status") {
        const ledger = await loadLedger();
        return json(res, 200, {
          prepOnly: !isAttempt3Armed(),
          attempt3Armed: isAttempt3Armed(),
          attemptsUsed: ledger.attempts.length,
          attemptsMax: PHASE2_LIMITS.maxAttempts,
          remainingAttempts: PHASE2_LIMITS.maxAttempts - ledger.attempts.length,
          cumulativeEstimatedCostUsd: ledger.cumulativeEstimatedCostUsd,
          absoluteSpendUsd: PHASE2_LIMITS.absoluteSpendUsd,
          model: PHASE2_LIMITS.model,
          maxPaidDurationMs: PHASE2_LIMITS.attempt3MaxDurationMs,
          banner: "Attempt 3 of 3 — paid connection not started",
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
      json(res, 500, { error: scrubSecrets(String(error.message || error).slice(0, 500)) });
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
