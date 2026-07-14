/**
 * Authenticated STT for the isolated Philip Voice Lab (:3101).
 * Does not use or weaken production /api/guidance/transcribe budgets.
 */
import type { Express, Request } from "express";
import multer from "multer";
import OpenAI from "openai";

import { labSttLimitsFromEnv, snapshotLabSttUsage } from "../philip-voice-lab/labSttBudget.mjs";
import { transcribeLabUtterance } from "../philip-voice-lab/labTranscribe.mjs";

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

let cachedClient: OpenAI | null = null;
let cachedKey: string | null = null;

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (cachedClient && cachedKey === key) return cachedClient;
  cachedClient = new OpenAI({ apiKey: key });
  cachedKey = key;
  return cachedClient;
}

export function registerPhilipVoiceLabTranscribeRoutes(app: Express): void {
  const limits = labSttLimitsFromEnv();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limits.maxFileBytes },
  });

  app.post(
    "/api/internal/philip-voice/transcribe",
    (req, res, next) => {
      if (!isEnabled()) {
        return res.status(404).json({ message: "Not found" });
      }
      if (!checkLabSecret(req)) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      return next();
    },
    upload.single("audio"),
    async (req, res) => {
      const sessionId = String((req.body as { sessionId?: string })?.sessionId ?? "").trim();
      const conversationId = String(
        (req.body as { conversationId?: string })?.conversationId ?? "",
      ).trim();

      try {
        const result = await transcribeLabUtterance({
          file: req.file,
          sessionId,
          conversationId,
          openaiClient: getOpenAI(),
        });

        if (!result.ok) {
          return res.status(result.status).json({
            message: result.message,
            code: result.code,
            usage: result.usage ?? snapshotLabSttUsage({ sessionId }),
            tagged: "philip-voice-lab-stt",
          });
        }

        return res.json({
          text: result.text,
          tagged: result.tagged,
          usage: result.usage,
          utteranceMs: result.utteranceMs,
        });
      } catch (err) {
        console.error("[philip-lab-stt] transcription failed:", err);
        return res.status(500).json({
          message: "Lab transcription failed",
          code: "philip_voice_lab_stt_failed",
          tagged: "philip-voice-lab-stt",
        });
      }
    },
  );

  app.get("/api/internal/philip-voice/transcribe/health", (req, res) => {
    if (!isEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!checkLabSecret(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const sid = String(req.query.sessionId ?? "health-check");
    return res.json({
      service: "philip-lab-stt",
      ready: Boolean(process.env.OPENAI_API_KEY?.trim()),
      tagged: "philip-voice-lab-stt",
      usage: snapshotLabSttUsage({ sessionId: sid }),
      limits: labSttLimitsFromEnv(),
    });
  });
}
