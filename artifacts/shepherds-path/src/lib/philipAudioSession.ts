/** Tear down Philip TTS playback so iOS can re-open the mic after Handoff 2. */

export const IOS_MIC_SETTLE_MS = 500;

const activeSpeakCancels = new Set<() => void>();

/** Serialize release calls — overlapping mic opens were a top stuck-mic cause on iOS. */
let releaseChain: Promise<void> = Promise.resolve();

function enqueueRelease(task: () => Promise<void>): Promise<void> {
  const next = releaseChain.then(task, task);
  releaseChain = next.catch(() => { /* keep chain alive */ });
  return next;
}

export function registerPhilipSpeakCancel(cancel: () => void): () => void {
  activeSpeakCancels.add(cancel);
  return () => {
    activeSpeakCancels.delete(cancel);
    cancel();
  };
}

function pausePhilipTtsElements(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll("audio[data-philip-tts]").forEach((node) => {
    const el = node as HTMLAudioElement;
    try {
      el.pause();
      el.removeAttribute("src");
      el.load();
      el.remove();
    } catch { /* noop */ }
  });
}

function releasePhilipAudioSessionSync(settleMs: number): Promise<void> {
  activeSpeakCancels.forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
  activeSpeakCancels.clear();
  pausePhilipTtsElements();
  if (settleMs > 0) {
    return new Promise((r) => window.setTimeout(r, settleMs));
  }
  return Promise.resolve();
}

/** Stop TTS output, cancel in-flight speak, brief pause for AVAudioSession handoff. */
export async function releasePhilipAudioSession(
  settleMs: number = IOS_MIC_SETTLE_MS,
): Promise<void> {
  return enqueueRelease(() => releasePhilipAudioSessionSync(settleMs));
}

/** Immediate TTS stop without settle wait — use when user barges in. */
export function interruptPhilipAudioSession(): void {
  activeSpeakCancels.forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
  activeSpeakCancels.clear();
  pausePhilipTtsElements();
}
