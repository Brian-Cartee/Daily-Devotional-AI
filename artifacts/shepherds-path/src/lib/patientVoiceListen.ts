/** Patient voice capture — never auto-submits on silence; user confirms when ready. */

export type VoiceListenUiPhase = "listening" | "thinking" | "ready";

export type PatientVoiceListener = {
  start: () => void;
  stop: () => string;
  isActive: () => boolean;
  destroy: () => void;
};

export type PatientVoiceOptions = {
  onTranscript: (final: string, interim: string) => void;
  onPhaseChange?: (phase: VoiceListenUiPhase) => void;
  /** ~6s silence — speak "Take your time" once per speech burst */
  onTakeYourTime?: () => void;
  /** ~10s silence — show manual continue affordance */
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
  if (!SR) return null;

  let rec: InstanceType<typeof SR> | null = null;
  let transcript = "";
  let active = false;
  let userStopped = false;
  let takeYourTimeFired = false;
  let thinkingTimer: ReturnType<typeof setTimeout> | null = null;
  let takeYourTimeTimer: ReturnType<typeof setTimeout> | null = null;
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

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

  const scheduleSilenceTimers = () => {
    clearTimers();
    if (!active) return;
    const words = transcript.split(/\s+/).filter(Boolean).length;
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

  const bindRecognition = () => {
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
        transcript = (transcript ? `${transcript} ${finalChunk}` : finalChunk).trim();
      }
      takeYourTimeFired = false;
      setPhase("listening");
      opts.onTranscript(transcript, interim);
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
          /* mic may be busy — retry once */
          restartTimer = setTimeout(() => {
            if (!active || userStopped || rec) return;
            try {
              bindRecognition();
              rec?.start();
            } catch {
              /* give up until user taps */
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

  return {
    start() {
      if (active) return;
      active = true;
      userStopped = false;
      transcript = "";
      takeYourTimeFired = false;
      setPhase("listening");
      bindRecognition();
      try {
        rec?.start();
      } catch {
        active = false;
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
      return transcript.trim();
    },
    isActive() {
      return active;
    },
    destroy() {
      userStopped = true;
      active = false;
      clearTimers();
      try {
        rec?.stop();
      } catch {
        /* noop */
      }
      rec = null;
    },
  };
}
