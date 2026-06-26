import type { EdgeCaseKind } from "./types";

export function detectEdgeCase(input: string): EdgeCaseKind {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "no_one";

  if (
    /\b(me|myself|i need this|for me)\b/i.test(trimmed) &&
    trimmed.length < 24
  ) {
    return "self";
  }

  if (
    /\b(nobody|no one|no-one|can't think|cannot think|no one comes to mind|don't know)\b/i.test(
      trimmed
    )
  ) {
    return "no_one";
  }

  if (
    /\b(passed away|died|death|in heaven|memorial|funeral|no longer with us|gone now|rest in peace)\b/i.test(
      trimmed
    )
  ) {
    return "deceased";
  }

  if (
    /\b(estranged|complicated|don't talk|haven't spoken|not on speaking|bad blood)\b/i.test(
      trimmed
    )
  ) {
    return "estranged";
  }

  return null;
}

export function detectGodLanguage(...texts: (string | null | undefined)[]): boolean {
  const combined = texts.filter(Boolean).join(" ").toLowerCase();
  return /\b(god|jesus|christ|lord|holy spirit|spirit|prayer|prayed|faith|scripture|bible)\b/i.test(
    combined
  );
}

export function extractSenderPhrases(...texts: (string | null | undefined)[]): string[] {
  const phrases: string[] = [];
  for (const t of texts) {
    if (!t?.trim()) continue;
    const sentences = t
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8);
    phrases.push(...sentences.slice(0, 4));
  }
  return [...new Set(phrases)].slice(0, 12);
}

export function parseRecipientInput(raw: string): { name: string; relationship: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { name: "", relationship: null };

  const relMatch = trimmed.match(/^(.+?)\s*[\u2014\u2013\-–,]\s*(my\s+.+)$/i);
  if (relMatch) {
    return { name: relMatch[1].trim(), relationship: relMatch[2].trim() };
  }

  const myMatch = trimmed.match(/^my\s+(.+)$/i);
  if (myMatch && !myMatch[1].includes(" ")) {
    return { name: myMatch[1].trim(), relationship: trimmed };
  }

  return { name: trimmed, relationship: null };
}

export function displayName(name: string): string {
  return name.trim().split(/\s+/)[0] || "them";
}
