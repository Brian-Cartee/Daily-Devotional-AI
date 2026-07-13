import { isPhilipVoiceLabEnabled, philipVoiceLabKey } from "@/lib/philipVoiceLabFlags";

function parseLabUrl(url: string): URL | null {
  try {
    const normalized = url.replace(/^shepherdspath:\/\//, "https://shepherdspath.app/");
    return new URL(normalized);
  } catch {
    return null;
  }
}

/** Validates deep link key when EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY is set. */
export function isValidPhilipVoiceLabUrl(url: string): boolean {
  if (!isPhilipVoiceLabEnabled()) return false;
  if (!url.includes("philip-voice-lab")) return false;

  const expectedKey = philipVoiceLabKey();
  if (!expectedKey) return true;

  const parsed = parseLabUrl(url);
  if (!parsed) return false;
  return parsed.searchParams.get("key") === expectedKey;
}

export function isPhilipVoiceLabDeepLink(url: string): boolean {
  return url.includes("philip-voice-lab") || url.includes("/philip-voice-lab");
}
