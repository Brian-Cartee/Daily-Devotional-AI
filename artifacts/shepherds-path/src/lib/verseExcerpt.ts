/** Short verse for image overlays — full text lives in expand / devotional. */
export function verseExcerptForCard(
  text: string,
  maxChars = 118,
): { text: string; truncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return { text: trimmed, truncated: false };
  }

  const slice = trimmed.slice(0, maxChars);
  const sentenceBreak = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  if (sentenceBreak >= 48) {
    return { text: trimmed.slice(0, sentenceBreak + 1).trim(), truncated: true };
  }

  const wordBreak = slice.replace(/\s+\S*$/, "").trim();
  if (wordBreak.length >= 40) {
    return { text: `${wordBreak}…`, truncated: true };
  }

  return { text: `${trimmed.slice(0, maxChars).trim()}…`, truncated: true };
}
