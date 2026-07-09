/**
 * Gate B session timeline — structured events + latency metrics per conversation.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR =
  process.env.PHILIP_VOICE_LAB_LOG_DIR ||
  path.resolve(__dirname, "../../server/philip-voice-lab");

const API_BASE = (process.env.PHILIP_VOICE_LAB_API_BASE || "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);
const LAB_SECRET = process.env.PHILIP_VOICE_LAB_SECRET?.trim() || "";

export class SessionTimeline {
  /**
   * @param {{ conversationId: string; sessionId: string; roomName: string; source?: string }} meta
   */
  constructor(meta) {
    this.conversationId = meta.conversationId;
    this.sessionId = meta.sessionId;
    this.roomName = meta.roomName;
    this.source = meta.source || "agent";
    this.startedAt = Date.now();
    this.sessionEvents = [];
    this.turns = [];
    this.currentTurn = null;
    this.turnCounter = 0;
    this.mark("session_start");
  }

  mark(event, data = {}) {
    const entry = {
      event,
      ts: Date.now(),
      iso: new Date().toISOString(),
      elapsedMs: Date.now() - this.startedAt,
      ...data,
    };
    this.sessionEvents.push(entry);
    if (this.currentTurn) {
      this.currentTurn.events.push(entry);
    }
    console.log(
      "[philip-gate-b]",
      this.conversationId,
      event,
      data.reason || data.phase || data.error || "",
    );
    return entry;
  }

  beginTurn() {
    this.turnCounter += 1;
    this.currentTurn = {
      turnIndex: this.turnCounter,
      events: [],
      metrics: {},
      transcript: "",
      phase1Preview: "",
    };
    this.turns.push(this.currentTurn);
    this.mark("turn_start", { turnIndex: this.turnCounter });
    return this.currentTurn;
  }

  endTurn(extra = {}) {
    if (!this.currentTurn) return;
    const m = this.currentTurn.metrics;
    if (m.userStopsSpeakingAt && m.playbackPublishStartAt) {
      m.totalLatencyMs = m.playbackPublishStartAt - m.userStopsSpeakingAt;
    }
    if (m.userStopsSpeakingAt && m.sttCompleteAt) {
      m.sttMs = m.sttCompleteAt - m.userStopsSpeakingAt;
    }
    if (m.sttCompleteAt && m.phase1CompleteAt) {
      m.phase1Ms = m.phase1CompleteAt - m.sttCompleteAt;
    }
    if (m.phase1CompleteAt && m.ttsCompleteAt) {
      m.ttsMs = m.ttsCompleteAt - m.phase1CompleteAt;
    }
    if (m.ttsCompleteAt && m.playbackPublishStartAt) {
      m.publishMs = m.playbackPublishStartAt - m.ttsCompleteAt;
    }
    if (m.playbackPublishStartAt && m.playbackPublishEndAt) {
      m.playbackPublishDurationMs = m.playbackPublishEndAt - m.playbackPublishStartAt;
    }
    this.mark("turn_complete", { turnIndex: this.currentTurn.turnIndex, metrics: m, ...extra });
    this.currentTurn = null;
  }

  metric(key, ts = Date.now()) {
    if (!this.currentTurn) return;
    this.currentTurn.metrics[key] = ts;
  }

  toJSON() {
    return {
      conversationId: this.conversationId,
      sessionId: this.sessionId,
      roomName: this.roomName,
      source: this.source,
      startedAt: this.startedAt,
      startedAtIso: new Date(this.startedAt).toISOString(),
      endedAt: Date.now(),
      endedAtIso: new Date().toISOString(),
      durationMs: Date.now() - this.startedAt,
      sessionEvents: this.sessionEvents,
      turns: this.turns,
    };
  }

  async persist() {
    const payload = this.toJSON();
    await fs.mkdir(LOG_DIR, { recursive: true });
    const file = path.join(LOG_DIR, `${this.conversationId}.json`);
    await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8");

    if (!LAB_SECRET) return payload;
    try {
      await fetch(`${API_BASE}/api/internal/philip-voice/timeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Philip-Lab-Secret": LAB_SECRET,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[philip-gate-b] timeline POST failed:", err);
    }
    return payload;
  }
}

/**
 * @param {import('@livekit/rtc-node').Room} room
 * @param {object} payload
 */
export async function publishTimelineToRoom(room, payload) {
  if (!room?.localParticipant) return;
  try {
    const data = new TextEncoder().encode(
      JSON.stringify({ type: "gate_b_timeline", ...payload }),
    );
    await room.localParticipant.publishData(data, {
      reliable: true,
      topic: "philip-gate-b",
    });
  } catch (err) {
    console.error("[philip-gate-b] publishData failed:", err);
  }
}
