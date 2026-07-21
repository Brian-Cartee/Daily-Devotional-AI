import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  IPHONE_LAB_LIMITS,
  IPHONE_LAB_REALTIME_SESSION,
  IPHONE_LAB_INSTRUCTIONS,
} from "../iphone-lab/config.mjs";
import { startIphoneLabServer } from "../iphone-lab/server.mjs";
import {
  createPeerConnectionForOpenAi,
  inspectWebRtcModule,
} from "../iphone-lab/webrtcCapability.mjs";
import { applyInputTranscriptEvent } from "../../../mobile-build/lib/philipRealtimeTranscript.mjs";
import { acceptSingleRemoteAudioTrack } from "../../../mobile-build/lib/philipRealtimeTrackPolicy.mjs";

test("pins cedar voice and gpt-realtime-2.1 for the iPhone lab", () => {
  assert.equal(IPHONE_LAB_LIMITS.model, "gpt-realtime-2.1");
  assert.equal(IPHONE_LAB_LIMITS.voice, "cedar");
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.output.voice, "cedar");
  assert.equal(IPHONE_LAB_REALTIME_SESSION.model, "gpt-realtime-2.1");
  assert.equal(
    IPHONE_LAB_REALTIME_SESSION.audio.input.transcription.model,
    "gpt-4o-mini-transcribe",
  );
  assert.equal(
    IPHONE_LAB_REALTIME_SESSION.audio.input.turn_detection.interrupt_response,
    false,
  );
  assert.equal(IPHONE_LAB_LIMITS.bundleIdentifier, "com.shepherdspath.app.philip-lab");
  assert.equal(IPHONE_LAB_LIMITS.profile, "philip-lab");
  assert.ok(IPHONE_LAB_LIMITS.easChargeCapUsd <= 5);
});

test("reuses the compact Phase 2B Philip identity with hard contracts preserved", () => {
  for (const required of [
    "central meaning across multiple topics",
    "Caregiving is a relationship",
    "Never invent a body",
    "If explicitly asked to pray",
    "Never guess about current-changing facts",
    "crisis_safety_protocol",
  ]) {
    assert.match(
      `${IPHONE_LAB_INSTRUCTIONS}\n${JSON.stringify(IPHONE_LAB_REALTIME_SESSION.tools)}`,
      new RegExp(required, "i"),
    );
  }
  assert.doesNotMatch(IPHONE_LAB_INSTRUCTIONS, /Front Door|G-lite|Terra|1400ms/i);
});

test("WebRTC capability probe requires peer connection primitives", () => {
  const missing = inspectWebRtcModule({});
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, [
    "RTCPeerConnection",
    "mediaDevices",
    "RTCSessionDescription",
  ]);

  class FakePC {
    constructor(config) {
      this.config = config;
    }
  }
  const ok = inspectWebRtcModule({
    RTCPeerConnection: FakePC,
    mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) },
    RTCSessionDescription: class {},
  });
  assert.equal(ok.ok, true);
  const pc = createPeerConnectionForOpenAi(FakePC);
  assert.equal(pc.config.sdpSemantics, "unified-plan");
});

test("mocked peer-connection lifecycle covers offer, data channel, barge-in cancel, teardown", async () => {
  const events = [];
  class FakeTrack {
    constructor() {
      this.kind = "audio";
      this.stopped = false;
    }
    stop() {
      this.stopped = true;
    }
  }
  class FakeStream {
    constructor() {
      this.tracks = [new FakeTrack()];
    }
    getTracks() {
      return this.tracks;
    }
    getAudioTracks() {
      return this.tracks;
    }
  }
  class FakeDataChannel {
    constructor(label) {
      this.label = label;
      this.readyState = "open";
      this.sent = [];
    }
    send(payload) {
      this.sent.push(JSON.parse(payload));
    }
    close() {
      this.readyState = "closed";
    }
  }
  class FakePC {
    constructor(config) {
      this.config = config;
      this.connectionState = "new";
      this.tracks = [];
      this.closed = false;
      this.localDescription = null;
      this.remoteDescription = null;
      this.dc = null;
    }
    createDataChannel(label) {
      this.dc = new FakeDataChannel(label);
      return this.dc;
    }
    addTrack(track, stream) {
      this.tracks.push({ track, stream });
    }
    async createOffer() {
      return { type: "offer", sdp: "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n" };
    }
    async setLocalDescription(desc) {
      this.localDescription = desc;
      this.connectionState = "have-local-offer";
    }
    async setRemoteDescription(desc) {
      this.remoteDescription = desc;
      this.connectionState = "connected";
    }
    close() {
      this.closed = true;
      this.connectionState = "closed";
      this.dc?.close();
    }
  }

  const pc = createPeerConnectionForOpenAi(FakePC);
  const stream = new FakeStream();
  for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
  const dc = pc.createDataChannel("oai-events");
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await pc.setRemoteDescription({ type: "answer", sdp: "v=0\r\n" });
  dc.send(JSON.stringify({ type: "response.cancel" }));
  dc.send(JSON.stringify({ type: "output_audio_buffer.clear" }));
  pc.close();
  for (const track of stream.getTracks()) track.stop();

  assert.equal(dc.label, "oai-events");
  assert.equal(dc.sent[0].type, "response.cancel");
  assert.equal(dc.sent[1].type, "output_audio_buffer.clear");
  assert.equal(pc.closed, true);
  assert.equal(stream.tracks[0].stopped, true);
  assert.equal(pc.connectionState, "closed");
  events.push("ok");
  assert.equal(events[0], "ok");
});

test("input transcript deltas and out-of-order completions associate by item_id", () => {
  const turns = [
    { turnNumber: 1, itemId: "item-1", speechStoppedAtMs: 1_000 },
    { turnNumber: 2, itemId: "item-2", speechStoppedAtMs: 2_000 },
  ];
  applyInputTranscriptEvent(
    turns,
    {
      type: "conversation.item.input_audio_transcription.delta",
      item_id: "item-2",
      delta: "Second ",
    },
    2_100,
  );
  applyInputTranscriptEvent(
    turns,
    {
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item-1",
      transcript: "First turn.",
    },
    1_450,
  );
  applyInputTranscriptEvent(
    turns,
    {
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item-2",
      transcript: "Second turn.",
    },
    2_650,
  );

  assert.equal(turns[0].inputTranscript, "First turn.");
  assert.equal(turns[0].speechEndToTranscriptCompleteMs, 450);
  assert.equal(turns[1].inputTranscriptDeltas, "Second ");
  assert.equal(turns[1].inputTranscript, "Second turn.");
  assert.equal(turns[1].speechEndToTranscriptCompleteMs, 650);
});

test("false-barge-in-sensitive track policy keeps one remote stream and tears duplicates down", () => {
  const first = { id: "remote-1", kind: "audio", stopped: false, stop() { this.stopped = true; } };
  const duplicate = {
    id: "remote-2",
    kind: "audio",
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
  const accepted = acceptSingleRemoteAudioTrack(null, first);
  const rejected = acceptSingleRemoteAudioTrack(accepted.trackId, duplicate);
  assert.equal(accepted.accepted, true);
  assert.equal(first.stopped, false);
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reason, "duplicate_audio");
  assert.equal(duplicate.stopped, true);
  assert.equal(rejected.trackId, "remote-1");
});

test("prep server rejects session creation before counting or provider access", async () => {
  const previousArm = process.env.ALLOW_IPHONE_REALTIME;
  const previousSecret = process.env.PHILIP_REALTIME_LAB_SECRET;
  delete process.env.ALLOW_IPHONE_REALTIME;
  process.env.PHILIP_REALTIME_LAB_SECRET = "fake-lab-secret-for-tests-only";
  const running = await startIphoneLabServer();
  try {
    const before = await fetch(`${running.origin}/api/iphone-realtime/status`).then((r) =>
      r.json(),
    );
    const denied = await fetch(`${running.origin}/api/iphone-realtime/session`, {
      method: "POST",
      headers: {
        "content-type": "application/sdp",
        "x-philip-realtime-lab-secret": "fake-lab-secret-for-tests-only",
      },
      body: "v=0\r\n",
    });
    assert.equal(denied.status, 423);
    assert.deepEqual(await denied.json(), {
      error: "iphone_realtime_not_armed",
      sessionCounted: false,
      providerCalled: false,
    });
    const after = await fetch(`${running.origin}/api/iphone-realtime/status`).then((r) =>
      r.json(),
    );
    assert.equal(after.sessionsUsed, before.sessionsUsed);
    assert.equal(after.cumulativeEstimatedCostUsd, before.cumulativeEstimatedCostUsd);
    assert.equal(after.liveKitCloud, false);
    assert.equal(after.productionApi, false);
    assert.equal(after.voice, "cedar");
  } finally {
    await running.close();
    if (previousArm == null) delete process.env.ALLOW_IPHONE_REALTIME;
    else process.env.ALLOW_IPHONE_REALTIME = previousArm;
    if (previousSecret == null) delete process.env.PHILIP_REALTIME_LAB_SECRET;
    else process.env.PHILIP_REALTIME_LAB_SECRET = previousSecret;
  }
});

test("rejects missing lab secret and never returns a provider key", async () => {
  const previousSecret = process.env.PHILIP_REALTIME_LAB_SECRET;
  delete process.env.PHILIP_REALTIME_LAB_SECRET;
  const running = await startIphoneLabServer();
  try {
    const response = await fetch(`${running.origin}/api/iphone-realtime/session`, {
      method: "POST",
      headers: { "content-type": "application/sdp" },
      body: "v=0\r\n",
    });
    assert.equal(response.status, 412);
    const config = await fetch(`${running.origin}/api/iphone-realtime/config`).then((r) =>
      r.json(),
    );
    const serialized = JSON.stringify(config);
    assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{10,}/);
    assert.doesNotMatch(serialized, /Bearer /);
    assert.match(serialized, /cedar/);
    assert.match(serialized, /no LiveKit Cloud/);
  } finally {
    await running.close();
    if (previousSecret == null) delete process.env.PHILIP_REALTIME_LAB_SECRET;
    else process.env.PHILIP_REALTIME_LAB_SECRET = previousSecret;
  }
});

test("mobile sources have no legacy fallback and require the isolated Realtime route", async () => {
  const screen = await readFile(
    new URL("../../../mobile-build/app/philip-realtime-lab.tsx", import.meta.url),
    "utf8",
  );
  const session = await readFile(
    new URL("../../../mobile-build/lib/philipRealtimeLabSession.ts", import.meta.url),
    "utf8",
  );
  const config = await readFile(
    new URL("../../../mobile-build/lib/philipRealtimeLabConfig.ts", import.meta.url),
    "utf8",
  );
  const layout = await readFile(
    new URL("../../../mobile-build/app/_layout.tsx", import.meta.url),
    "utf8",
  );
  const voiceLab = await readFile(
    new URL("../../../mobile-build/app/philip-voice-lab.tsx", import.meta.url),
    "utf8",
  );
  const eas = await readFile(new URL("../../../mobile-build/eas.json", import.meta.url), "utf8");
  const appConfig = await readFile(
    new URL("../../../mobile-build/app.config.js", import.meta.url),
    "utf8",
  );
  const api = await readFile(
    new URL("../../../mobile-build/lib/philipRealtimeLabApi.ts", import.meta.url),
    "utf8",
  );
  const audioSession = await readFile(
    new URL("../../../mobile-build/lib/philipRealtimeAudioSession.ts", import.meta.url),
    "utf8",
  );
  const transcriptHelper = await readFile(
    new URL("../../../mobile-build/lib/philipRealtimeTranscript.mjs", import.meta.url),
    "utf8",
  );
  const isolatedRoute = await readFile(
    new URL("../../api-server/src/routes/philipRealtimeLab.ts", import.meta.url),
    "utf8",
  );

  assert.match(screen, /Philip Realtime Lab/);
  assert.match(screen, /Realtime Research Prototype/);
  assert.match(screen, /Start Conversation/);
  assert.match(screen, /Emergency Stop/);
  assert.match(screen, /Refresh Realtime Readiness/);
  assert.match(screen, /AppState\.addEventListener/);
  assert.match(screen, /screen_navigation/);
  assert.doesNotMatch(screen, /Open Legacy Philip Voice Lab|router\.push\(.philip-voice-lab/);
  assert.match(session, /@livekit\/react-native-webrtc/);
  assert.match(session, /oai-events/);
  assert.match(session, /response\.cancel/);
  assert.match(session, /output_audio_buffer\.clear/);
  assert.match(transcriptHelper, /conversation\.item\.input_audio_transcription\.delta/);
  assert.match(transcriptHelper, /conversation\.item\.input_audio_transcription\.completed/);
  assert.match(transcriptHelper, /speechEndToTranscriptCompleteMs/);
  assert.match(session, /echoCancellation: true/);
  assert.match(session, /expected_one_microphone_track/);
  assert.match(session, /duplicate_remote_audio_track/);
  assert.match(session, /state === "failed" \|\| state === "disconnected"/);
  assert.match(session, /`peer_connection_\$\{state\}`/);
  assert.doesNotMatch(session, /livekit\.cloud|wss:\/\/.*livekit/i);
  assert.match(config, /realtime_lab_url_must_target_isolated_route/);
  assert.match(api, /five-minute Realtime bearer token/);
  assert.match(api, /readiness_isolation_check_failed/);
  assert.match(audioSession, /audioMode: "voiceChat"/);
  assert.match(audioSession, /playAndRecord/);
  assert.doesNotMatch(screen, /Audio\.setAudioModeAsync/);
  assert.match(layout, /philip-realtime-lab/);
  assert.match(voiceLab, /Open Philip Realtime Lab/);
  assert.match(voiceLab, /does not replace this screen/);
  assert.match(eas, /"philip-lab"/);
  assert.match(eas, /PHILIP_VOICE_LAB_BUNDLE_SUFFIX/);
  assert.match(
    eas,
    /https:\/\/www\.shepherdspathai\.com\/api\/internal\/philip-voice\/realtime/,
  );
  assert.match(appConfig, /philipRealtimeLabUrl/);
  assert.doesNotMatch(appConfig, /philipRealtimeLabSecret/);
  assert.match(isolatedRoute, /runtime_token_required/);
  assert.match(isolatedRoute, /iphone_realtime_not_armed/);
  assert.match(isolatedRoute, /providerCalled: false/);
  assert.doesNotMatch(screen + session + config + api, /OPENAI_API_KEY|sk-/);
});
