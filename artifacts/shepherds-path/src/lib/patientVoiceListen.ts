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
  /** Listener stopped without submitting (getUserMedia failed, nothing captured, or forceStop) */
  onListenEnd?: () => void;
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
const FALLBACK_AUTO_SUBMIT_MS = 1_200;
const DEFAULT_MIN_CHARS = 8;
const SPOKEN_PATIENCE_MAX_WORDS = 12;
const SR_STALL_MS = 2000;
const STALL_EXTEND_COOLDOWN_MS = 2000;
const SILENCE_POLL_MS = 350;
const MAX_SR_STALL_EXTENDS = 3;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function dynamicPauseMs(words: number): number {
  if (words < 20) return 1800;
  if (words < 60) return 1600;
  return 1500;
}

function resolveConversationalAutoSubmitMs(words: number, override?: number): number {
  if (override != null) return override;
  if (words >= 80) return 1500;
  if (words >= 40) return 1600;
  if (words >= 20) return 1700;
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
  let latestInterim = "";
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
  let hardTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let silencePoll: ReturnType<typeof setInterval> | null = null;
  let stallExtendCount = 0;
  let absoluteMaxTimer: ReturnType<typeof setTimeout> | null = null;

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
    const words = wordCount(previewTranscript);
    const autoMs = resolveConversationalAutoSubmitMs(words, opts.autoSubmitSilenceMs);
    const silentFor = now - lastSpeechAt;
    // User has been quiet long enough — let the silence poll submit, don't extend.
    if (hasEnoughToSubmit() && silentFor >= autoMs) return;
    // Cap extensions so ambient audio can't block handoff indefinitely.
    if (stallExtendCount >= MAX_SR_STALL_EXTENDS) return;
    if (silentFor < SR_STALL_MS) return;
    if (now - lastStallExtendAt < STALL_EXTEND_COOLDOWN_MS) return;
    const bytes = totalAudioBytes();
    // Raise threshold well above room-tone/ambient noise byte rate.
    if (bytes < audioBytesAtLastSpeech + 6000) return;
    stallExtendCount += 1;
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
    if (hardTimeoutTimer) clearTimeout(hardTimeoutTimer);
    thinkingTimer = null;
    takeYourTimeTimer = null;
    readyTimer = null;
    restartTimer = null;
    hardTimeoutTimer = null;
  };

  const clearAbsoluteMax = () => {
    if (absoluteMaxTimer) clearTimeout(absoluteMaxTimer);
    absoluteMaxTimer = null;
  };

  const clearSilencePoll = () => {
    if (silencePoll) clearInterval(silencePoll);
    silencePoll = null;
  };

  const pollSilenceAndSubmit = () => {
    if (!active || autoSubmitFired || !opts.conversational) return;
    if (!hasEnoughToSubmit()) return;
    const words = wordCount(previewTranscript);
    const autoMs = resolveConversationalAutoSubmitMs(words, opts.autoSubmitSilenceMs);
    if (Date.now() - lastSpeechAt >= autoMs) {
      triggerAutoSubmit();
    }
  };

  const startSilencePoll = () => {
    clearSilencePoll();
    silencePoll = setInterval(pollSilenceAndSubmit, SILENCE_POLL_MS);
  };

  const setPhase = (phase: VoiceListenUiPhase) => {
    opts.onPhaseChange?.(phase);
  };

  const effectivePreview = () =>
    previewTranscript.trim() || latestInterim.trim();

  const hasEnoughToSubmit = (): boolean => {
    const min = opts.minCharsForAutoSubmit ?? DEFAULT_MIN_CHARS;
    return effectivePreview().length >= min || audioChunks.length > 0;
  };

  const pushPreview = (final: string, interim: string) => {
    const display = (final + (interim ? ` ${interim}` : "")).trim();
    opts.onTranscript(final, interim);
    if (display) previewTranscript = final || display;
    latestInterim = interim;
  };

  // Shared teardown — always notifies GuidancePage so mic UI never stays stuck.
  const endListening = (notifyListenEnd: boolean) => {
    userStopped = true;
    active = false;
    clearTimers();
    clearSilencePoll();
    clearAbsoluteMax();
    teardownTurnService();
    try { rec?.stop(); } catch { /* noop */ }
    rec = null;
    void waitForRecorderStop();
    if (notifyListenEnd) opts.onListenEnd?.();
  };

  const forceStop = () => {
    // Called when nothing was captured — stop mic and notify UI to reset.
    if (!active) return;
    endListening(true);
  };

  const triggerAutoSubmit = () => {
    if (autoSubmitFired || !active) return;
    if (!hasEnoughToSubmit()) {
      if (!hardTimeoutTimer) {
        hardTimeoutTimer = setTimeout(() => {
          hardTimeoutTimer = null;
          if (!active) return;
          if (hasEnoughToSubmit()) triggerAutoSubmit();
          else forceStop();
        }, 1500);
      }
      return;
    }
    autoSubmitFired = true;
    // Don't set active=false yet — defer until after waitForRecorderStop so
    // absoluteMax can't fire a second submit and onAutoSubmit is guaranteed.
    clearTimers();
    clearSilencePoll();
    teardownTurnService();
    try { rec?.stop(); } catch { /* noop */ }
    rec = null;
    void waitForRecorderStop()
      .then(() => { endListening(false); opts.onAutoSubmit?.(); })
      .catch(() => { endListening(false); opts.onAutoSubmit?.(); });
  };

  // ---------------------------------------------------------------------------
  // Fallback timers — used when Smart Turn WS is not available
  // ---------------------------------------------------------------------------
  const scheduleFallbackTimers = () => {
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
            // If turn_complete doesn't arrive within 2.5s, submit anyway.
            // Protects against turn-service crashes or silent failures.
            if (!hardTimeoutTimer) {
              hardTimeoutTimer = setTimeout(() => {
                hardTimeoutTimer = null;
                if (active && !autoSubmitFired) triggerAutoSubmit();
              }, 2500);
            }
          } else if (msg.event === "turn_complete") {
            if (hardTimeoutTimer) { clearTimeout(hardTimeoutTimer); hardTimeoutTimer = null; }
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
        if (active && !autoSubmitFired) scheduleFallbackTimers();
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
      // Always reschedule SR-based silence timer — runs regardless of turn-service state.
      // This ensures handoff happens even when turn-service never sends speech_end/turn_complete.
      scheduleFallbackTimers();
    };

    recognition.onspeechend = () => {
      if (!active || userStopped) return;
      // Don't reset lastSpeechAt — iOS spams onspeechend and would push the
      // silence window forward, preventing handoff. Just reschedule timers.
      scheduleFallbackTimers();
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
      // getUserMedia was blocked (iOS transient activation expired, or permission denied).
      // Fire onListenEnd so the caller can clean up entryMicLive and heartVoiceRef.
      endListening(true);
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
      stallExtendCount = 0;
      setPhase("listening");
      void startMedia();
      if (canPreview) {
        bindRecognition();
        try { rec?.start(); } catch { /* recording-only fallback */ }
      }
      // Always start fallback timers immediately; Smart Turn cancels them if it connects
      scheduleFallbackTimers();
      startSilencePoll();
      // Absolute safety net — mic can never stay open longer than 25s.
      absoluteMaxTimer = setTimeout(() => {
        absoluteMaxTimer = null;
        if (!active || autoSubmitFired) return;
        if (hasEnoughToSubmit()) triggerAutoSubmit();
        else forceStop();
      }, 25_000);
    },
    stop() {
      if (!active) return effectivePreview();
      endListening(false);
      return effectivePreview();
    },
    hasRecordedAudio() {
      return audioChunks.length > 0;
    },
    getPreview() {
      return effectivePreview();
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
      finalizing = false;
      autoSubmitFired = true;
      if (active) endListening(false);
      void waitForRecorderStop().finally(() => {
        audioChunks = [];
        previewTranscript = "";
        latestInterim = "";
      });
    },
  };
}
