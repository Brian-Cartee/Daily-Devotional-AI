const $ = (selector) => document.querySelector(selector);
const bannerEl = $("#banner");
const statusEl = $("#status");
const levelEl = $("#level");
const micFlag = $("#micFlag");
const speechFlag = $("#speechFlag");
const silenceFlag = $("#silenceFlag");
const networkFlag = $("#networkFlag");
const elapsedEl = $("#elapsed");
const micTestBtn = $("#micTest");
const stopMicBtn = $("#stopMic");
const beginBtn = $("#begin");
const endBtn = $("#end");
const emergencyBtn = $("#emergency");
const originalFetch = window.fetch.bind(window);

const PRICING_PER_MILLION = Object.freeze({
  realtime: {
    textInput: 4,
    cachedTextInput: 0.4,
    audioInput: 32,
    cachedAudioInput: 0.4,
    textOutput: 24,
    audioOutput: 64,
  },
  transcription: {
    input: 1.25,
    output: 5,
  },
});

let status = null;
let micStream = null;
let audioContext = null;
let localAnalyser = null;
let localPoll = null;
let uiTimer = null;
let hardStopTimer = null;
let pc = null;
let dc = null;
let remoteAnalyser = null;
let remotePoll = null;
let providerRequestCount = 0;
let speechSeen = false;
let silenceSeen = false;
let localCheckPassed = false;
let sessionActive = false;
let completed = false;
let sessionStartedAtMs = null;
let currentResponse = null;
let remoteAudible = false;
let quietRemoteFrames = 0;
let lastSpeechStoppedAtMs = null;
let pendingTurn = null;
const turnByItemId = new Map();

const evidence = {
  schemaVersion: 1,
  phase: "2B",
  sessionNumber: 1,
  model: "gpt-realtime-2.1",
  transcriptionModel: "gpt-4o-mini-transcribe",
  transport: "browser WebRTC unified interface",
  microphone: "real",
  syntheticAudio: false,
  audioRecorded: false,
  audioPersisted: false,
  transcriptStorage: "sanitized local research evidence",
  startedAt: null,
  endedAt: null,
  durationMs: 0,
  status: "not_started",
  stopReason: null,
  connection: {},
  turns: [],
  responses: [],
  interruptions: [],
  transcription: {
    completed: 0,
    failed: 0,
    usage: {
      inputTokens: 0,
      audioInputTokens: 0,
      textInputTokens: 0,
      outputTokens: 0,
    },
  },
  realtimeUsage: {
    textInputTokens: 0,
    cachedTextInputTokens: 0,
    audioInputTokens: 0,
    cachedAudioInputTokens: 0,
    textOutputTokens: 0,
    audioOutputTokens: 0,
  },
  providerErrors: [],
  tools: [],
  events: [],
  realtimeEstimatedCostUsd: 0,
  transcriptionEstimatedCostUsd: 0,
  estimatedCostUsd: 0,
};

function nowMs() {
  return performance.now();
}

function log(message) {
  statusEl.textContent += `${statusEl.textContent ? "\n" : ""}${message}`;
  statusEl.scrollTop = statusEl.scrollHeight;
}

function formatElapsed(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function updateFlags() {
  speechFlag.textContent = `speech: ${speechSeen ? "yes" : "no"}`;
  silenceFlag.textContent = `silence after speech: ${silenceSeen ? "yes" : "no"}`;
  networkFlag.textContent = `provider requests: ${providerRequestCount}`;
}

function setBeginEnabled(enabled, reason = "") {
  beginBtn.disabled = !enabled;
  beginBtn.textContent = enabled ? "Begin Session 1" : "Begin Session 1 (disabled)";
  beginBtn.title = reason;
}

function wordMetrics(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return {
    words,
    characters: String(text || "").length,
    estimatedSpokenDurationMs: Math.round((words / 150) * 60_000),
  };
}

function recomputeCosts() {
  const r = evidence.realtimeUsage;
  evidence.realtimeEstimatedCostUsd = Number(
    ((
      r.textInputTokens * PRICING_PER_MILLION.realtime.textInput +
      r.cachedTextInputTokens * PRICING_PER_MILLION.realtime.cachedTextInput +
      r.audioInputTokens * PRICING_PER_MILLION.realtime.audioInput +
      r.cachedAudioInputTokens * PRICING_PER_MILLION.realtime.cachedAudioInput +
      r.textOutputTokens * PRICING_PER_MILLION.realtime.textOutput +
      r.audioOutputTokens * PRICING_PER_MILLION.realtime.audioOutput
    ) / 1_000_000).toFixed(6),
  );
  const t = evidence.transcription.usage;
  evidence.transcriptionEstimatedCostUsd = Number(
    ((
      t.inputTokens * PRICING_PER_MILLION.transcription.input +
      t.outputTokens * PRICING_PER_MILLION.transcription.output
    ) / 1_000_000).toFixed(6),
  );
  evidence.estimatedCostUsd = Number(
    (
      evidence.realtimeEstimatedCostUsd +
      evidence.transcriptionEstimatedCostUsd
    ).toFixed(6),
  );
  const remainingBeforeSession = Math.max(
    0,
    Number(status?.capUsd || 0) -
      Number(status?.cumulativeEstimatedCostUsd || 0),
  );
  if (
    sessionActive &&
    !completed &&
    remainingBeforeSession > 0 &&
    evidence.estimatedCostUsd >= Math.max(0, remainingBeforeSession - 0.1)
  ) {
    void finish("budget_stop", "phase2b_cap_buffer_reached");
  }
}

function addRealtimeUsage(usage = {}) {
  const input = usage.input_token_details || {};
  const cached = input.cached_tokens_details || {};
  const output = usage.output_token_details || {};
  const cachedText = Number(cached.text_tokens || 0);
  const cachedAudio = Number(cached.audio_tokens || 0);
  evidence.realtimeUsage.textInputTokens += Math.max(
    0,
    Number(input.text_tokens || 0) - cachedText,
  );
  evidence.realtimeUsage.cachedTextInputTokens += cachedText;
  evidence.realtimeUsage.audioInputTokens += Math.max(
    0,
    Number(input.audio_tokens || 0) - cachedAudio,
  );
  evidence.realtimeUsage.cachedAudioInputTokens += cachedAudio;
  evidence.realtimeUsage.textOutputTokens += Number(output.text_tokens || 0);
  evidence.realtimeUsage.audioOutputTokens += Number(output.audio_tokens || 0);
  recomputeCosts();
}

function addTranscriptionUsage(usage = {}) {
  const inputDetails = usage.input_token_details || {};
  const t = evidence.transcription.usage;
  t.inputTokens += Number(usage.input_tokens || 0);
  t.audioInputTokens += Number(inputDetails.audio_tokens || 0);
  t.textInputTokens += Number(inputDetails.text_tokens || 0);
  t.outputTokens += Number(usage.output_tokens || 0);
  recomputeCosts();
}

function eventRecord(event, atMs) {
  return {
    type: event.type,
    atMs,
    eventId: event.event_id || null,
    itemId: event.item_id || null,
    responseId: event.response_id || event.response?.id || null,
  };
}

function send(event) {
  if (!dc || dc.readyState !== "open") throw new Error("data_channel_not_open");
  dc.send(JSON.stringify(event));
}

function handleToolCall(item) {
  if (item.name !== "factual_currentness") return;
  const output = {
    supported: false,
    reason: "phase2b_no_authorized_current_fact_provider",
    instruction: "Say you do not have a verified current result and will not guess.",
  };
  evidence.tools.push({
    atMs: nowMs(),
    name: item.name,
    callId: item.call_id,
    arguments: item.arguments || "",
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

function latestUnboundTurn() {
  return [...evidence.turns].reverse().find((turn) => !turn.itemId) || pendingTurn;
}

function handleProviderEvent(event) {
  const atMs = nowMs();
  const observedTypes = new Set([
    "session.created",
    "session.updated",
    "input_audio_buffer.speech_started",
    "input_audio_buffer.speech_stopped",
    "input_audio_buffer.committed",
    "conversation.item.input_audio_transcription.completed",
    "conversation.item.input_audio_transcription.failed",
    "output_audio_buffer.started",
    "output_audio_buffer.stopped",
    "output_audio_buffer.cleared",
    "response.created",
    "response.done",
    "response.cancelled",
    "error",
  ]);
  if (observedTypes.has(event.type)) evidence.events.push(eventRecord(event, atMs));

  if (event.type === "session.created") {
    evidence.connection.sessionCreatedAtMs = atMs;
    evidence.connection.offerToSessionCreatedMs = Math.round(
      atMs - evidence.connection.offerPostedAtMs,
    );
    log("Provider session created.");
    return;
  }

  if (event.type === "input_audio_buffer.speech_started") {
    const turn = {
      turnNumber: evidence.turns.length + 1,
      itemId: event.item_id || null,
      speechStartedAtMs: atMs,
      providerAudioStartMs: event.audio_start_ms ?? null,
      transcript: "",
      transcriptStatus: "pending",
    };
    evidence.turns.push(turn);
    pendingTurn = turn;
    if (turn.itemId) turnByItemId.set(turn.itemId, turn);
    if (remoteAudible) {
      const interruption = {
        turnNumber: turn.turnNumber,
        detectedAtMs: atMs,
        assistantWasAudible: true,
        assistantResponseId: currentResponse?.responseId || null,
      };
      evidence.interruptions.push(interruption);
      log("Barge-in detected while Philip was audible.");
    }
    log(`VAD speech_started · turn ${turn.turnNumber}`);
    return;
  }

  if (event.type === "input_audio_buffer.speech_stopped") {
    lastSpeechStoppedAtMs = atMs;
    const turn =
      (event.item_id && turnByItemId.get(event.item_id)) ||
      pendingTurn ||
      evidence.turns.at(-1);
    if (turn) {
      if (event.item_id && !turn.itemId) {
        turn.itemId = event.item_id;
        turnByItemId.set(event.item_id, turn);
      }
      turn.speechStoppedAtMs = atMs;
      turn.providerAudioEndMs = event.audio_end_ms ?? null;
      turn.userSpeakingTimeMs = Math.max(0, Math.round(atMs - turn.speechStartedAtMs));
    }
    log(`VAD speech_stopped · turn ${turn?.turnNumber || "unknown"}`);
    return;
  }

  if (event.type === "input_audio_buffer.committed") {
    const turn = pendingTurn || latestUnboundTurn() || evidence.turns.at(-1);
    if (turn && event.item_id) {
      turn.itemId = event.item_id;
      turn.committedAtMs = atMs;
      turn.previousItemId = event.previous_item_id || null;
      turnByItemId.set(event.item_id, turn);
    }
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.completed") {
    const turn =
      turnByItemId.get(event.item_id) ||
      evidence.turns.find((candidate) => !candidate.transcript) ||
      null;
    if (turn) {
      turn.itemId = event.item_id;
      turn.transcript = String(event.transcript || "").trim();
      turn.transcriptStatus = "completed";
      turn.transcriptCompletedAtMs = atMs;
      turn.transcriptCompletionFromSpeechEndMs =
        turn.speechStoppedAtMs == null
          ? null
          : Math.round(atMs - turn.speechStoppedAtMs);
      turn.transcriptionUsage = event.usage || null;
      turnByItemId.set(event.item_id, turn);
      log(`Brian: ${turn.transcript}`);
    }
    evidence.transcription.completed += 1;
    addTranscriptionUsage(event.usage);
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.failed") {
    const turn = turnByItemId.get(event.item_id);
    if (turn) {
      turn.transcriptStatus = "failed";
      turn.transcriptError = {
        type: event.error?.type || null,
        code: event.error?.code || null,
        message: event.error?.message || null,
      };
    }
    evidence.transcription.failed += 1;
    log(`Input transcription failed for ${event.item_id || "unknown item"}.`);
    return;
  }

  if (event.type === "response.created") {
    currentResponse = {
      responseNumber: evidence.responses.length + 1,
      responseId: event.response?.id || null,
      createdAtMs: atMs,
      transcriptDeltas: "",
      audioStartAtMs: null,
      audioStopAtMs: null,
    };
    return;
  }

  if (event.type === "response.output_audio_transcript.delta") {
    if (!currentResponse) {
      currentResponse = {
        responseNumber: evidence.responses.length + 1,
        responseId: event.response_id || null,
        createdAtMs: atMs,
        transcriptDeltas: "",
        audioStartAtMs: null,
        audioStopAtMs: null,
      };
    }
    currentResponse.transcriptDeltas += event.delta || "";
    return;
  }

  if (
    event.type === "output_audio_buffer.stopped" ||
    event.type === "output_audio_buffer.cleared"
  ) {
    const interruption = evidence.interruptions.at(-1);
    if (
      interruption?.assistantWasAudible &&
      interruption.assistantStoppedAtMs == null
    ) {
      interruption.assistantStoppedAtMs = atMs;
      interruption.interruptionToAudioStoppedMs = Math.max(
        0,
        Math.round(atMs - interruption.detectedAtMs),
      );
      interruption.stopEvent = event.type;
      log(`Barge-in audio stop: ${interruption.interruptionToAudioStoppedMs}ms.`);
    }
    return;
  }

  if (event.type === "response.done") {
    addRealtimeUsage(event.response?.usage);
    const functionCalls = (event.response?.output || []).filter(
      (item) => item.type === "function_call",
    );
    for (const item of functionCalls) handleToolCall(item);
    const response = currentResponse || {
      responseNumber: evidence.responses.length + 1,
      responseId: event.response?.id || null,
      transcriptDeltas: "",
      audioStartAtMs: null,
      audioStopAtMs: null,
    };
    response.responseId = event.response?.id || response.responseId;
    response.doneAtMs = atMs;
    response.status = event.response?.status || null;
    response.transcript = (
      (event.response?.output || [])
        .flatMap((item) => item.content || [])
        .map((content) => content.transcript || content.text || "")
        .join("") || response.transcriptDeltas
    ).trim();
    Object.assign(response, wordMetrics(response.transcript));
    response.usage = event.response?.usage || null;
    response.functionCallOnly = functionCalls.length > 0 && !response.transcript;
    if (response.audioStartAtMs != null && lastSpeechStoppedAtMs != null) {
      response.speechEndToFirstAudibleMs = Math.round(
        response.audioStartAtMs - lastSpeechStoppedAtMs,
      );
    }
    if (!evidence.responses.includes(response)) evidence.responses.push(response);
    if (response.transcript) log(`Philip: ${response.transcript}`);
    return;
  }

  if (event.type === "error") {
    evidence.providerErrors.push({
      atMs,
      type: event.error?.type || null,
      code: event.error?.code || null,
      message: event.error?.message || null,
    });
    log(`Provider error: ${event.error?.code || event.error?.type || "unknown"}`);
  }
}

function startRemoteAudio(stream) {
  const source = audioContext.createMediaStreamSource(stream);
  remoteAnalyser = audioContext.createAnalyser();
  remoteAnalyser.fftSize = 1024;
  source.connect(remoteAnalyser);
  source.connect(audioContext.destination);
  const samples = new Uint8Array(remoteAnalyser.fftSize);
  remotePoll = setInterval(() => {
    remoteAnalyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      const n = (sample - 128) / 128;
      sum += n * n;
    }
    const audibleNow = Math.sqrt(sum / samples.length) > 0.008;
    quietRemoteFrames = audibleNow ? 0 : quietRemoteFrames + 1;
    const stableAudible = audibleNow || (remoteAudible && quietRemoteFrames < 5);
    if (stableAudible === remoteAudible) return;
    remoteAudible = stableAudible;
    const atMs = nowMs();
    if (stableAudible && currentResponse?.audioStartAtMs == null) {
      currentResponse.audioStartAtMs = atMs;
      if (lastSpeechStoppedAtMs != null) {
        const latency = Math.round(atMs - lastSpeechStoppedAtMs);
        currentResponse.speechEndToFirstAudibleMs = latency;
        const turn = evidence.turns.at(-1);
        if (turn) {
          turn.firstAudibleAtMs = atMs;
          turn.speechEndToFirstAudibleMs = latency;
        }
        log(`Speech-end → first audible: ${latency}ms.`);
      }
    }
    if (!stableAudible && currentResponse) {
      currentResponse.audioStopAtMs = atMs;
      if (currentResponse.audioStartAtMs != null) {
        currentResponse.audibleDurationMs = Math.max(
          0,
          Math.round(atMs - currentResponse.audioStartAtMs),
        );
      }
    }
  }, 10);
}

function stopIntervals() {
  clearInterval(localPoll);
  clearInterval(remotePoll);
  clearInterval(uiTimer);
  clearTimeout(hardStopTimer);
  localPoll = null;
  remotePoll = null;
  uiTimer = null;
  hardStopTimer = null;
}

async function closeMedia() {
  stopIntervals();
  if (micStream) for (const track of micStream.getTracks()) track.stop();
  micStream = null;
  try {
    pc?.close();
  } catch {}
  pc = null;
  dc = null;
  try {
    await audioContext?.close();
  } catch {}
  audioContext = null;
  localAnalyser = null;
  remoteAnalyser = null;
  remoteAudible = false;
  levelEl.style.width = "0%";
  micFlag.textContent = "microphone: closed";
}

async function startLocalMicCheck() {
  if (sessionActive) return;
  await closeMedia();
  speechSeen = false;
  silenceSeen = false;
  localCheckPassed = false;
  updateFlags();
  statusEl.textContent = "Opening microphone locally. No provider request.";
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
  audioContext = new AudioContext();
  await audioContext.resume();
  const source = audioContext.createMediaStreamSource(micStream);
  localAnalyser = audioContext.createAnalyser();
  localAnalyser.fftSize = 2048;
  source.connect(localAnalyser);
  micFlag.textContent = "microphone: open (local only)";
  stopMicBtn.disabled = false;
  micTestBtn.disabled = true;
  const samples = new Uint8Array(localAnalyser.fftSize);
  let speaking = false;
  let quietSince = null;
  localPoll = setInterval(() => {
    localAnalyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      const n = (sample - 128) / 128;
      sum += n * n;
    }
    const rms = Math.sqrt(sum / samples.length);
    levelEl.style.width = `${Math.min(100, Math.round(rms * 280))}%`;
    if (rms >= 0.02) {
      quietSince = null;
      if (!speaking) {
        speaking = true;
        speechSeen = true;
        log("Local speech detected.");
      }
    } else if (speaking && rms <= 0.01) {
      if (quietSince == null) quietSince = nowMs();
      if (nowMs() - quietSince >= 1500 && !silenceSeen) {
        speaking = false;
        silenceSeen = true;
        localCheckPassed = true;
        log("Local silence after speech detected. Check passed.");
        if (status?.armed && status?.session1Available) setBeginEnabled(true);
      }
    } else {
      quietSince = null;
    }
    updateFlags();
  }, 50);
}

async function stopLocalMicCheck() {
  await closeMedia();
  micTestBtn.disabled = false;
  stopMicBtn.disabled = true;
  if (localCheckPassed && status?.armed && status?.session1Available) {
    setBeginEnabled(true);
  }
}

async function beginSession() {
  if (!status?.armed || !status?.session1Available) throw new Error("session1_not_available");
  if (!localCheckPassed || !speechSeen || !silenceSeen) {
    throw new Error("local_microphone_check_required");
  }
  if (providerRequestCount !== 0) throw new Error("unexpected_provider_request_in_prep");
  setBeginEnabled(false, "Session 1 has started.");
  micTestBtn.disabled = true;
  stopMicBtn.disabled = true;
  await closeMedia();

  sessionActive = true;
  evidence.status = "connecting";
  evidence.startedAt = new Date().toISOString();
  sessionStartedAtMs = nowMs();
  bannerEl.textContent = "Session 1 is live — natural conversation, maximum five minutes.";
  endBtn.disabled = false;
  uiTimer = setInterval(() => {
    elapsedEl.textContent = formatElapsed(nowMs() - sessionStartedAtMs);
  }, 200);

  micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
  audioContext = new AudioContext();
  await audioContext.resume();
  micFlag.textContent = "microphone: open (live Realtime)";
  const localSource = audioContext.createMediaStreamSource(micStream);
  localAnalyser = audioContext.createAnalyser();
  localAnalyser.fftSize = 2048;
  localSource.connect(localAnalyser);
  const samples = new Uint8Array(localAnalyser.fftSize);
  localPoll = setInterval(() => {
    localAnalyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      const n = (sample - 128) / 128;
      sum += n * n;
    }
    levelEl.style.width = `${Math.min(100, Math.round(Math.sqrt(sum / samples.length) * 280))}%`;
  }, 50);

  pc = new RTCPeerConnection();
  for (const track of micStream.getAudioTracks()) pc.addTrack(track, micStream);
  pc.addEventListener("track", (event) => startRemoteAudio(event.streams[0]));
  dc = pc.createDataChannel("oai-events");
  dc.addEventListener("message", (message) => {
    try {
      handleProviderEvent(JSON.parse(message.data));
    } catch (error) {
      evidence.providerErrors.push({
        atMs: nowMs(),
        type: "client_event_handler",
        message: String(error.message || error),
      });
    }
  });
  const dataOpen = new Promise((resolve, reject) => {
    dc.addEventListener("open", resolve, { once: true });
    dc.addEventListener("error", () => reject(new Error("data_channel_error")), {
      once: true,
    });
  });
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  evidence.connection.offerCreatedAtMs = nowMs();
  evidence.connection.offerPostedAtMs = nowMs();
  log("Manual Begin accepted. Posting SDP through trusted local server.");
  const answerResponse = await originalFetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/sdp" },
    body: offer.sdp,
  });
  providerRequestCount += 1;
  updateFlags();
  if (!answerResponse.ok) {
    const body = await answerResponse.text();
    throw new Error(`session_create_failed:${answerResponse.status}:${body.slice(0, 160)}`);
  }
  evidence.sessionId = answerResponse.headers.get("x-phase2b-session-id");
  evidence.connection.answerReceivedAtMs = nowMs();
  evidence.connection.offerPostRoundTripMs = Math.round(
    evidence.connection.answerReceivedAtMs - evidence.connection.offerPostedAtMs,
  );
  await pc.setRemoteDescription({
    type: "answer",
    sdp: await answerResponse.text(),
  });
  await dataOpen;
  evidence.connection.dataChannelOpenAtMs = nowMs();
  evidence.connection.offerToDataChannelOpenMs = Math.round(
    evidence.connection.dataChannelOpenAtMs - evidence.connection.offerCreatedAtMs,
  );
  evidence.status = "running";
  hardStopTimer = setTimeout(() => {
    void finish("duration_stop", "five_minute_hard_stop");
  }, Number(status.maxDurationMs));
  log("LIVE. Speak naturally; Philip was not told the evaluation categories.");
}

async function finish(finalStatus, stopReason) {
  if (completed) return;
  completed = true;
  sessionActive = false;
  evidence.status = finalStatus;
  evidence.stopReason = stopReason;
  evidence.endedAt = new Date().toISOString();
  evidence.durationMs = Math.max(
    0,
    Math.round(nowMs() - (sessionStartedAtMs || nowMs())),
  );
  recomputeCosts();
  await closeMedia();
  endBtn.disabled = true;
  setBeginEnabled(false, "Session 1 complete; report required before another session.");
  bannerEl.textContent = `Session 1 finished — ${stopReason}. No further session is enabled.`;
  if (evidence.sessionId) {
    const response = await originalFetch("/api/evidence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(evidence),
    });
    if (!response.ok) log(`Evidence save failed: HTTP ${response.status}`);
    else log(`Evidence saved. Total estimated cost: $${evidence.estimatedCostUsd}.`);
  }
  window.__PHASE2B_RESULT__ = evidence;
  document.documentElement.dataset.phase2bStatus = finalStatus;
}

async function endAndSave() {
  endBtn.disabled = true;
  log("Ending after a short transcript-completion grace period…");
  await new Promise((resolve) => setTimeout(resolve, 1800));
  await finish("completed", "manual_natural_close");
}

async function emergencyStop() {
  if (sessionActive) {
    try {
      send({ type: "response.cancel" });
      send({ type: "output_audio_buffer.clear" });
    } catch {}
    await finish("stopped", "emergency_stop");
    return;
  }
  await stopLocalMicCheck();
  log("Local resources stopped; no provider session was started.");
}

window.fetch = async (input, init) => {
  const url = String(typeof input === "string" ? input : input?.url || "");
  if (/api\.openai\.com/i.test(url)) {
    providerRequestCount += 1;
    updateFlags();
    throw new Error("direct_browser_provider_access_blocked");
  }
  if (/\/api\/session\b/i.test(url) && !sessionActive) {
    providerRequestCount += 1;
    updateFlags();
    throw new Error("session_creation_blocked_until_manual_begin");
  }
  return originalFetch(input, init);
};

micTestBtn.addEventListener("click", () => {
  startLocalMicCheck().catch((error) => log(`Local mic error: ${error.message || error}`));
});
stopMicBtn.addEventListener("click", () => {
  stopLocalMicCheck().catch((error) => log(`Stop error: ${error.message || error}`));
});
beginBtn.addEventListener("click", () => {
  beginSession().catch(async (error) => {
    evidence.providerErrors.push({
      atMs: nowMs(),
      type: "client_or_transport_error",
      message: String(error.message || error),
    });
    log(`Begin failed: ${error.message || error}`);
    await finish("failed", "session_start_failure");
  });
});
endBtn.addEventListener("click", () => {
  endAndSave().catch((error) => log(`End error: ${error.message || error}`));
});
emergencyBtn.addEventListener("click", () => {
  emergencyStop().catch((error) => log(`Emergency stop error: ${error.message || error}`));
});

async function boot() {
  setBeginEnabled(false, "Complete local microphone check first.");
  updateFlags();
  status = await originalFetch("/api/status", { cache: "no-store" }).then((r) => r.json());
  if (!status.armed) {
    bannerEl.textContent = "UNPAID PREPARATION — Session 1 is not armed.";
    log("No provider session can start. Local microphone check remains available.");
    return;
  }
  if (!status.session1Available) {
    bannerEl.textContent = "Session 1 already consumed — report required.";
    log("No additional Phase 2B session is enabled.");
    return;
  }
  bannerEl.textContent =
    "ARMED for Session 1 only. Complete the local check; then manually press Begin.";
  log(
    `Armed: ${status.model} + async ${status.transcriptionModel}; max ${Math.round(
      status.maxDurationMs / 1000,
    )}s; Phase 2B cap $${status.capUsd}.`,
  );
}

window.__PHASE2B__ = {
  getStatus: () => status,
  getEvidence: () => evidence,
  getProviderRequestCount: () => providerRequestCount,
  isLocalCheckPassed: () => localCheckPassed,
  isSessionActive: () => sessionActive,
  emergencyStop,
};

boot().catch((error) => log(`Boot failed: ${error.message || error}`));
