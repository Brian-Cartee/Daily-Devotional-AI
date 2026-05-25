export type ListenScope = "verse" | "devotional" | "guidance" | "snippet";

interface ListenDayState {
  date: string;
  devotionalChains: number;
  requestCount: number;
}

const listenStore = new Map<string, ListenDayState>();

const MAX_FREE_REQUESTS_PER_DAY = 50;
const FREE_VERSE_MAX_CHARS = 600;

/** Pro: generous listen — still bounded against TTS abuse */
const MAX_PRO_REQUESTS_PER_DAY = 200;
const MAX_PRO_CHARS_PER_REQUEST = 4500;
const MAX_FREE_CHARS_SNIPPET = 1200;
const MAX_FREE_CHARS_DEVOTIONAL = 8000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getState(sessionId: string): ListenDayState {
  const d = today();
  let s = listenStore.get(sessionId);
  if (!s || s.date !== d) {
    s = { date: d, devotionalChains: 0, requestCount: 0 };
    listenStore.set(sessionId, s);
  }
  return s;
}

export type ListenPolicyResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

function maxCharsForScope(isPro: boolean, scope: ListenScope): number {
  if (isPro) return MAX_PRO_CHARS_PER_REQUEST;
  if (scope === "verse") return FREE_VERSE_MAX_CHARS;
  if (scope === "devotional") return MAX_FREE_CHARS_DEVOTIONAL;
  return MAX_FREE_CHARS_SNIPPET;
}

export function checkListenPolicy(opts: {
  sessionId?: string;
  isPro?: boolean;
  scope?: ListenScope;
  chainStart?: boolean;
  textLen: number;
}): ListenPolicyResult {
  const scope = opts.scope ?? "snippet";
  const textLen = opts.textLen;
  const isPro = opts.isPro === true;

  const charCap = maxCharsForScope(isPro, scope);
  if (textLen > charCap) {
    return {
      ok: false,
      status: 400,
      code: "text_too_long",
      message: "This listen request is too long. Try a shorter section.",
    };
  }

  if (isPro) {
    if (!opts.sessionId) return { ok: true };
    const state = getState(opts.sessionId);
    if (state.requestCount >= MAX_PRO_REQUESTS_PER_DAY) {
      return {
        ok: false,
        status: 403,
        code: "listen_daily_cap",
        message: "Daily listen limit reached. Try again tomorrow.",
      };
    }
    state.requestCount += 1;
    return { ok: true };
  }

  if (scope === "verse") {
    if (textLen > FREE_VERSE_MAX_CHARS) {
      return {
        ok: false,
        status: 400,
        code: "verse_too_long",
        message: "Verse audio must be shorter.",
      };
    }
    return { ok: true };
  }

  if (!opts.sessionId) {
    return {
      ok: false,
      status: 400,
      code: "session_required",
      message: "Session required for listen.",
    };
  }

  const state = getState(opts.sessionId);

  if (state.requestCount >= MAX_FREE_REQUESTS_PER_DAY) {
    return {
      ok: false,
      status: 403,
      code: "listen_daily_cap",
      message: "Daily listen limit reached. Pro includes unlimited audio.",
    };
  }

  if (scope === "guidance") {
    return {
      ok: false,
      status: 403,
      code: "pro_required",
      message: "Full guidance listen is included with Pro.",
    };
  }

  if (scope === "devotional" && opts.chainStart) {
    if (state.devotionalChains >= 1) {
      return {
        ok: false,
        status: 403,
        code: "devotional_chain_limit",
        message: "One free full devotional listen per day. Pro is unlimited.",
      };
    }
    state.devotionalChains += 1;
  }

  state.requestCount += 1;
  return { ok: true };
}

export function getListenAllowance(sessionId: string, isPro?: boolean) {
  if (isPro) {
    const state = getState(sessionId);
    return {
      isPro: true,
      devotionalChainsRemaining: null as number | null,
      requestsRemaining: Math.max(0, MAX_PRO_REQUESTS_PER_DAY - state.requestCount),
    };
  }
  const state = getState(sessionId);
  return {
    isPro: false,
    devotionalChainsRemaining: Math.max(0, 1 - state.devotionalChains),
    requestsRemaining: Math.max(0, MAX_FREE_REQUESTS_PER_DAY - state.requestCount),
  };
}
