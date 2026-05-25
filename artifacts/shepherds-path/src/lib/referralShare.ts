const DEFAULT_ORIGIN = "https://shepherdspathai.com";

export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return DEFAULT_ORIGIN;
}

export function buildReferralShareUrl(code: string): string {
  return `${getAppOrigin()}?ref=${encodeURIComponent(code)}`;
}

export function appendRefToUrl(url: string, code: string): string {
  try {
    const u = new URL(url, getAppOrigin());
    u.searchParams.set("ref", code);
    return u.toString();
  } catch {
    return buildReferralShareUrl(code);
  }
}

export const INVITE_SHARE_TITLE = "Shepherd's Path — Daily Walk with Jesus";

export function inviteShareText(bonusDays: number, welcomeDays: number): string {
  return `I've been walking with Jesus daily on Shepherd's Path. Join through my link — you get ${welcomeDays} days of Pro free, and I earn ${bonusDays} bonus Pro days when you start.`;
}
