/**
 * LiveKit room loop — subscribe user mic, STT → phase1 → tts → publish agent audio.
 * Gate B: full session timeline instrumentation.
 */
import {
  DEFAULT_SAMPLE_RATE,
  UtteranceCollector,
  pcmToWav,
  publishMp3ToSource,
  rmsInt16,
} from "./audioUtil.mjs";
import { SessionTimeline, publishTimelineToRoom } from "./sessionTimeline.mjs";

const API_BASE = (process.env.PHILIP_VOICE_LAB_API_BASE || "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);

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
  const identity = `agent-${roomName.slice(0, 40)}`;
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
  const res = await fetch(`${API_BASE}/api/guidance/transcribe`, {
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
  const res = await fetch(`${API_BASE}/api/guidance/phase1`, {
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

async function callTts(text, sessionId) {
  const res = await fetch(`${API_BASE}/api/tts`, {
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
 * @param {{ roomName: string; sessionId: string; utterance: Buffer; vadReason?: string; audioSource: import('@livekit/rtc-node').AudioSource; timeline: SessionTimeline; room: import('@livekit/rtc-node').Room }} job
 */
export async function runPhilipLabTurn(job) {
  const turn = job.timeline.beginTurn();
  job.timeline.mark("user_stops_speaking", { vadReason: job.vadReason });
  job.timeline.metric("userStopsSpeakingAt");

  try {
    job.timeline.mark("stt_start");
    const sttStartAt = Date.now();
    const transcript = await callTranscribe(job.utterance, job.sessionId, DEFAULT_SAMPLE_RATE);
    job.timeline.mark("stt_complete", {
      transcriptChars: transcript.length,
      sttMs: Date.now() - sttStartAt,
    });
    job.timeline.metric("sttCompleteAt");
    turn.transcript = transcript;

    if (!transcript || transcript.length < 2) {
      job.timeline.mark("empty_transcript");
      job.timeline.endTurn({ ok: false, reason: "empty_transcript" });
      return null;
    }

    job.timeline.mark("phase1_start");
    const phase1StartAt = Date.now();
    const phase1Text = await callPhase1(transcript, job.sessionId);
    job.timeline.mark("phase1_complete", {
      phase1Chars: phase1Text.length,
      phase1Ms: Date.now() - phase1StartAt,
    });
    job.timeline.metric("phase1CompleteAt");
    turn.phase1Preview = phase1Text.slice(0, 200);

    job.timeline.mark("tts_start");
    const ttsStartAt = Date.now();
    const audio = await callTts(phase1Text, job.sessionId);
    job.timeline.mark("tts_end", { mp3Bytes: audio.length, ttsMs: Date.now() - ttsStartAt });
    job.timeline.metric("ttsCompleteAt");

    job.timeline.mark("playback_publish_start");
    job.timeline.metric("playbackPublishStartAt");
    const publish = await publishMp3ToSource(
      audio,
      job.audioSource,
      DEFAULT_SAMPLE_RATE,
      job.audioFrameFactory,
    );
    job.timeline.mark("playback_publish_end", publish);
    job.timeline.metric("playbackPublishEndAt");
    job.timeline.mark("playback_end", {
      pcmDurationMs: publish.pcmDurationMs,
      estimatedClientPlaybackEndAt: Date.now() + (publish.pcmDurationMs || 0),
    });

    job.timeline.endTurn({ ok: true });
    const payload = job.timeline.toJSON();
    await publishTimelineToRoom(job.room, {
      conversationId: job.roomName,
      phase: "turn_complete",
      timeline: payload,
    });
    return { phase1Text, audioBytes: audio.length, metrics: turn.metrics };
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
    dispose,
  } = await import("@livekit/rtc-node");
  const { roomName, sessionId } = opts;
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
  const audioSource = new AudioSource(DEFAULT_SAMPLE_RATE, 1);
  const agentTrack = LocalAudioTrack.createAudioTrack("philip-voice", audioSource);
  const publishOptions = new TrackPublishOptions();
  publishOptions.source = TrackSource.SOURCE_MICROPHONE;

  let listenTask = null;
  let listenAbort = null;
  let processing = false;
  let processingPhase = "idle";
  let interruptionLoggedThisTurn = false;
  const collector = new UtteranceCollector({ sampleRate: DEFAULT_SAMPLE_RATE });
  const energyThreshold = collector.energyThreshold;

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

          if (processing) {
            const energy = rmsInt16(samples);
            if (energy >= energyThreshold && !interruptionLoggedThisTurn) {
              interruptionLoggedThisTurn = true;
              timeline.mark("interruption_attempt", { phase: processingPhase });
            }
            continue;
          }

          const vad = collector.push(samples);
          if (!vad) continue;

          if (vad.vadReason && vad.vadReason !== "vad_silence") {
            timeline.mark("vad_event", { reason: vad.vadReason });
          }

          if (!vad.utterance || vad.utterance.length < 1600) {
            if (vad.vadReason === "vad_speech_too_short") {
              timeline.mark("vad_timeout", { reason: "speech_too_short" });
            }
            continue;
          }

          processing = true;
          processingPhase = "turn";
          interruptionLoggedThisTurn = false;
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
            });
          } catch (err) {
            log("turn error:", err);
          } finally {
            processing = false;
            processingPhase = "idle";
            interruptionLoggedThisTurn = false;
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
    if (participant.identity.startsWith("agent-")) return;
    startMicLoop(track, participant);
  };

  const attachExistingUserTracks = () => {
    for (const participant of room.remoteParticipants.values()) {
      if (participant.identity.startsWith("agent-")) continue;
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
    if (!participant.identity.startsWith("agent-")) {
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
  void dispose();
});
