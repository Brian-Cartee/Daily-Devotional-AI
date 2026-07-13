import { getOrCreateNativeSessionId } from "@/lib/native-profile";
import {
  checkPhilipVoiceLabHealth,
  createPhilipVoiceLabSession,
  type PhilipVoiceLabSession,
} from "@/lib/philipVoiceLabApi";

export type PhilipLabConnectState =
  | "idle"
  | "preflight"
  | "minting"
  | "ready"
  | "error";

export async function preparePhilipVoiceLabSession(): Promise<{
  sessionId: string;
  credentials: PhilipVoiceLabSession;
}> {
  const healthy = await checkPhilipVoiceLabHealth();
  if (!healthy) {
    throw new Error(
      "Lab health check failed. Confirm PHILIP_VOICE_LAB_ENABLED and secrets on the server.",
    );
  }

  const rawSessionId = await getOrCreateNativeSessionId();
  const sessionId = rawSessionId.startsWith("philip-lab-")
    ? rawSessionId
    : `philip-lab-${rawSessionId}`;
  const credentials = await createPhilipVoiceLabSession(sessionId);
  return { sessionId, credentials };
}
