/**
 * Philip Voice Lab — internal-only LiveKit session minting.
 * Returns 404 when PHILIP_VOICE_LAB_ENABLED is not true (server kill switch).
 */
import type { Express, Request } from "express";
import { AccessToken } from "livekit-server-sdk";

import {
  getConversationLog,
  listRecentEvaluations,
  mergeClientTimeline,
  saveEvaluation,
  saveTimeline,
  type GateBEvaluation,
} from "../philip-voice-lab/storage";
import {
  normalizeLabSessionId,
  mintLabRoomName,
  mintLabParticipantIdentity,
} from "../philip-voice-lab/labIdentity.mjs";

export function isPhilipVoiceLabEnabled(): boolean {
  return process.env.PHILIP_VOICE_LAB_ENABLED === "true";
}

function labSecret(): string | undefined {
  const s = process.env.PHILIP_VOICE_LAB_SECRET?.trim();
  return s || undefined;
}

function checkLabSecret(req: Request): boolean {
  const secret = labSecret();
  if (!secret) return false;
  const header = String(req.headers["x-philip-lab-secret"] ?? "").trim();
  const bodyKey = String((req.body as { labKey?: string })?.labKey ?? "").trim();
  return header === secret || bodyKey === secret;
}

function liveKitConfig(): { url: string; apiKey: string; apiSecret: string } | null {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

async function mintToken(opts: {
  identity: string;
  roomName: string;
  apiKey: string;
  apiSecret: string;
  canPublish: boolean;
  name?: string;
}): Promise<string> {
  const at = new AccessToken(opts.apiKey, opts.apiSecret, {
    identity: opts.identity,
    name: opts.name,
    ttl: "30m",
  });
  at.addGrant({
    roomJoin: true,
    room: opts.roomName,
    canPublish: opts.canPublish,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

async function dispatchAgent(roomName: string, sessionId: string): Promise<void> {
  const dispatchUrl =
    process.env.PHILIP_VOICE_LAB_AGENT_DISPATCH_URL?.trim() ||
    "http://127.0.0.1:8091/dispatch";
  const secret = labSecret();
  try {
    await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-Philip-Lab-Secret": secret } : {}),
      },
      body: JSON.stringify({ roomName, sessionId }),
    });
  } catch (err) {
    console.error("[philip-voice-lab] agent dispatch failed:", err);
  }
}

export function registerPhilipVoiceLabRoutes(app: Express): void {
  app.get("/api/internal/philip-voice/health", (req, res) => {
    if (!isPhilipVoiceLabEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const lk = liveKitConfig();
    return res.json({
      ok: true,
      livekitConfigured: Boolean(lk),
      agentDispatchUrl:
        process.env.PHILIP_VOICE_LAB_AGENT_DISPATCH_URL?.trim() ||
        "http://127.0.0.1:8091/dispatch",
    });
  });

  app.post("/api/internal/philip-voice/session", async (req, res) => {
    if (!isPhilipVoiceLabEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sessionId = normalizeLabSessionId(
      String((req.body as { sessionId?: string })?.sessionId ?? "").trim(),
    );
    if (!sessionId || sessionId.length > 128) {
      return res.status(400).json({ message: "sessionId required" });
    }

    const lk = liveKitConfig();
    if (!lk) {
      return res.status(503).json({
        message: "LiveKit not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.",
      });
    }

    const roomName = mintLabRoomName(sessionId);
    const participantIdentity = mintLabParticipantIdentity(sessionId);

    try {
      const token = await mintToken({
        identity: participantIdentity,
        roomName,
        apiKey: lk.apiKey,
        apiSecret: lk.apiSecret,
        canPublish: true,
        name: "Philip lab user",
      });

      void dispatchAgent(roomName, sessionId);

      return res.json({
        url: lk.url,
        token,
        roomName,
        participantIdentity,
      });
    } catch (err) {
      console.error("[philip-voice-lab] session error:", err);
      return res.status(500).json({ message: "Failed to create voice session" });
    }
  });

  app.post("/api/internal/philip-voice/timeline", async (req, res) => {
    if (!isPhilipVoiceLabEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const conversationId = String((req.body as { conversationId?: string })?.conversationId ?? "").trim();
    if (!conversationId) {
      return res.status(400).json({ message: "conversationId required" });
    }
    try {
      await saveTimeline(req.body as Record<string, unknown>);
      return res.json({ ok: true, conversationId });
    } catch (err) {
      console.error("[philip-voice-lab] timeline save error:", err);
      return res.status(500).json({ message: "Failed to save timeline" });
    }
  });

  app.post("/api/internal/philip-voice/timeline/client", async (req, res) => {
    if (!isPhilipVoiceLabEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const conversationId = String((req.body as { conversationId?: string })?.conversationId ?? "").trim();
    const clientTimeline = (req.body as { clientTimeline?: Record<string, unknown> })?.clientTimeline;
    if (!conversationId || !clientTimeline || typeof clientTimeline !== "object") {
      return res.status(400).json({ message: "conversationId and clientTimeline required" });
    }
    try {
      await mergeClientTimeline(conversationId, clientTimeline);
      return res.json({ ok: true });
    } catch (err) {
      console.error("[philip-voice-lab] client timeline error:", err);
      return res.status(500).json({ message: "Failed to merge client timeline" });
    }
  });

  app.get("/api/internal/philip-voice/timeline/:conversationId", async (req, res) => {
    if (!isPhilipVoiceLabEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const conversationId = String(req.params.conversationId || "").trim();
    const log = await getConversationLog(conversationId);
    if (!log) return res.status(404).json({ message: "Not found" });
    return res.json(log);
  });

  app.post("/api/internal/philip-voice/evaluation", async (req, res) => {
    if (!isPhilipVoiceLabEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const body = req.body as Partial<GateBEvaluation> & { immersionBreak?: string };
    const conversationId = String(body.conversationId || "").trim();
    const sessionId = String(body.sessionId || "").trim();
    const immersionBreak = String(body.immersionBreak || "").trim();
    if (!conversationId || !sessionId || !immersionBreak) {
      return res.status(400).json({
        message: "conversationId, sessionId, and immersionBreak are required",
      });
    }
    const evalPayload: GateBEvaluation = {
      conversationId,
      sessionId,
      roomName: body.roomName,
      scenarioTag: body.scenarioTag,
      submittedAt: new Date().toISOString(),
      technical: {
        latency: Number(body.technical?.latency) || 0,
        audioQuality: Number(body.technical?.audioQuality) || 0,
        reliability: Number(body.technical?.reliability) || 0,
      },
      human: {
        feltPresent: Number(body.human?.feltPresent) || 0,
        computerOrPerson: Number(body.human?.computerOrPerson) || 0,
        understoodMe: Number(body.human?.understoodMe) || 0,
        wouldTalkAgain: body.human?.wouldTalkAgain === true,
      },
      canonical: {
        pointedTowardGod: body.canonical?.pointedTowardGod === true,
        faithfulToCanon: body.canonical?.faithfulToCanon === true,
        provedPhilip: body.canonical?.provedPhilip === true,
      },
      immersionBreak,
    };
    try {
      await saveEvaluation(evalPayload);
      return res.json({ ok: true, conversationId });
    } catch (err) {
      console.error("[philip-voice-lab] evaluation save error:", err);
      return res.status(500).json({ message: "Failed to save evaluation" });
    }
  });

  app.get("/api/internal/philip-voice/evaluations", async (req, res) => {
    if (!isPhilipVoiceLabEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const evaluations = await listRecentEvaluations(limit);
    return res.json({ evaluations });
  });
}
