import Constants from "expo-constants";

/** True only in philip-lab EAS / local lab builds (EXPO_PUBLIC_ENABLE_PHILIP_VOICE_LAB=true). */
export function isPhilipVoiceLabEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_ENABLE_PHILIP_VOICE_LAB === "true") return true;
  const extra = Constants.expoConfig?.extra as { philipVoiceLabEnabled?: boolean } | undefined;
  return extra?.philipVoiceLabEnabled === true;
}

export function philipVoiceLabKey(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY || "").trim();
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra as { philipVoiceLabKey?: string } | undefined;
  return (extra?.philipVoiceLabKey || "").trim();
}
