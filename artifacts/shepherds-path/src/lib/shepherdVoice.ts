import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";

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

const RETURN_LINES = [
  "You're back. I'm here — what's on your heart?",
  "Good to have you back. What's stirring in you?",
  "Glad you came back. I'm listening — what's on your heart?",
  "Welcome back. Take a breath — what do you want to bring?",
  "You returned. That means something. What's on your heart?",
];

export function buildShepherdReturnLine(name: string | null | undefined): string {
  const line = RETURN_LINES[Math.floor(Math.random() * RETURN_LINES.length)];
  return name ? `${name}. ${line}` : line;
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
      : `${hi} Good to have you back — I'm glad you came. ${trimmed} Take your time.`;
  }
  if (isFirstVisit) {
    return name
      ? `${hi} You didn't have to open this — but you did. I'm glad you're here. Take your time. Nothing you say has to be polished.`
      : "You didn't have to open this — but you did. I'm glad you're here. Take your time. Nothing you say has to be polished.";
  }
  return name
    ? `${hi} Good to see you. Whatever brought you here — you don't have to have it figured out before you speak.`
    : "Good to see you. Whatever brought you here — you don't have to have it figured out before you speak.";
}

export type SpeakShepherdOptions = {
  onStart?: () => void;
  onEnd?: () => void;
  onFail?: () => void;
  scope?: "verse" | "snippet";
  voice?: string;
  prefetchedBlob?: Blob | null;
  isPro?: boolean;
};

export function prefetchShepherdTTS(text: string, isPro?: boolean): Promise<Blob | null> {
  const input = text.trim();
  if (!input) return Promise.resolve(null);
  const proFlag = isPro !== undefined ? isPro : isProVerifiedLocally();
  return fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: input,
      voice: SHEPHERD_VOICE,
      scope: "guidance",
      sessionId: getSessionId(),
      isPro: proFlag,
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
    audio = makeAudio(url);
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
    prefetchShepherdTTS(input, opts?.isPro).then((blob) => {
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

/** Create an Audio element safe for iOS — playsinline prevents earpiece routing after getUserMedia. */
function makeAudio(src?: string): HTMLAudioElement {
  const el = src ? new Audio(src) : new Audio();
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");
  return el;
}

/**
 * Stream TTS from /api/tts/stream and play via MediaSource for ~300ms TTFB.
 * Falls back to blob path on browsers without MediaSource (older iOS Safari).
 * Returns a cancel function — call it to stop playback mid-stream.
 */
export function speakShepherdStream(
  text: string,
  opts?: SpeakShepherdOptions,
): () => void {
  const input = text.trim();
  if (!input) {
    opts?.onFail?.();
    opts?.onEnd?.();
    return () => {};
  }

  let cancelled = false;
  let audio: HTMLAudioElement | null = null;
  let sourceBuffer: SourceBuffer | null = null;
  let mediaSource: MediaSource | null = null;
  let canplayDeadlineTimer: number | undefined;

  const proFlag = opts?.isPro !== undefined ? opts.isPro : isProVerifiedLocally();

  const bodyPayload = JSON.stringify({
    text: input,
    sessionId: getSessionId(),
    isPro: proFlag,
  });

  // MediaSource path — chunks play as they arrive (~300ms TTFB).
  // iOS 17.1+ uses ManagedMediaSource; desktop Chrome/Firefox use MediaSource.
  const MS: typeof MediaSource | undefined =
    (window as unknown as { ManagedMediaSource?: typeof MediaSource }).ManagedMediaSource ??
    (typeof MediaSource !== "undefined" ? MediaSource : undefined);

  if (MS && MS.isTypeSupported("audio/mpeg")) {
    mediaSource = new MS() as MediaSource;
    const url = URL.createObjectURL(mediaSource);
    audio = makeAudio();
    // ManagedMediaSource requires the element to be in the DOM; playsinline prevents earpiece routing
    audio.disableRemotePlayback = true;
    audio.style.display = "none";
    document.body.appendChild(audio);
    audio.src = url;

    const pendingChunks: ArrayBuffer[] = [];
    let streamDone = false;
    let appending = false;

    const tryAppend = () => {
      if (
        !sourceBuffer ||
        appending ||
        sourceBuffer.updating ||
        pendingChunks.length === 0
      )
        return;
      appending = true;
      const chunk = pendingChunks.shift()!;
      sourceBuffer.appendBuffer(chunk);
    };

    mediaSource.addEventListener("sourceopen", () => {
      if (cancelled) return;
      try {
        sourceBuffer = mediaSource!.addSourceBuffer("audio/mpeg");
      } catch {
        // Browser rejected — fall through to blob path below
        URL.revokeObjectURL(url);
        useBlobFallback();
        return;
      }

      // If oncanplay never fires (iOS ManagedMediaSource edge case), signal failure
      // so speakShepherdStreamWithMicHandoff's own fallback timer can open the mic.
      canplayDeadlineTimer = window.setTimeout(() => {
        if (!cancelled) { cleanupAudio(); opts?.onFail?.(); opts?.onEnd?.(); }
      }, 8000);

      sourceBuffer.addEventListener("updateend", () => {
        appending = false;
        if (pendingChunks.length > 0) {
          tryAppend();
        } else if (streamDone) {
          try {
            mediaSource!.endOfStream();
          } catch {}
        }
      });

      fetch("/api/tts/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyPayload,
      })
        .then(async (r) => {
          if (!r.ok || !r.body) throw new Error(`TTS stream ${r.status}`);
          const reader = r.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (cancelled) { reader.cancel(); break; }
            pendingChunks.push(value.buffer as ArrayBuffer);
            tryAppend();
          }
          streamDone = true;
          if (!sourceBuffer?.updating && pendingChunks.length === 0) {
            try { mediaSource!.endOfStream(); } catch {}
          }
        })
        .catch(() => {
          if (!cancelled) {
            opts?.onFail?.();
            opts?.onEnd?.();
          }
        });
    });

    const cleanupAudio = () => {
      window.clearTimeout(canplayDeadlineTimer);
      if (audio) {
        audio.pause();
        audio.src = "";
        if (audio.parentNode) audio.parentNode.removeChild(audio);
        URL.revokeObjectURL(url);
        audio = null;
      }
    };

    audio.oncanplay = () => {
      if (cancelled) return;
      window.clearTimeout(canplayDeadlineTimer);
      audio!.play()
        .then(() => {
          // Small delay before signaling onStart — gives audio output time to
          // fully resume so the first syllable isn't swallowed on iOS.
          setTimeout(() => { if (!cancelled) opts?.onStart?.(); }, 180);
        })
        .catch(() => {
          if (!cancelled) { opts?.onFail?.(); opts?.onEnd?.(); }
        });
    };
    audio.onended = () => {
      cleanupAudio();
      if (!cancelled) opts?.onEnd?.();
    };

    return () => {
      cancelled = true;
      cleanupAudio();
    };
  }

  // Blob fallback — no MediaSource support (old iOS).
  // Only called when the MediaSource path above was not entered.
  function useBlobFallback() {
    fetch("/api/tts/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyPayload,
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) { opts?.onFail?.(); opts?.onEnd?.(); return; }
        const url = URL.createObjectURL(blob);
        audio = makeAudio(url);
        audio.onended = () => { URL.revokeObjectURL(url); if (!cancelled) opts?.onEnd?.(); };
        audio.play().catch(() => { opts?.onFail?.(); opts?.onEnd?.(); });
        opts?.onStart?.();
      })
      .catch(() => { opts?.onFail?.(); opts?.onEnd?.(); });
  }

  if (!(MS && MS.isTypeSupported("audio/mpeg"))) {
    useBlobFallback();
  }

  return () => {
    cancelled = true;
    if (audio) { audio.pause(); audio = null; }
  };
}

export const PROCESSING_BRIDGE = "I'm sitting with what you shared.";
/** Spoken after Phase 1 reply (or follow-up voice submit) — not the first entry. */
export const PHASE1_REPLY_BRIDGE = "Give me a moment with that.";
export const TAKE_YOUR_TIME_BRIDGE = "Take your time.";
export const READY_PROMPT_BRIDGE = "Whenever you're ready, I'm here.";

/** Brief sacred pause on the threshold screen before Philip's opening line. */
export const VOICE_GREETING_DWELL_MS = 1600;
/** Conversational auto-submit silence — entry / Phase 1 reply / follow-up. */
export const VOICE_SILENCE_ENTRY_MS = 1_500;
export const VOICE_SILENCE_PHASE1_MS = 1200;
export const VOICE_SILENCE_FOLLOWUP_MS = 1200;

export const VOICE_MIC_HANDOFF_PHASE1_MS = 800;
export const VOICE_MIC_HANDOFF_FOLLOWUP_MS = 600;

const HEAVY_REPLY_RE =
  /\b(died|death|funeral|miscarriage|suicid|abuse|rape|murder|killed|overdose|hospital|chemo|cancer|divorc)\b/i;

const MEDIUM_PONDERING_RE =
  /\b(scared|afraid|anxious|anxiety|depressed|depression|crying|hopeless|alone|lonely|hurt|hurting|struggling|lost|broken|desperate|worried|panic|grief|sad|overwhelmed|grief)\b/i;

/** Sentiment-aware silence before Philip speaks — simulates holding what was shared.
 *  Heavy: 1800ms  Medium: 900ms  Default: 400ms */
export function getPonderingPauseMs(userText: string): number {
  if (HEAVY_REPLY_RE.test(userText)) return 1800;
  if (MEDIUM_PONDERING_RE.test(userText)) return 900;
  return 400;
}

/** Acute grief / raw one-liners — skip spoken bridge; visual presence only. */
export function shouldSkipReplyBridge(reply: string): boolean {
  const t = reply.trim();
  if (t.length > 0 && t.length < 15) return true;
  if (HEAVY_REPLY_RE.test(t)) return true;
  return false;
}

export function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2000, words * 380 + 800);
}

export function speakProcessingBridge(onEnd?: () => void): () => void {
  return speakShepherdLine(PROCESSING_BRIDGE, { onEnd });
}

/** Resolve after Philip finishes the processing bridge line (or immediately if TTS fails). */
export function waitForProcessingBridge(): Promise<void> {
  return new Promise((resolve) => {
    speakProcessingBridge(() => resolve());
  });
}

export type SubmitBridgeKind = "entry" | "phase1Reply";

/** Bridge removed — breath pulse is the visual signal; no audio filler between speech and reply. */
export function waitForSubmitBridge(_kind: SubmitBridgeKind, _replyText?: string): Promise<void> {
  return Promise.resolve();
}

/** Speak Philip's line, then hand off to mic — with iOS-safe fallback if onended never fires. */
export function speakShepherdWithMicHandoff(
  text: string,
  opts: {
    onStart?: () => void;
    onSpeakingEnd?: () => void;
    onHandoff: () => void;
    handoffDelayMs?: number;
    prefetchedBlob?: Blob | null;
  },
): () => void {
  let handoffScheduled = false;
  const handoffDelay = opts.handoffDelayMs ?? VOICE_MIC_HANDOFF_PHASE1_MS;
  const scheduleHandoff = () => {
    if (handoffScheduled) return;
    handoffScheduled = true;
    window.setTimeout(opts.onHandoff, handoffDelay);
  };
  const fallbackMs = estimateSpeechMs(text) + 1500;
  const fallbackTimer = window.setTimeout(() => {
    opts.onSpeakingEnd?.();
    scheduleHandoff();
  }, fallbackMs);
  const cancelSpeak = speakShepherdLine(text, {
    prefetchedBlob: opts.prefetchedBlob,
    onStart: opts.onStart,
    onEnd: () => {
      window.clearTimeout(fallbackTimer);
      opts.onSpeakingEnd?.();
      scheduleHandoff();
    },
    onFail: () => {
      window.clearTimeout(fallbackTimer);
      opts.onSpeakingEnd?.();
      scheduleHandoff();
    },
  });
  return () => {
    window.clearTimeout(fallbackTimer);
    cancelSpeak();
  };
}

/** Like speakShepherdWithMicHandoff but uses the streaming TTS path (~300ms TTFB). */
export function speakShepherdStreamWithMicHandoff(
  text: string,
  opts: {
    onStart?: () => void;
    onSpeakingEnd?: () => void;
    onHandoff: () => void;
    handoffDelayMs?: number;
    isPro?: boolean;
  },
): () => void {
  let handoffScheduled = false;
  const handoffDelay = opts.handoffDelayMs ?? VOICE_MIC_HANDOFF_PHASE1_MS;
  const scheduleHandoff = () => {
    if (handoffScheduled) return;
    handoffScheduled = true;
    window.setTimeout(opts.onHandoff, handoffDelay);
  };
  const fallbackMs = estimateSpeechMs(text) + 1500;
  const fallbackTimer = window.setTimeout(() => {
    opts.onSpeakingEnd?.();
    scheduleHandoff();
  }, fallbackMs);
  const cancelSpeak = speakShepherdStream(text, {
    isPro: opts.isPro,
    onStart: opts.onStart,
    onEnd: () => {
      window.clearTimeout(fallbackTimer);
      opts.onSpeakingEnd?.();
      scheduleHandoff();
    },
    onFail: () => {
      window.clearTimeout(fallbackTimer);
      opts.onSpeakingEnd?.();
      scheduleHandoff();
    },
  });
  return () => {
    window.clearTimeout(fallbackTimer);
    cancelSpeak();
  };
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
  messages?: Array<{ role: string; content: string }>,
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
      messages: messages?.length
        ? messages.map((m) => ({ role: m.role, content: m.content }))
        : undefined,
    }),
  }).catch(() => {});
}
