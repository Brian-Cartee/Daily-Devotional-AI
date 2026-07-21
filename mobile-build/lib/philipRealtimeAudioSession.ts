import { Platform } from "react-native";
import { AudioSession } from "@livekit/react-native";

let active = false;
/** Last output we successfully selected (iOS: force_speaker). */
let selectedOutput: string | null = null;

/**
 * Realtime's sole iOS audio-session owner. expo-av is used only to request
 * microphone permission; it must not configure AVAudioSession for this screen.
 */
export async function prepareRealtimeAudioSession(): Promise<void> {
  if (active) return;
  if (Platform.OS === "ios") {
    await AudioSession.setAppleAudioConfiguration({
      audioCategory: "playAndRecord",
      audioCategoryOptions: ["allowBluetooth", "defaultToSpeaker"],
      audioMode: "voiceChat",
    });
  }
  await AudioSession.startAudioSession();
  if (Platform.OS === "ios") {
    await AudioSession.selectAudioOutput("force_speaker");
    selectedOutput = "force_speaker";
  }
  active = true;
}

export async function releaseRealtimeAudioSession(): Promise<void> {
  if (!active) return;
  active = false;
  selectedOutput = null;
  await AudioSession.stopAudioSession();
}

export function isRealtimeAudioSessionActiveForTests(): boolean {
  return active;
}

/**
 * Best-effort audio route snapshot for unpaid diagnostics.
 *
 * LiveKit's AudioSession on iOS only exposes getAudioOutputs() →
 * "default" | "force_speaker". It does not report the live AVAudioSession
 * port (receiver / speaker / Bluetooth / headset) or route-change events
 * without a new native dependency. We record what the OS API does expose
 * plus our last selected output; never raw audio.
 */
export async function captureRealtimeAudioRouteSnapshot(
  reason: string,
): Promise<Record<string, unknown>> {
  try {
    const outputs =
      typeof AudioSession.getAudioOutputs === "function"
        ? await AudioSession.getAudioOutputs()
        : [];
    return {
      available: true,
      platform: Platform.OS,
      outputs: Array.isArray(outputs) ? outputs : [],
      selectedOutput,
      inputHint:
        Platform.OS === "ios"
          ? "playAndRecord+voiceChat; live input port not exposed by LiveKit AudioSession"
          : "platform_input_port_not_queried",
      routeChangeMonitoring: "unavailable_without_new_dependency",
      note: `reason=${reason}; ios_live_port_unavailable_without_new_dependency`,
      audioSessionActive: active,
    };
  } catch (error) {
    return {
      available: false,
      platform: Platform.OS,
      outputs: [],
      selectedOutput,
      inputHint: null,
      routeChangeMonitoring: "unavailable_without_new_dependency",
      note: `reason=${reason}; capture_failed:${String((error as Error)?.message || error).slice(0, 120)}`,
      audioSessionActive: active,
    };
  }
}
