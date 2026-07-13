/**
 * Dev-only playback / barge-in logs.
 * Enable: PHILIP_VOICE_LAB_RUNTIME_VERIFY=true
 */

import { isRuntimeVerifyEnabled } from "./voiceTurnLog.mjs";

export function logPlaybackEvent(title, details = {}) {
  if (!isRuntimeVerifyEnabled()) return;
  const lines = ["", title];
  for (const [key, value] of Object.entries(details)) {
    if (value === undefined) continue;
    lines.push(`${key}: ${value}`);
  }
  lines.push("");
  console.log(lines.join("\n"));
}

export function logPlaybackCompleted(generation, extra = {}) {
  logPlaybackEvent("✅ Philip playback completed — listening active", {
    playbackGeneration: generation,
    ...extra,
  });
}

export function logPlaybackInterrupted(generation, extra = {}) {
  logPlaybackEvent("🛑 Philip interrupted by user — playback cancelled, listening active", {
    playbackGeneration: generation,
    ...extra,
  });
}
