import Constants from "expo-constants";

export const PHILIP_REALTIME_LAB_MODEL = "gpt-realtime-2.1";
export const PHILIP_REALTIME_LAB_VOICE = "cedar";
export const PHILIP_REALTIME_LAB_MAX_DURATION_MS = 115_000;
// Lead time before the hard stop at which the session gets a non-forcing
// "nearly over" context item so Philip can close naturally.
export const PHILIP_REALTIME_LAB_CLOSING_NOTICE_MS = 20_000;
export const PHILIP_REALTIME_LAB_SPEND_CAP_USD = 1;

type Extra = {
  philipVoiceLabEnabled?: boolean;
  philipRealtimeLabUrl?: string;
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

/**
 * The public hostname is shared, but this exact path is reverse-proxied directly
 * to the isolated :3101 lab process. No production API route is accepted.
 */
export function assertIsolatedRealtimeLabUrl(url: string): void {
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/\/$/, "");
  if (parsed.protocol !== "https:") {
    throw new Error("realtime_lab_url_must_use_https");
  }
  if (
    parsed.hostname !== "www.shepherdspathai.com" ||
    path !== "/api/internal/philip-voice/realtime"
  ) {
    throw new Error("realtime_lab_url_must_target_isolated_route");
  }
}
