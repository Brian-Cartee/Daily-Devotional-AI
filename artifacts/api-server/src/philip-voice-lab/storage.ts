/**
 * Gate B — file-backed timeline + evaluation storage (lab only).
 */
import fs from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "server/philip-voice-lab");

export type GateBEvaluation = {
  conversationId: string;
  sessionId: string;
  roomName?: string;
  scenarioTag?: string;
  submittedAt: string;
  technical: {
    latency: number;
    audioQuality: number;
    reliability: number;
  };
  human: {
    feltPresent: number;
    computerOrPerson: number;
    understoodMe: number;
    wouldTalkAgain: boolean;
  };
  canonical: {
    pointedTowardGod: boolean;
    faithfulToCanon: boolean;
    provedPhilip: boolean;
  };
  immersionBreak: string;
  clientTimeline?: unknown[];
};

async function ensureDir() {
  await fs.mkdir(LOG_DIR, { recursive: true });
}

function conversationPath(conversationId: string) {
  const safe = conversationId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(LOG_DIR, `${safe}.json`);
}

export async function saveTimeline(payload: Record<string, unknown>): Promise<void> {
  const conversationId = String(payload.conversationId || "");
  if (!conversationId) throw new Error("conversationId required");
  await ensureDir();
  const file = conversationPath(conversationId);
  let existing: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(file, "utf8");
    existing = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* new file */
  }
  const merged = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(file, JSON.stringify(merged, null, 2), "utf8");
}

export async function mergeClientTimeline(
  conversationId: string,
  clientTimeline: unknown[],
): Promise<void> {
  await ensureDir();
  const file = conversationPath(conversationId);
  let existing: Record<string, unknown> = { conversationId };
  try {
    const raw = await fs.readFile(file, "utf8");
    existing = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* new */
  }
  existing.clientTimeline = clientTimeline;
  existing.clientUpdatedAt = new Date().toISOString();
  await fs.writeFile(file, JSON.stringify(existing, null, 2), "utf8");
}

export async function saveEvaluation(evalPayload: GateBEvaluation): Promise<void> {
  await ensureDir();
  const file = conversationPath(evalPayload.conversationId);
  let existing: Record<string, unknown> = { conversationId: evalPayload.conversationId };
  try {
    const raw = await fs.readFile(file, "utf8");
    existing = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* new */
  }
  existing.evaluation = evalPayload;
  existing.evaluatedAt = evalPayload.submittedAt;
  await fs.writeFile(file, JSON.stringify(existing, null, 2), "utf8");

  const indexFile = path.join(LOG_DIR, "_evaluations.jsonl");
  await fs.appendFile(indexFile, `${JSON.stringify(evalPayload)}\n`, "utf8");
}

export async function getConversationLog(conversationId: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(conversationPath(conversationId), "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function listRecentEvaluations(limit = 50): Promise<GateBEvaluation[]> {
  const indexFile = path.join(LOG_DIR, "_evaluations.jsonl");
  try {
    const raw = await fs.readFile(indexFile, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .map((line) => JSON.parse(line) as GateBEvaluation)
      .reverse();
  } catch {
    return [];
  }
}
