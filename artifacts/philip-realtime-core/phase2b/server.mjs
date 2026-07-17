import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PHASE2B_LIMITS,
  PHASE2B_REALTIME_SESSION,
  isPhase2BSession1Armed,
  sanitizedPhase2BConfig,
} from "./config.mjs";
import {
  applyPhase2OpenAiApiKey,
  scrubSecrets,
} from "../phase2/loadCredential.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, "..");
const PUBLIC_ROOT = path.join(HERE, "public");
const EVIDENCE_ROOT = path.join(PACKAGE_ROOT, "evidence", "phase2b");
const LEDGER_PATH = path.join(EVIDENCE_ROOT, "session-ledger.json");
const MAX_BODY_BYTES = 5 * 1024 * 1024;

function emptyLedger() {
  return {
    schemaVersion: 1,
    phase: "2B",
    model: PHASE2B_LIMITS.model,
    transcriptionModel: PHASE2B_LIMITS.transcriptionModel,
    maximumNewSessions: PHASE2B_LIMITS.maximumNewSessions,
    absoluteCumulativeSpendUsd: PHASE2B_LIMITS.absoluteCumulativeSpendUsd,
    sessions: [],
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

async function serveStatic(res, pathname) {
  const route =
    pathname === "/" || pathname === "/session1"
      ? "index.html"
      : path.basename(pathname);
  const allowed = new Set(["index.html", "app.mjs"]);
  if (!allowed.has(route)) return text(res, 404, "not found");
  try {
    const contents = await readFile(path.join(PUBLIC_ROOT, route));
    return text(
      res,
      200,
      contents,
      route.endsWith(".mjs")
        ? "text/javascript; charset=utf-8"
        : "text/html; charset=utf-8",
    );
  } catch {
    return text(res, 404, "not found");
  }
}

async function reserveSession1() {
  const ledger = await loadLedger();
  if (ledger.sessions.length >= PHASE2B_LIMITS.maximumNewSessions) {
    throw new Error("phase2b_three_session_cap_reached");
  }
  if (
    PHASE2B_LIMITS.session1OnlyUntilReport &&
    ledger.sessions.length >= 1
  ) {
    throw new Error("phase2b_session1_already_consumed_report_required");
  }
  if (
    ledger.cumulativeEstimatedCostUsd + PHASE2B_LIMITS.sessionReserveUsd >
    PHASE2B_LIMITS.absoluteCumulativeSpendUsd
  ) {
    throw new Error("phase2b_spend_reservation_would_exceed_cap");
  }
  const session = {
    sessionId: `phase2b-${Date.now()}-1`,
    ordinal: ledger.sessions.length + 1,
    name: "natural_conversation_session_1",
    model: PHASE2B_LIMITS.model,
    transcriptionModel: PHASE2B_LIMITS.transcriptionModel,
    attemptedAt: new Date().toISOString(),
    status: "attempted",
    success: false,
    maxDurationMs: PHASE2B_LIMITS.maximumDurationMs,
    reservedUsd: PHASE2B_LIMITS.sessionReserveUsd,
    realtimeEstimatedCostUsd: 0,
    transcriptionEstimatedCostUsd: 0,
    estimatedCostUsd: 0,
  };
  ledger.sessions.push(session);
  await saveLedger(ledger); // Count before provider access.
  return { ledger, session };
}

async function updateSession(sessionId, patch) {
  const ledger = await loadLedger();
  const session = ledger.sessions.find((item) => item.sessionId === sessionId);
  if (!session) throw new Error("phase2b_session_not_found");
  Object.assign(session, patch);
  ledger.cumulativeEstimatedCostUsd = Number(
    ledger.sessions
      .reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0)
      .toFixed(6),
  );
  await saveLedger(ledger);
  return { ledger, session };
}

function resolveApiKey() {
  const value = process.env.OPENAI_API_KEY;
  if (!value || !String(value).trim()) {
    return { ok: false, error: "OPENAI_API_KEY is not present" };
  }
  const trimmed = String(value).trim();
  if (trimmed === "OPENAI_API_KEY" || trimmed.startsWith("OPENAI_API_KEY=")) {
    return { ok: false, error: "malformed local credential assignment" };
  }
  return { ok: true, value: trimmed };
}

async function createRealtimeCall(req, res) {
  if (!isPhase2BSession1Armed()) {
    return json(res, 423, {
      error: "phase2b_session1_not_armed",
      sessionCounted: false,
      providerCalled: false,
    });
  }
  const key = resolveApiKey();
  if (!key.ok) return json(res, 412, { error: key.error });

  const sdp = await readBody(req, { asText: true });
  if (!sdp.startsWith("v=0")) return json(res, 400, { error: "invalid_sdp_offer" });

  let reserved;
  try {
    reserved = await reserveSession1();
  } catch (error) {
    return json(res, 409, { error: error.message });
  }

  const { session } = reserved;
  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", JSON.stringify(PHASE2B_REALTIME_SESSION));

  try {
    const providerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.value}`,
        "OpenAI-Safety-Identifier": "philip-realtime-phase2b-brian-local",
      },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    const answer = await providerResponse.text();
    const requestId = providerResponse.headers.get("x-request-id") || null;
    if (!providerResponse.ok) {
      let providerErrorType = null;
      let providerErrorCode = null;
      try {
        const parsed = JSON.parse(answer);
        providerErrorType = parsed?.error?.type || null;
        providerErrorCode = parsed?.error?.code || null;
      } catch {}
      await updateSession(session.sessionId, {
        status: "provider_rejected",
        providerStatus: providerResponse.status,
        providerErrorType,
        providerErrorCode,
        providerRequestId: requestId,
        finishedAt: new Date().toISOString(),
      });
      return json(res, providerResponse.status, {
        error: "realtime_call_rejected",
        providerStatus: providerResponse.status,
        providerErrorType,
        providerErrorCode,
        sessionId: session.sessionId,
      });
    }
    await updateSession(session.sessionId, {
      status: "transport_connected",
      providerStatus: providerResponse.status,
      providerRequestId: requestId,
    });
    return text(res, 200, answer, "application/sdp", {
      "x-phase2b-session-id": session.sessionId,
      "x-phase2b-session-ordinal": String(session.ordinal),
      "x-phase2b-max-duration-ms": String(PHASE2B_LIMITS.maximumDurationMs),
      "x-phase2b-remaining-budget-usd": String(
        PHASE2B_LIMITS.absoluteCumulativeSpendUsd -
          reserved.ledger.cumulativeEstimatedCostUsd,
      ),
    });
  } catch (error) {
    await updateSession(session.sessionId, {
      status: "transport_failed",
      failureMessage: scrubSecrets(String(error.message || error)).slice(0, 300),
      finishedAt: new Date().toISOString(),
    });
    return json(res, 502, {
      error: "realtime_transport_failed",
      sessionId: session.sessionId,
    });
  }
}

async function persistEvidence(req, res) {
  const evidence = JSON.parse(await readBody(req, { asText: true }));
  if (!evidence.sessionId) return json(res, 400, { error: "sessionId required" });
  const safe = {
    ...evidence,
    apiKey: undefined,
    authorization: undefined,
    providerHeaders: undefined,
    cookies: undefined,
    rawAudio: undefined,
  };
  const outPath = path.join(EVIDENCE_ROOT, `${evidence.sessionId}.json`);
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeFile(outPath, `${JSON.stringify(safe, null, 2)}\n`, { mode: 0o600 });
  const { ledger } = await updateSession(evidence.sessionId, {
    status: evidence.status || "completed",
    success: evidence.status === "completed",
    durationMs: evidence.durationMs,
    realtimeEstimatedCostUsd: Number(evidence.realtimeEstimatedCostUsd || 0),
    transcriptionEstimatedCostUsd: Number(
      evidence.transcriptionEstimatedCostUsd || 0,
    ),
    estimatedCostUsd: Number(evidence.estimatedCostUsd || 0),
    stopReason: evidence.stopReason || null,
    finishedAt: new Date().toISOString(),
    evidenceFile: path.relative(PACKAGE_ROOT, outPath),
  });
  return json(res, 200, {
    saved: true,
    cumulativeEstimatedCostUsd: ledger.cumulativeEstimatedCostUsd,
    evidenceFile: path.relative(PACKAGE_ROOT, outPath),
  });
}

export async function startPhase2BServer({ port = 0 } = {}) {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
      if (req.method === "GET" && url.pathname === "/api/status") {
        const ledger = await loadLedger();
        return json(res, 200, {
          phase: "2B",
          armed: isPhase2BSession1Armed(),
          model: PHASE2B_LIMITS.model,
          transcriptionModel: PHASE2B_LIMITS.transcriptionModel,
          sessionsUsed: ledger.sessions.length,
          sessionsMax: PHASE2B_LIMITS.maximumNewSessions,
          session1Available: ledger.sessions.length === 0,
          cumulativeEstimatedCostUsd: ledger.cumulativeEstimatedCostUsd,
          capUsd: PHASE2B_LIMITS.absoluteCumulativeSpendUsd,
          maxDurationMs: PHASE2B_LIMITS.maximumDurationMs,
        });
      }
      if (req.method === "GET" && url.pathname === "/api/config") {
        return json(res, 200, sanitizedPhase2BConfig());
      }
      if (req.method === "GET" && url.pathname === "/api/ledger") {
        return json(res, 200, await loadLedger());
      }
      if (req.method === "POST" && url.pathname === "/api/session") {
        return createRealtimeCall(req, res);
      }
      if (req.method === "POST" && url.pathname === "/api/evidence") {
        return persistEvidence(req, res);
      }
      if (req.method === "GET") return serveStatic(res, url.pathname);
      return text(res, 404, "not found");
    } catch (error) {
      return json(res, 500, {
        error: scrubSecrets(String(error.message || error).slice(0, 500)),
      });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    server,
    origin: `http://127.0.0.1:${address.port}`,
    port: address.port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (isPhase2BSession1Armed()) {
    applyPhase2OpenAiApiKey();
    console.log("PHASE2B_SESSION1_ARMED credential_loaded_in_process");
  } else {
    console.log("PHASE2B_PREP_ONLY session_not_armed");
  }
  const running = await startPhase2BServer({
    port: Number(process.env.PORT || 4318),
  });
  console.log(`PHASE2B_SERVER_READY ${running.origin}`);
}
