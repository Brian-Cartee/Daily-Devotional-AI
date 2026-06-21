/** Strip decorative/CSV quotes so UI and share cards add exactly one pair. */
const EDGE_QUOTE = /^[\s"'“”‘’«»‹›]+|[\s"'“”‘’«»‹›]+$/;

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

export function trimVerseForShare(text: string, maxChars = 230): string {
  const clean = stripWrappingQuotes(text);
  if (clean.length <= maxChars) return clean;
  return `${clean.substring(0, maxChars - 1)}\u2026`;
}

/** Curly quotes for on-screen display (not canvas — share images use trimVerseForShare). */
export function formatVerseForDisplay(text: string): string {
  const core = stripWrappingQuotes(text);
  return `\u201C${core}\u201D`;
}
