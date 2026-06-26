/** Tear down Philip TTS playback so iOS can re-open the mic after Handoff 2. */

export const IOS_MIC_SETTLE_MS = 500;

const activeSpeakCancels = new Set<() => void>();

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

/** Stop TTS output, cancel in-flight speak, brief pause for AVAudioSession handoff. */
export async function releasePhilipAudioSession(
  settleMs: number = IOS_MIC_SETTLE_MS,
): Promise<void> {
  activeSpeakCancels.forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
  activeSpeakCancels.clear();
  pausePhilipTtsElements();
  if (settleMs > 0) {
    await new Promise((r) => window.setTimeout(r, settleMs));
  }
}
