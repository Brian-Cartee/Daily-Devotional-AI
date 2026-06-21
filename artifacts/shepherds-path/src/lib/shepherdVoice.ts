import { getSessionId } from "@/lib/session";

/** Philip — default Talk It Through voice (internal; never shown to users). */
export const SHEPHERD_VOICE = "onyx";

/** Barnabas — encouragement / splash open 1 (internal). */
export const ENCOURAGER_VOICE = "fable";

export function buildShepherdGreeting(
  name: string | null | undefined,
  isFirstVisit: boolean,
  witnessLine: string | null,
): string {
  const hi = name ? `Hi ${name}.` : "Hi.";
  if (witnessLine) {
    return `${hi} It's good to have you back. ${witnessLine} What's on your heart today?`;
  }
  if (isFirstVisit) {
    return name
      ? `${hi} I'm glad you're here. Take your time — what's on your heart?`
      : "I'm glad you're here. Take your time — what's on your heart?";
  }
  return name
    ? `${hi} It's good to have you back. What's on your heart today?`
    : "It's good to have you back. What's on your heart today?";
}

export type SpeakShepherdOptions = {
  onStart?: () => void;
  onEnd?: () => void;
  scope?: "verse" | "snippet";
  voice?: string;
};

/** Speak a line in the shepherd voice. Returns a cancel function. */
export function speakShepherdLine(text: string, opts?: SpeakShepherdOptions): () => void {
  const input = text.trim();
  if (!input) return () => {};

  let cancelled = false;
  let audio: HTMLAudioElement | null = null;

  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: input,
      voice: opts?.voice ?? SHEPHERD_VOICE,
      scope: opts?.scope ?? "verse",
      sessionId: getSessionId(),
    }),
  })
    .then((r) => (r.ok ? r.blob() : null))
    .then((blob) => {
      if (cancelled || !blob) {
        if (!cancelled) opts?.onEnd?.();
        return;
      }
      const url = URL.createObjectURL(blob);
      audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audio = null;
        if (!cancelled) opts?.onEnd?.();
      };
      audio.play().catch(() => {
        if (!cancelled) opts?.onEnd?.();
      });
      if (!cancelled) opts?.onStart?.();
    })
    .catch(() => {
      if (!cancelled) opts?.onEnd?.();
    });

  return () => {
    cancelled = true;
    if (audio) {
      audio.pause();
      audio = null;
    }
  };
}
