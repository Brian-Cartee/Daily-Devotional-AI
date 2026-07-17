import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  IPHONE_LAB_LIMITS,
  IPHONE_LAB_REALTIME_SESSION,
  isIphoneRealtimeArmed,
  sanitizedIphoneLabConfig,
} from "./config.mjs";
import {
  applyPhase2OpenAiApiKey,
  scrubSecrets,
} from "../phase2/loadCredential.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, "..");
const EVIDENCE_ROOT = path.join(PACKAGE_ROOT, "evidence", "iphone-lab");
const LEDGER_PATH = path.join(EVIDENCE_ROOT, "session-ledger.json");
const MAX_BODY_BYTES = 5 * 1024 * 1024;

function emptyLedger() {
  return {
    schemaVersion: 1,
    phase: "iphone-realtime-lab",
    model: IPHONE_LAB_LIMITS.model,
    voice: IPHONE_LAB_LIMITS.voice,
    sessions: [],
    cumulativeEstimatedCostUsd: 0,
    absoluteSpendUsd: IPHONE_LAB_LIMITS.absoluteSpendUsd,
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
    "access-control-allow-origin": "*",
    ...headers,
  });
  res.end(`${JSON.stringify(value, null, 2)}\n`);
}

function text(res, status, value, contentType = "text/plain; charset=utf-8", headers = {}) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    ...headers,
  });
  res.end(value);
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

function authorizeLabRequest(req) {
  const expected = String(process.env.PHILIP_REALTIME_LAB_SECRET || "").trim();
  if (!expected) {
    return { ok: false, status: 412, error: "lab_secret_not_configured" };
  }
  const provided = String(req.headers["x-philip-realtime-lab-secret"] || "").trim();
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: "lab_secret_rejected" };
  }
  return { ok: true };
}

async function reserveSession() {
  const ledger = await loadLedger();
  if (ledger.sessions.length >= 1) {
    throw new Error("iphone_lab_session_already_consumed");
  }
  if (
    ledger.cumulativeEstimatedCostUsd + IPHONE_LAB_LIMITS.sessionReserveUsd >
    IPHONE_LAB_LIMITS.absoluteSpendUsd
  ) {
    throw new Error("iphone_lab_spend_reservation_would_exceed_cap");
  }
  const session = {
    sessionId: `iphone-lab-${Date.now()}-1`,
    ordinal: 1,
    model: IPHONE_LAB_LIMITS.model,
    voice: IPHONE_LAB_LIMITS.voice,
    attemptedAt: new Date().toISOString(),
    status: "attempted",
    success: false,
    maxDurationMs: IPHONE_LAB_LIMITS.maximumDurationMs,
    reservedUsd: IPHONE_LAB_LIMITS.sessionReserveUsd,
    estimatedCostUsd: 0,
  };
  ledger.sessions.push(session);
  await saveLedger(ledger);
  return { ledger, session };
}

async function updateSession(sessionId, patch) {
  const ledger = await loadLedger();
  const session = ledger.sessions.find((item) => item.sessionId === sessionId);
  if (!session) throw new Error("iphone_lab_session_not_found");
  Object.assign(session, patch);
  ledger.cumulativeEstimatedCostUsd = Number(
    ledger.sessions
      .reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0)
      .toFixed(6),
  );
  await saveLedger(ledger);
  return { ledger, session };
}

async function createRealtimeCall(req, res) {
  const auth = authorizeLabRequest(req);
  if (!auth.ok) return json(res, auth.status, { error: auth.error });

  if (!isIphoneRealtimeArmed()) {
    return json(res, 423, {
      error: "iphone_realtime_not_armed",
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
    reserved = await reserveSession();
  } catch (error) {
    return json(res, 409, { error: error.message });
  }

  const { session } = reserved;
  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", JSON.stringify(IPHONE_LAB_REALTIME_SESSION));

  try {
    const providerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.value}`,
        "OpenAI-Safety-Identifier": "philip-realtime-iphone-lab-brian",
      },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    const answer = await providerResponse.text();
    const requestId = providerResponse.headers.get("x-request-id") || null;
    if (!providerResponse.ok) {
      await updateSession(session.sessionId, {
        status: "provider_rejected",
        providerStatus: providerResponse.status,
        providerRequestId: requestId,
        finishedAt: new Date().toISOString(),
      });
      return json(res, providerResponse.status, {
        error: "realtime_call_rejected",
        providerStatus: providerResponse.status,
        sessionId: session.sessionId,
      });
    }
    await updateSession(session.sessionId, {
      status: "transport_connected",
      providerStatus: providerResponse.status,
      providerRequestId: requestId,
    });
    return text(res, 200, answer, "application/sdp", {
      "x-iphone-lab-session-id": session.sessionId,
      "x-iphone-lab-max-duration-ms": String(IPHONE_LAB_LIMITS.maximumDurationMs),
      "x-iphone-lab-voice": IPHONE_LAB_LIMITS.voice,
      "x-iphone-lab-model": IPHONE_LAB_LIMITS.model,
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
  const auth = authorizeLabRequest(req);
  if (!auth.ok) return json(res, auth.status, { error: auth.error });
  const evidence = JSON.parse(await readBody(req, { asText: true }));
  if (!evidence.sessionId) return json(res, 400, { error: "sessionId required" });
  const safe = {
    ...evidence,
    apiKey: undefined,
    authorization: undefined,
    providerHeaders: undefined,
    rawAudio: undefined,
  };
  const outPath = path.join(EVIDENCE_ROOT, `${evidence.sessionId}.json`);
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeFile(outPath, `${JSON.stringify(safe, null, 2)}\n`, { mode: 0o600 });
  const { ledger } = await updateSession(evidence.sessionId, {
    status: evidence.status || "completed",
    success: evidence.status === "completed",
    durationMs: evidence.durationMs,
    estimatedCostUsd: Number(evidence.estimatedCostUsd || 0),
    stopReason: evidence.stopReason || null,
    finishedAt: new Date().toISOString(),
    evidenceFile: path.relative(PACKAGE_ROOT, outPath),
  });
  return json(res, 200, {
    saved: true,
    cumulativeEstimatedCostUsd: ledger.cumulativeEstimatedCostUsd,
  });
}

export async function startIphoneLabServer({ port = 0 } = {}) {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers":
            "content-type,x-philip-realtime-lab-secret",
        });
        res.end();
        return;
      }
      const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
      if (req.method === "GET" && url.pathname === "/api/iphone-realtime/status") {
        const ledger = await loadLedger();
        return json(res, 200, {
          phase: "iphone-realtime-lab",
          armed: isIphoneRealtimeArmed(),
          model: IPHONE_LAB_LIMITS.model,
          voice: IPHONE_LAB_LIMITS.voice,
          sessionsUsed: ledger.sessions.length,
          sessionAvailable: ledger.sessions.length === 0,
          cumulativeEstimatedCostUsd: ledger.cumulativeEstimatedCostUsd,
          capUsd: IPHONE_LAB_LIMITS.absoluteSpendUsd,
          maxDurationMs: IPHONE_LAB_LIMITS.maximumDurationMs,
          liveKitCloud: false,
          productionApi: false,
        });
      }
      if (req.method === "GET" && url.pathname === "/api/iphone-realtime/config") {
        return json(res, 200, sanitizedIphoneLabConfig());
      }
      if (req.method === "POST" && url.pathname === "/api/iphone-realtime/session") {
        return createRealtimeCall(req, res);
      }
      if (req.method === "POST" && url.pathname === "/api/iphone-realtime/evidence") {
        return persistEvidence(req, res);
      }
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
  if (isIphoneRealtimeArmed()) {
    applyPhase2OpenAiApiKey();
    console.log("IPHONE_REALTIME_ARMED credential_loaded_in_process");
  } else {
    console.log("IPHONE_REALTIME_PREP_ONLY session_not_armed");
  }
  if (!process.env.PHILIP_REALTIME_LAB_SECRET) {
    console.log("IPHONE_REALTIME_LAB_SECRET_MISSING set before any phone handshake");
  }
  const running = await startIphoneLabServer({
    port: Number(process.env.PORT || 4319),
  });
  console.log(`IPHONE_LAB_SERVER_READY ${running.origin}`);
}
