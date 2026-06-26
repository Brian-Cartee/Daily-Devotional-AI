import type {
  CanonicalHistoryInput,
  CommitSessionMindInput,
  SessionMind,
  SessionMindStage,
} from "./types";

const SESSION_MIND_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  mind: SessionMind;
  cachedAt: number;
}

const store = new Map<string, CacheEntry>();

export function isSessionMindEnabled(): boolean {
  return process.env.PHILIP_SESSION_MIND !== "0";
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Merge phase-1 spine with client messages so follow-ups see the full conversation. */
export function reconstructCanonicalHistory(input: CanonicalHistoryInput): Array<{ role: "user" | "assistant"; content: string }> {
  const situationText = input.situation.trim();
  const clientMsgs = input.messages ?? [];
  const phase1 = input.phase1Response?.trim();
  const phase1Reply = input.phase1UserReply?.trim();

  if (phase1 && phase1Reply && situationText) {
    const spine: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: situationText },
      { role: "assistant", content: phase1 },
      { role: "user", content: phase1Reply },
    ];

    let rest = clientMsgs;
    if (
      rest.length > 0
      && rest[0].role === "user"
      && normalizeText(rest[0].content) === normalizeText(situationText)
    ) {
      rest = rest.slice(1);
    }

    return [...spine, ...rest];
  }

  if (clientMsgs.length > 0) return clientMsgs;
  if (situationText) return [{ role: "user", content: situationText }];
  return [];
}

export function inferSessionMindStage(exchangeNum: number, closing: boolean): SessionMindStage {
  if (closing) return "closing";
  if (exchangeNum <= 1) return "recognition";
  if (exchangeNum <= 4) return "exploration";
  return "deepening";
}

export function oneLinePhilipSummary(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const sentence = trimmed.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? trimmed;
  return sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence;
}

export function commitSessionMind(prior: SessionMind | null, input: CommitSessionMindInput): SessionMind {
  const exchangeNum = input.canonicalHistory.filter(m => m.role === "assistant").length;
  const summary = oneLinePhilipSummary(input.philipResponse);
  const philipSummaries = summary
    ? [...(prior?.philipSummaries ?? []), summary].slice(-8)
    : (prior?.philipSummaries ?? []);

  return {
    version: (prior?.version ?? 0) + 1,
    exchangeNum,
    stage: inferSessionMindStage(exchangeNum, input.conversationState.conversation_closing),
    philipSummaries,
    state: input.conversationState,
    phase1Included: input.phase1Included,
    canonicalTurnCount: input.canonicalHistory.length,
  };
}

export function getSessionMind(sessionId: string): SessionMind | null {
  if (!sessionId) return null;
  const entry = store.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > SESSION_MIND_TTL_MS) {
    store.delete(sessionId);
    return null;
  }
  return entry.mind;
}

export function setSessionMind(sessionId: string, mind: SessionMind): void {
  if (!sessionId) return;
  store.set(sessionId, { mind, cachedAt: Date.now() });
}

export function invalidateSessionMind(sessionId: string): void {
  if (!sessionId) return;
  store.delete(sessionId);
}

/** Test helper — clears in-process cache between unit test cases. */
export function clearSessionMindStoreForTests(): void {
  store.clear();
}
