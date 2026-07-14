/**
 * Lab-only STT financial guards — separate from production customer budgets.
 * In-memory counters tagged for observability; never silent unlimited.
 */

const DAY_MS = 86_400_000;

function envInt(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/** Defaults: generous for private Brian testing, not public unlimited. */
export function labSttLimitsFromEnv() {
  return {
    /** Reject a single utterance longer than this (ms of audio). */
    maxUtteranceMs: envInt("PHILIP_VOICE_LAB_STT_MAX_UTTERANCE_MS", 60_000),
    /** Max STT requests per lab sessionId per UTC day. */
    maxRequestsPerSessionDay: envInt("PHILIP_VOICE_LAB_STT_MAX_REQUESTS_PER_SESSION_DAY", 80),
    /** Max STT requests across all lab traffic per UTC day. */
    maxRequestsPerLabDay: envInt("PHILIP_VOICE_LAB_STT_MAX_REQUESTS_PER_DAY", 200),
    /** Max transcribed audio minutes across all lab traffic per UTC day. */
    maxMinutesPerLabDay: envInt("PHILIP_VOICE_LAB_STT_MAX_MINUTES_PER_DAY", 60),
    /** Multer / body size ceiling (bytes). */
    maxFileBytes: envInt("PHILIP_VOICE_LAB_STT_MAX_FILE_BYTES", 25 * 1024 * 1024),
  };
}

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** @type {Map<string, { requests: number; minutes: number }>} */
const dayTotals = new Map();
/** @type {Map<string, number>} */
const sessionDayCounts = new Map();

function dayBucket(day = utcDayKey()) {
  let b = dayTotals.get(day);
  if (!b) {
    b = { requests: 0, minutes: 0 };
    dayTotals.set(day, b);
  }
  return b;
}

/**
 * Pre-check before calling OpenAI. Does not increment.
 * @returns {{ ok: true } | { ok: false; status: number; code: string; message: string; usage: object }}
 */
export function checkLabSttAllowance({
  sessionId,
  utteranceMs = 0,
  limits = labSttLimitsFromEnv(),
} = {}) {
  const sid = String(sessionId || "").trim() || "anonymous-lab";
  const day = utcDayKey();
  const usage = snapshotLabSttUsage({ sessionId: sid, day, limits });

  if (utteranceMs > limits.maxUtteranceMs) {
    return {
      ok: false,
      status: 413,
      code: "philip_voice_lab_stt_utterance_too_long",
      message: `Lab utterance exceeds ${limits.maxUtteranceMs}ms audio cap.`,
      usage,
    };
  }

  const sessionKey = `${day}:${sid}`;
  const sessionCount = sessionDayCounts.get(sessionKey) || 0;
  if (sessionCount >= limits.maxRequestsPerSessionDay) {
    return {
      ok: false,
      status: 429,
      code: "philip_voice_lab_stt_limit",
      message:
        "Philip Voice Lab transcription allowance reached for this lab session today. Try again tomorrow or raise PHILIP_VOICE_LAB_STT_MAX_REQUESTS_PER_SESSION_DAY.",
      usage,
    };
  }

  const bucket = dayBucket(day);
  if (bucket.requests >= limits.maxRequestsPerLabDay) {
    return {
      ok: false,
      status: 429,
      code: "philip_voice_lab_stt_limit",
      message:
        "Philip Voice Lab daily transcription request allowance reached. Try again tomorrow or raise PHILIP_VOICE_LAB_STT_MAX_REQUESTS_PER_DAY.",
      usage,
    };
  }

  const addMinutes = Math.max(0, utteranceMs) / 60_000;
  if (bucket.minutes + addMinutes > limits.maxMinutesPerLabDay) {
    return {
      ok: false,
      status: 429,
      code: "philip_voice_lab_stt_limit",
      message:
        "Philip Voice Lab daily transcription minute allowance reached. Try again tomorrow or raise PHILIP_VOICE_LAB_STT_MAX_MINUTES_PER_DAY.",
      usage,
    };
  }

  return { ok: true };
}

/** Record a successful (or billed) lab STT attempt. */
export function recordLabSttUsage({ sessionId, utteranceMs = 0 } = {}) {
  const sid = String(sessionId || "").trim() || "anonymous-lab";
  const day = utcDayKey();
  const sessionKey = `${day}:${sid}`;
  sessionDayCounts.set(sessionKey, (sessionDayCounts.get(sessionKey) || 0) + 1);
  const bucket = dayBucket(day);
  bucket.requests += 1;
  bucket.minutes += Math.max(0, utteranceMs) / 60_000;
  return snapshotLabSttUsage({ sessionId: sid, day });
}

export function snapshotLabSttUsage({
  sessionId,
  day = utcDayKey(),
  limits = labSttLimitsFromEnv(),
} = {}) {
  const sid = String(sessionId || "").trim() || "anonymous-lab";
  const bucket = dayBucket(day);
  const sessionCount = sessionDayCounts.get(`${day}:${sid}`) || 0;
  return {
    tag: "philip-voice-lab-stt",
    day,
    sessionId: sid,
    sessionRequestsToday: sessionCount,
    labRequestsToday: bucket.requests,
    labMinutesToday: Math.round(bucket.minutes * 1000) / 1000,
    limits: {
      maxUtteranceMs: limits.maxUtteranceMs,
      maxRequestsPerSessionDay: limits.maxRequestsPerSessionDay,
      maxRequestsPerLabDay: limits.maxRequestsPerLabDay,
      maxMinutesPerLabDay: limits.maxMinutesPerLabDay,
      maxFileBytes: limits.maxFileBytes,
    },
  };
}

/** Test-only reset. */
export function resetLabSttBudgetForTests() {
  dayTotals.clear();
  sessionDayCounts.clear();
}
