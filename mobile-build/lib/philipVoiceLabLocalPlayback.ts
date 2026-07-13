import { Audio, InterruptionModeIOS } from "expo-av";
import { File, Paths } from "expo-file-system";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://www.shepherdspathai.com";

let activeSound: Audio.Sound | null = null;
let activeFile: File | null = null;

/** Gate B fallback: play Philip via HTTPS TTS when LiveKit remote audio is silent on iOS. */
export async function playPhilipReplyLocally(
  text: string,
  sessionId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "empty reply text" };

  try {
    if (activeSound) {
      await activeSound.unloadAsync();
      activeSound = null;
    }
    if (activeFile) {
      try {
        activeFile.delete();
      } catch {}
      activeFile = null;
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const res = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: trimmed.slice(0, 4096),
        scope: "guidance",
        sessionId,
        voice: "onyx",
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: `TTS ${res.status}${body ? `: ${body.slice(0, 80)}` : ""}` };
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length < 512) {
      return { ok: false, reason: "TTS returned empty audio" };
    }

    const file = new File(Paths.cache, `philip-lab-reply-${Date.now()}.mp3`);
    file.create({ overwrite: true });
    file.write(bytes);
    activeFile = file;

    const { sound } = await Audio.Sound.createAsync(
      { uri: file.uri },
      { shouldPlay: true, volume: 1.0 },
    );
    activeSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
        if (activeSound === sound) activeSound = null;
        if (activeFile === file) {
          try {
            file.delete();
          } catch {}
          activeFile = null;
        }
      }
    });
    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, reason };
  }
}

export async function stopPhilipLocalPlayback(): Promise<void> {
  if (activeSound) {
    try {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
    } catch {}
    activeSound = null;
  }
  if (activeFile) {
    try {
      activeFile.delete();
    } catch {}
    activeFile = null;
  }
}
