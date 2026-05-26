/** Verse sharing — consistent text, URLs, and native share helpers */

export const APP_ORIGIN =
  typeof window !== "undefined" && window.location?.origin?.startsWith("http")
    ? window.location.origin.replace(/\/$/, "")
    : "https://www.shepherdspathai.com";

export function easternVerseDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

/** Human-facing page (SPA) */
export function buildVersePageUrl(date: string): string {
  return `${APP_ORIGIN}/v/${date}`;
}

/** Link previews (HTML + OG for iMessage, Facebook, etc.) */
export function buildVerseSharePreviewUrl(date: string): string {
  return `${APP_ORIGIN}/api/share/verse/${date}`;
}

export function absoluteApiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${APP_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export type VerseShareInput = {
  text: string;
  reference: string;
  date?: string;
  /** Optional line above the link — reflection, prayer snippet, etc. */
  extraLine?: string;
};

export function buildVerseShareText({
  text,
  reference,
  date,
  extraLine,
}: VerseShareInput): string {
  const d = date ?? easternVerseDateKey();
  const url = buildVerseSharePreviewUrl(d);
  const parts = [`"${text}"`, `— ${reference}`];
  if (extraLine?.trim()) parts.push("", extraLine.trim());
  parts.push("", "Sit in Scripture · Shepherd's Path", url);
  return parts.join("\n");
}

export function buildFriendVerseShareText(
  text: string,
  reference: string,
  senderName?: string | null,
  date?: string,
): string {
  const from = senderName?.trim()
    ? `${senderName.trim()} was thinking of you`
    : "Someone was thinking of you";
  const d = date ?? easternVerseDateKey();
  return `${from} while reading today's verse.\n\n"${text}"\n— ${reference}\n\n${buildVerseSharePreviewUrl(d)}`;
}

export function buildGuidanceEncouragementShareText(
  verse: { text: string; reference: string },
  encouragementExcerpt: string,
  date?: string,
): string {
  const clipped =
    encouragementExcerpt.length > 320
      ? `${encouragementExcerpt.slice(0, 317)}…`
      : encouragementExcerpt;
  return buildVerseShareText({
    text: verse.text,
    reference: verse.reference,
    date,
    extraLine: `A word that met me today:\n"${clipped}"`,
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareNative(payload: {
  title?: string;
  text: string;
  url?: string;
  files?: File[];
}): Promise<"shared" | "cancelled" | "failed"> {
  if (!navigator.share) {
    const ok = await copyToClipboard(
      payload.url ? `${payload.text}\n\n${payload.url}` : payload.text,
    );
    return ok ? "shared" : "failed";
  }
  try {
    await navigator.share({
      title: payload.title,
      text: payload.text,
      url: payload.url,
      files: payload.files,
    });
    return "shared";
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled";
    return "failed";
  }
}
