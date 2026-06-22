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

  // Read the full response as text — works on all browsers and iOS WebViews
  // without any ReadableStream complexity. The server streams but the client
  // waits for completion then displays the full result.
  const text = await res.text();
  if (text && !signal?.aborted) {
    onUpdate(text);
  }

  void refreshAiUsage();
  return text ?? "";
}
