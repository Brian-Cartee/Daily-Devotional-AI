import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import express, { type Express, type Request } from "express";

// The Realtime identity/session config remains canonical in the isolated core.
import * as iphoneRealtimeConfig from "../../../philip-realtime-core/iphone-lab/config.mjs";

const {
  IPHONE_LAB_LIMITS,
  IPHONE_LAB_REALTIME_SESSION,
  isIphoneRealtimeArmed,
} = iphoneRealtimeConfig;

const ROUTE_ROOT = "/api/internal/philip-voice/realtime";
const TOKEN_TTL_MS = 5 * 60 * 1000;
const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
const EVIDENCE_ROOT =
  process.env.PHILIP_REALTIME_LAB_EVIDENCE_DIR?.trim() ||
  path.resolve(process.cwd(), "../philip-realtime-core/evidence/iphone-lab");
const LEDGER_PATH = path.join(EVIDENCE_ROOT, "session-ledger.json");

type LedgerSession = {
  sessionId: string;
  ordinal: number;
  model: string;
  voice: string;
  attemptedAt: string;
  status: string;
  success: boolean;
  maxDurationMs: number;
  reservedUsd: number;
  estimatedCostUsd: number;
  providerStatus?: number;
  providerRequestId?: string | null;
  finishedAt?: string;
  failureMessage?: string;
  durationMs?: number;
  stopReason?: string | null;
  evidenceFile?: string;
};

type Ledger = {
  schemaVersion: 1;
  phase: "iphone-realtime-lab";
  model: string;
  voice: string;
  sessions: LedgerSession[];
  cumulativeEstimatedCostUsd: number;
  absoluteSpendUsd: number;
};

function emptyLedger(): Ledger {
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

async function loadLedger(): Promise<Ledger> {
  try {
    return JSON.parse(await readFile(LEDGER_PATH, "utf8")) as Ledger;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyLedger();
    throw error;
  }
}

async function saveLedger(ledger: Ledger): Promise<void> {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeFile(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`, {
    mode: 0o600,
  });
}

function labSecret(): string {
  return String(process.env.PHILIP_VOICE_LAB_SECRET || "").trim();
}

function suppliedLabSecret(req: Request): string {
  return String(req.headers["x-philip-lab-secret"] || "").trim();
}

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function signRuntimeToken(payloadPart: string): string {
  return createHmac("sha256", `${labSecret()}:iphone-realtime-runtime-v1`)
    .update(payloadPart)
    .digest("base64url");
}

function mintRuntimeToken(): { token: string; expiresAt: string } {
  const expiresAtMs = Date.now() + TOKEN_TTL_MS;
  const payloadPart = base64Url(
    JSON.stringify({
      aud: "philip-iphone-realtime-lab",
      exp: expiresAtMs,
      nonce: randomUUID(),
    }),
  );
  return {
    token: `${payloadPart}.${signRuntimeToken(payloadPart)}`,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

function hasValidRuntimeToken(req: Request): boolean {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice("Bearer ".length).trim();
  const [payloadPart, signature, extra] = token.split(".");
  if (!payloadPart || !signature || extra) return false;
  const expected = Buffer.from(signRuntimeToken(payloadPart));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as {
      aud?: string;
      exp?: number;
    };
    return (
      payload.aud === "philip-iphone-realtime-lab" &&
      Number.isFinite(payload.exp) &&
      Number(payload.exp) > Date.now()
    );
  } catch {
    return false;
  }
}

function requireRuntimeToken(req: Request, res: express.Response): boolean {
  if (!labSecret()) {
    res.status(503).json({ error: "realtime_lab_auth_not_configured" });
    return false;
  }
  if (!hasValidRuntimeToken(req)) {
    res.status(401).json({ error: "realtime_lab_runtime_token_required" });
    return false;
  }
  return true;
}

async function statusPayload() {
  const ledger = await loadLedger();
  return {
    phase: "iphone-realtime-lab",
    runtime: "isolated-philip-lab-api",
    route: ROUTE_ROOT,
    armed: isIphoneRealtimeArmed(),
    model: IPHONE_LAB_LIMITS.model,
    voice: IPHONE_LAB_LIMITS.voice,
    inputTranscriptionModel:
      IPHONE_LAB_REALTIME_SESSION.audio?.input?.transcription?.model || null,
    sessionsUsed: ledger.sessions.length,
    sessionAvailable: ledger.sessions.length === 0,
    cumulativeEstimatedCostUsd: ledger.cumulativeEstimatedCostUsd,
    capUsd: IPHONE_LAB_LIMITS.absoluteSpendUsd,
    maxDurationMs: IPHONE_LAB_LIMITS.maximumDurationMs,
    liveKitCloud: false,
    productionApi: false,
    providerCalledByStatus: false,
  };
}

async function reserveSession(): Promise<LedgerSession> {
  const ledger = await loadLedger();
  if (ledger.sessions.length >= 1) throw new Error("iphone_lab_session_already_consumed");
  if (
    ledger.cumulativeEstimatedCostUsd + IPHONE_LAB_LIMITS.sessionReserveUsd >
    IPHONE_LAB_LIMITS.absoluteSpendUsd
  ) {
    throw new Error("iphone_lab_spend_reservation_would_exceed_cap");
  }
  const session: LedgerSession = {
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
  return session;
}

async function updateSession(
  sessionId: string,
  patch: Partial<LedgerSession>,
): Promise<Ledger> {
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
  return ledger;
}

function safeFailure(error: unknown): string {
  return String((error as Error)?.message || error)
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]")
    .slice(0, 300);
}

export function registerPhilipRealtimeLabRoutes(app: Express): void {
  app.post(`${ROUTE_ROOT}/token`, (req, res) => {
    const expected = labSecret();
    if (!expected) return res.status(503).json({ error: "realtime_lab_auth_not_configured" });
    if (suppliedLabSecret(req) !== expected) {
      return res.status(401).json({ error: "realtime_lab_auth_rejected" });
    }
    return res.json({
      ...mintRuntimeToken(),
      runtime: "isolated-philip-lab-api",
      model: IPHONE_LAB_LIMITS.model,
      voice: IPHONE_LAB_LIMITS.voice,
    });
  });

  app.get(`${ROUTE_ROOT}/status`, async (req, res) => {
    if (!requireRuntimeToken(req, res)) return;
    return res.json(await statusPayload());
  });

  app.post(
    `${ROUTE_ROOT}/session`,
    express.text({ type: "application/sdp", limit: "5mb" }),
    async (req, res) => {
      if (!requireRuntimeToken(req, res)) return;
      if (!isIphoneRealtimeArmed()) {
        return res.status(423).json({
          error: "iphone_realtime_not_armed",
          sessionCounted: false,
          providerCalled: false,
        });
      }
      const key = String(process.env.OPENAI_API_KEY || "").trim();
      if (!key) return res.status(503).json({ error: "openai_key_not_configured" });
      const sdp = String(req.body || "");
      if (!sdp.startsWith("v=0")) return res.status(400).json({ error: "invalid_sdp_offer" });

      let session: LedgerSession;
      try {
        session = await reserveSession();
      } catch (error) {
        return res.status(409).json({ error: safeFailure(error) });
      }

      const form = new FormData();
      form.set("sdp", sdp);
      form.set("session", JSON.stringify(IPHONE_LAB_REALTIME_SESSION));
      try {
        const providerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "OpenAI-Safety-Identifier": "philip-realtime-iphone-lab-brian",
          },
          body: form,
          signal: AbortSignal.timeout(20_000),
        });
        const answer = await providerResponse.text();
        const requestId = providerResponse.headers.get("x-request-id");
        if (!providerResponse.ok) {
          await updateSession(session.sessionId, {
            status: "provider_rejected",
            providerStatus: providerResponse.status,
            providerRequestId: requestId,
            finishedAt: new Date().toISOString(),
          });
          return res.status(providerResponse.status).json({
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
        res.set({
          "cache-control": "no-store",
          "x-iphone-lab-session-id": session.sessionId,
          "x-iphone-lab-max-duration-ms": String(IPHONE_LAB_LIMITS.maximumDurationMs),
          "x-iphone-lab-voice": IPHONE_LAB_LIMITS.voice,
          "x-iphone-lab-model": IPHONE_LAB_LIMITS.model,
        });
        return res.type("application/sdp").send(answer);
      } catch (error) {
        await updateSession(session.sessionId, {
          status: "transport_failed",
          failureMessage: safeFailure(error),
          finishedAt: new Date().toISOString(),
        });
        return res.status(502).json({
          error: "realtime_transport_failed",
          sessionId: session.sessionId,
        });
      }
    },
  );

  app.post(`${ROUTE_ROOT}/evidence`, async (req, res) => {
    if (!requireRuntimeToken(req, res)) return;
    const evidence = (req.body || {}) as Record<string, unknown>;
    const sessionId = String(evidence.sessionId || "");
    if (!/^iphone-lab-\d+-1$/.test(sessionId)) {
      return res.status(400).json({ error: "valid_sessionId_required" });
    }
    const safe = {
      ...evidence,
      apiKey: undefined,
      authorization: undefined,
      providerHeaders: undefined,
      rawAudio: undefined,
    };
    const serialized = `${JSON.stringify(safe, null, 2)}\n`;
    if (Buffer.byteLength(serialized) > MAX_EVIDENCE_BYTES) {
      return res.status(413).json({ error: "evidence_too_large" });
    }
    await mkdir(EVIDENCE_ROOT, { recursive: true });
    const outPath = path.join(EVIDENCE_ROOT, `${sessionId}.json`);
    await writeFile(outPath, serialized, { mode: 0o600 });
    const ledger = await updateSession(sessionId, {
      status: String(evidence.status || "completed"),
      success: evidence.status === "completed",
      durationMs: Number(evidence.durationMs || 0),
      estimatedCostUsd: Number(evidence.estimatedCostUsd || 0),
      stopReason: String(evidence.stopReason || "") || null,
      finishedAt: new Date().toISOString(),
      evidenceFile: path.relative(process.cwd(), outPath),
    });
    return res.json({
      saved: true,
      cumulativeEstimatedCostUsd: ledger.cumulativeEstimatedCostUsd,
    });
  });
}
