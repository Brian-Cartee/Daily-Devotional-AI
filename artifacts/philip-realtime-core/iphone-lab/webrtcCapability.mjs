/**
 * Shared WebRTC capability checks for the iPhone Realtime lab.
 * Used by local Node tests and mirrored by the React Native client.
 */

export const REQUIRED_WEBRTC_EXPORTS = [
  "RTCPeerConnection",
  "mediaDevices",
  "RTCSessionDescription",
];

export function inspectWebRtcModule(mod = {}) {
  const missing = REQUIRED_WEBRTC_EXPORTS.filter((name) => typeof mod[name] === "undefined");
  return {
    ok: missing.length === 0,
    missing,
    hasMediaStream: typeof mod.MediaStream !== "undefined",
    packageName: "@livekit/react-native-webrtc",
  };
}

export function createPeerConnectionForOpenAi(RTCPeerConnection, iceServers) {
  const servers = iceServers || [{ urls: "stun:stun.l.google.com:19302" }];
  return new RTCPeerConnection({
    iceServers: servers,
    sdpSemantics: "unified-plan",
  });
}

export function assertOpenAiWebRtcCompatible(mod) {
  const report = inspectWebRtcModule(mod);
  if (!report.ok) {
    throw new Error(`missing_webrtc_exports:${report.missing.join(",")}`);
  }
  return report;
}
