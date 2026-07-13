/**
 * LiveKit room loop — subscribe user mic, STT → guidance → tts → publish agent audio.
 * Turn 1: /api/guidance/phase1. Turn 2+: /api/guidance/response (web-identical payloads).
 * Gate B: full session timeline instrumentation.
 *
 * LiveKit RTC imports are lazy (inside the functions that need them) so that the
 * simulated-turn gate (which drives runPhilipLabTurn with an injected
 * audioFrameFactory) can run without @livekit/rtc-node / livekit-server-sdk
 * installed, and so agent startup/readiness stays cheap.
 */
import {
  DEFAULT_SAMPLE_RATE,
  UtteranceCollector,
  delay,
  envInt,
  pcmDurationMs,
  pcmToWav,
  publishMp3ToSourceDetached,
  vadConfigFromEnv,
} from "./audioUtil.mjs";
import { callGuidanceResponse } from "./guidanceClient.mjs";
import {
  isLabAgentIdentity,
  mintLabAgentIdentity,
  normalizeLabSessionId,
} from "./labIdentity.mjs";
import { SessionTimeline, publishTimelineToRoom } from "./sessionTimeline.mjs";
import { logVoiceTurnVerification } from "./voiceTurnLog.mjs";

function apiBase() {
  return (process.env.PHILIP_VOICE_LAB_API_BASE || "http://127.0.0.1:8080").replace(/\/$/, "");
}

function guidanceApiBase() {
  return (
    process.env.PHILIP_VOICE_LAB_GUIDANCE_API_BASE ||
    process.env.PHILIP_VOICE_LAB_API_BASE ||
    "http://127.0.0.1:8080"
  ).replace(/\/$/, "");
}

function log(...args) {
  console.log("[philip-voice-agent]", ...args);
}

function liveKitEnv() {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) {
    throw new Error("LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET required for RTC");
  }
  return { url, apiKey, apiSecret };
}

async function mintAgentToken(roomName) {
  const { AccessToken } = await import("livekit-server-sdk");
  const { apiKey, apiSecret } = liveKitEnv();
  const identity = mintLabAgentIdentity(roomName);
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: "Philip",
    ttl: "45m",
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  const token = await at.toJwt();
  return { token, identity };
}

async function callTranscribe(pcmBuffer, sessionId, sampleRate = DEFAULT_SAMPLE_RATE) {
  const wav = pcmToWav(pcmBuffer, sampleRate);
  const form = new FormData();
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "utterance.wav");
  form.append("sessionId", sessionId);
  const res = await fetch(`${guidanceApiBase()}/api/guidance/transcribe`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`transcribe ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return String(data.text || "").trim();
}

async function callPhase1(transcript, sessionId) {
  const res = await fetch(`${guidanceApiBase()}/api/guidance/phase1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation: transcript,
      sessionId,
      companionMode: "philip",
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`phase1 ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.text();
}

/** @returns {{ completedTurns: number; openingSituation: string; phase1Response: string; phase1UserReply: string; messages: Array<{ role: string; content: string }>; conversationId: string }} */
export function createConversationState(conversationId) {
  return {
    completedTurns: 0,
    openingSituation: "",
    phase1Response: "",
    phase1UserReply: "",
    messages: [],
    conversationId,
  };
}

async function callTts(text, sessionId) {
  const res = await fetch(`${guidanceApiBase()}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      scope: "guidance",
      sessionId,
      voice: "onyx",
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`tts ${res.status}: ${errText.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * @param {{ roomName: string; sessionId: string; utterance: Buffer; vadReason?: string; audioSource: import('@livekit/rtc-node').AudioSource; timeline: SessionTimeline; room: import('@livekit/rtc-node').Room; conversationState: ReturnType<typeof createConversationState>; playbackQueue: { pending: Promise<unknown> }; audioFrameFactory?: (chunk: Int16Array) => unknown }} job
 */
export async function runPhilipLabTurn(job) {
  const state = job.conversationState;
  const sessionId = normalizeLabSessionId(job.sessionId);
  const voiceTurnNumber = state.completedTurns + 1;
  const turnStartAt = Date.now();
  const utteranceMs = pcmDurationMs(job.utterance, DEFAULT_SAMPLE_RATE);
  const turn = job.timeline.beginTurn();
  job.timeline.mark("user_stops_speaking", { vadReason: job.vadReason, utteranceMs });
  job.timeline.metric("userStopsSpeakingAt");

  let sttMs = 0;
  let guidanceMs = 0;
  let ttsMs = 0;
  let playbackMs = 0;

  try {
    job.timeline.mark("stt_start");
    const sttStartAt = Date.now();
    const transcript = await callTranscribe(job.utterance, sessionId, DEFAULT_SAMPLE_RATE);
    sttMs = Date.now() - sttStartAt;
    job.timeline.mark("stt_complete", {
      transcriptChars: transcript.length,
      sttMs,
    });
    job.timeline.metric("sttCompleteAt");
    turn.transcript = transcript;

    if (!transcript || transcript.length < 2) {
      job.timeline.mark("empty_transcript");
      job.timeline.endTurn({ ok: false, reason: "empty_transcript" });
      return null;
    }

    let replyText;
    let runtimeHeaders = null;
    let endpoint = "/api/guidance/phase1";
    let conversationMode = "Phase1 Opening";
    let messagesLength = 0;
    let twoPhaseBridge = false;
    let followUpMode = false;

    job.timeline.mark("guidance_start", { voiceTurnNumber, completedTurns: state.completedTurns });
    const guidanceStartAt = Date.now();

    if (state.completedTurns === 0) {
      replyText = await callPhase1(transcript, sessionId);
      state.openingSituation = transcript;
      state.phase1Response = replyText;
      messagesLength = 0;
      job.timeline.mark("phase1_complete", {
        phase1Chars: replyText.length,
        phase1Ms: Date.now() - guidanceStartAt,
      });
    } else if (state.completedTurns === 1) {
      endpoint = "/api/guidance/response";
      conversationMode = "Two-Phase Bridge";
      twoPhaseBridge = true;
      messagesLength = 1;
      state.phase1UserReply = transcript;
      const result = await callGuidanceResponse({
        situation: state.openingSituation,
        messages: [{ role: "user", content: state.openingSituation }],
        sessionId,
        conversationId: state.conversationId,
        phase1Response: state.phase1Response,
        phase1UserReply: state.phase1UserReply,
      });
      replyText = result.text;
      runtimeHeaders = result.headers;
      if (runtimeHeaders.conversationId) {
        state.conversationId = runtimeHeaders.conversationId;
      }
      state.messages = [
        { role: "user", content: state.openingSituation },
        { role: "assistant", content: replyText },
      ];
      job.timeline.mark("guidance_response_complete", {
        lane: runtimeHeaders.lane,
        guidanceMs: Date.now() - guidanceStartAt,
        replyChars: replyText.length,
      });
    } else {
      endpoint = "/api/guidance/response";
      conversationMode = "Follow-up";
      followUpMode = true;
      const messagesWithUser = [...state.messages, { role: "user", content: transcript }];
      messagesLength = messagesWithUser.length;
      const result = await callGuidanceResponse({
        situation: state.openingSituation,
        messages: messagesWithUser,
        sessionId,
        conversationId: state.conversationId,
        phase1Response: state.phase1Response,
        phase1UserReply: state.phase1UserReply,
        turnEventContent: transcript,
      });
      replyText = result.text;
      runtimeHeaders = result.headers;
      if (runtimeHeaders.conversationId) {
        state.conversationId = runtimeHeaders.conversationId;
      }
      state.messages = [...messagesWithUser, { role: "assistant", content: replyText }];
      job.timeline.mark("guidance_response_complete", {
        lane: runtimeHeaders.lane,
        guidanceMs: Date.now() - guidanceStartAt,
        replyChars: replyText.length,
      });
    }

    guidanceMs = Date.now() - guidanceStartAt;
    state.completedTurns += 1;

    turn.phase1Text = replyText;
    turn.phase1Preview = replyText.slice(0, 200);

    job.timeline.mark("tts_start");
    const ttsStartAt = Date.now();
    const audio = await callTts(replyText, sessionId);
    ttsMs = Date.now() - ttsStartAt;
    job.timeline.mark("tts_end", { mp3Bytes: audio.length, ttsMs });
    job.timeline.metric("ttsCompleteAt");

    job.timeline.mark("playback_publish_start");
    job.timeline.metric("playbackPublishStartAt");
    const playbackStartAt = Date.now();

    await job.playbackQueue.pending.catch(() => {});
    const { pcmDurationMs: pcmMs, framePublished } =
      await publishMp3ToSourceDetached(audio, job.audioSource, DEFAULT_SAMPLE_RATE, job.audioFrameFactory);
    playbackMs = Date.now() - playbackStartAt;

    job.timeline.mark("playback_publish_end", { pcmDurationMs: pcmMs });
    job.timeline.metric("playbackPublishEndAt");
    job.timeline.mark("playback_end", {
      pcmDurationMs: pcmMs,
      earlyMic: true,
      estimatedClientPlaybackEndAt: Date.now() + pcmMs,
    });

    const micSettleMs = envInt("PHILIP_VOICE_LAB_EARLY_MIC_SETTLE_MS", 600);
    await delay(micSettleMs);

    job.playbackQueue.pending = framePublished;
    // Intentionally not awaited: audio delivery continues after this turn returns
    // and the caller resumes the mic. Errors are already logged inside
    // publishMp3ToSourceDetached; this just prevents an unhandled-rejection warning.
    framePublished.catch(() => {});

    const totalTurnMs = Date.now() - turnStartAt;

    logVoiceTurnVerification({
      voiceTurnNumber,
      endpoint,
      conversationMode,
      messagesLength,
      sessionId,
      conversationId: state.conversationId,
      twoPhaseBridge,
      followUpMode,
      latencyMs: guidanceMs,
      runtimeHeaders,
      timing: {
        utteranceMs,
        vadReason: job.vadReason ?? "vad_silence",
        sttMs,
        guidanceMs,
        ttsMs,
        playbackMs,
        totalTurnMs,
        replyChars: replyText.length,
        earlyMic: true,
        pcmDurationMs: pcmMs,
      },
    });

    job.timeline.endTurn({
      ok: true,
      voiceTurnNumber,
      endpoint,
      lane: runtimeHeaders?.lane ?? "phase1",
      sttMs,
      guidanceMs,
      ttsMs,
      playbackMs,
      totalTurnMs,
      earlyMic: true,
      pcmDurationMs: pcmMs,
    });

    const payload = job.timeline.toJSON();
    await publishTimelineToRoom(job.room, {
      conversationId: job.roomName,
      phase: "turn_complete",
      phase1Text: replyText,
      timeline: payload,
    });
    return {
      phase1Text: replyText,
      audioBytes: audio.length,
      metrics: turn.metrics,
    };
  } catch (err) {
    job.timeline.mark("turn_error", { error: String(err) });
    job.timeline.endTurn({ ok: false, error: String(err) });
    throw err;
  }
}

/**
 * @param {{ roomName: string; sessionId: string; abortSignal?: AbortSignal }} opts
 */
export async function runPhilipVoiceRoom(opts) {
  const {
    AudioSource,
    AudioStream,
    LocalAudioTrack,
    Room,
    RoomEvent,
    TrackKind,
    TrackPublishOptions,
    TrackSource,
  } = await import("@livekit/rtc-node");
  const { roomName } = opts;
  const sessionId = normalizeLabSessionId(opts.sessionId);
  const conversationId = roomName;
  const timeline = new SessionTimeline({
    conversationId,
    sessionId,
    roomName,
    source: "agent",
  });

  const { url } = liveKitEnv();
  const { token, identity } = await mintAgentToken(roomName);

  const room = new Room();
  const audioSource = new AudioSource(DEFAULT_SAMPLE_RATE, 1, 2000);
  const agentTrack = LocalAudioTrack.createAudioTrack("philip-voice", audioSource);
  const publishOptions = new TrackPublishOptions();
  publishOptions.source = TrackSource.SOURCE_MICROPHONE;

  let listenTask = null;
  let listenAbort = null;
  let processing = false;
  const vadConfig = vadConfigFromEnv();
  const collector = new UtteranceCollector(vadConfig);
  const conversationState = createConversationState(conversationId);
  const playbackQueue = { pending: Promise.resolve() };
  log("vad config", vadConfig);

  const stopListening = () => {
    listenAbort?.abort();
    listenAbort = null;
    listenTask = null;
  };

  const startMicLoop = (track, participant) => {
    if (listenTask) return;
    timeline.mark("user_mic_subscribed", { participant: participant.identity });
    listenAbort = new AbortController();
    const signal = listenAbort.signal;

    listenTask = (async () => {
      const stream = new AudioStream(track, {
        sampleRate: DEFAULT_SAMPLE_RATE,
        numChannels: 1,
      });
      try {
        for await (const frame of stream) {
          if (signal.aborted) break;
          const samples = frame.data;

          if (processing) continue;

          const vad = collector.push(samples);
          if (!vad) continue;

          if (vad.vadReason && vad.vadReason !== "vad_silence" && vad.vadReason !== "vad_speech_too_short") {
            timeline.mark("vad_event", { reason: vad.vadReason });
          }

          if (!vad.utterance || vad.utterance.length < 1600) {
            if (vad.vadReason === "vad_speech_too_short") {
              timeline.mark("vad_timeout", { reason: "speech_too_short" });
            }
            continue;
          }

          processing = true;
          collector.pause();
          try {
            await runPhilipLabTurn({
              roomName,
              sessionId,
              utterance: vad.utterance,
              vadReason: vad.vadReason,
              audioSource,
              timeline,
              room,
              conversationState,
              playbackQueue,
            });
          } catch (err) {
            log("turn error:", err);
          } finally {
            processing = false;
            collector.resume();
            timeline.mark("mic_resumed");
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          log("mic loop ended:", err);
          timeline.mark("mic_loop_error", { error: String(err) });
        }
      }
    })();
  };

  const onTrackSubscribed = (track, _pub, participant) => {
    if (track.kind !== TrackKind.KIND_AUDIO) return;
    if (isLabAgentIdentity(participant.identity)) return;
    startMicLoop(track, participant);
  };

  const attachExistingUserTracks = () => {
    for (const participant of room.remoteParticipants.values()) {
      if (isLabAgentIdentity(participant.identity)) continue;
      for (const pub of participant.trackPublications.values()) {
        if (pub.track?.kind === TrackKind.KIND_AUDIO) {
          startMicLoop(pub.track, participant);
          return;
        }
      }
    }
  };

  room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    if (!isLabAgentIdentity(participant.identity)) {
      timeline.mark("participant_disconnected", { identity: participant.identity });
      stopListening();
      collector.reset();
    }
  });
  room.on(RoomEvent.Disconnected, (reason) => {
    timeline.mark("disconnect", { reason: String(reason ?? "unknown") });
  });

  try {
    timeline.mark("agent_connecting", { identity });
    await room.connect(url, token, { autoSubscribe: true, dynacast: true });
    timeline.mark("agent_connected");
    await room.localParticipant.publishTrack(agentTrack, publishOptions);
    timeline.mark("agent_track_published");
    attachExistingUserTracks();

    await new Promise((resolve) => {
      if (opts.abortSignal?.aborted) {
        resolve();
        return;
      }
      room.on(RoomEvent.Disconnected, resolve);
      opts.abortSignal?.addEventListener("abort", () => {
        timeline.mark("session_abort");
        resolve();
      }, { once: true });
    });
  } finally {
    stopListening();
    collector.reset();
    timeline.mark("session_end");
    const payload = await timeline.persist();
    await publishTimelineToRoom(room, {
      conversationId,
      phase: "session_end",
      timeline: payload,
    });
    try {
      await agentTrack.close();
    } catch {}
    try {
      await room.disconnect();
    } catch {}
    log("room session ended", roomName);
  }
}

process.on("SIGINT", () => {
  void import("@livekit/rtc-node")
    .then(({ dispose }) => dispose())
    .catch(() => {});
});
