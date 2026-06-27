/** Strip decorative/CSV quotes so UI and share cards add exactly one pair. */
const EDGE_QUOTE = /^[\s"'“”‘’«»‹›]+|[\s"'“”‘’«»‹›]+$/;

/** All quote glyphs — removed before display; wrappers add one pair only. */
const INLINE_QUOTES = /[\u201C\u201D\u201E\u201F\u0022\u0027\u2018\u2019\u00AB\u00BB\u2039\u203A]/g;

export function stripWrappingQuotes(text: string): string {
  if (!text?.trim()) return text?.trim() ?? "";
  let s = text.trim();
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(EDGE_QUOTE, "");
  }
  return s;
}

/** Clean verse body for display and share art — no embedded quotation marks. */
export function normalizeVerseBody(text: string): string {
  if (!text?.trim()) return "";
  let s = stripWrappingQuotes(text);
  s = s.replace(INLINE_QUOTES, "");
  return s.replace(/\s+/g, " ").trim();
}

export function trimVerseForShare(text: string, maxChars = 230): string {
  const clean = normalizeVerseBody(text);
  if (clean.length <= maxChars) return clean;
  return `${clean.substring(0, maxChars - 1)}\u2026`;
}

/** Curly quotes for on-screen display (not canvas — share images use trimVerseForShare). */
export function formatVerseForDisplay(text: string): string {
  const core = normalizeVerseBody(text);
  return `\u201C${core}\u201D`;
}
