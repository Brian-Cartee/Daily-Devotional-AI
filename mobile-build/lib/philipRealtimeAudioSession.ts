import { Platform } from "react-native";
import { AudioSession } from "@livekit/react-native";

let active = false;

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
  }
  active = true;
}

export async function releaseRealtimeAudioSession(): Promise<void> {
  if (!active) return;
  active = false;
  await AudioSession.stopAudioSession();
}

export function isRealtimeAudioSessionActiveForTests(): boolean {
  return active;
}
