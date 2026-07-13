import { Platform } from "react-native";

import { philipVoiceLabKey } from "@/lib/philipVoiceLabFlags";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS !== "web" ? "https://www.shepherdspathai.com" : "");

export type PhilipVoiceLabSession = {
  url: string;
  token: string;
  roomName: string;
  participantIdentity: string;
};

export async function createPhilipVoiceLabSession(
  sessionId: string,
): Promise<PhilipVoiceLabSession> {
  const labKey = philipVoiceLabKey();
  if (!labKey) {
    throw new Error("EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY is not configured for this build.");
  }

  const res = await fetch(`${API_BASE}/api/internal/philip-voice/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Philip-Lab-Secret": labKey,
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    if (res.status === 404) {
      throw new Error("Philip Voice Lab is disabled on the server (kill switch).");
    }
    throw new Error(`Session failed (${res.status}): ${errBody.slice(0, 160)}`);
  }

  return res.json() as Promise<PhilipVoiceLabSession>;
}

export async function checkPhilipVoiceLabHealth(): Promise<boolean> {
  const labKey = philipVoiceLabKey();
  if (!labKey) return false;
  try {
    const res = await fetch(`${API_BASE}/api/internal/philip-voice/health`, {
      headers: { "X-Philip-Lab-Secret": labKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
