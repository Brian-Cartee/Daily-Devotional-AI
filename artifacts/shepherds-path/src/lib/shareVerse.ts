/** Verse sharing — consistent text, URLs, and native share helpers */

import { isNativeWebViewShell } from "@/lib/platform";
import { shareViaNativeShell } from "@/lib/nativeBridge";

/** Canonical public site for share links — never use shepherdspath.app (dead domain). */
export const SHARE_SITE_ORIGIN = "https://www.shepherdspathai.com";

export const APP_ORIGIN =
  typeof window !== "undefined" && window.location?.origin?.startsWith("http")
    ? window.location.origin.replace(/\/$/, "")
    : SHARE_SITE_ORIGIN;

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** Absolute https URL for sharing, e.g. sharePageUrl("/about"). */
export function sharePageUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SHARE_SITE_ORIGIN}${normalized}`;
}

function ensureShareUrl(url?: string): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return trimmed.replace(/^http:\/\//i, "https://");
  if (trimmed.startsWith("www.")) return `https://${trimmed}`;
  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }
  return undefined;
}

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

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** App Store shell with native Share bridge (set in injected JS from .mobile-build). */
export function hasNativeShareBridge(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.spNativeShare === "1";
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "2em";
    ta.style.height = "2em";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
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
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
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
    if (result === "shared" || result === "copied" || result === "cancelled") return result;
  }
  downloadBlob(blob, opts.filename);
  return "saved";
}

export async function shareNative(payload: {
  title?: string;
  text: string;
  url?: string;
  files?: File[];
}): Promise<ShareOutcome> {
  const shareUrl = ensureShareUrl(payload.url) ?? (payload.url?.startsWith("/") ? sharePageUrl(payload.url) : undefined);

  const clipboardBody = shareUrl
    ? payload.text.includes(shareUrl)
      ? payload.text
      : `${payload.text}\n\n${shareUrl}`
    : payload.text;

  if (isNativeWebViewShell() && !payload.files?.length) {
    if (
      shareViaNativeShell({
        title: payload.title,
        text: shareUrl ? `${payload.text}\n\n${shareUrl}` : clipboardBody,
        url: shareUrl,
      })
    ) {
      return "shared";
    }
  }

  if (!navigator.share) {
    const ok = await copyToClipboard(clipboardBody);
    return ok ? "copied" : "failed";
  }

  const ios = isIOSDevice();

  try {
    if (payload.files?.length) {
      const sharePayload: ShareData = {
        title: payload.title,
        text: payload.text,
        url: payload.url,
        files: payload.files,
      };
      if (navigator.canShare && !navigator.canShare(sharePayload)) {
        const ok = await copyToClipboard(clipboardBody);
        return ok ? "copied" : "failed";
      }
      await navigator.share(sharePayload);
      return "shared";
    }

    // iOS: share the https URL only — avoids broken links like ".app" in Messages.
    const sharePayload: ShareData = ios && shareUrl
      ? { title: payload.title, url: shareUrl }
      : {
          title: payload.title,
          text: payload.text,
          url: shareUrl,
        };

    if (navigator.canShare && !navigator.canShare(sharePayload)) {
      const ok = await copyToClipboard(clipboardBody);
      return ok ? "copied" : "failed";
    }
    await navigator.share(sharePayload);
    return "shared";
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled";
    const ok = await copyToClipboard(clipboardBody);
    return ok ? "copied" : "failed";
  }
}
