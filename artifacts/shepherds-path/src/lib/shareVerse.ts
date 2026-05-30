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

/** Short caption when the verse is already on the shared image (avoids duplicate on iOS). */
export function buildImageShareCaption(reference: string, date?: string): string {
  const d = date ?? easternVerseDateKey();
  return `${reference} · Shepherd's Path\n${buildVerseSharePreviewUrl(d)}`;
}

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

/** Save a generated share card to the device (Photos / Downloads). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function shareImageFilename(reference: string): string {
  const slug = reference.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "verse";
  return `shepherds-path-${slug}.png`;
}

/** Native share with image file; falls back to download when the OS can't share files. */
export async function shareImageBlob(
  blob: Blob,
  opts: { filename: string; title?: string; text: string; url?: string },
): Promise<"shared" | "saved" | "cancelled" | "failed"> {
  const file = new File([blob], opts.filename, { type: "image/png" });
  const canTryFiles = !navigator.canShare || navigator.canShare({ files: [file] });
  if (canTryFiles && navigator.share) {
    const result = await shareNative({
      title: opts.title ?? "Shepherd's Path",
      text: opts.text,
      url: opts.url,
      files: [file],
    });
    if (result === "shared" || result === "cancelled") return result;
  }
  downloadBlob(blob, opts.filename);
  return "saved";
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
