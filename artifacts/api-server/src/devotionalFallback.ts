import type { Verse } from "@workspace/db/schema";

type VerseLike = Pick<Verse, "reference" | "text" | "encouragement" | "reflectionPrompt">;

export function isOpenAIFailure(err: unknown): boolean {
  const e = err as { code?: string; status?: number; message?: string; type?: string };
  if (e?.code === "insufficient_quota" || e?.code === "billing_hard_limit_reached") return true;
  if (e?.status === 429 || e?.status === 503 || e?.status === 502) return true;
  if (e?.type === "insufficient_quota") return true;
  const msg = String(e?.message ?? err ?? "").toLowerCase();
  if (msg.includes("timeout") || msg.includes("econnrefused") || msg.includes("network error")) {
    return true;
  }
  if (msg.includes("rate limit") || msg.includes("overloaded")) return true;
  return false;
}

export function buildDevotionalFallbackReflection(
  verse: VerseLike,
  firstName?: string,
): string {
  const encouragement = verse.encouragement?.trim() || "";
  const prompt = verse.reflectionPrompt?.trim() || "";
  const opener = firstName ? `${firstName}, ` : "";

  const paragraphs: string[] = [];
  if (encouragement) {
    paragraphs.push(`${opener}${encouragement}`);
  } else {
    paragraphs.push(
      `${opener}Today's word from ${verse.reference} is here for you — not as a lecture, but as something steady to hold as you move through this day.`,
    );
  }

  if (prompt) {
    paragraphs.push(prompt.endsWith("?") ? prompt : `${prompt}?`);
  } else {
    paragraphs.push("What might God be inviting you to receive from this passage today?");
  }

  return paragraphs.join("\n\n");
}

export function buildDevotionalFallbackPrayer(
  verse: VerseLike,
  reflectionContext?: string,
  firstName?: string,
): string {
  const address = firstName ? `Lord, ${firstName} comes to You` : "Lord, I come to You";
  const anchor =
    verse.encouragement?.trim().split(/(?<=[.!?])\s+/)[0]?.trim() ||
    verse.text.trim().split(/(?<=[.!?])\s+/)[0]?.trim() ||
    "Thank You for today's Word.";

  let prayer = `${address} with ${verse.reference} on my heart. ${anchor}`;

  if (reflectionContext?.trim()) {
    prayer += " Let what You stirred in me just now stay with me as I pray.";
  } else if (verse.reflectionPrompt?.trim()) {
    prayer += ` ${verse.reflectionPrompt.trim().replace(/\?$/, "")} — meet me there.`;
  }

  prayer += " Hold what I cannot carry alone. Guard my heart with Your peace. Amen.";
  return prayer;
}

export function writePlainTextResponse(res: import("express").Response, text: string): void {
  if (res.headersSent) return;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.write(text);
  res.end();
}
