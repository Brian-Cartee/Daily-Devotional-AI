/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const appJson = require("./app.json");
  const enableLab = process.env.EXPO_PUBLIC_ENABLE_PHILIP_VOICE_LAB === "true";
  const expo = { ...appJson.expo };

  if (enableLab) {
    const plugins = [...(expo.plugins || [])];
    if (!plugins.includes("@livekit/react-native-expo-plugin")) {
      plugins.push("@livekit/react-native-expo-plugin");
    }
    if (!plugins.includes("@config-plugins/react-native-webrtc")) {
      plugins.push("@config-plugins/react-native-webrtc");
    }

    expo.plugins = plugins;
    expo.extra = {
      ...expo.extra,
      philipVoiceLabEnabled: true,
      philipVoiceLabKey: (process.env.EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY || "").trim(),
      // Exact public route reverse-proxied to the isolated :3101 lab process.
      philipRealtimeLabUrl: (process.env.EXPO_PUBLIC_PHILIP_REALTIME_LAB_URL || "").trim(),
    };
    if (enableLab && process.env.EXPO_PUBLIC_PHILIP_VOICE_LAB_BUNDLE_SUFFIX === "lab") {
      expo.name = "Philip Voice Lab";
      expo.ios = {
        ...expo.ios,
        bundleIdentifier: "com.shepherdspath.app.philip-lab",
      };
    }
  }

  return { expo };
};
