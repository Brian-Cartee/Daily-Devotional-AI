/** Hybrid voice capture — MediaRecorder + Whisper (truth), SpeechRecognition (live preview).
 *  Turn detection: Smart Turn WebSocket service (primary) → silence timer (fallback).
 */

import { pickGuidanceAudioMimeType, transcribeGuidanceAudio } from "@/lib/guidanceTranscribe";

export type VoiceListenUiPhase = "listening" | "thinking" | "ready";

export type PatientVoiceListener = {
  start: () => void;
  stop: () => string;
  hasRecordedAudio: () => boolean;
  getPreview: () => string;
  finalizeTranscript: () => Promise<string>;
  isActive: () => boolean;
  isFinalizing: () => boolean;
  destroy: () => void;
};

export type PatientVoiceOptions = {
  onTranscript: (final: string, interim: string) => void;
  onPhaseChange?: (phase: VoiceListenUiPhase) => void;
  onTakeYourTime?: () => void;
  /** Non-conversational: show manual continue affordance */
  onReadyPrompt?: () => void;
  /** Conversational: auto-handoff after sustained silence */
  onAutoSubmit?: () => void;
  conversational?: boolean;
  autoSubmitSilenceMs?: number;
  minCharsForAutoSubmit?: number;
  /** Spoken "Take your time" — off for entry; gated by word count when on */
  spokenPatienceBridge?: boolean;
  lang?: string;
};

// ---------------------------------------------------------------------------
// Turn service WebSocket URL
// ---------------------------------------------------------------------------
function turnServiceUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}/ws/turn`;
}

// ---------------------------------------------------------------------------
// Fallback silence constants (used when WebSocket unavailable)
// ---------------------------------------------------------------------------
const FALLBACK_AUTO_SUBMIT_MS = 3_000;   // was 10s; short fallback silence
const DEFAULT_MIN_CHARS = 8;
const SPOKEN_PATIENCE_MAX_WORDS = 12;
const SR_STALL_MS = 2500;
const STALL_EXTEND_COOLDOWN_MS = 2500;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function dynamicPauseMs(words: number): number {
  if (words < 20) return 3500;
  if (words < 60) return 2500;
  return 2000;
}

function resolveConversationalAutoSubmitMs(words: number, override?: number): number {
  if (override != null) return override;
  if (words >= 80) return 2500;
  if (words >= 40) return 3000;
  if (words >= 20) return 3500;
  return FALLBACK_AUTO_SUBMIT_MS;
}

export function createPatientVoiceListener(opts: PatientVoiceOptions): PatientVoiceListener | null {
  if (typeof window === "undefined") return null;

  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const canPreview = !!SR;
  const canRecord = typeof navigator !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== "undefined";

  if (!canPreview && !canRecord) return null;

  let rec: InstanceType<NonNullable<typeof SR>> | null = null;
  let previewTranscript = "";
  let active = false;
  let userStopped = false;
  let finalizing = false;
  let autoSubmitFired = false;
  let takeYourTimeFired = false;
  let thinkingTimer: ReturnType<typeof setTimeout> | null = null;
  let takeYourTimeTimer: ReturnType<typeof setTimeout> | null = null;
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  let stream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let mimeType = pickGuidanceAudioMimeType();
  let recorderStopPromise: Promise<void> | null = null;
  let lastSpeechAt = 0;
  let audioBytesAtLastSpeech = 0;
  let lastStallExtendAt = 0;

  // Smart Turn WebSocket + AudioWorklet state
  let turnWs: WebSocket | null = null;
  let audioCtx: AudioContext | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let mediaSource: MediaStreamAudioSourceNode | null = null;
  let turnServiceReady = false;

  const totalAudioBytes = () =>
    audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);

  const markSpeechActivity = () => {
    lastSpeechAt = Date.now();
    audioBytesAtLastSpeech = totalAudioBytes();
  };

  const maybeExtendForSrStall = (chunkSize: number) => {
    if (!active || chunkSize < 200) return;
    const now = Date.now();
    if (now - lastSpeechAt < SR_STALL_MS) return;
    if (now - lastStallExtendAt < STALL_EXTEND_COOLDOWN_MS) return;
    const bytes = totalAudioBytes();
    if (bytes < audioBytesAtLastSpeech + 1500) return;
    lastStallExtendAt = now;
    lastSpeechAt = now;
    takeYourTimeFired = false;
    setPhase("listening");
    scheduleFallbackTimers();
  };

  const clearTimers = () => {
    if (thinkingTimer) clearTimeout(thinkingTimer);
    if (takeYourTimeTimer) clearTimeout(takeYourTimeTimer);
    if (readyTimer) clearTimeout(readyTimer);
    if (restartTimer) clearTimeout(restartTimer);
    thinkingTimer = null;
    takeYourTimeTimer = null;
    readyTimer = null;
    restartTimer = null;
  };

  const setPhase = (phase: VoiceListenUiPhase) => {
    opts.onPhaseChange?.(phase);
  };

  const hasEnoughToSubmit = (): boolean => {
    const min = opts.minCharsForAutoSubmit ?? DEFAULT_MIN_CHARS;
    return previewTranscript.trim().length >= min || audioChunks.length > 0;
  };

  const pushPreview = (final: string, interim: string) => {
    const display = (final + (interim ? ` ${interim}` : "")).trim();
    opts.onTranscript(final, interim);
    if (display) previewTranscript = final || display;
  };

  const triggerAutoSubmit = () => {
    if (autoSubmitFired || !active) return;
    if (!hasEnoughToSubmit()) return;
    autoSubmitFired = true;
    userStopped = true;
    active = false;
    clearTimers();
    teardownTurnService();
    try { rec?.stop(); } catch { /* noop */ }
    rec = null;
    void waitForRecorderStop().then(() => {
      opts.onAutoSubmit?.();
    });
  };

  // ---------------------------------------------------------------------------
  // Fallback timers — used when Smart Turn WS is not available
  // ---------------------------------------------------------------------------
  const scheduleFallbackTimers = () => {
    if (turnServiceReady) return; // Smart Turn is handling it
    clearTimers();
    if (!active) return;
    const words = wordCount(previewTranscript);
    const base = dynamicPauseMs(words);
    const autoMs = opts.conversational
      ? resolveConversationalAutoSubmitMs(words, opts.autoSubmitSilenceMs)
      : (opts.autoSubmitSilenceMs ?? FALLBACK_AUTO_SUBMIT_MS);

    thinkingTimer = setTimeout(() => {
      if (!active) return;
      setPhase("thinking");
    }, Math.min(3000, base));

    if (opts.spokenPatienceBridge !== false && opts.onTakeYourTime) {
      takeYourTimeTimer = setTimeout(() => {
        if (!active || takeYourTimeFired) return;
        if (wordCount(previewTranscript) >= SPOKEN_PATIENCE_MAX_WORDS) return;
        if (Date.now() - lastSpeechAt < 5000) return;
        takeYourTimeFired = true;
        opts.onTakeYourTime?.();
      }, 6000);
    }

    readyTimer = setTimeout(() => {
      if (!active || autoSubmitFired) return;
      if (opts.conversational) {
        triggerAutoSubmit();
        return;
      }
      setPhase("ready");
      opts.onReadyPrompt?.();
    }, opts.conversational ? autoMs : 10_000);
  };

  // ---------------------------------------------------------------------------
  // Smart Turn WebSocket
  // ---------------------------------------------------------------------------
  const setupTurnService = (micStream: MediaStream) => {
    if (!opts.conversational) return; // only for conversational mode

    try {
      const ws = new WebSocket(turnServiceUrl());
      turnWs = ws;

      ws.onopen = () => { /* wait for "ready" event */ };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { event: string };
          if (msg.event === "ready") {
            turnServiceReady = true;
            clearTimers(); // cancel fallback timers — Smart Turn is live
            startPCMStream(micStream);
          } else if (msg.event === "speech_start") {
            markSpeechActivity();
            takeYourTimeFired = false;
            setPhase("listening");
          } else if (msg.event === "speech_end") {
            setPhase("thinking");
          } else if (msg.event === "turn_complete") {
            if (active && !autoSubmitFired) {
              triggerAutoSubmit();
            }
          }
        } catch { /* noop */ }
      };

      ws.onerror = () => {
        // Smart Turn unavailable — fall through to silence timers
        turnServiceReady = false;
        scheduleFallbackTimers();
      };

      ws.onclose = () => {
        turnServiceReady = false;
      };

      // Give the WS 1.5s to connect; if it doesn't, start fallback
      setTimeout(() => {
        if (!turnServiceReady && active) {
          scheduleFallbackTimers();
        }
      }, 1500);

    } catch {
      scheduleFallbackTimers();
    }
  };

  const startPCMStream = async (micStream: MediaStream) => {
    try {
      audioCtx = new AudioContext({ sampleRate: 16000 });
      await audioCtx.audioWorklet.addModule("/pcm-processor.js");
      workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
      mediaSource = audioCtx.createMediaStreamSource(micStream);
      mediaSource.connect(workletNode);
      workletNode.connect(audioCtx.destination);

      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (turnWs?.readyState === WebSocket.OPEN) {
          turnWs.send(e.data);
        }
      };
    } catch {
      // AudioWorklet failed (e.g. Firefox without support) — keep fallback timers
    }
  };

  const teardownTurnService = () => {
    try { workletNode?.disconnect(); } catch { /* noop */ }
    try { mediaSource?.disconnect(); } catch { /* noop */ }
    try { audioCtx?.close(); } catch { /* noop */ }
    try { turnWs?.close(); } catch { /* noop */ }
    workletNode = null;
    mediaSource = null;
    audioCtx = null;
    turnWs = null;
    turnServiceReady = false;
  };

  // ---------------------------------------------------------------------------
  // MediaRecorder (unchanged — collects webm for Whisper)
  // ---------------------------------------------------------------------------
  const stopTracks = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    mediaRecorder = null;
  };

  const waitForRecorderStop = (): Promise<void> => {
    if (recorderStopPromise) return recorderStopPromise;
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      stopTracks();
      return Promise.resolve();
    }
    const recorder = mediaRecorder;
    recorderStopPromise = new Promise<void>((resolve) => {
      recorder.onstop = () => {
        stopTracks();
        recorderStopPromise = null;
        resolve();
      };
      try {
        recorder.stop();
      } catch {
        stopTracks();
        recorderStopPromise = null;
        resolve();
      }
    });
    return recorderStopPromise;
  };

  // ---------------------------------------------------------------------------
  // SpeechRecognition (live transcript preview)
  // ---------------------------------------------------------------------------
  const bindRecognition = () => {
    if (!canPreview || !SR) return;
    const recognition = new SR();
    rec = recognition;
    recognition.lang = opts.lang ?? "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (e: any) => {
      let interim = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) finalChunk += piece;
        else interim += piece;
      }
      if (finalChunk) {
        previewTranscript = (previewTranscript ? `${previewTranscript} ${finalChunk}` : finalChunk).trim();
      }
      if (finalChunk || interim) markSpeechActivity();
      takeYourTimeFired = false;
      autoSubmitFired = false;
      setPhase("listening");
      pushPreview(previewTranscript, interim);
      // Only reschedule fallback timers; Smart Turn handles conversational submit
      if (!turnServiceReady) scheduleFallbackTimers();
    };

    recognition.onend = () => {
      rec = null;
      if (!active || userStopped) return;
      restartTimer = setTimeout(() => {
        if (!active || userStopped || rec) return;
        try {
          bindRecognition();
          rec?.start();
        } catch {
          restartTimer = setTimeout(() => {
            if (!active || userStopped || rec) return;
            try { bindRecognition(); rec?.start(); } catch { /* preview unavailable */ }
          }, 400);
        }
      }, 120);
    };

    recognition.onerror = () => {
      rec = null;
      if (!active || userStopped) return;
      restartTimer = setTimeout(() => {
        if (!active || userStopped || rec) return;
        try { bindRecognition(); rec?.start(); } catch { /* noop */ }
      }, 500);
    };
  };

  const startMedia = async () => {
    if (!canRecord) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      });
      audioChunks = [];
      mimeType = pickGuidanceAudioMimeType();
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
          maybeExtendForSrStall(e.data.size);
        }
      };
      mediaRecorder.start(1000);

      // Start Smart Turn service (passes same stream for PCM; MediaRecorder keeps webm)
      setupTurnService(stream);
    } catch {
      stopTracks();
    }
  };

  return {
    start() {
      if (active) return;
      active = true;
      userStopped = false;
      autoSubmitFired = false;
      previewTranscript = "";
      audioChunks = [];
      recorderStopPromise = null;
      takeYourTimeFired = false;
      lastSpeechAt = Date.now();
      audioBytesAtLastSpeech = 0;
      lastStallExtendAt = 0;
      setPhase("listening");
      void startMedia();
      if (canPreview) {
        bindRecognition();
        try { rec?.start(); } catch { /* recording-only fallback */ }
      }
      // Always start fallback timers immediately; Smart Turn cancels them if it connects
      scheduleFallbackTimers();
    },
    stop() {
      userStopped = true;
      active = false;
      clearTimers();
      teardownTurnService();
      try { rec?.stop(); } catch { /* noop */ }
      rec = null;
      void waitForRecorderStop();
      return previewTranscript.trim();
    },
    hasRecordedAudio() {
      return audioChunks.length > 0;
    },
    getPreview() {
      return previewTranscript.trim();
    },
    async finalizeTranscript() {
      await waitForRecorderStop();
      const preview = previewTranscript.trim();
      if (audioChunks.length === 0) return preview;
      const blob = new Blob(audioChunks, { type: mimeType });
      if (blob.size < 200) return preview;
      finalizing = true;
      try {
        const whisper = await transcribeGuidanceAudio(blob, mimeType);
        return whisper.trim() || preview;
      } catch {
        return preview;
      } finally {
        finalizing = false;
        audioChunks = [];
      }
    },
    isActive() {
      return active;
    },
    isFinalizing() {
      return finalizing;
    },
    destroy() {
      userStopped = true;
      active = false;
      finalizing = false;
      autoSubmitFired = true;
      clearTimers();
      teardownTurnService();
      try { rec?.stop(); } catch { /* noop */ }
      rec = null;
      void waitForRecorderStop().finally(() => {
        audioChunks = [];
        previewTranscript = "";
      });
    },
  };
}
