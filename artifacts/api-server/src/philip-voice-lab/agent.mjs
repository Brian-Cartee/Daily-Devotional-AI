#!/usr/bin/env node
/**
 * Philip Voice Lab — isolated agent worker (separate PM2 process).
 *
 * HTTP dispatch → LiveKit join → STT → /api/guidance/phase1 → /api/tts → publish audio.
 */
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { config as loadEnv } from "dotenv";

import { checkFfmpegReady } from "./readiness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "../..");

loadEnv({ path: path.join(apiRoot, ".env.philip-lab"), override: true });
loadEnv({ path: path.join(apiRoot, ".env"), override: true });

// Lazy so the LiveKit RTC stack (and its native bindings) is only loaded when
// the agent is actually enabled and dispatched — keeps startup and readiness cheap.
const { runPhilipVoiceRoom } = await import("./roomLoop.mjs");

const PORT = Number(process.env.PHILIP_VOICE_LAB_AGENT_PORT || 8091);
const LAB_SECRET = process.env.PHILIP_VOICE_LAB_SECRET?.trim() || "";

function enabled() {
  return process.env.PHILIP_VOICE_LAB_ENABLED === "true";
}

function log(...args) {
  console.log("[philip-voice-agent]", ...args);
}

/** @type {Map<string, { abort: AbortController }>} */
const activeRooms = new Map();

async function handleDispatch(body) {
  const roomName = String(body.roomName || "").trim();
  const sessionId = String(body.sessionId || "").trim();
  if (!roomName || !sessionId) {
    throw new Error("roomName and sessionId required");
  }
  if (activeRooms.has(roomName)) {
    log("already handling", roomName);
    return { ok: true, duplicate: true };
  }

  const abort = new AbortController();
  activeRooms.set(roomName, { abort });

  void runPhilipVoiceRoom({ roomName, sessionId, abortSignal: abort.signal })
    .catch((err) => log("room error:", err))
    .finally(() => {
      activeRooms.delete(roomName);
    });

  log("dispatch", roomName, sessionId);
  return { ok: true, roomName };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function checkSecret(req) {
  if (!LAB_SECRET) return false;
  return String(req.headers["x-philip-lab-secret"] || "").trim() === LAB_SECRET;
}

const server = http.createServer(async (req, res) => {
  if (!enabled()) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Not found" }));
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    const ffmpeg = await checkFfmpegReady();
    res.writeHead(ffmpeg.ok ? 200 : 503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: ffmpeg.ok,
        service: "philip-voice-agent",
        activeRooms: activeRooms.size,
        ffmpeg,
      }),
    );
    return;
  }

  if (req.method === "POST" && req.url === "/dispatch") {
    if (!checkSecret(req)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Unauthorized" }));
      return;
    }
    try {
      const body = await readJson(req);
      const result = await handleDispatch(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      log("dispatch error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: String(err) }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
});

if (!enabled()) {
  console.error(
    "[philip-voice-agent] PHILIP_VOICE_LAB_ENABLED is not true — exiting (kill switch).",
  );
  process.exit(0);
}

server.listen(PORT, "127.0.0.1", async () => {
  log(`listening on http://127.0.0.1:${PORT}`);
  log(`API_BASE=${process.env.PHILIP_VOICE_LAB_API_BASE || "http://127.0.0.1:8080"}`);
  if (!LAB_SECRET) {
    log("WARN: PHILIP_VOICE_LAB_SECRET not set — dispatch endpoint will reject requests");
  }
  const lkUrl = process.env.LIVEKIT_URL?.trim();
  if (!lkUrl) {
    log("WARN: LIVEKIT_URL not set — RTC will fail on dispatch");
  }
  const ffmpeg = await checkFfmpegReady();
  if (ffmpeg.ok) log(`ffmpeg ready: ${ffmpeg.version}`);
  else log(`WARN: ffmpeg unavailable: ${ffmpeg.error || "readiness check failed"}`);
});

process.on("SIGTERM", () => {
  for (const { abort } of activeRooms.values()) abort.abort();
  server.close(() => process.exit(0));
});
