/**
 * Capability probe for OpenAI Realtime WebRTC using the already-gated
 * `@livekit/react-native-webrtc` package (no LiveKit Cloud, no extra native dep).
 */

export type WebRtcPrimitives = {
  RTCPeerConnection: new (config?: object) => {
    createDataChannel: (label: string) => unknown;
    addTrack: (track: unknown, stream: unknown) => unknown;
    createOffer: () => Promise<{ sdp?: string; type?: string }>;
    setLocalDescription: (desc: unknown) => Promise<void>;
    setRemoteDescription: (desc: unknown) => Promise<void>;
    close: () => void;
    ontrack: ((event: {
      streams: unknown[];
      track?: {
        id?: string;
        kind?: string;
        readyState?: string;
        stop?: () => void;
        addEventListener?: (type: string, listener: () => void) => void;
      };
    }) => void) | null;
    onconnectionstatechange: (() => void) | null;
    connectionState?: string;
    iceConnectionState?: string;
  };
  mediaDevices: {
    getUserMedia: (constraints: object) => Promise<{
      getTracks: () => Array<{
        stop: () => void;
        kind: string;
        id?: string;
        enabled?: boolean;
        muted?: boolean;
        readyState?: string;
        addEventListener?: (type: string, listener: () => void) => void;
      }>;
      getAudioTracks: () => Array<{
        stop: () => void;
        kind: string;
        id?: string;
        enabled?: boolean;
        muted?: boolean;
        readyState?: string;
        addEventListener?: (type: string, listener: () => void) => void;
      }>;
    }>;
  };
  RTCSessionDescription: new (init: { type: string; sdp: string }) => unknown;
  MediaStream?: new () => unknown;
  registerGlobals?: () => void;
};

export const REQUIRED_WEBRTC_EXPORTS = [
  "RTCPeerConnection",
  "mediaDevices",
  "RTCSessionDescription",
] as const;

let globalsRegistered = false;

export function inspectWebRtcModule(mod: Record<string, unknown>) {
  const missing = REQUIRED_WEBRTC_EXPORTS.filter((name) => typeof mod[name] === "undefined");
  return {
    ok: missing.length === 0,
    missing,
    hasMediaStream: typeof mod.MediaStream !== "undefined",
    packageName: "@livekit/react-native-webrtc",
  };
}

/** Load the LiveKit RN WebRTC package without routing through LiveKit Cloud. */
export function loadLiveKitReactNativeWebRtc():
  | {
      ok: true;
      primitives: WebRtcPrimitives;
      report: ReturnType<typeof inspectWebRtcModule>;
    }
  | {
      ok: false;
      error: string;
      report: ReturnType<typeof inspectWebRtcModule> | null;
    } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@livekit/react-native-webrtc") as Record<string, unknown>;
    const report = inspectWebRtcModule(mod);
    if (!report.ok) {
      return {
        ok: false,
        error: `missing_webrtc_exports:${report.missing.join(",")}`,
        report,
      };
    }
    if (!globalsRegistered && typeof mod.registerGlobals === "function") {
      (mod.registerGlobals as () => void)();
      globalsRegistered = true;
    }
    return {
      ok: true,
      primitives: mod as unknown as WebRtcPrimitives,
      report,
    };
  } catch (error) {
    return {
      ok: false,
      error: `webrtc_package_unavailable:${String((error as Error)?.message || error)}`,
      report: null,
    };
  }
}

export function createPeerConnectionForOpenAi(
  primitives: WebRtcPrimitives,
  iceServers: object[] = [{ urls: "stun:stun.l.google.com:19302" }],
) {
  return new primitives.RTCPeerConnection({
    iceServers,
    sdpSemantics: "unified-plan",
  });
}
