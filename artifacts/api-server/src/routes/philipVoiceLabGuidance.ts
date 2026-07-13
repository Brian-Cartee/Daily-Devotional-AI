/**
 * Candidate guidance brain — authenticated HTTP surface for the voice agent.
 *
 * Runs the isolated Conversation Front Door on the lab service (:3101). The agent
 * calls this INSTEAD of production /api/guidance/* so candidate response generation
 * never touches the production runtime (0.2.7). Media (STT/TTS) stays on :3001.
 *
 * This route performs no database, scheduler, or background work — it classifies
 * and composes a single conversational turn.
 */
import type { Express, Request } from "express";

import {
  runCandidateGuidanceTurn,
  candidateGuidanceReadiness,
} from "../philip-voice-lab/guidanceBrain.mjs";

function isEnabled(): boolean {
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

type GuidanceTurnBody = {
  transcript?: string;
  firstName?: string;
  conversationId?: string;
  sessionId?: string;
  state?: Record<string, unknown> | null;
};

export function registerPhilipVoiceLabGuidanceRoutes(app: Express): void {
  app.get("/api/internal/philip-voice/guidance/health", (req, res) => {
    if (!isEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const readiness = candidateGuidanceReadiness();
    return res.status(readiness.ready ? 200 : 503).json({
      service: "philip-lab-guidance",
      ...readiness,
    });
  });

  app.post("/api/internal/philip-voice/guidance/turn", async (req, res) => {
    if (!isEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Live-runtime policy: never silently serve canned conversation. If the model
    // key is missing (and diagnostics are not explicitly enabled), fail clearly.
    const readiness = candidateGuidanceReadiness();
    if (!readiness.ready) {
      return res.status(503).json({
        message:
          "Candidate guidance not ready: live model key is not configured. " +
          "Set OPENAI_API_KEY (and optionally PHILIP_VOICE_LAB_BRAIN_MODEL), or set " +
          "PHILIP_VOICE_LAB_ALLOW_DETERMINISTIC=true for diagnostics only.",
        readiness,
      });
    }

    const body = (req.body ?? {}) as GuidanceTurnBody;
    const transcript = String(body.transcript ?? "").trim();
    if (!transcript) {
      return res.status(400).json({ message: "transcript required" });
    }

    try {
      const result = await runCandidateGuidanceTurn({
        transcript,
        firstName: body.firstName,
        state: body.state ?? undefined,
      });

      res.setHeader("X-Philip-Runtime-Version", "candidate-front-door-1");
      res.setHeader("X-Philip-Lane", String(result.lane ?? ""));
      res.setHeader("X-Philip-Engine", String(result.engine ?? ""));
      res.setHeader("X-Philip-Intent", String(result.intent ?? ""));
      if (result.conduct) res.setHeader("X-Philip-Conduct", String(result.conduct));

      return res.json({
        text: result.text,
        intent: result.intent,
        conduct: result.conduct ?? null,
        lane: result.lane,
        engine: result.engine,
        reopened: result.reopened,
        personalMeaning: result.personalMeaning,
        faithOffered: result.faithOffered,
        state: result.state,
        meta: result.meta,
      });
    } catch (err) {
      console.error("[philip-lab-guidance] turn error:", err);
      return res.status(500).json({ message: "Failed to generate candidate guidance turn" });
    }
  });
}
