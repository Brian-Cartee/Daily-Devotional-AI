const params = new URLSearchParams(location.search);
const sessionNumber = Number(params.get("session"));
const statusEl = document.querySelector("#status");
const startButton = document.querySelector("#start");

const PRICING = {
  textInput: 4,
  textCachedInput: 0.4,
  textOutput: 24,
  audioInput: 32,
  audioCachedInput: 0.4,
  audioOutput: 64,
};

let preflight;
let pc;
let dc;
let audioContext;
let inputDestination;
let remoteAnalyser;
let analyserTimer;
let attemptId;
let sessionStartedAt;
let hardStopTimer;
let completed = false;
let lastRemoteAudible = false;
let activeTurn = null;
let currentResponse = null;

const evidence = {
  schemaVersion: 1,
  sessionNumber,
  model: "gpt-realtime-2.1",
  transport: "browser WebRTC unified interface",
  audioRecorded: false,
  userTranscriptSource: "neutral synthetic fixture text",
  startedAt: null,
  endedAt: null,
  durationMs: 0,
  status: "not_started",
  stopReason: null,
  connection: {},
  turns: [],
  responses: [],
  interruptions: [],
  tools: [],
  providerErrors: [],
  events: [],
  usage: {
    textInputTokens: 0,
    cachedTextInputTokens: 0,
    audioInputTokens: 0,
    cachedAudioInputTokens: 0,
    textOutputTokens: 0,
    audioOutputTokens: 0,
  },
  estimatedCostUsd: 0,
};

const waiters = [];
function emitLocal(type, detail = {}) {
  const event = { type, atMs: performance.now(), ...detail };
  for (let i = waiters.length - 1; i >= 0; i -= 1) {
    const waiter = waiters[i];
    if (waiter.predicate(event)) {
      waiters.splice(i, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(event);
    }
  }
  return event;
}

function waitFor(predicate, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const waiter = {
      predicate,
      resolve,
      timer: setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index >= 0) waiters.splice(index, 1);
        reject(new Error(`timeout:${label}`));
      }, timeoutMs),
    };
    waiters.push(waiter);
  });
}

function log(message, data) {
  const line = data ? `${message} ${JSON.stringify(data)}` : message;
  statusEl.textContent += `\n${line}`;
  console.log(line);
}

function send(event) {
  if (!dc || dc.readyState !== "open") throw new Error("data_channel_not_open");
  dc.send(JSON.stringify(event));
}

function estimateCost() {
  const u = evidence.usage;
  const usd =
    (u.textInputTokens * PRICING.textInput +
      u.cachedTextInputTokens * PRICING.textCachedInput +
      u.audioInputTokens * PRICING.audioInput +
      u.cachedAudioInputTokens * PRICING.audioCachedInput +
      u.textOutputTokens * PRICING.textOutput +
      u.audioOutputTokens * PRICING.audioOutput) /
    1_000_000;
  evidence.estimatedCostUsd = Number(usd.toFixed(6));
  return evidence.estimatedCostUsd;
}

function addUsage(usage = {}) {
  const input = usage.input_token_details || {};
  const output = usage.output_token_details || {};
  evidence.usage.textInputTokens += Number(input.text_tokens || 0);
  evidence.usage.cachedTextInputTokens += Number(input.cached_tokens || 0);
  evidence.usage.audioInputTokens += Number(input.audio_tokens || 0);
  evidence.usage.cachedAudioInputTokens += Number(input.cached_audio_tokens || 0);
  evidence.usage.textOutputTokens += Number(output.text_tokens || 0);
  evidence.usage.audioOutputTokens += Number(output.audio_tokens || 0);
  estimateCost();
  const priorCost = Number(preflight.ledger.cumulativeEstimatedCostUsd || 0);
  if (
    priorCost + evidence.estimatedCostUsd >=
    preflight.config.limits.absoluteSpendUsd -
      preflight.config.limits.spendStopBufferUsd
  ) {
    void finish("budget_stop", "estimated_cost_neared_absolute_cap");
  }
}

function extractTranscript(response) {
  return (response?.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.transcript || content.text || "")
    .join("")
    .trim();
}

function wordMetrics(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return {
    words,
    characters: String(text || "").length,
    estimatedAudibleDurationMs: Math.round((words / 150) * 60_000),
  };
}

function handleToolCall(item) {
  if (item.name !== "factual_currentness") {
    evidence.providerErrors.push({
      atMs: performance.now(),
      type: "unsupported_tool_call",
      name: item.name,
    });
    return;
  }
  const output = {
    supported: false,
    reason: "phase2_test_has_no_authorized_live_fact_provider",
    instruction:
      "State that you do not have a verified live result and will not guess. Do not provide a winner or score.",
  };
  evidence.tools.push({
    atMs: performance.now(),
    name: item.name,
    callId: item.call_id,
    arguments: item.arguments,
    output,
  });
  send({
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id: item.call_id,
      output: JSON.stringify(output),
    },
  });
  send({ type: "response.create" });
}

function handleProviderEvent(event) {
  const now = performance.now();
  const keep = [
    "session.created",
    "session.updated",
    "input_audio_buffer.speech_started",
    "input_audio_buffer.speech_stopped",
    "output_audio_buffer.started",
    "output_audio_buffer.stopped",
    "output_audio_buffer.cleared",
    "response.created",
    "response.done",
    "response.cancelled",
    "error",
    "rate_limits.updated",
  ];
  if (keep.includes(event.type)) {
    evidence.events.push({
      type: event.type,
      atMs: now,
      responseId: event.response_id || event.response?.id,
      itemId: event.item_id,
    });
  }

  if (event.type === "session.created") {
    evidence.connection.sessionCreatedAtMs = now;
    evidence.connection.offerToSessionCreatedMs = Math.round(
      now - evidence.connection.offerPostedAtMs,
    );
    emitLocal("session.created", { raw: event });
    return;
  }
  if (event.type === "input_audio_buffer.speech_started") {
    if (activeTurn) activeTurn.providerSpeechStartedAtMs = now;
    emitLocal("speech.started", { raw: event });
    return;
  }
  if (event.type === "input_audio_buffer.speech_stopped") {
    if (activeTurn) activeTurn.providerSpeechStoppedAtMs = now;
    emitLocal("speech.stopped", { raw: event });
    return;
  }
  if (event.type === "output_audio_buffer.started") {
    emitLocal("assistant.output_started", { source: "provider_event", raw: event });
    return;
  }
  if (event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared") {
    emitLocal("assistant.output_stopped", {
      source: event.type,
      raw: event,
    });
    return;
  }
  if (event.type === "response.created") {
    currentResponse = {
      responseId: event.response?.id,
      createdAtMs: now,
      transcriptDeltas: "",
      audioStartAtMs: null,
      audioStopAtMs: null,
    };
    return;
  }
  if (event.type === "response.output_audio_transcript.delta" && currentResponse) {
    currentResponse.transcriptDeltas += event.delta || "";
    return;
  }
  if (event.type === "response.done") {
    addUsage(event.response?.usage);
    const functionCalls = (event.response?.output || []).filter(
      (item) => item.type === "function_call",
    );
    for (const item of functionCalls) handleToolCall(item);

    const transcript =
      extractTranscript(event.response) || currentResponse?.transcriptDeltas || "";
    const response = {
      ...(currentResponse || {}),
      responseId: event.response?.id || currentResponse?.responseId,
      doneAtMs: now,
      status: event.response?.status,
      transcript,
      ...wordMetrics(transcript),
      usage: event.response?.usage || null,
      functionCallOnly: functionCalls.length > 0 && !transcript,
    };
    evidence.responses.push(response);
    currentResponse = null;
    emitLocal("response.done", { response, raw: event });
    return;
  }
  if (event.type === "error") {
    evidence.providerErrors.push({
      atMs: now,
      type: event.error?.type,
      code: event.error?.code,
      message: event.error?.message,
    });
    emitLocal("provider.error", { raw: event });
  }
}

function startRemoteAudioMeter(stream) {
  const source = audioContext.createMediaStreamSource(stream);
  remoteAnalyser = audioContext.createAnalyser();
  remoteAnalyser.fftSize = 1024;
  source.connect(remoteAnalyser);
  source.connect(audioContext.destination);
  const samples = new Uint8Array(remoteAnalyser.fftSize);
  let quietFrames = 0;
  analyserTimer = setInterval(() => {
    remoteAnalyser.getByteTimeDomainData(samples);
    let energy = 0;
    for (const sample of samples) {
      const normalized = (sample - 128) / 128;
      energy += normalized * normalized;
    }
    const rms = Math.sqrt(energy / samples.length);
    const audibleNow = rms > 0.008;
    if (audibleNow) quietFrames = 0;
    else quietFrames += 1;
    const stableAudible = audibleNow || (lastRemoteAudible && quietFrames < 5);
    if (stableAudible !== lastRemoteAudible) {
      lastRemoteAudible = stableAudible;
      const local = emitLocal(
        stableAudible ? "assistant.audible_started" : "assistant.audible_stopped",
        { rms },
      );
      if (currentResponse) {
        if (stableAudible && currentResponse.audioStartAtMs == null) {
          currentResponse.audioStartAtMs = local.atMs;
        }
        if (!stableAudible) currentResponse.audioStopAtMs = local.atMs;
      }
    }
  }, 10);
}

async function playFixture(id, text) {
  activeTurn = {
    id,
    cleanUserTranscript: text,
    fixturePlaybackStartedAtMs: performance.now(),
  };
  evidence.turns.push(activeTurn);
  const response = await fetch(`/fixtures/${id}.wav`, { cache: "no-store" });
  if (!response.ok) throw new Error(`fixture_load_failed:${id}`);
  const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(inputDestination);
  const started = waitFor((event) => event.type === "speech.started", 12_000, `${id}:speech_started`);
  const stopped = waitFor((event) => event.type === "speech.stopped", 15_000, `${id}:speech_stopped`);
  source.start();
  await started;
  await new Promise((resolve) => source.addEventListener("ended", resolve, { once: true }));
  activeTurn.fixturePlaybackEndedAtMs = performance.now();
  await stopped;
  activeTurn.detectedSpeechDurationMs = Math.round(
    activeTurn.providerSpeechStoppedAtMs - activeTurn.providerSpeechStartedAtMs,
  );
  return activeTurn;
}

async function awaitAssistantForTurn(turn, timeoutMs = 25_000) {
  const started = await waitFor(
    (event) =>
      event.type === "assistant.audible_started" ||
      event.type === "assistant.output_started",
    timeoutMs,
    `${turn.id}:assistant_start`,
  );
  turn.firstAudibleAtMs = started.atMs;
  turn.speechEndToFirstAudibleMs = Math.round(
    started.atMs - turn.providerSpeechStoppedAtMs,
  );
  turn.firstAudibleMeasurementSource = started.source || "browser_audio_analyser";
  return started;
}

async function awaitResponseCompletion(timeoutMs = 35_000) {
  while (true) {
    const event = await waitFor(
      (candidate) =>
        candidate.type === "response.done" || candidate.type === "provider.error",
      timeoutMs,
      "response_completion",
    );
    if (event.type === "provider.error") throw new Error("provider_error_during_response");
    if (!event.response.functionCallOnly) return event.response;
  }
}

async function runNormalTurn(turnSpec) {
  const turn = await playFixture(turnSpec.id, turnSpec.text);
  await awaitAssistantForTurn(turn);
  const response = await awaitResponseCompletion();
  turn.responseId = response.responseId;
  turn.assistantTranscript = response.transcript;
  return { turn, response };
}

async function runInterruptedTurn(turnSpec) {
  const initial = await playFixture(turnSpec.id, turnSpec.text);
  await awaitAssistantForTurn(initial);
  await new Promise((resolve) => setTimeout(resolve, turnSpec.interrupt.afterAudibleMs));

  const interruptStartedPromise = waitFor(
    (event) => event.type === "speech.started",
    12_000,
    `${turnSpec.interrupt.id}:speech_started`,
  );
  const interruptStoppedPromise = waitFor(
    (event) => event.type === "speech.stopped",
    15_000,
    `${turnSpec.interrupt.id}:speech_stopped`,
  );
  const outputStoppedPromise = waitFor(
    (event) =>
      event.type === "assistant.audible_stopped" ||
      event.type === "assistant.output_stopped",
    8_000,
    `${turnSpec.interrupt.id}:assistant_stop`,
  );

  activeTurn = {
    id: turnSpec.interrupt.id,
    cleanUserTranscript: turnSpec.interrupt.text,
    fixturePlaybackStartedAtMs: performance.now(),
    isInterruption: true,
  };
  evidence.turns.push(activeTurn);
  const fixtureResponse = await fetch(`/fixtures/${turnSpec.interrupt.id}.wav`, {
    cache: "no-store",
  });
  const buffer = await audioContext.decodeAudioData(await fixtureResponse.arrayBuffer());
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(inputDestination);
  source.start();
  const detected = await interruptStartedPromise;
  activeTurn.providerSpeechStartedAtMs = detected.atMs;
  const audioStopped = await outputStoppedPromise;
  const interruption = {
    turnId: activeTurn.id,
    detectedAtMs: detected.atMs,
    assistantStoppedAtMs: audioStopped.atMs,
    interruptionToAudioStoppedMs: Math.max(0, Math.round(audioStopped.atMs - detected.atMs)),
    stopMeasurementSource: audioStopped.source || "browser_audio_analyser",
  };
  evidence.interruptions.push(interruption);

  await new Promise((resolve) => source.addEventListener("ended", resolve, { once: true }));
  activeTurn.fixturePlaybackEndedAtMs = performance.now();
  const speechStopped = await interruptStoppedPromise;
  activeTurn.providerSpeechStoppedAtMs = speechStopped.atMs;
  await awaitAssistantForTurn(activeTurn);
  const response = await awaitResponseCompletion();
  activeTurn.responseId = response.responseId;
  activeTurn.assistantTranscript = response.transcript;
  return { initial, interrupt: activeTurn, response, interruption };
}

async function finish(status, stopReason = null) {
  if (completed) return;
  completed = true;
  clearTimeout(hardStopTimer);
  clearInterval(analyserTimer);
  evidence.status = status;
  evidence.stopReason = stopReason;
  evidence.endedAt = new Date().toISOString();
  evidence.durationMs = Math.round(performance.now() - sessionStartedAt);
  estimateCost();
  try {
    pc?.close();
  } catch {}
  try {
    await audioContext?.close();
  } catch {}
  if (attemptId) {
    evidence.attemptId = attemptId;
    const saved = await fetch("/api/evidence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(evidence),
    });
    if (!saved.ok) throw new Error(`evidence_save_failed:${saved.status}`);
  }
  document.documentElement.dataset.phase2Status = status;
  window.__PHASE2_RESULT__ = evidence;
  log(`FINISHED ${status}`, { stopReason, cost: evidence.estimatedCostUsd });
}

async function run() {
  startButton.disabled = true;
  statusEl.textContent = "Preflight...";
  preflight = await fetch(`/api/preflight?session=${sessionNumber}`, {
    cache: "no-store",
  }).then((response) => response.json());
  if (!preflight.apiKeyPresent) throw new Error("OPENAI_API_KEY_missing");
  if (preflight.config.session.model !== "gpt-realtime-2.1") {
    throw new Error("model_mismatch");
  }

  evidence.scenario = preflight.scenario.name;
  evidence.sanitizedSessionConfig = preflight.config.session;
  evidence.startedAt = new Date().toISOString();
  sessionStartedAt = performance.now();
  evidence.status = "connecting";

  audioContext = new AudioContext();
  await audioContext.resume();
  inputDestination = audioContext.createMediaStreamDestination();
  pc = new RTCPeerConnection();
  pc.addTrack(inputDestination.stream.getAudioTracks()[0], inputDestination.stream);
  pc.addEventListener("track", (event) => startRemoteAudioMeter(event.streams[0]));
  dc = pc.createDataChannel("oai-events");
  dc.addEventListener("message", (message) => handleProviderEvent(JSON.parse(message.data)));

  const openPromise = new Promise((resolve, reject) => {
    dc.addEventListener("open", resolve, { once: true });
    dc.addEventListener("error", () => reject(new Error("data_channel_error")), {
      once: true,
    });
  });
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  evidence.connection.offerCreatedAtMs = performance.now();
  evidence.connection.offerPostedAtMs = performance.now();
  const answerResponse = await fetch(`/api/session?session=${sessionNumber}`, {
    method: "POST",
    headers: { "content-type": "application/sdp" },
    body: offer.sdp,
  });
  attemptId = answerResponse.headers.get("x-phase2-attempt-id");
  if (!answerResponse.ok) {
    const failure = await answerResponse.text();
    throw new Error(`session_create_failed:${answerResponse.status}:${failure.slice(0, 200)}`);
  }
  evidence.attemptId = attemptId;
  const maxDurationMs = preflight.scenario.maxDurationMs;
  const elapsedSinceStart = performance.now() - sessionStartedAt;
  hardStopTimer = setTimeout(() => {
    void finish("duration_stop", `hard_stop_before_${maxDurationMs}_ms`);
  }, Math.max(1, maxDurationMs - elapsedSinceStart));
  evidence.connection.answerReceivedAtMs = performance.now();
  evidence.connection.offerPostRoundTripMs = Math.round(
    evidence.connection.answerReceivedAtMs - evidence.connection.offerPostedAtMs,
  );
  await pc.setRemoteDescription({
    type: "answer",
    sdp: await answerResponse.text(),
  });
  await openPromise;
  evidence.connection.dataChannelOpenAtMs = performance.now();
  evidence.connection.offerToDataChannelOpenMs = Math.round(
    evidence.connection.dataChannelOpenAtMs - evidence.connection.offerCreatedAtMs,
  );
  if (!evidence.connection.sessionCreatedAtMs) {
    await waitFor((event) => event.type === "session.created", 10_000, "session_created");
  }

  evidence.status = "running";
  for (const turnSpec of preflight.scenario.turns) {
    if (completed) break;
    if (turnSpec.interrupt) await runInterruptedTurn(turnSpec);
    else await runNormalTurn(turnSpec);
    const priorCost = Number(preflight.ledger.cumulativeEstimatedCostUsd || 0);
    if (
      priorCost + estimateCost() >=
      preflight.config.limits.absoluteSpendUsd -
        preflight.config.limits.spendStopBufferUsd
    ) {
      await finish("budget_stop", "estimated_cost_neared_absolute_cap");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  await finish("completed");
}

startButton.addEventListener("click", () => {
  run().catch(async (error) => {
    evidence.providerErrors.push({
      atMs: performance.now(),
      type: "client_or_transport_error",
      message: String(error.message || error),
    });
    log("ERROR", { message: String(error.message || error) });
    await finish("failed", String(error.message || error));
  });
});

if (params.get("autorun") === "1") startButton.click();
