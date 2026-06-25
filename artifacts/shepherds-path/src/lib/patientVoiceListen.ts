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
  /** MediaRecorder actually started or stopped — drives live mic UI */
  onMicLive?: (live: boolean) => void;
  conversational?: boolean;
  autoSubmitSilenceMs?: number;
  minCharsForAutoSubmit?: number;
  /** Spoken "Take your time" — off for entry; gated by word count when on */
  spokenPatienceBridge?: boolean;
  lang?: string;
  /** Pre-acquired MediaStream — skip getUserMedia; caller owns + cleans up tracks. */
  preAcquiredStream?: MediaStream;
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
const MIN_AUDIO_BYTES_FOR_HANDOFF = 2_500;
const POST_SPEECH_SUBMIT_MS = 850;
const ANALYSER_POLL_MS = 120;
/** Time-domain RMS above this ≈ user speaking (0–100 scale). */
const RMS_SPEECH_THRESHOLD = 6;
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

function preferLocalSilenceDetection(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isLiveMediaStream(stream: MediaStream | null | undefined): boolean {
  return !!stream?.getTracks().some((t) => t.readyState === "live" && t.enabled);
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
  let recordingTimersArmed = false;
  let previewCharsAtLastExtend = 0;
  let lastFinalSpeechAt = 0;
  let postSpeechSubmitTimer: ReturnType<typeof setTimeout> | null = null;
  let userSpeechDetected = false;
  let analyserCtx: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let analyserSource: MediaStreamAudioSourceNode | null = null;
  let analyserPoll: ReturnType<typeof setInterval> | null = null;
  let analyserBuf: Uint8Array | null = null;

  const armRecordingTimers = () => {
    if (recordingTimersArmed || !active) return;
    recordingTimersArmed = true;
    scheduleFallbackTimers();
    startSilencePoll();
    absoluteMaxTimer = setTimeout(() => {
      absoluteMaxTimer = null;
      if (!active || autoSubmitFired) return;
      if (hasEnoughToSubmit()) triggerAutoSubmit();
      else forceStop();
    }, 25_000);
  };
  let turnWs: WebSocket | null = null;
  let audioCtx: AudioContext | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let mediaSource: MediaStreamAudioSourceNode | null = null;
  let turnServiceReady = false;

  const totalAudioBytes = () =>
    audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);

  const hasCapturedUserSpeech = (): boolean =>
    userSpeechDetected
    || lastFinalSpeechAt > 0
    || wordCount(previewTranscript) > 0
    || latestInterim.trim().length >= 4;

  const rmsFromAnalyser = (): number => {
    if (!analyserNode || !analyserBuf) return 0;
    analyserNode.getByteTimeDomainData(analyserBuf);
    let sum = 0;
    for (let i = 0; i < analyserBuf.length; i++) {
      const v = (analyserBuf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / analyserBuf.length) * 100;
  };

  const startAnalyserSilence = (micStream: MediaStream) => {
    if (!opts.conversational) return;
    try {
      analyserCtx = new AudioContext();
      void analyserCtx.resume();
      analyserSource = analyserCtx.createMediaStreamSource(micStream);
      analyserNode = analyserCtx.createAnalyser();
      analyserNode.fftSize = 512;
      analyserSource.connect(analyserNode);
      analyserBuf = new Uint8Array(analyserNode.fftSize);

      analyserPoll = setInterval(() => {
        if (!active || autoSubmitFired) return;
        const rms = rmsFromAnalyser();
        if (rms >= RMS_SPEECH_THRESHOLD) {
          userSpeechDetected = true;
          markSpeechActivity(true);
          return;
        }
        if (!userSpeechDetected || !hasEnoughToSubmit()) return;
        const words = wordCount(previewTranscript);
        const autoMs = resolveConversationalAutoSubmitMs(words, opts.autoSubmitSilenceMs);
        const anchor = lastFinalSpeechAt > 0 ? lastFinalSpeechAt : lastSpeechAt;
        if (Date.now() - anchor >= autoMs) {
          triggerAutoSubmit();
        }
      }, ANALYSER_POLL_MS);
    } catch {
      /* analyser unavailable — silence poll + SR fallback */
    }
  };

  const teardownAnalyser = () => {
    if (analyserPoll) clearInterval(analyserPoll);
    analyserPoll = null;
    analyserBuf = null;
    try { analyserSource?.disconnect(); } catch { /* noop */ }
    try { analyserNode?.disconnect(); } catch { /* noop */ }
    try { analyserCtx?.close(); } catch { /* noop */ }
    analyserSource = null;
    analyserNode = null;
    analyserCtx = null;
  };

  const markSpeechActivity = (fromFinal = true) => {
    const now = Date.now();
    if (fromFinal) lastFinalSpeechAt = now;
    // Interim-only updates must not block handoff after the user stops (iOS room tone).
    if (fromFinal || now - lastFinalSpeechAt < 2_500) {
      lastSpeechAt = now;
    }
    audioBytesAtLastSpeech = totalAudioBytes();
    clearPostSpeechSubmit();
  };

  const clearPostSpeechSubmit = () => {
    if (postSpeechSubmitTimer) clearTimeout(postSpeechSubmitTimer);
    postSpeechSubmitTimer = null;
  };

  const schedulePostSpeechSubmit = (delayMs = POST_SPEECH_SUBMIT_MS) => {
    clearPostSpeechSubmit();
    postSpeechSubmitTimer = setTimeout(() => {
      postSpeechSubmitTimer = null;
      if (active && !autoSubmitFired) triggerAutoSubmit();
    }, delayMs);
  };

  const maybeExtendForSrStall = (chunkSize: number) => {
    // Conversational handoff uses silence/VAD — ambient MediaRecorder growth must not extend.
    if (opts.conversational) return;
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
    // Conversational: don't extend on room tone if the live preview hasn't grown.
    const previewLen = effectivePreview().length;
    if (opts.conversational && previewLen <= previewCharsAtLastExtend && previewLen < (opts.minCharsForAutoSubmit ?? DEFAULT_MIN_CHARS)) {
      return;
    }
    stallExtendCount += 1;
    lastStallExtendAt = now;
    previewCharsAtLastExtend = previewLen;
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

  const clearUiTimers = () => {
    if (thinkingTimer) clearTimeout(thinkingTimer);
    if (takeYourTimeTimer) clearTimeout(takeYourTimeTimer);
    thinkingTimer = null;
    takeYourTimeTimer = null;
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
    const anchor = lastFinalSpeechAt > 0 ? lastFinalSpeechAt : lastSpeechAt;
    if (Date.now() - anchor >= autoMs) {
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
    if (!hasCapturedUserSpeech()) return false;
    const min = opts.minCharsForAutoSubmit ?? DEFAULT_MIN_CHARS;
    const preview = effectivePreview();
    if (preview.length >= min) return true;
    if (opts.conversational && totalAudioBytes() >= MIN_AUDIO_BYTES_FOR_HANDOFF) return true;
    return false;
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
    recordingTimersArmed = false;
    clearTimers();
    clearSilencePoll();
    clearAbsoluteMax();
    clearPostSpeechSubmit();
    teardownAnalyser();
    teardownTurnService();
    try { rec?.stop(); } catch { /* noop */ }
    rec = null;
    opts.onMicLive?.(false);
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
    clearPostSpeechSubmit();
    teardownAnalyser();
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
    // iOS WebView: remote VAD false-positives block handoff — use local analyser instead.
    if (!opts.conversational || preferLocalSilenceDetection()) return;

    try {
      const ws = new WebSocket(turnServiceUrl());
      turnWs = ws;

      ws.onopen = () => { /* wait for "ready" event */ };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { event: string };
          if (msg.event === "ready") {
            turnServiceReady = true;
            clearUiTimers();
            void startPCMStream(micStream).then((ok) => {
              if (!ok && active && !autoSubmitFired) scheduleFallbackTimers();
            });
            // Keep browser silence timers as backup — Smart Turn can miss on some devices.
            scheduleFallbackTimers();
          } else if (msg.event === "speech_start") {
            markSpeechActivity(true);
            takeYourTimeFired = false;
            setPhase("listening");
          } else if (msg.event === "speech_end") {
            setPhase("thinking");
            schedulePostSpeechSubmit(POST_SPEECH_SUBMIT_MS);
            if (!hardTimeoutTimer) {
              hardTimeoutTimer = setTimeout(() => {
                hardTimeoutTimer = null;
                if (active && !autoSubmitFired) triggerAutoSubmit();
              }, 1_800);
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

  const startPCMStream = async (micStream: MediaStream): Promise<boolean> => {
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
      return true;
    } catch {
      // AudioWorklet failed (e.g. Firefox without support) — keep fallback timers
      return false;
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
    // Don't stop pre-acquired tracks — the caller owns and manages that stream's lifetime.
    if (!opts.preAcquiredStream) {
      stream?.getTracks().forEach((t) => t.stop());
    }
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
        userSpeechDetected = true;
        markSpeechActivity(true);
        takeYourTimeFired = false;
        setPhase("listening");
        pushPreview(previewTranscript, interim);
        scheduleFallbackTimers();
      } else if (interim.trim().length >= 4) {
        userSpeechDetected = true;
        markSpeechActivity(false);
        setPhase("listening");
        pushPreview(previewTranscript, interim);
      }
    };

    recognition.onspeechend = () => {
      if (!active || userStopped) return;
      scheduleFallbackTimers();
      if (opts.conversational && hasEnoughToSubmit()) {
        schedulePostSpeechSubmit(POST_SPEECH_SUBMIT_MS);
      }
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
    if (!canRecord) {
      endListening(true);
      return;
    }
    try {
      stream = opts.preAcquiredStream && isLiveMediaStream(opts.preAcquiredStream)
        ? opts.preAcquiredStream
        : await navigator.mediaDevices.getUserMedia({
          audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
        });
      audioChunks = [];
      mimeType = pickGuidanceAudioMimeType();
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
          if (opts.conversational && e.data.size > 500) {
            userSpeechDetected = true;
          }
          maybeExtendForSrStall(e.data.size);
        }
      };
      mediaRecorder.start(1000);
      opts.onMicLive?.(true);
      armRecordingTimers();
      startAnalyserSilence(stream);

      // Desktop fallback: remote VAD when not on iOS
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
      userSpeechDetected = false;
      lastFinalSpeechAt = 0;
      previewCharsAtLastExtend = 0;
      recordingTimersArmed = false;
      setPhase("listening");
      if (!canRecord) {
        if (!canPreview) {
          endListening(true);
          return;
        }
        armRecordingTimers();
      }
      void startMedia();
      if (canPreview) {
        bindRecognition();
        try { rec?.start(); } catch { /* recording-only fallback */ }
      }
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
