/** Top-nav conviction icon — dismissible so the threshold stays calm. */

export const CONVICTION_WHISPER_DISMISSED_KEY = "sp_conviction_whisper_dismissed";
export const CONVICTION_WHISPER_CHANGE_EVENT = "sp-conviction-whisper-change";

export function isConvictionWhisperVisible(): boolean {
  try {
    return localStorage.getItem(CONVICTION_WHISPER_DISMISSED_KEY) !== "1";
  } catch {
    return true;
  }
}

function notifyWhisperChange(): void {
  window.dispatchEvent(new Event(CONVICTION_WHISPER_CHANGE_EVENT));
}

export function dismissConvictionWhisper(): void {
  try {
    localStorage.setItem(CONVICTION_WHISPER_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
  notifyWhisperChange();
}

/** After someone reads the panel once, hide the nav icon (still in ⋯ menu). */
export function markConvictionPanelOpened(): void {
  dismissConvictionWhisper();
}
