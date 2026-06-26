import crypto from "crypto";
import { db } from "../../db";
import { philipConversationTurns } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";

export type TranscriptRole = "user" | "assistant";

export interface GuidanceTranscriptMessage {
  role: TranscriptRole;
  content: string;
}

export interface TurnEventInput {
  role: TranscriptRole;
  content: string;
  clientTurnId?: string;
}

export interface ResolveTranscriptInput {
  sessionId?: string;
  conversationId?: string;
  situation: string;
  messages?: GuidanceTranscriptMessage[];
  turnEvent?: TurnEventInput;
  phase1Response?: string;
  phase1UserReply?: string;
}

export type TranscriptAuthorityMode = "server" | "client" | "merged" | "disabled";

export interface ResolveTranscriptResult {
  conversationId: string;
  messages: GuidanceTranscriptMessage[];
  mode: TranscriptAuthorityMode;
  turnCount: number;
  appendedTurn: boolean;
}

export function isTranscriptAuthorityEnabled(): boolean {
  return process.env.PHILIP_TRANSCRIPT !== "0";
}

export function hashTurnContent(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

export function createConversationId(): string {
  return crypto.randomUUID();
}

function normalizeRole(role: string): TranscriptRole | null {
  if (role === "user" || role === "assistant") return role;
  return null;
}

async function loadTurns(conversationId: string): Promise<GuidanceTranscriptMessage[]> {
  const rows = await db
    .select()
    .from(philipConversationTurns)
    .where(eq(philipConversationTurns.conversationId, conversationId))
    .orderBy(asc(philipConversationTurns.turnIndex));
  return rows
    .map((row) => {
      const role = normalizeRole(row.role);
      if (!role || !row.content?.trim()) return null;
      return { role, content: row.content };
    })
    .filter((m): m is GuidanceTranscriptMessage => !!m);
}

async function nextTurnIndex(conversationId: string): Promise<number> {
  const rows = await db
    .select({ turnIndex: philipConversationTurns.turnIndex })
    .from(philipConversationTurns)
    .where(eq(philipConversationTurns.conversationId, conversationId))
    .orderBy(asc(philipConversationTurns.turnIndex));
  if (rows.length === 0) return 0;
  return rows[rows.length - 1].turnIndex + 1;
}

async function appendTurn(
  conversationId: string,
  sessionId: string,
  role: TranscriptRole,
  content: string,
  clientTurnId?: string,
): Promise<boolean> {
  const trimmed = content.trim();
  if (!trimmed) return false;

  if (clientTurnId) {
    const [existing] = await db
      .select()
      .from(philipConversationTurns)
      .where(and(
        eq(philipConversationTurns.conversationId, conversationId),
        eq(philipConversationTurns.clientTurnId, clientTurnId),
      ));
    if (existing) return false;
  }

  const turnIndex = await nextTurnIndex(conversationId);
  await db.insert(philipConversationTurns).values({
    conversationId,
    sessionId,
    turnIndex,
    role,
    content: trimmed,
    contentHash: hashTurnContent(trimmed),
    clientTurnId: clientTurnId ?? null,
  });
  return true;
}

async function ensurePhase1SpineTurns(
  conversationId: string,
  sessionId: string,
  situation: string,
  phase1Response?: string,
  phase1UserReply?: string,
): Promise<void> {
  const existing = await loadTurns(conversationId);
  const situationTrim = situation.trim();
  const p1 = phase1Response?.trim();
  const p1Reply = phase1UserReply?.trim();
  if (!situationTrim) return;

  const hasSituation = existing.some(
    (m, i) => i === 0 && m.role === "user" && m.content.trim() === situationTrim,
  );
  if (!hasSituation) {
    await appendTurn(conversationId, sessionId, "user", situationTrim, `spine-situation-${hashTurnContent(situationTrim).slice(0, 12)}`);
  }

  if (p1) {
    const hasP1Assistant = existing.some((m) => m.role === "assistant" && m.content.trim() === p1);
    if (!hasP1Assistant) {
      await appendTurn(conversationId, sessionId, "assistant", p1, `spine-p1-${hashTurnContent(p1).slice(0, 12)}`);
    }
  }

  if (p1Reply) {
    const hasP1User = existing.some((m) => m.role === "user" && m.content.trim() === p1Reply);
    if (!hasP1User) {
      await appendTurn(conversationId, sessionId, "user", p1Reply, `spine-p1u-${hashTurnContent(p1Reply).slice(0, 12)}`);
    }
  }
}

async function backfillFromClientMessages(
  conversationId: string,
  sessionId: string,
  messages: GuidanceTranscriptMessage[],
): Promise<void> {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg.content?.trim()) continue;
    await appendTurn(
      conversationId,
      sessionId,
      msg.role,
      msg.content,
      `backfill-${i}-${hashTurnContent(msg.content).slice(0, 10)}`,
    );
  }
}

export async function resolveGuidanceTranscript(
  input: ResolveTranscriptInput,
): Promise<ResolveTranscriptResult> {
  const conversationId = input.conversationId?.trim() || createConversationId();
  const clientMessages = (input.messages ?? [])
    .map((m) => {
      const role = normalizeRole(m.role);
      if (!role || !m.content?.trim()) return null;
      return { role, content: m.content.trim() };
    })
    .filter((m): m is GuidanceTranscriptMessage => !!m);

  if (!isTranscriptAuthorityEnabled() || !input.sessionId) {
    const fallback = clientMessages.length > 0
      ? clientMessages
      : [{ role: "user" as const, content: input.situation.trim() }];
    return {
      conversationId,
      messages: fallback,
      mode: "disabled",
      turnCount: fallback.length,
      appendedTurn: false,
    };
  }

  const sessionId = input.sessionId;
  let appendedTurn = false;

  if (input.turnEvent?.content?.trim()) {
    appendedTurn = await appendTurn(
      conversationId,
      sessionId,
      input.turnEvent.role,
      input.turnEvent.content,
      input.turnEvent.clientTurnId,
    );
  }

  if (input.phase1Response?.trim() && input.phase1UserReply?.trim()) {
    await ensurePhase1SpineTurns(
      conversationId,
      sessionId,
      input.situation,
      input.phase1Response,
      input.phase1UserReply,
    );
  }

  const serverMessages = await loadTurns(conversationId);

  if (input.turnEvent && serverMessages.length > 0) {
    return {
      conversationId,
      messages: serverMessages,
      mode: "server",
      turnCount: serverMessages.length,
      appendedTurn,
    };
  }

  if (serverMessages.length >= clientMessages.length && serverMessages.length > 0) {
    return {
      conversationId,
      messages: serverMessages,
      mode: "server",
      turnCount: serverMessages.length,
      appendedTurn,
    };
  }

  if (clientMessages.length > 0) {
    if (serverMessages.length === 0) {
      await backfillFromClientMessages(conversationId, sessionId, clientMessages);
      const backfilled = await loadTurns(conversationId);
      return {
        conversationId,
        messages: backfilled.length > 0 ? backfilled : clientMessages,
        mode: backfilled.length > 0 ? "client" : "client",
        turnCount: backfilled.length || clientMessages.length,
        appendedTurn,
      };
    }

    return {
      conversationId,
      messages: clientMessages,
      mode: "merged",
      turnCount: clientMessages.length,
      appendedTurn,
    };
  }

  const opening = input.situation.trim();
  const fallback = opening ? [{ role: "user" as const, content: opening }] : [];
  return {
    conversationId,
    messages: fallback,
    mode: "client",
    turnCount: fallback.length,
    appendedTurn,
  };
}

export async function recordAssistantTranscriptTurn(
  conversationId: string,
  sessionId: string,
  content: string,
): Promise<void> {
  if (!isTranscriptAuthorityEnabled() || !conversationId || !sessionId || !content.trim()) return;
  await appendTurn(
    conversationId,
    sessionId,
    "assistant",
    content,
    `assistant-${hashTurnContent(content).slice(0, 16)}-${Date.now()}`,
  );
}

export async function getConversationTranscript(
  conversationId: string,
): Promise<GuidanceTranscriptMessage[]> {
  if (!conversationId) return [];
  return loadTurns(conversationId);
}
