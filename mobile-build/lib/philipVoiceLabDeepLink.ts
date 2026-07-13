import { isPhilipVoiceLabEnabled, philipVoiceLabKey } from "@/lib/philipVoiceLabFlags";

function parseLabUrl(url: string): URL | null {
  try {
    const normalized = url.replace(/^shepherdspath:\/\//, "https://shepherdspath.app/");
    return new URL(normalized);
  } catch {
    return null;
  }
}

/** Validates lab deep links. Build-time key is used for API auth; URL must not carry ?key=. */
export function isValidPhilipVoiceLabUrl(url: string): boolean {
  if (!isPhilipVoiceLabEnabled()) return false;
  if (!url.includes("philip-voice-lab")) return false;

  const parsed = parseLabUrl(url);
  if (!parsed) return false;

  const urlKey = parsed.searchParams.get("key");
  if (urlKey) {
    const expectedKey = philipVoiceLabKey();
    return expectedKey ? urlKey === expectedKey : false;
  }

  return true;
}

export function isPhilipVoiceLabDeepLink(url: string): boolean {
  return url.includes("philip-voice-lab") || url.includes("/philip-voice-lab");
}
