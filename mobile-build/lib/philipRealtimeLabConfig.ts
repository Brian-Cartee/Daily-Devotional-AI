import Constants from "expo-constants";

export const PHILIP_REALTIME_LAB_MODEL = "gpt-realtime-2.1";
export const PHILIP_REALTIME_LAB_VOICE = "cedar";
export const PHILIP_REALTIME_LAB_MAX_DURATION_MS = 115_000;
export const PHILIP_REALTIME_LAB_SPEND_CAP_USD = 1;

type Extra = {
  philipVoiceLabEnabled?: boolean;
  philipRealtimeLabUrl?: string;
  philipRealtimeLabSecret?: string;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra || {}) as Extra;
}

/** Same gate as legacy Voice Lab — philip-lab internal builds only. */
export function isPhilipRealtimeLabEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_ENABLE_PHILIP_VOICE_LAB === "true") return true;
  return Boolean(extra().philipVoiceLabEnabled);
}

/**
 * Lab-only session host. Must never silently default to production API.
 * Configure via EXPO_PUBLIC_PHILIP_REALTIME_LAB_URL for phone tests.
 */
export function philipRealtimeLabBaseUrl(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_PHILIP_REALTIME_LAB_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const fromExtra = String(extra().philipRealtimeLabUrl || "").trim();
  return fromExtra.replace(/\/$/, "");
}

export function philipRealtimeLabSecret(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_PHILIP_REALTIME_LAB_SECRET || "").trim();
  if (fromEnv) return fromEnv;
  return String(extra().philipRealtimeLabSecret || "").trim();
}

export function assertNotProductionRealtimeHost(url: string): void {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "shepherdspathai.com" || host.endsWith(".shepherdspathai.com")) {
    throw new Error("production_api_forbidden_for_iphone_realtime_lab");
  }
}
