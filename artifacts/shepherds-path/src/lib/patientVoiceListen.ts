/** Hybrid voice capture — MediaRecorder + Whisper (truth), SpeechRecognition (live preview). */

import { pickGuidanceAudioMimeType, transcribeGuidanceAudio } from "@/lib/guidanceTranscribe";

export type VoiceListenUiPhase = "listening" | "thinking" | "ready";

export type PatientVoiceListener = {
  start: () => void;
  /** Stop capture; returns live preview text (may be refined on finalize). */
  stop: () => string;
  /** Whisper transcript when audio exists; falls back to preview. */
  finalizeTranscript: () => Promise<string>;
  isActive: () => boolean;
  isFinalizing: () => boolean;
  destroy: () => void;
};

export type PatientVoiceOptions = {
  onTranscript: (final: string, interim: string) => void;
  onPhaseChange?: (phase: VoiceListenUiPhase) => void;
  onTakeYourTime?: () => void;
  onReadyPrompt?: () => void;
  lang?: string;
};

function dynamicPauseMs(wordCount: number): number {
  if (wordCount < 20) return 3500;
  if (wordCount < 60) return 2500;
  return 2000;
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
  let takeYourTimeFired = false;
  let thinkingTimer: ReturnType<typeof setTimeout> | null = null;
  let takeYourTimeTimer: ReturnType<typeof setTimeout> | null = null;
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  let stream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let mimeType = pickGuidanceAudioMimeType();

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

  const pushPreview = (final: string, interim: string) => {
    const display = (final + (interim ? ` ${interim}` : "")).trim();
    opts.onTranscript(final, interim);
    if (display) previewTranscript = final || display;
  };

  const scheduleSilenceTimers = () => {
    clearTimers();
    if (!active) return;
    const words = previewTranscript.split(/\s+/).filter(Boolean).length;
    const base = dynamicPauseMs(words);

    thinkingTimer = setTimeout(() => {
      if (!active) return;
      setPhase("thinking");
    }, Math.min(3000, base));

    takeYourTimeTimer = setTimeout(() => {
      if (!active || takeYourTimeFired) return;
      takeYourTimeFired = true;
      opts.onTakeYourTime?.();
    }, 6000);

    readyTimer = setTimeout(() => {
      if (!active) return;
      setPhase("ready");
      opts.onReadyPrompt?.();
    }, 10000);
  };

  const stopMedia = () => {
    try {
      if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    } catch {
      /* noop */
    }
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    mediaRecorder = null;
  };

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
      takeYourTimeFired = false;
      setPhase("listening");
      pushPreview(previewTranscript, interim);
      scheduleSilenceTimers();
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
            try {
              bindRecognition();
              rec?.start();
            } catch {
              /* preview unavailable — recording continues */
            }
          }, 400);
        }
      }, 120);
    };

    recognition.onerror = () => {
      rec = null;
      if (!active || userStopped) return;
      restartTimer = setTimeout(() => {
        if (!active || userStopped || rec) return;
        try {
          bindRecognition();
          rec?.start();
        } catch {
          /* noop */
        }
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
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.start(1000);
    } catch {
      stopMedia();
    }
  };

  return {
    start() {
      if (active) return;
      active = true;
      userStopped = false;
      previewTranscript = "";
      audioChunks = [];
      takeYourTimeFired = false;
      setPhase("listening");
      void startMedia();
      if (canPreview) {
        bindRecognition();
        try {
          rec?.start();
        } catch {
          /* recording-only fallback */
        }
      }
      scheduleSilenceTimers();
    },
    stop() {
      userStopped = true;
      active = false;
      clearTimers();
      try {
        rec?.stop();
      } catch {
        /* noop */
      }
      rec = null;
      stopMedia();
      return previewTranscript.trim();
    },
    async finalizeTranscript() {
      const preview = previewTranscript.trim();
      if (audioChunks.length === 0) return preview;
      const blob = new Blob(audioChunks, { type: mimeType });
      audioChunks = [];
      if (blob.size < 800) return preview;
      finalizing = true;
      try {
        const whisper = await transcribeGuidanceAudio(blob, mimeType);
        return whisper.trim() || preview;
      } catch {
        return preview;
      } finally {
        finalizing = false;
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
      clearTimers();
      try {
        rec?.stop();
      } catch {
        /* noop */
      }
      rec = null;
      stopMedia();
      audioChunks = [];
      previewTranscript = "";
    },
  };
}
