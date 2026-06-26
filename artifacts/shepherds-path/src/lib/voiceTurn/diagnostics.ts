import { nativeDiag } from "@/lib/nativeDiag";
import type { VoiceTurnEvent, VoiceTurnState } from "./types";
import { checkVoiceTurnInvariants } from "./reducer";

export function voiceTurnDiag(
  event: string,
  detail: string | VoiceTurnState | VoiceTurnEvent = "",
): void {
  let payload = "";
  if (typeof detail === "string") {
    payload = detail;
  } else if ("audioMode" in detail) {
    const s = detail as VoiceTurnState;
    payload = `phase=${s.phase} audio=${s.audioMode} slot=${s.captureSlot ?? "-"} mic=${s.micLive ? 1 : 0} arm=${s.micArming ? 1 : 0} epoch=${s.epoch}`;
  } else {
    payload = JSON.stringify(detail);
  }
  nativeDiag(`voice_${event}`, payload.slice(0, 500));
}

export function voiceTurnDiagInvariants(state: VoiceTurnState): void {
  const violations = checkVoiceTurnInvariants(state);
  for (const v of violations) {
    voiceTurnDiag("invariant", `${v.code}:${v.detail}`);
  }
}
