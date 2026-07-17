import {
  PHILIP_REALTIME_LAB_MODEL,
  PHILIP_REALTIME_LAB_VOICE,
  assertIsolatedRealtimeLabUrl,
  philipRealtimeLabBaseUrl,
} from "@/lib/philipRealtimeLabConfig";
import { philipVoiceLabKey } from "@/lib/philipVoiceLabFlags";

export type RealtimeLabReadiness = {
  runtime: string;
  route: string;
  armed: boolean;
  model: string;
  voice: string;
  inputTranscriptionModel: string | null;
  sessionsUsed: number;
  sessionAvailable: boolean;
  cumulativeEstimatedCostUsd: number;
  liveKitCloud: false;
  productionApi: false;
};

export type RealtimeLabAccess = {
  token: string;
  expiresAt: string;
  readiness: RealtimeLabReadiness;
};

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = await response.text().catch(() => "");
  let detail = "";
  try {
    detail = String((JSON.parse(body) as { error?: string }).error || "");
  } catch {
    detail = body.slice(0, 120);
  }
  return new Error(detail || `${fallback}_${response.status}`);
}

export async function fetchRealtimeLabAccess(): Promise<RealtimeLabAccess> {
  const baseUrl = philipRealtimeLabBaseUrl();
  if (!baseUrl) throw new Error("Realtime Lab is not configured: missing server URL");
  assertIsolatedRealtimeLabUrl(baseUrl);

  // Temporary internal-build bridge: exchange the existing lab-only bundle
  // credential for a five-minute Realtime bearer token. OpenAI credentials
  // never enter the app.
  const labKey = philipVoiceLabKey();
  if (!labKey) {
    throw new Error("Realtime Lab is not configured: internal lab credential unavailable");
  }
  const tokenResponse = await fetch(`${baseUrl}/token`, {
    method: "POST",
    headers: { "X-Philip-Lab-Secret": labKey },
  });
  if (!tokenResponse.ok) throw await responseError(tokenResponse, "runtime_token_failed");
  const tokenBody = (await tokenResponse.json()) as {
    token?: string;
    expiresAt?: string;
    model?: string;
    voice?: string;
  };
  if (!tokenBody.token || !tokenBody.expiresAt) {
    throw new Error("runtime_token_response_invalid");
  }
  if (
    tokenBody.model !== PHILIP_REALTIME_LAB_MODEL ||
    tokenBody.voice !== PHILIP_REALTIME_LAB_VOICE
  ) {
    throw new Error("runtime_token_model_or_voice_mismatch");
  }

  const statusResponse = await fetch(`${baseUrl}/status`, {
    headers: { Authorization: `Bearer ${tokenBody.token}` },
  });
  if (!statusResponse.ok) throw await responseError(statusResponse, "readiness_failed");
  const readiness = (await statusResponse.json()) as RealtimeLabReadiness;
  if (
    readiness.runtime !== "isolated-philip-lab-api" ||
    readiness.productionApi !== false ||
    readiness.liveKitCloud !== false
  ) {
    throw new Error("readiness_isolation_check_failed");
  }
  if (
    readiness.model !== PHILIP_REALTIME_LAB_MODEL ||
    readiness.voice !== PHILIP_REALTIME_LAB_VOICE
  ) {
    throw new Error("readiness_model_or_voice_mismatch");
  }
  return {
    token: tokenBody.token,
    expiresAt: tokenBody.expiresAt,
    readiness,
  };
}
