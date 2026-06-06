import { Platform } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://www.shepherdspathai.com";

export async function syncMobileProToServer(
  sessionId: string,
  isPro: boolean,
  expiresAt?: string | null,
): Promise<void> {
  if (!sessionId) return;
  try {
    await fetch(`${API_BASE}/api/mobile/sync-pro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        isPro,
        platform: Platform.OS === "android" ? "android" : "ios",
        expiresAt: expiresAt ?? undefined,
      }),
    });
  } catch {
    /* non-blocking */
  }
}
