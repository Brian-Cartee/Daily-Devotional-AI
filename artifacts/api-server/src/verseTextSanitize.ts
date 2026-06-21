import type { SheetVerse } from "./googleSheets";

/** Known typo: "He restores my should" → soul (common sheet / dictation error). */
const RESTORES_MY_SOUL_FIXES: [RegExp, string][] = [
  [/\bHe restores my should\b/gi, "He restores my soul"],
  [/\bhe restores my should\b/gi, "he restores my soul"],
  [/\brestores my should\b/gi, "restores my soul"],
  [/\brestore my should\b/gi, "restore my soul"],
];

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

export function verseTextHasRestoreSoulTypo(text: string): boolean {
  return /restore\w*\s+my\s+should\b/i.test(text);
}

export function sanitizeVerseText(text: string, _reference?: string): string {
  if (!text?.trim()) return text;
  let out = stripWrappingQuotes(text);
  for (const [pattern, replacement] of RESTORES_MY_SOUL_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function sanitizeSheetVerse(verse: SheetVerse): SheetVerse {
  const reference = verse.reference?.trim() || "";
  return {
    ...verse,
    verseText: sanitizeVerseText(verse.verseText, reference),
    encouragement: sanitizeVerseText(verse.encouragement, reference),
    reflectionPrompt: sanitizeVerseText(verse.reflectionPrompt, reference),
  };
}

export function sanitizeStoredVerse<T extends {
  text: string;
  reference: string;
  encouragement?: string | null;
  reflectionPrompt?: string | null;
}>(verse: T): T {
  const reference = verse.reference?.trim() || "";
  return {
    ...verse,
    text: sanitizeVerseText(verse.text, reference),
    encouragement: verse.encouragement
      ? sanitizeVerseText(verse.encouragement, reference)
      : verse.encouragement,
    reflectionPrompt: verse.reflectionPrompt
      ? sanitizeVerseText(verse.reflectionPrompt, reference)
      : verse.reflectionPrompt,
  };
}
