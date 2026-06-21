import { getSessionId } from "@/lib/session";

/** Philip — default Talk It Through voice (internal; never shown to users). */
export const SHEPHERD_VOICE = "onyx";

/** Barnabas — encouragement / splash open 1 (internal). */
export const ENCOURAGER_VOICE = "fable";

export const GREETING_DATE_KEY = "sp_guidance_greeted_date";
export const GREETING_SESSION_KEY = "sp_guidance_greeted_this_session";

export function getEasternDateStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

export function shouldPlayShepherdGreeting(): boolean {
  try {
    if (localStorage.getItem(GREETING_DATE_KEY) === getEasternDateStr()) return false;
    if (sessionStorage.getItem(GREETING_SESSION_KEY)) return false;
  } catch {
    /* noop */
  }
  return true;
}

export function markShepherdGreetingPlayed(): void {
  try {
    sessionStorage.setItem(GREETING_SESSION_KEY, "1");
    localStorage.setItem(GREETING_DATE_KEY, getEasternDateStr());
  } catch {
    /* noop */
  }
}

export function buildShepherdGreeting(
  name: string | null | undefined,
  isFirstVisit: boolean,
  witnessLine: string | null,
  reentryLine?: string | null,
): string {
  const hi = name ? `Hi ${name}.` : "Hi.";
  if (reentryLine?.trim()) {
    return `${hi} ${reentryLine.trim()}`;
  }
  if (witnessLine) {
    const trimmed = witnessLine.trim();
    const endsQuestion = trimmed.endsWith("?");
    return endsQuestion
      ? `${hi} Good to have you back — I'm glad you came. ${trimmed}`
      : `${hi} Good to have you back — I'm glad you came. ${trimmed} What's on your heart today?`;
  }
  if (isFirstVisit) {
    return name
      ? `${hi} I'm genuinely glad you're here. Take your time — what's on your heart?`
      : "I'm genuinely glad you're here. Take your time — what's on your heart?";
  }
  return name
    ? `${hi} Good to have you back. I'm glad you're here — what's on your heart today?`
    : "Good to have you back. I'm glad you're here — what's on your heart today?";
}

export type SpeakShepherdOptions = {
  onStart?: () => void;
  onEnd?: () => void;
  onFail?: () => void;
  scope?: "verse" | "snippet";
  voice?: string;
  prefetchedBlob?: Blob | null;
};

export function prefetchShepherdTTS(text: string): Promise<Blob | null> {
  const input = text.trim();
  if (!input) return Promise.resolve(null);
  return fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: input,
      voice: SHEPHERD_VOICE,
      scope: "verse",
      sessionId: getSessionId(),
    }),
  })
    .then((r) => (r.ok ? r.blob() : null))
    .catch(() => null);
}

/** Speak a line in the shepherd voice. Returns a cancel function. */
export function speakShepherdLine(text: string, opts?: SpeakShepherdOptions): () => void {
  const input = text.trim();
  if (!input) {
    opts?.onFail?.();
    opts?.onEnd?.();
    return () => {};
  }

  let cancelled = false;
  let audio: HTMLAudioElement | null = null;

  const playBlob = (blob: Blob) => {
    if (cancelled) return;
    const url = URL.createObjectURL(blob);
    audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      audio = null;
      if (!cancelled) opts?.onEnd?.();
    };
    audio.play().catch(() => {
      if (!cancelled) {
        opts?.onFail?.();
        opts?.onEnd?.();
      }
    });
    if (!cancelled) opts?.onStart?.();
  };

  if (opts?.prefetchedBlob) {
    playBlob(opts.prefetchedBlob);
  } else {
    prefetchShepherdTTS(input).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        opts?.onFail?.();
        opts?.onEnd?.();
        return;
      }
      playBlob(blob);
    });
  }

  return () => {
    cancelled = true;
    if (audio) {
      audio.pause();
      audio = null;
    }
  };
}

export const PROCESSING_BRIDGE = "I'm sitting with what you shared.";
export const TAKE_YOUR_TIME_BRIDGE = "Take your time.";
export const READY_PROMPT_BRIDGE = "Whenever you're ready, I'm here.";

export function speakProcessingBridge(onEnd?: () => void): () => void {
  return speakShepherdLine(PROCESSING_BRIDGE, { onEnd });
}

/** Resolve after Philip finishes the processing bridge line (or immediately if TTS fails). */
export function waitForProcessingBridge(): Promise<void> {
  return new Promise((resolve) => {
    speakProcessingBridge(resolve);
  });
}

export function speakTakeYourTimeBridge(): () => void {
  return speakShepherdLine(TAKE_YOUR_TIME_BRIDGE);
}

export function speakReadyPromptBridge(): () => void {
  return speakShepherdLine(READY_PROMPT_BRIDGE);
}

export function postGuidanceMemory(
  situation: string,
  response: string | undefined,
  stage: "pending" | "complete",
): void {
  const sessionId = getSessionId();
  const trimmed = situation.trim();
  if (!sessionId || trimmed.length < 8) return;
  fetch("/api/guidance/save-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation: trimmed,
      response: response?.trim() || trimmed,
      sessionId,
      stage,
    }),
  }).catch(() => {});
}
