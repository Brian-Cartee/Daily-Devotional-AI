import { Platform } from "react-native";

import { philipVoiceLabKey } from "@/lib/philipVoiceLabFlags";
import type { ClientTimelineJSON } from "@/lib/philipVoiceLabClientTimeline";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS !== "web" ? "https://www.shepherdspathai.com" : "");

function labHeaders(): Record<string, string> {
  const key = philipVoiceLabKey();
  return {
    "Content-Type": "application/json",
    "X-Philip-Lab-Secret": key,
  };
}

export type GateBEvaluationPayload = {
  conversationId: string;
  sessionId: string;
  roomName?: string;
  scenarioTag?: string;
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
};

export const GATE_B_SCENARIOS = [
  "Grief",
  "Anxiety",
  "Anger",
  "Marriage",
  "Addiction",
  "Loneliness",
  "Celebration",
  "Doubt",
  "Atheist",
  "Pastor",
  "Teenager",
  "Elderly believer",
  "Other",
] as const;

export async function submitGateBEvaluation(payload: GateBEvaluationPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/api/internal/philip-voice/evaluation`, {
    method: "POST",
    headers: labHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Evaluation failed (${res.status}): ${err.slice(0, 160)}`);
  }
}

export async function uploadClientTimeline(
  conversationId: string,
  clientTimeline: ClientTimelineJSON,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/internal/philip-voice/timeline/client`, {
    method: "POST",
    headers: labHeaders(),
    body: JSON.stringify({ conversationId, clientTimeline }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Timeline upload failed (${res.status}): ${err.slice(0, 160)}`);
  }
}

export async function fetchConversationLog(conversationId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${API_BASE}/api/internal/philip-voice/timeline/${encodeURIComponent(conversationId)}`,
    { headers: { "X-Philip-Lab-Secret": philipVoiceLabKey() } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch log (${res.status})`);
  return res.json() as Promise<Record<string, unknown>>;
}
