/**
 * Isolated Philip Voice Lab API — session minting, timeline, and evaluations only.
 *
 * Does NOT register production routes, schedulers, migrations, or background workers.
 * Guidance/TTS/transcribe for the voice agent should use PHILIP_VOICE_LAB_GUIDANCE_API_BASE
 * (production API on loopback :3001) so duplicate cron/push/email jobs never start.
 */
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { registerPhilipVoiceLabRoutes } from "../routes/philipVoiceLab";

if (process.env.PHILIP_VOICE_LAB_ENABLED !== "true") {
  console.error("[philip-lab-api] PHILIP_VOICE_LAB_ENABLED is not true — refusing to start (kill switch).");
  process.exit(1);
}

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

registerPhilipVoiceLabRoutes(app);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "philip-lab-api",
    isolated: true,
    philipVoiceLabEnabled: true,
  });
});

const port = Number(process.env.PORT) || 3101;
const host = process.env.HOST?.trim() || "127.0.0.1";

const server = createServer(app);

server.listen(port, host, () => {
  console.log(`[philip-lab-api] listening on http://${host}:${port} (isolated lab API)`);
});

process.on("uncaughtException", (err) => {
  console.error("[philip-lab-api] UNCAUGHT EXCEPTION", err);
});

process.on("unhandledRejection", (err) => {
  console.error("[philip-lab-api] UNHANDLED REJECTION", err);
});
