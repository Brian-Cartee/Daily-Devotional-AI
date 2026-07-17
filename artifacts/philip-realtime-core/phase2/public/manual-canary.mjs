import {
  ATTEMPT3_PAID_LIMITS,
  createElapsedTimer,
  createLocalSpeechSilenceDetector,
} from "/localVad.mjs";

const statusEl = document.querySelector("#status");
const levelBar = document.querySelector("#levelBar");
const speechFlag = document.querySelector("#speechFlag");
const silenceFlag = document.querySelector("#silenceFlag");
const micFlag = document.querySelector("#micFlag");
const netFlag = document.querySelector("#netFlag");
const elapsedEl = document.querySelector("#elapsed");
const attemptBanner = document.querySelector("#attemptBanner");
const micTestBtn = document.querySelector("#micTest");
const stopBtn = document.querySelector("#stop");
const beginBtn = document.querySelector("#beginRealtime");

const PRICING = {
  textInput: 4,
  textCachedInput: 0.4,
  textOutput: 24,
  audioInput: 32,
  audioCachedInput: 0.4,
  audioOutput: 64,
};

let attempt3Armed = false;
let paidSessionActive = false;
let audioContext = null;
let mediaStream = null;
let analyser = null;
let pollTimer = null;
let uiTimer = null;
let hardStopTimer = null;
let providerRequestCount = 0;
let speechSeen = false;
let silenceSeen = false;
let localMicTestDone = false;

let pc = null;
let dc = null;
let attemptId = null;
let sessionStartedAt = null;
let completed = false;
let lastRemoteAudible = false;
let remoteAnalyser = null;
let analyserTimer = null;
let currentResponse = null;
let pendingSpeechStoppedAt = null;
let lastAssistantItemId = null;

const detector = createLocalSpeechSilenceDetector({ silenceDurationMs: 1500 });
const timer = createElapsedTimer(() => performance.now());

const evidence = {
  schemaVersion: 1,
  sessionNumber: 1,
  attemptOrdinal: 3,
  model: "gpt-realtime-2.1",
  transport: "browser WebRTC unified interface",
  audioRecorded: false,
  userTranscriptSource: "real_microphone_live",
  syntheticAudio: false,
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

function log(line) {
  statusEl.textContent += `\n${line}`;
  statusEl.scrollTop = statusEl.scrollHeight;
}

function formatElapsed(ms) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function setMicState(state) {
  micFlag.textContent = `microphone: ${state}`;
}

function updateFlags() {
  speechFlag.textContent = `speech detected: ${speechSeen ? "yes" : "no"}`;
  speechFlag.classList.toggle("on-speech", speechSeen);
  silenceFlag.textContent = `silence detected: ${silenceSeen ? "yes" : "no"}`;
  silenceFlag.classList.toggle("on-silence", silenceSeen);
  netFlag.textContent = `provider requests: ${providerRequestCount}`;
}

function hardDisablePaidStart(reason = "Disabled.") {
  beginBtn.disabled = true;
  beginBtn.setAttribute("aria-disabled", "true");
  beginBtn.title = reason;
  beginBtn.textContent = "Begin Authorized Realtime Canary (disabled)";
}

function enablePaidStart() {
  beginBtn.disabled = false;
  beginBtn.removeAttribute("aria-disabled");
  beginBtn.title = "Starts Attempt 3 of 3 with real microphone. Max 2 minutes.";
  beginBtn.textContent = "Begin Authorized Realtime Canary";
  beginBtn.style.background = "#6fbf73";
  beginBtn.style.color = "#102010";
  beginBtn.style.border = "0";
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
  if (item.name !== "factual_currentness") return;
  const output = {
    supported: false,
    reason: "phase2_attempt3_no_live_fact_provider",
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

function send(event) {
  if (!dc || dc.readyState !== "open") throw new Error("data_channel_not_open");
  dc.send(JSON.stringify(event));
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
    log("Provider: session.created");
    return;
  }
  if (event.type === "session.updated") {
    log("Provider: session.updated");
    return;
  }
  if (event.type === "input_audio_buffer.speech_started") {
    speechSeen = true;
    updateFlags();
    if (lastRemoteAudible) {
      const interruption = {
        detectedAtMs: now,
        assistantWasAudible: true,
      };
      evidence.interruptions.push(interruption);
      log("Barge-in: speech_started while assistant audible");
    }
    evidence.turns.push({
      id: `live-${evidence.turns.length + 1}`,
      providerSpeechStartedAtMs: now,
      cleanUserTranscript: "(live microphone; provider transcript not mirrored)",
    });
    emitLocal("speech.started", { raw: event });
    log("Provider VAD: speech_started");
    return;
  }
  if (event.type === "input_audio_buffer.speech_stopped") {
    silenceSeen = true;
    updateFlags();
    pendingSpeechStoppedAt = now;
    const turn = evidence.turns[evidence.turns.length - 1];
    if (turn && turn.providerSpeechStoppedAtMs == null) {
      turn.providerSpeechStoppedAtMs = now;
      if (turn.providerSpeechStartedAtMs != null) {
        turn.detectedSpeechDurationMs = Math.round(
          now - turn.providerSpeechStartedAtMs,
        );
      }
    }
    emitLocal("speech.stopped", { raw: event });
    log("Provider VAD: speech_stopped");
    return;
  }
  if (event.type === "output_audio_buffer.started") {
    emitLocal("assistant.output_started", { source: "provider_event" });
    return;
  }
  if (event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared") {
    if (evidence.interruptions.length) {
      const last = evidence.interruptions[evidence.interruptions.length - 1];
      if (last.assistantStoppedAtMs == null && last.assistantWasAudible) {
        last.assistantStoppedAtMs = now;
        last.interruptionToAudioStoppedMs = Math.max(
          0,
          Math.round(now - last.detectedAtMs),
        );
        log(
          `Barge-in stop measured: ${last.interruptionToAudioStoppedMs}ms`,
        );
      }
    }
    emitLocal("assistant.output_stopped", { source: event.type });
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
    if (
      pendingSpeechStoppedAt != null &&
      response.audioStartAtMs != null
    ) {
      response.speechEndToFirstAudibleMs = Math.round(
        response.audioStartAtMs - pendingSpeechStoppedAt,
      );
    }
    evidence.responses.push(response);
    if (transcript) log(`Assistant: ${transcript}`);
    currentResponse = null;
    emitLocal("response.done", { response });
    return;
  }
  if (event.type === "error") {
    evidence.providerErrors.push({
      atMs: now,
      type: event.error?.type,
      code: event.error?.code,
      message: event.error?.message,
    });
    log(`Provider error: ${event.error?.code || event.error?.type || "unknown"}`);
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
          if (pendingSpeechStoppedAt != null) {
            const latency = Math.round(local.atMs - pendingSpeechStoppedAt);
            currentResponse.speechEndToFirstAudibleMs = latency;
            const turn = evidence.turns[evidence.turns.length - 1];
            if (turn) {
              turn.firstAudibleAtMs = local.atMs;
              turn.speechEndToFirstAudibleMs = latency;
            }
            log(`Measured speech-end → first audible: ${latency}ms`);
          }
        }
        if (!stableAudible) currentResponse.audioStopAtMs = local.atMs;
      }
    }
  }, 10);
}

async function closeLocalOnlyResources() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (mediaStream && !paidSessionActive) {
    for (const track of mediaStream.getTracks()) track.stop();
    mediaStream = null;
  }
  analyser = null;
}

async function finish(status, stopReason = null) {
  if (completed) return;
  completed = true;
  paidSessionActive = false;
  clearTimeout(hardStopTimer);
  clearInterval(analyserTimer);
  clearInterval(uiTimer);
  timer.stop();
  evidence.status = status;
  evidence.stopReason = stopReason;
  evidence.endedAt = new Date().toISOString();
  evidence.durationMs = Math.round(performance.now() - (sessionStartedAt || performance.now()));
  estimateCost();
  try {
    pc?.close();
  } catch {}
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) track.stop();
    mediaStream = null;
  }
  try {
    await audioContext?.close();
  } catch {}
  audioContext = null;
  setMicState("closed");
  hardDisablePaidStart("Attempt 3 finished. Further creation disabled.");
  attemptBanner.textContent = `Attempt 3 of 3 — finished (${status})`;
  if (attemptId) {
    evidence.attemptId = attemptId;
    try {
      await originalFetch("/api/evidence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(evidence),
      });
    } catch (error) {
      log(`Evidence save failed: ${String(error.message || error)}`);
    }
  }
  window.__PHASE2_RESULT__ = evidence;
  document.documentElement.dataset.phase2Status = status;
  log(`FINISHED ${status}${stopReason ? ` (${stopReason})` : ""} · est cost $${evidence.estimatedCostUsd}`);
}

async function startLocalMicTest() {
  if (paidSessionActive) {
    log("Local mic test blocked while paid session is active.");
    return;
  }
  await closeLocalOnlyResources();
  if (audioContext) {
    try {
      await audioContext.close();
    } catch {}
    audioContext = null;
  }
  detector.reset();
  speechSeen = false;
  silenceSeen = false;
  updateFlags();
  statusEl.textContent = "Opening microphone locally (no OpenAI)…";

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  audioContext = new AudioContext();
  await audioContext.resume();
  const source = audioContext.createMediaStreamSource(mediaStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  setMicState("open");
  timer.start();
  uiTimer = setInterval(() => {
    elapsedEl.textContent = formatElapsed(timer.elapsedMs());
  }, 200);
  log("Microphone open. Speak, then stay quiet ≥1.5s. Confirm provider requests stay 0.");

  const samples = new Uint8Array(analyser.fftSize);
  pollTimer = setInterval(() => {
    analyser.getByteTimeDomainData(samples);
    const transition = detector.ingestTimeDomain(samples, performance.now());
    levelBar.style.width = `${Math.min(100, Math.round(detector.lastRms * 280))}%`;
    if (transition === "speech") {
      speechSeen = true;
      updateFlags();
      log("Local VAD: speech detected");
    }
    if (transition === "silence") {
      silenceSeen = true;
      localMicTestDone = true;
      updateFlags();
      log("Local VAD: silence detected (≥1.5s)");
      if (attempt3Armed) {
        enablePaidStart();
        log("Local mic check complete. You may press Begin Authorized Realtime Canary.");
      }
    }
  }, detector.config.pollIntervalMs);
}

async function beginRealtimeCanary() {
  if (!attempt3Armed) {
    log("Blocked: Attempt 3 is not armed.");
    return;
  }
  if (paidSessionActive || completed) {
    log("Blocked: paid session already started or finished.");
    return;
  }
  if (!localMicTestDone || !speechSeen || !silenceSeen) {
    log("Complete the local microphone test (speech + 1.5s silence) before Begin.");
    return;
  }
  if (providerRequestCount !== 0) {
    log("Blocked: unexpected provider requests occurred during local prep.");
    return;
  }

  hardDisablePaidStart("Connecting Attempt 3…");
  micTestBtn.disabled = true;
  await closeLocalOnlyResources();
  if (audioContext) {
    try {
      await audioContext.close();
    } catch {}
    audioContext = null;
  }

  paidSessionActive = true;
  providerRequestCount = 0;
  updateFlags();
  attemptBanner.textContent = "Attempt 3 of 3 — paid Realtime connection in progress";
  evidence.startedAt = new Date().toISOString();
  sessionStartedAt = performance.now();
  evidence.status = "connecting";
  evidence.syntheticAudio = false;
  timer.start();
  uiTimer = setInterval(() => {
    elapsedEl.textContent = formatElapsed(timer.elapsedMs());
  }, 200);

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  audioContext = new AudioContext();
  await audioContext.resume();
  setMicState("open (live Realtime)");

  // Local level meter only (not recorded).
  const localSource = audioContext.createMediaStreamSource(mediaStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  localSource.connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  pollTimer = setInterval(() => {
    analyser.getByteTimeDomainData(samples);
    let energy = 0;
    for (const sample of samples) {
      const n = (sample - 128) / 128;
      energy += n * n;
    }
    const rms = Math.sqrt(energy / samples.length);
    levelBar.style.width = `${Math.min(100, Math.round(rms * 280))}%`;
  }, 50);

  pc = new RTCPeerConnection();
  for (const track of mediaStream.getAudioTracks()) {
    pc.addTrack(track, mediaStream);
  }
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
  log("Posting SDP offer to local trusted server (Attempt 3 will be counted now)…");

  const answerResponse = await originalFetch("/api/session?session=1", {
    method: "POST",
    headers: { "content-type": "application/sdp" },
    body: offer.sdp,
  });
  providerRequestCount += 1;
  updateFlags();
  attemptId = answerResponse.headers.get("x-phase2-attempt-id");
  if (!answerResponse.ok) {
    const failure = await answerResponse.text();
    throw new Error(`session_create_failed:${answerResponse.status}:${failure.slice(0, 200)}`);
  }
  evidence.attemptId = attemptId;
  evidence.connection.answerReceivedAtMs = performance.now();
  evidence.connection.offerPostRoundTripMs = Math.round(
    evidence.connection.answerReceivedAtMs - evidence.connection.offerPostedAtMs,
  );
  log(
    `SDP answer received in ${evidence.connection.offerPostRoundTripMs}ms · attemptId=${attemptId}`,
  );

  hardStopTimer = setTimeout(() => {
    void finish("duration_stop", `hard_stop_before_${ATTEMPT3_PAID_LIMITS.maxDurationMs}_ms`);
  }, ATTEMPT3_PAID_LIMITS.maxDurationMs);

  await pc.setRemoteDescription({
    type: "answer",
    sdp: await answerResponse.text(),
  });
  await openPromise;
  evidence.connection.dataChannelOpenAtMs = performance.now();
  evidence.connection.offerToDataChannelOpenMs = Math.round(
    evidence.connection.dataChannelOpenAtMs - evidence.connection.offerCreatedAtMs,
  );
  log(
    `Data channel open in ${evidence.connection.offerToDataChannelOpenMs}ms from offer create`,
  );
  if (!evidence.connection.sessionCreatedAtMs) {
    await waitFor((event) => event.type === "session.created", 10_000, "session_created");
  }
  evidence.status = "running";
  log("Live. Speak naturally. Interrupt once while Philip is talking. Then say goodbye.");
  log("Emergency Stop remains active. Auto-teardown at 2 minutes.");
}

async function emergencyStop() {
  log("Emergency Stop pressed.");
  if (paidSessionActive || attemptId) {
    try {
      if (dc && dc.readyState === "open") {
        send({ type: "response.cancel" });
        send({ type: "output_audio_buffer.clear" });
      }
    } catch {}
    await finish("stopped", "emergency_stop");
    return;
  }
  clearInterval(pollTimer);
  clearInterval(uiTimer);
  timer.stop();
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) track.stop();
    mediaStream = null;
  }
  if (audioContext) {
    try {
      await audioContext.close();
    } catch {}
    audioContext = null;
  }
  setMicState("closed");
  levelBar.style.width = "0%";
  if (attempt3Armed && !completed) {
    enablePaidStart();
    log("Local resources closed. Paid Begin remains available until used.");
  } else {
    hardDisablePaidStart();
    log("Stopped. Paid connection was not started.");
  }
}

const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(typeof input === "string" ? input : input?.url || "");
  // Block direct browser→OpenAI. Local /api/session is allowed only while Begin is running.
  if (/api\.openai\.com/i.test(url)) {
    providerRequestCount += 1;
    updateFlags();
    log(`Blocked browser→OpenAI request: ${url}`);
    throw new Error("browser_must_not_hold_standard_api_key");
  }
  if (/\/api\/session\b/i.test(url) && !paidSessionActive) {
    providerRequestCount += 1;
    updateFlags();
    log(`Blocked accidental /api/session before Begin: ${url}`);
    throw new Error("provider_request_blocked_until_begin");
  }
  return originalFetch(input, init);
};

beginBtn.addEventListener("click", (event) => {
  event.preventDefault();
  beginRealtimeCanary().catch(async (error) => {
    evidence.providerErrors.push({
      atMs: performance.now(),
      type: "client_or_transport_error",
      message: String(error.message || error),
    });
    log(`Begin failed: ${String(error.message || error)}`);
    await finish("failed", String(error.message || error));
  });
});

micTestBtn.addEventListener("click", () => {
  startLocalMicTest().catch(async (error) => {
    const message = String(error && error.message ? error.message : error);
    if (/NotAllowedError|Permission denied/i.test(message) || error?.name === "NotAllowedError") {
      log("Microphone permission denied.");
      setMicState("denied");
    } else {
      log(`Local mic error: ${message}`);
      setMicState("error");
    }
  });
});

stopBtn.addEventListener("click", () => {
  emergencyStop().catch((error) => log(`Stop error: ${String(error.message || error)}`));
});

async function boot() {
  hardDisablePaidStart("Checking arming status…");
  updateFlags();
  elapsedEl.textContent = "00:00";
  const prep = await originalFetch("/api/prep-status", { cache: "no-store" }).then((r) =>
    r.json(),
  );
  attempt3Armed = Boolean(prep.attempt3Armed);
  if (!attempt3Armed) {
    attemptBanner.textContent = "Attempt 3 of 3 — paid connection not started";
    hardDisablePaidStart("Disabled during unpaid preparation. Attempt 3 is not armed.");
    log("Preparation mode. Attempt 3 not armed. No OpenAI connection will start.");
    return;
  }
  attemptBanner.textContent =
    "Attempt 3 of 3 — ARMED. Complete local mic test, then press Begin when ready.";
  hardDisablePaidStart("Complete local mic speech+silence test before Begin.");
  log("Attempt 3 is armed in the local server process.");
  log("1) Test Microphone Locally  2) Speak + 1.5s silence  3) Confirm provider requests: 0  4) Begin");
  log(
    `Limits: model=${ATTEMPT3_PAID_LIMITS.model}, max=${ATTEMPT3_PAID_LIMITS.maxDurationMs}ms, cap=$${ATTEMPT3_PAID_LIMITS.absoluteSpendUsd}`,
  );
}

window.__PHASE2_MANUAL_CANARY__ = {
  getAttempt3Armed: () => attempt3Armed,
  isBeginDisabled: () => beginBtn.disabled,
  getProviderRequestCount: () => providerRequestCount,
  getSpeechSeen: () => speechSeen,
  getSilenceSeen: () => silenceSeen,
  getMicOpen: () => Boolean(mediaStream),
  getPaidSessionActive: () => paidSessionActive,
  emergencyStop,
  getEvidence: () => evidence,
};

boot().catch((error) => log(`Boot failed: ${String(error.message || error)}`));
