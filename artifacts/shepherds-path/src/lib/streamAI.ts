import { apiUrl } from "@/lib/api";
import { refreshAiUsage } from "@/hooks/use-ai-usage";
import { apiSessionExtras } from "@/lib/requestExtras";

export class AiLimitReachedError extends Error {
  limitReached = true;

  constructor(message: string) {
    super(message);
    this.name = "AiLimitReachedError";
  }
}

export async function streamAI(
  url: string,
  body: object,
  onUpdate: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(apiUrl(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...apiSessionExtras(), ...body }),
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.limitReached) {
        throw new AiLimitReachedError(
          errData.message || "You've reached today's reflection limit.",
        );
      }
      if (errData.message) msg = errData.message;
    } catch (e) {
      if (e instanceof AiLimitReachedError) throw e;
    }
    throw new Error(msg);
  }

  // iOS WKWebView / older Safari can return a null body or a non-streamable body.
  // Fall back to reading the full text at once so content always appears.
  if (!res.body) {
    const text = await res.text();
    if (text) onUpdate(text);
    void refreshAiUsage();
    return text;
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  try {
    reader = res.body.getReader();
  } catch {
    // ReadableStream not supported — read full response instead
    const text = await res.clone().text();
    if (text) onUpdate(text);
    void refreshAiUsage();
    return text;
  }

  const decoder = new TextDecoder();
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) break;
      text += decoder.decode(value, { stream: true });
      onUpdate(text);
    }
  } finally {
    reader.releaseLock();
  }

  void refreshAiUsage();
  return text;
}
