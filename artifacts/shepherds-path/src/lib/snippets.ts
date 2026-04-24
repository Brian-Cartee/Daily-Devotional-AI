import { getSessionId } from "./session";

export async function saveSnippet({
  text,
  reference,
  source,
}: {
  text: string;
  reference: string;
  source?: string;
}) {
  const sessionId = getSessionId();
  const content = source ? `[${source}]\n\n${text}` : text;

  const res = await fetch("/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      type: "verse",
      content,
      reference,
    }),
  });

  if (!res.ok) throw new Error("Failed to save snippet");
  return res.json();
}
