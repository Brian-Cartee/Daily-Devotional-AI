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
import { callCandidateGuidanceTurn, mediaApiBase, sttApiBase, labSecret } from "./guidanceClient.mjs";
import {
  isLabAgentIdentity,
  mintLabAgentIdentity,
  normalizeLabSessionId,
} from "./labIdentity.mjs";
import { SessionTimeline, publishTimelineToRoom } from "./sessionTimeline.mjs";
import { logVoiceTurnVerification } from "./voiceTurnLog.mjs";
import { recordTurnObservation } from "./turnObservability.mjs";
import { awaitingConstrainedShortAnswer } from "./frontDoor.mjs";
import { PHILIP_VOICE_GENOME_VERSION } from "./compactGenome.mjs";

/** Candidate genome honesty marker — compact live-voice genome + Front Door routing. */
export const CANDIDATE_GENOME_VERSION = PHILIP_VOICE_GENOME_VERSION;
export const CANDIDATE_RUNTIME_LABEL = "Philip Voice Lab Candidate";

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

async function callTranscribe(pcmBuffer, sessionId, sampleRate = DEFAULT_SAMPLE_RATE, conversationId = "") {
  const wav = pcmToWav(pcmBuffer, sampleRate);
  const form = new FormData();
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "utterance.wav");
  form.append("sessionId", sessionId);
  if (conversationId) form.append("conversationId", conversationId);
  const secret = labSecret();
  const res = await fetch(`${sttApiBase()}/api/internal/philip-voice/transcribe`, {
    method: "POST",
    headers: {
      ...(secret ? { "X-Philip-Lab-Secret": secret } : {}),
    },
    body: form,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`lab-transcribe ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return String(data.text || "").trim();
}

/**
 * @param {string} conversationId
 * @param {{ firstName?: string }} [opts]
 * @returns {{ completedTurns: number; conversationId: string; firstName: string; brainState: object|null; messages: Array<{ role: string; content: string }> }}
 */
export function createConversationState(conversationId, opts = {}) {
  return {
    completedTurns: 0,
    conversationId,
    firstName: opts.firstName || "",
    brainState: null,
    messages: [],
  };
}

async function callTts(text, sessionId) {
  const res = await fetch(`${mediaApiBase()}/api/tts`, {
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
  const userSpeechEndAt = job.userSpeechEndAt ?? turnStartAt;
  const vadCloseAt = job.vadCloseAt ?? turnStartAt;
  const utteranceMs = pcmDurationMs(job.utterance, DEFAULT_SAMPLE_RATE);
  const turn = job.timeline.beginTurn();
  job.timeline.mark("user_stops_speaking", {
    vadReason: job.vadReason,
    utteranceMs,
    shortAnswerGate: Boolean(job.shortAnswerGate),
    userSpeechEndAt,
    vadCloseAt,
  });
  job.timeline.metric("userStopsSpeakingAt");

  let sttMs = 0;
  let guidanceMs = 0;
  let ttsMs = 0;
  let playbackMs = 0;
  let sttStartAt = 0;
  let sttEndAt = 0;
  let guidanceStartAt = 0;
  let guidanceEndAt = 0;
  let ttsStartAt = 0;
  let ttsEndAt = 0;
  let firstAudioAt = null;
  let playbackCompleteAt = null;

  const pendingBefore = Boolean(state.brainState?.pendingPrayerOffer);

  try {
    job.timeline.mark("stt_start");
    sttStartAt = Date.now();
    const transcript = await callTranscribe(
      job.utterance,
      sessionId,
      DEFAULT_SAMPLE_RATE,
      state.conversationId,
    );
    sttEndAt = Date.now();
    sttMs = sttEndAt - sttStartAt;
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

    const endpoint = "/api/internal/philip-voice/guidance/turn";
    const conversationMode =
      state.completedTurns === 0 ? "Front Door Opening" : "Front Door Follow-up";

    job.timeline.mark("guidance_start", { voiceTurnNumber, completedTurns: state.completedTurns });
    guidanceStartAt = Date.now();

    const stateBefore = state.brainState;
    const brain = await callCandidateGuidanceTurn({
      transcript,
      firstName: state.firstName,
      state: stateBefore,
      conversationId: state.conversationId,
      sessionId,
    });
    guidanceEndAt = Date.now();
    const replyText = brain.text;
    state.brainState = brain.state;
    state.messages = brain.state?.history ?? [
      ...state.messages,
      { role: "user", content: transcript },
      { role: "assistant", content: replyText },
    ];
    const messagesLength = state.messages.length;

    // Synthesized headers — honest about candidate Front Door (no production Mind).
    const runtimeHeaders = {
      lane: brain.lane ?? null,
      runtimeVersion: "candidate-front-door-1",
      conversationId: state.conversationId,
      plannerSource: null,
      identityKernelMode: null,
      contextMode: null,
      memoryPolicy: null,
      mindStage: null,
      mindVersion: null,
      stateSource: "front_door",
      gates: [],
      questionsAskedCount: null,
      memoryRetrievalChars: null,
      genomeVersion: CANDIDATE_GENOME_VERSION,
      runtimeLabel: CANDIDATE_RUNTIME_LABEL,
    };

    const stateTransition = `${stateBefore?.lastIntent ?? "start"} -> ${brain.intent}${
      brain.reopened ? " (reopened)" : ""
    }${brain.state?.sentOff ? " [sent_off]" : ""}`;

    job.timeline.mark("guidance_response_complete", {
      lane: brain.lane,
      intent: brain.intent,
      engine: brain.engine,
      reopened: brain.reopened,
      pendingPrayerOffer: Boolean(brain.state?.pendingPrayerOffer),
      guidanceMs: guidanceEndAt - guidanceStartAt,
      replyChars: replyText.length,
    });

    guidanceMs = guidanceEndAt - guidanceStartAt;
    state.completedTurns += 1;

    turn.transcript = transcript;
    turn.intent = brain.intent;
    turn.lane = brain.lane;
    turn.engine = brain.engine;
    turn.reopened = brain.reopened;
    turn.stateTransition = stateTransition;
    turn.phase1Text = replyText;
    turn.phase1Preview = replyText.slice(0, 200);

    job.timeline.mark("tts_start");
    ttsStartAt = Date.now();
    const audio = await callTts(replyText, sessionId);
    ttsEndAt = Date.now();
    ttsMs = ttsEndAt - ttsStartAt;
    job.timeline.mark("tts_end", { mp3Bytes: audio.length, ttsMs });
    job.timeline.metric("ttsCompleteAt");

    job.timeline.mark("playback_publish_start");
    job.timeline.metric("playbackPublishStartAt");
    const playbackStartAt = Date.now();
    firstAudioAt = playbackStartAt;

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

    job.playbackQueue.pending = framePublished.then((result) => {
      playbackCompleteAt = Date.now();
      return result;
    });
    // Intentionally not awaited: audio delivery continues after this turn returns
    // and the caller resumes the mic. Errors are already logged inside
    // publishMp3ToSourceDetached; this just prevents an unhandled-rejection warning.
    framePublished.catch(() => {});

    const totalTurnMs = Date.now() - turnStartAt;
    const speechEndToFirstAudioMs =
      firstAudioAt != null && userSpeechEndAt != null
        ? Math.max(0, firstAudioAt - userSpeechEndAt)
        : null;

    const pendingAfter = Boolean(brain.state?.pendingPrayerOffer);

    logVoiceTurnVerification({
      voiceTurnNumber,
      endpoint,
      conversationMode,
      messagesLength,
      sessionId,
      conversationId: state.conversationId,
      intent: brain.intent,
      engine: brain.engine,
      stateTransition,
      reopened: brain.reopened,
      twoPhaseBridge: false,
      followUpMode: state.completedTurns > 1,
      latencyMs: guidanceMs,
      runtimeHeaders,
      pendingPrayerOfferBefore: pendingBefore,
      pendingPrayerOfferAfter: pendingAfter,
      shortAnswerGate: Boolean(job.shortAnswerGate),
      genomeVersion: CANDIDATE_GENOME_VERSION,
      timing: {
        utteranceMs,
        vadReason: job.vadReason ?? "vad_silence",
        userSpeechEndAt,
        vadCloseAt,
        sttStartAt,
        sttEndAt,
        sttMs,
        guidanceStartAt,
        guidanceEndAt,
        guidanceMs,
        ttsStartAt,
        ttsEndAt,
        ttsMs,
        firstAudioAt,
        playbackCompleteAt,
        playbackMs,
        speechEndToFirstAudioMs,
        totalTurnMs,
        replyChars: replyText.length,
        earlyMic: true,
        pcmDurationMs: pcmMs,
        timeToFirstAudioMs: speechEndToFirstAudioMs,
      },
    });

    await recordTurnObservation({
      conversationId: state.conversationId,
      sessionId,
      voiceTurnNumber,
      transcript,
      responseText: replyText,
      intent: brain.intent,
      conduct: brain.conduct ?? null,
      lane: brain.lane,
      engine: brain.engine,
      runtimeVersion: runtimeHeaders.runtimeVersion,
      genomeVersion: CANDIDATE_GENOME_VERSION,
      stateTransition,
      reopened: brain.reopened,
      personalMeaning: brain.personalMeaning,
      faithOffered: brain.faithOffered,
      pendingPrayerOfferBefore: pendingBefore,
      pendingPrayerOfferAfter: pendingAfter,
      shortAnswerGate: Boolean(job.shortAnswerGate),
      vadReason: job.vadReason ?? "vad_silence",
      latency: {
        sttMs,
        guidanceMs,
        ttsMs,
        playbackMs,
        totalTurnMs,
        utteranceMs,
        userSpeechEndAt,
        vadCloseAt,
        sttStartAt,
        sttEndAt,
        guidanceStartAt,
        guidanceEndAt,
        ttsStartAt,
        ttsEndAt,
        firstAudioAt,
        speechEndToFirstAudioMs,
      },
    });

    job.timeline.endTurn({
      ok: true,
      voiceTurnNumber,
      endpoint,
      lane: brain.lane ?? "front_door",
      intent: brain.intent,
      engine: brain.engine,
      sttMs,
      guidanceMs,
      ttsMs,
      playbackMs,
      totalTurnMs,
      earlyMic: true,
      pcmDurationMs: pcmMs,
      speechEndToFirstAudioMs,
      pendingPrayerOffer: pendingAfter,
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
 * @param {{ roomName: string; sessionId: string; firstName?: string; abortSignal?: AbortSignal }} opts
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
  const conversationState = createConversationState(conversationId, { firstName: opts.firstName });
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

          // Context-aware VAD: pending prayer (constrained yes/no) uses a lower
          // min-speech floor so brief affirmations are not discarded.
          const awaitShort = awaitingConstrainedShortAnswer(conversationState.brainState);
          collector.setAwaitingShortAnswer(awaitShort);

          const vad = collector.push(samples);
          if (!vad) continue;

          if (vad.vadReason && vad.vadReason !== "vad_silence" && vad.vadReason !== "vad_speech_too_short") {
            timeline.mark("vad_event", { reason: vad.vadReason });
          }

          // Short-answer gate may yield brief PCM; lower the hard byte floor only then.
          // Ordinary turns keep the 1600-byte noise guard (~16.7ms @48kHz int16 — tiny blips).
          const minBytes = vad.shortAnswerGate ? 800 : 1600;
          if (!vad.utterance || vad.utterance.length < minBytes) {
            if (vad.vadReason === "vad_speech_too_short") {
              timeline.mark("vad_timeout", {
                reason: "speech_too_short",
                shortAnswerGate: Boolean(vad.shortAnswerGate),
                speechMs: vad.speechMs ?? null,
              });
            }
            continue;
          }

          if (vad.shortAnswerGate) {
            log("contextual short-answer VAD accepted", {
              speechMs: vad.speechMs,
              shortAnswerMinSpeechMs: collector.shortAnswerMinSpeechMs,
            });
            timeline.mark("vad_short_answer_accepted", {
              speechMs: vad.speechMs,
              minSpeechMs: collector.shortAnswerMinSpeechMs,
            });
          }

          processing = true;
          collector.pause();
          try {
            await runPhilipLabTurn({
              roomName,
              sessionId,
              utterance: vad.utterance,
              vadReason: vad.vadReason,
              shortAnswerGate: Boolean(vad.shortAnswerGate),
              userSpeechEndAt: vad.speechEndAt ?? Date.now(),
              vadCloseAt: Date.now(),
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
