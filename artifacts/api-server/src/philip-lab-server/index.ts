/**
 * Isolated Philip Voice Lab API — session minting, timeline, evaluations, and the
 * candidate conversation brain (Conversation Front Door).
 *
 * Does NOT register production routes, schedulers, migrations, or background workers.
 * Candidate response generation runs here (PHILIP_VOICE_LAB_GUIDANCE_API_BASE → :3101),
 * so it never touches the production runtime. Media only — transcription + TTS — uses
 * PHILIP_VOICE_LAB_MEDIA_API_BASE (production API on loopback :3001).
 */
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { registerPhilipVoiceLabRoutes } from "../routes/philipVoiceLab";
import { registerPhilipVoiceLabGuidanceRoutes } from "../routes/philipVoiceLabGuidance";

if (process.env.PHILIP_VOICE_LAB_ENABLED !== "true") {
  console.error("[philip-lab-api] PHILIP_VOICE_LAB_ENABLED is not true — refusing to start (kill switch).");
  process.exit(1);
}

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

registerPhilipVoiceLabRoutes(app);
registerPhilipVoiceLabGuidanceRoutes(app);

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
