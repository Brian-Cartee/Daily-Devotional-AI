import { registerGlobals } from "@livekit/react-native";

let registered = false;

/** Call once before any LiveKitRoom mounts (required on iOS). */
export function ensureLiveKitGlobals(): void {
  if (registered) return;
  registerGlobals();
  registered = true;
}
