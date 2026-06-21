const ACTIVE_SITUATION_KEY = "sp_guidance_active_situation";

export function stashGuidanceSituation(text: string): void {
  try {
    sessionStorage.setItem(ACTIVE_SITUATION_KEY, text.trim());
  } catch {
    /* storage unavailable */
  }
}

export function readGuidanceSituation(): string {
  try {
    return sessionStorage.getItem(ACTIVE_SITUATION_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function clearGuidanceSituation(): void {
  try {
    sessionStorage.removeItem(ACTIVE_SITUATION_KEY);
  } catch {
    /* noop */
  }
}

/** Resolve situation from URL param or session stash (voice entries use ?active=1). */
export function resolveGuidanceSituation(search: string): string {
  const params = new URLSearchParams(search);
  const fromUrl = params.get("situation")?.trim() ?? "";
  if (fromUrl) return fromUrl;
  if (params.get("active") === "1") return readGuidanceSituation();
  return "";
}
