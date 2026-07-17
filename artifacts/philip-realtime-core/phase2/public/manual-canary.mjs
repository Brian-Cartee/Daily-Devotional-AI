import {
  ATTEMPT3_PAID_LIMITS,
  createElapsedTimer,
  createLocalSpeechSilenceDetector,
} from "/localVad.mjs";

const prepOnly = true; // unpaid preparation — paid Begin remains disabled
const statusEl = document.querySelector("#status");
const levelBar = document.querySelector("#levelBar");
const speechFlag = document.querySelector("#speechFlag");
const silenceFlag = document.querySelector("#silenceFlag");
const micFlag = document.querySelector("#micFlag");
const netFlag = document.querySelector("#netFlag");
const elapsedEl = document.querySelector("#elapsed");
const micTestBtn = document.querySelector("#micTest");
const stopBtn = document.querySelector("#stop");
const beginBtn = document.querySelector("#beginRealtime");

let audioContext = null;
let mediaStream = null;
let analyser = null;
let pollTimer = null;
let uiTimer = null;
let providerRequestCount = 0;
let speechSeen = false;
let silenceSeen = false;

const detector = createLocalSpeechSilenceDetector({ silenceDurationMs: 1500 });
const timer = createElapsedTimer(() => performance.now());

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

function hardDisablePaidStart() {
  beginBtn.disabled = true;
  beginBtn.setAttribute("aria-disabled", "true");
  beginBtn.title = "Disabled during unpaid preparation. Attempt 3 is not armed.";
  beginBtn.textContent = "Begin Authorized Realtime Canary (disabled)";
}

async function closeMic() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (uiTimer) {
    clearInterval(uiTimer);
    uiTimer = null;
  }
  timer.stop();
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) track.stop();
    mediaStream = null;
  }
  if (audioContext) {
    try {
      await audioContext.close();
    } catch {
      // ignore
    }
    audioContext = null;
  }
  analyser = null;
  setMicState("closed");
  levelBar.style.width = "0%";
}

async function startLocalMicTest() {
  if (!prepOnly) throw new Error("prep_only_invariant_broken");
  hardDisablePaidStart();
  await closeMic();
  detector.reset();
  speechSeen = false;
  silenceSeen = false;
  updateFlags();
  statusEl.textContent = "Opening microphone locally…";

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
  // Do not connect to destination — no playback/recording of the mic.
  setMicState("open");
  timer.start();
  log("Microphone open. Speak normally, then stay quiet for at least 1.5 seconds.");
  log(`Paid limits armed for later Attempt 3 only: model=${ATTEMPT3_PAID_LIMITS.model}, max=${ATTEMPT3_PAID_LIMITS.maxDurationMs}ms`);

  const samples = new Uint8Array(analyser.fftSize);
  pollTimer = setInterval(() => {
    analyser.getByteTimeDomainData(samples);
    const transition = detector.ingestTimeDomain(samples, performance.now());
    const pct = Math.min(100, Math.round(detector.lastRms * 280));
    levelBar.style.width = `${pct}%`;
    if (transition === "speech") {
      speechSeen = true;
      updateFlags();
      log("Local VAD: speech detected");
    }
    if (transition === "silence") {
      silenceSeen = true;
      updateFlags();
      log(`Local VAD: silence detected (≥${detector.config.silenceDurationMs}ms)`);
    }
  }, detector.config.pollIntervalMs);

  uiTimer = setInterval(() => {
    elapsedEl.textContent = formatElapsed(timer.elapsedMs());
  }, 200);
}

async function emergencyStop() {
  log("Emergency Stop — closing local microphone and cancelling timers.");
  await closeMic();
  hardDisablePaidStart();
  log("Stopped. Paid connection was not started. Attempt 3 remains unused.");
}

beginBtn.addEventListener("click", (event) => {
  event.preventDefault();
  log("Blocked: Begin Authorized Realtime Canary is disabled during unpaid preparation.");
});

micTestBtn.addEventListener("click", () => {
  startLocalMicTest().catch(async (error) => {
    const message = String(error && error.message ? error.message : error);
    if (/NotAllowedError|Permission denied/i.test(message) || error?.name === "NotAllowedError") {
      log("Microphone permission denied. Local test cannot continue.");
      setMicState("denied");
    } else {
      log(`Local mic error: ${message}`);
      setMicState("error");
    }
    await closeMic();
  });
});

stopBtn.addEventListener("click", () => {
  emergencyStop().catch((error) => log(`Stop error: ${String(error.message || error)}`));
});

// Intercept any accidental fetch to OpenAI or local paid session endpoints.
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(typeof input === "string" ? input : input?.url || "");
  if (/api\.openai\.com|\/api\/session\b/i.test(url)) {
    providerRequestCount += 1;
    updateFlags();
    log(`Blocked accidental provider/session request: ${url}`);
    throw new Error("provider_request_blocked_in_prep_mode");
  }
  return originalFetch(input, init);
};

hardDisablePaidStart();
updateFlags();
elapsedEl.textContent = "00:00";
log("Preparation mode active. Attempt 3 of 3 — paid connection not started.");
log("No OpenAI requests will be sent from this page.");

window.__PHASE2_MANUAL_CANARY__ = {
  prepOnly,
  isBeginDisabled: () => beginBtn.disabled,
  getProviderRequestCount: () => providerRequestCount,
  getSpeechSeen: () => speechSeen,
  getSilenceSeen: () => silenceSeen,
  getMicOpen: () => Boolean(mediaStream),
  detector,
  timer,
  emergencyStop,
};
