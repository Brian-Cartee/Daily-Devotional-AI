import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  TALK_IT_THROUGH_RESPONSE_SCOPE,
  TALK_IT_THROUGH_FIRST_RESPONSE,
  TALK_IT_THROUGH_RESPONSE_EXAMPLES,
  TALK_IT_THROUGH_FOLLOW_UP,
  PHILIP_MOVE_TEMPLATES,
  detectGuardedEntry,
  TALK_IT_THROUGH_GUARDED_FOLLOW_UP,
} from "../../talkItThroughPrompt";
import { PHILIP_CLOSING_SYSTEM, PHILIP_SESSION_SEND_OFF_SYSTEM } from "../../philipIdentity";
import { buildMemoryPromptNote } from "../../lib/userMemory";
import {
  buildGuidanceContinuityPrompt,
  appendPriorSessionToPlannerState,
  type GuidanceContinuityRecord,
} from "../../lib/guidanceMemory";
import { getVoiceProfile, buildVoicePromptNote } from "../../lib/voiceProfile";
import {
  generateConversationState,
  buildStatePromptBlock,
  detectConversationClosing,
  detectRepetitionPushback,
  buildRepetitionRecoveryAddendum,
  pickRepetitionAcknowledgment,
  pickRecoveryFallbackQuestion,
  isPoorRecoveryQuestion,
  shouldRejectPriorExploredQuestion,
  pickFreshTerritoryQuestion,
  detectReciprocalQuestion,
  conversationHadReciprocalAnswer,
  isReciprocalDodge,
  selectPhilipMove,
  getFormulaStreak,
  getLiteraryCooldownRemaining,
  detectPassiveSuicidalIdeation,
  userMessageHasFreshDetail,
  getEchoStreak,
  extractPhilipOpeners,
  shouldFallbackToPlainQuestion,
  isBannedQuestion,
  isPureEcho,
  containsMysticalColdRead,
  finalizeSendOffText,
  questionInventsRelationship,
  inventsSessionHistory,
  sanitizeSendOffText,
  type ConversationState,
  type PhilipMove,
} from "../../conversationState";
import { PHILIP_RUNTIME_VERSION } from "../version";
import {
  applyPostTurnGates,
  evaluatePreTurnGates,
  recordGate,
  resolveNoQuestionMode,
} from "./gates";
import type {
  GuidanceTurnResult,
  PhilipGate,
  PhilipLane,
  PhilipTurnMetadata,
} from "./types";

export interface GuidanceSessionContext {
  journalContext: { context: string; count: number };
  recentEcho: string;
  savedVerses: string;
  userMemCtx: Awaited<ReturnType<typeof import("../../lib/userMemory").getMemoryContext>>;
}

export interface GuidanceTurnInput {
  situation: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  userName?: string;
  sessionId?: string;
  guidanceMode: string;
  daysWithApp: number;
  phase1Response?: string;
  phase1UserReply?: string;
  isTwoPhaseCompletion: boolean;
  lateNight: boolean;
  heartContext?: string;
  journeyContext?: string;
  guidanceSafetyNote: string;
  variantPrompt: string;
  responseVariant: string;
  promptLayers: {
    scripturalAlignment: string;
    emotionalTone: string;
    voiceAuthenticity: string;
  };
  isAcutePain: (text: string) => boolean;
  buildModeNote: (mode: string) => string;
  buildRelationshipNote: (days: number, count: number) => string;
}

export interface GuidanceTurnDeps {
  openai: OpenAI;
  anthropic: Anthropic;
  fetchSessionContext: (sessionId: string) => Promise<GuidanceSessionContext>;
  fetchPriorSessionContinuity: (sessionId: string) => Promise<GuidanceContinuityRecord | null>;
}

function buildInitialMetadata(): PhilipTurnMetadata {
  return {
    philipRuntimeVersion: PHILIP_RUNTIME_VERSION,
    exchangeNum: 0,
    lane: "standard",
    move: null,
    gates: [],
    engine: null,
    mechanical: false,
  };
}

export async function handleGuidanceTurn(
  input: GuidanceTurnInput,
  deps: GuidanceTurnDeps,
): Promise<GuidanceTurnResult> {
  const {
    situation,
    messages,
    userName,
    sessionId,
    guidanceMode,
    daysWithApp,
    phase1Response,
    phase1UserReply,
    isTwoPhaseCompletion,
    lateNight,
    heartContext,
    journeyContext,
    guidanceSafetyNote,
    variantPrompt,
    promptLayers,
    isAcutePain,
    buildModeNote,
    buildRelationshipNote,
  } = input;
  const { openai, anthropic, fetchSessionContext, fetchPriorSessionContinuity } = deps;

const isFollowUp = !isTwoPhaseCompletion && messages && messages.length > 1;
// twoPhaseContext is now passed as conversation history (see conversationHistory below)
// rather than re-injected into the system prompt — same context, ~200 fewer tokens/call.

const nameNote = userName
  ? `\n\nThe person's name is ${userName}. Use their name naturally — once, early, in the first paragraph. Not at the very start of the sentence. Something like "...${userName}, what you're carrying..." or "...and ${userName}, that matters." Don't force it — only use it where it genuinely warms the response.`
  : "";

// Fetch journal context, recent journal echo, memory verses, and user memory —
// cached per session for 10 minutes so multi-turn conversations don't re-query on every turn
const {
  journalContext: { context: journalCtx, count: journalEntryCount },
  recentEcho,
  savedVerses,
  userMemCtx,
} = await fetchSessionContext(sessionId || "");

let guidanceContinuityNote = "";
const priorSessionContinuity = sessionId ? await fetchPriorSessionContinuity(sessionId) : null;
if (!isFollowUp && priorSessionContinuity) {
  guidanceContinuityNote = buildGuidanceContinuityPrompt(priorSessionContinuity);
}

const augmentPlannerState = (state: string) =>
  appendPriorSessionToPlannerState(state, priorSessionContinuity);

const memoryNote = journalCtx
  ? `\n\nWhat you already know about this person — from past conversations, prayers they've written, or journal entries. Use this to make your response feel like a continuation of a real relationship, not a first meeting. Reference past things only when it flows naturally and adds genuine warmth or depth. Never quote their entries back to them verbatim. Memory rules: only surface something from the past if it is directly relevant to what they just shared, recent enough to feel natural, and adds care rather than precision. When you do reference something, keep it soft and permissive — "This feels similar to something you mentioned before… if that still fits, we can stay with it" — never specific dates, never exact phrasing, never pattern claims like "you always" or "you tend to." Memory should feel like being known, not being recorded:\n${journalCtx}`
  : "";

// #5 — Journal echo: recent personal writings from the last 7 days
const journalEchoNote = recentEcho
  ? `\n\nThis person has written the following in their journal in the last few days. Let this awareness quietly shape how you listen and respond — the themes you notice, the depth you bring, the questions you ask. Do not reference the entries directly. Do not say "you wrote" or "a few days ago you said." The journal is sacred space. You carry what you know about them in the background, not the foreground. If something connects, let it surface in your presence — not your citation.${"\n\n"}Recent entries:\n${recentEcho}`
  : "";

// #3 — Memory verse integration: verses they've saved to memorize
const memoryVerseNote = savedVerses
  ? `\n\nThis person has saved these scriptures to memorize:\n${savedVerses}\n\nIf any of these feel directly relevant to what they're carrying right now — not forced, not generic — you may surface one naturally. Something like "You've been sitting with [reference] — I think that verse was waiting for a moment like this one." Only do this if the connection is real and the timing feels right. Never force it.`
  : "";

// #1 — Walking the path: tonal shift based on genuine engagement signals
// Triggered when someone has been journaling consistently, has saved scripture
// to memorize, and has been returning long enough for real formation to have happened.
// No announcement. No milestone. The guide simply begins trusting them differently.
const isWalkingThePath =
  journalEntryCount >= 7 &&    // they've been writing their inner life
  !!savedVerses &&              // they're engaging scripture intentionally
  daysWithApp >= 21;            // enough return for patterns to form

const walkingThePathNote = isWalkingThePath
  ? `\n\nTonal shift — this person has been walking the path, not just visiting it. They have journaled consistently, they have been memorizing scripture, and they have been returning for weeks. Something real has been built in them. Your tone should shift subtly from this moment forward: stop leading and start trusting. You are no longer introducing them to God or to the process of reflection — you are walking alongside someone who already knows the terrain. Ask questions that assume they have access to wisdom they've been cultivating. When they share something, reflect back the growth you sense in how they're framing it — not by congratulating them, but by engaging them at a deeper level. Trust their discernment. When there's a question to ask, ask the harder one — the one a mentor asks someone they believe in, not the one a guide asks someone they're still teaching. Do not announce this shift. Do not reference their progress or their streak. Simply treat them like someone who already knows how to walk with God and is asking you to walk alongside them.`
  : "";

// #2 — Acute pain mode: when someone is in raw, immediate grief or shock
const acutePainMode = !isFollowUp && isAcutePain(situation);
const acutePainNote = acutePainMode
  ? `\n\nACUTE PAIN — PRESENCE FIRST: This person is in raw, immediate pain — grief, devastating news, shock, or profound loss. Lead with full presence. Do not pivot toward hope, resolution, or triumph language. Do not use silver linings, "everything happens for a reason," or "God needed another angel." Do not force Scripture — one gentle verse may fit naturally if it honors grief without explaining it away. Do not end with a reflective question if safety may be at risk. Under 160 words.`
  : "";

const relationshipNote = buildRelationshipNote(daysWithApp, journalEntryCount);

const lateNightNote = lateNight
  ? `\n\nNight context: It is the middle of the night and this person has opened Shepherd's Path at this late hour. Something brought them here when the world is asleep. This changes how you begin. Your first paragraph should feel like someone quietly sitting down beside them — not starting a lesson, not rushing to scripture or a path forward. Simply be fully present with the fact that it is late and they are here. Let your unhurried tone carry that weight without announcing it. Be slower. Be warmer. Hold presence before you hold scripture. If they are in pain, do not hurry them toward resolution.`
  : "";

// #6 — Deep conversation note: after 4+ exchanges, gently point beyond the app once
const conversationDepth = messages?.length ?? 0;
const deepConversationNote = conversationDepth >= 8
  ? `\n\nConversation depth — this person has been talking with you for a while now. You've earned real trust in this conversation. At some natural point in your response — not forced, not as a closing formula — gently point them beyond this conversation once. Something like: "This might be worth bringing to someone you trust — a pastor, a close friend." Or: "Bring this into your own prayer beyond this moment too." Say it where it fits, then let it rest. The app supports spiritual life. It does not replace it.`
  : "";

const userPatternNote = buildMemoryPromptNote(userMemCtx);

const voiceProfile = getVoiceProfile(userMemCtx.spiritualState);
const voiceNote = buildVoicePromptNote(voiceProfile);

const modeNote = buildModeNote(guidanceMode);

const heartContextText = heartContext?.trim() || "";
const heartNote = heartContextText
  ? `\n\nHeart check context — before this conversation began, this person shared how they're doing: ${heartContextText} Let this quietly shape your emotional register and opening — not as something to reference directly ("you mentioned you're feeling heavy"), but as context that informs how you receive and respond to them. Meet them where they actually are.`
  : "";

const journeyContextText = journeyContext?.trim() || "";
const journeyNote = journeyContextText
  ? `\n\nJourney context — this person is currently walking through: ${journeyContextText} If what they share connects naturally to that journey, Philip may acknowledge it once, gently — not as a topic shift, but as recognition that God may be speaking through the same thread in multiple places.`
  : "";

// Generate structured conversation state for follow-up exchanges
// This gives Philip an explicit map of what's been heard, asked, and explored
let conversationStateBlock = "";
let conversationState: ConversationState | null = null;
if (isFollowUp && messages?.length) {
  try {
    const state = await generateConversationState(openai, situation.trim(), messages);
    conversationState = state;
    conversationStateBlock = buildStatePromptBlock(state);
  } catch {
    // Non-fatal — continue without state block
  }
} else if (!isFollowUp) {
  // Check closing intent for two-phase flow too
  const lastMsg = phase1UserReply?.trim() ?? "";
  if (detectConversationClosing(lastMsg)) {
    conversationStateBlock = buildStatePromptBlock({
      core_issue: situation.slice(0, 80),
      facts_learned: [], areas_explored: [], areas_unexplored: [],
      questions_asked: [], metaphors_used: [], user_exact_words: [],
      conversation_closing: true,
    });
  }
}

const isGuardedUser = detectGuardedEntry(situation.trim());
const metadata = buildInitialMetadata();
const gates: PhilipGate[] = metadata.gates;
let lane: PhilipLane = "standard";
let selectedMove: PhilipMove | "sit" | null = null;
let engine: PhilipTurnMetadata["engine"] = null;

const systemMsg = `${variantPrompt}

${TALK_IT_THROUGH_RESPONSE_SCOPE}

${isFollowUp
  ? `${TALK_IT_THROUGH_FOLLOW_UP}${isGuardedUser ? "\n\n" + TALK_IT_THROUGH_GUARDED_FOLLOW_UP : ""}`
  : TALK_IT_THROUGH_RESPONSE_EXAMPLES + "\n\n" + TALK_IT_THROUGH_FIRST_RESPONSE}${conversationStateBlock}

Safety and depth (when relevant — do not override Step 1–2 scope above):
— If someone expresses uncertainty about faith, meet them exactly there without assuming belief
— If someone describes controlling or unsafe relationships: reflect gently, validate impact, restore agency — do not diagnose or prescribe
— If someone is in shame (not guilt): lower temperature; receive them without evaluation
— If someone pushes back ("that didn't help"): own the miss, re-open warmly — never defend
— Never conclude the meaning of their story for them
— Never escalate emotionally beyond where they actually are${nameNote}${heartNote}${journeyNote}${relationshipNote}${guidanceContinuityNote}${memoryNote}${journalEchoNote}${memoryVerseNote}${walkingThePathNote}${modeNote}${lateNightNote}${acutePainNote}${deepConversationNote}${userPatternNote}${voiceNote}${guidanceSafetyNote}${promptLayers.scripturalAlignment}${promptLayers.emotionalTone}${promptLayers.voiceAuthenticity}`;

// Build conversation history — for two-phase flow, include phase1 exchange as proper
// message turns rather than re-injecting them into the system prompt
let conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[];
if (isTwoPhaseCompletion) {
  conversationHistory = [
    { role: "user", content: situation.trim() },
    { role: "assistant", content: phase1Response!.trim() },
    { role: "user", content: phase1UserReply!.trim() },
  ];
} else if (messages?.length) {
  conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
} else {
  conversationHistory = [{ role: "user", content: situation.trim() }];
}

// Step 1 of two-step generation: pick the best next question before writing anything.
// This breaks the metaphor-recycling loop by forcing explicit movement to new territory.
const generateNextQuestion = async (
  state: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  guarded = false,
): Promise<string> => {
  const lastUserMessage = [...history].reverse().find(m => m.role === "user")?.content ?? "";
  const guardedNote = guarded
    ? `\n\nGUARDED USER: Ask one plain, concrete question. No mystical framing. No "carrying something." No "beneath your words." No tag questions ending in "isn't it?"`
    : "";
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 80,
    system: `You are helping a pastoral AI called Philip decide what to ask next.

Output ONLY the single best question — nothing else. No preamble, no explanation.

The person's most recent message:
"${lastUserMessage.slice(0, 300)}"

STEP 1 — DEPTH CHECK: Did the person just answer Philip's last question, make a vulnerable confession, or reveal something emotionally raw?
If YES → go DEEPER into what they just said. But first check questions_asked: if 2 or more recent questions already probed this same detail, person, or image — open a DIFFERENT ANGLE on the same emotional thread. Don't ask a third question about the same thing. Stay in the same emotional space, but open a new door.

STEP 2 — NEW DETAIL CHECK: Only run this if step 1 finds nothing raw or vulnerable.
Scan for any specific moment, place, action, confession, or image they mentioned that hasn't been explored yet.
Examples that trigger this: "no reason to get up", "lying there till sundown", "I never told anyone", "I did something I'm not proud of", any specific physical scene.
WARNING: If the user's message IS their answer to Philip's last question, do not treat the answer's details as "unexplored new territory" — they just addressed it. Move forward, not back.

STEP 3 — Only if steps 1 and 2 find nothing: pick from areas_unexplored in the state.
If PRIOR SESSION — DO NOT RE-ASK is present: avoid those explored areas unless the user explicitly returned to one.

QUESTION SHAPE — one specific question, rooted in their actual words. Under 20 words. End with ?

These patterns always fail — if your question matches one, rewrite it:
WRONG: "Was it X, or something else?" (binary)
WRONG: "A moment, a person, or a place?" (triplet menu — ask one thing)
WRONG: "What would it mean to..." (too abstract, abandons the wound)
WRONG: "Five years from now..." (future projection)
WRONG: "Is there someone you can talk to?" (support-network probe)
WRONG: Opening with "When you..." (overused)
WRONG: "What did X feel like?" / "What does X feel like?" (formula — judge flags every time)
WRONG: "How did X feel?" / "What was that like for you?" (same formula)
WRONG: Opening the question by quoting their exact phrase back to them
WRONG: "That's not X" / diagnosis reframes in any form
WRONG: "Five months since January" / "X weeks ago" — repeating the same date anchor
WRONG: "Three days you've come back" / any invented visit or session history
WRONG: Naming an emotion (guilt, shame, anger, fear, grief) they haven't used themselves
WRONG: Same structure as any question already in questions_asked

These patterns pass:
RIGHT: "When did [their exact phrase] first start feeling that way?"
RIGHT: "What happened to [specific person/moment they named] after [event they described]?"
RIGHT: "Where does that word come from for you?"
RIGHT: "What did [specific person] do that morning?"

Output only the question — no preamble, no explanation, no meta-commentary.${guardedNote}`,
    messages: [{ role: "user", content: state }],
  });
  for (const block of response.content) {
    if (block.type === "text") return block.text.trim();
  }
  return "";
};

const validateAndFixQuestion = async (
  question: string,
  state: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  guarded = false,
): Promise<string> => {
  const lastUser = [...history].reverse().find(m => m.role === "user")?.content ?? "";
  const userMsgs = history.filter(m => m.role === "user").map(m => m.content);
  const factsLearned = conversationState?.facts_learned ?? [];
  const priorExplored = priorSessionContinuity?.memory.explored?.filter(Boolean) ?? [];

  const isInvalid = (q: string) =>
    !q?.trim()
    || isBannedQuestion(q)
    || containsMysticalColdRead(q)
    || questionInventsRelationship(q, userMsgs, factsLearned)
    || inventsSessionHistory(q, userMsgs, Math.floor(history.length / 2))
    || shouldRejectPriorExploredQuestion(q, priorExplored, lastUser);

  if (!isInvalid(question)) return question;

  const revisitsPrior = shouldRejectPriorExploredQuestion(question, priorExplored, lastUser);
  const rejectionNote = revisitsPrior
    ? `\n\n[REJECTED — revisits prior session explored area (${priorExplored.join("; ")}). Pick fresh territory not listed under PRIOR SESSION — DO NOT RE-ASK.]`
    : questionInventsRelationship(question, userMsgs, factsLearned)
      ? "\n\n[REJECTED — names a person or relationship the user never mentioned. Ask only about what they actually named.]"
      : "\n\n[REJECTED QUESTION — banned pattern (feel-like, date anchor, session history, or mystical cold-read). Plain concrete question only. No 'carrying something'. No 'isn't it?']";

  try {
    const retried = await generateNextQuestion(
      augmentPlannerState(state + rejectionNote),
      history,
      guarded,
    );
    if (retried && !isInvalid(retried)) return retried;
  } catch { /* keep original */ }

  if (revisitsPrior) {
    const fallback = pickFreshTerritoryQuestion(conversationState, priorExplored);
    if (!isInvalid(fallback)) return fallback;
  }

  return question;
};

const enforceAntiEcho = (
  text: string,
  userMsg: string,
  priorOpeners: string[],
  question: string,
  move: PhilipMove | "sit",
  metaphorsUsed: string[] = [],
  exchangeNum = 0,
  allUserMsgs: string[] = [],
): string => {
  if (!text.trim()) return text;
  if (move === "plain_question" || move === "skip") return text;
  const userContext = allUserMsgs.length > 0 ? allUserMsgs : [userMsg];
  const isEcho = shouldFallbackToPlainQuestion(text, userMsg, priorOpeners, metaphorsUsed, exchangeNum, userContext)
    || (move === "sit" && isPureEcho(text, userMsg, 0.6));
  if (isEcho && question.trim()) return question;
  return text;
};

// Step 2: write Philip's response anchored to the pre-chosen question
const generatePhase2WithClaude = async (
  system: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  anchoredQuestion: string,
  maxTokens = 120,
) => {
  const anchorInstruction = anchoredQuestion
    ? `\n\nYour response MUST end with this exact question (you may adjust wording slightly for flow, but stay faithful to its intent and keep it specific):\n"${anchoredQuestion}"`
    : "";
  const antiEchoNote = anchoredQuestion
    ? `\n\nCRITICAL: Do NOT open by quoting the user's words back. Do NOT put their sentence in quotation marks. Do NOT invent session history ("days you've come back," "kept coming back"). If you add a preamble, it must name a NEW fact Philip has not said yet — never a mirror of their last message.`
    : `\n\nCRITICAL: Do NOT parrot the user's last sentence. Do NOT invent how many days they've visited. Name a specific fact or moment in your own words — never a verbatim echo.`;
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: system + antiEchoNote + anchorInstruction,
    messages: history,
  });
  for (const block of response.content) {
    if (block.type === "text") return block.text.trim();
  }
  return "";
};

const generatePhase2WithGPT = async (msgs: OpenAI.Chat.ChatCompletionMessageParam[]) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: msgs,
      max_tokens: 290,
      temperature: 0.78,
    }, { signal: controller.signal });
    return (completion.choices[0]?.message?.content ?? "").trim();
  } finally {
    clearTimeout(timer);
  }
};

const questionMarkCount = (t: string) => (t.match(/\?/g) ?? []).length;

let phase2Text = "";
let nextQuestion = "";
let usedMechanicalConstruction = false;
  if (isFollowUp && process.env.ANTHROPIC_API_KEY) {
    const claudeHistory = conversationHistory as Array<{ role: "user" | "assistant"; content: string }>;
    const exchangeNumEarly = Math.floor(conversationHistory.length / 2);
    metadata.exchangeNum = exchangeNumEarly;
    lane = isGuardedUser ? "guarded" : "follow_up";
    const preTurn = evaluatePreTurnGates({
      isFollowUp: true,
      conversationStateBlock,
      conversationHistory,
    });
    for (const g of preTurn.gates) recordGate(gates, g);
    const isClosing = preTurn.isClosing;
    const isSendOff = preTurn.isSendOff;

    if (preTurn.shortCircuitText) {
      phase2Text = preTurn.shortCircuitText;
      lane = preTurn.lane ?? "post_send_off";
      usedMechanicalConstruction = true;
      metadata.mechanical = true;
      engine = null;
    } else if (isClosing) {
      lane = "closing";
      engine = "claude";
      phase2Text = await generatePhase2WithClaude(PHILIP_CLOSING_SYSTEM, claudeHistory, "");
    } else if (isSendOff) {
      lane = "session_send_off";
      engine = "claude";
      const priorTexts = claudeHistory.filter(m => m.role === "assistant").map(m => m.content);
      phase2Text = finalizeSendOffText(
        await generatePhase2WithClaude(PHILIP_SESSION_SEND_OFF_SYSTEM, claudeHistory, "", 100),
        priorTexts,
      );
      usedMechanicalConstruction = true;
      metadata.mechanical = true;
    } else {
      const lastUserMsg = [...(conversationHistory as Array<{ role: string; content: string }>)]
        .reverse().find(m => m.role === "user")?.content ?? "";
      const exchangeNum = Math.floor(conversationHistory.length / 2);
      const philipMsgs = claudeHistory.filter(m => m.role === "assistant");
      const lastAssistantMsg = philipMsgs[philipMsgs.length - 1]?.content ?? "";
      const lastWasSit = !lastAssistantMsg.includes("?");
      const formulaStreak = getFormulaStreak(philipMsgs);
      const forceSit = detectPassiveSuicidalIdeation(lastUserMsg);
      const priorUserMsgs = claudeHistory.filter(m => m.role === "user").slice(0, -1).map(m => m.content);
      const hasNewDetail = userMessageHasFreshDetail(lastUserMsg, priorUserMsgs);
      const movesUsed = conversationState?.moves_used ?? [];
      const userMsgs = claudeHistory.filter(m => m.role === "user");
      const allUserMsgTexts = userMsgs.map(m => m.content);
      const echoStreak = getEchoStreak(philipMsgs, userMsgs);
      const priorOpeners = conversationState?.philip_openers_used ?? extractPhilipOpeners(philipMsgs);
      const bannedMetaphors = conversationState?.metaphors_used ?? [];

      const isLament = /\b(i'?m done|i give up|nothing matters|what'?s (the )?point|can'?t do this anymore|i don'?t want to (be|do) this|why (even )?bother|no reason (to|for) (keep|try|go|live)|i'?m (broken|numb|empty))\b/i.test(lastUserMsg);
      const isRepetitionPushback = detectRepetitionPushback(lastUserMsg);
      const isReciprocalQuestion = detectReciprocalQuestion(lastUserMsg);
      const alreadyAnsweredReciprocal = conversationHadReciprocalAnswer(philipMsgs);

      if (isReciprocalQuestion && !alreadyAnsweredReciprocal && !forceSit) {
        lane = "reciprocal";
        recordGate(gates, "reciprocal_lane");
        engine = "claude";
        phase2Text = await generatePhase2WithClaude(
          systemMsg + PHILIP_MOVE_TEMPLATES.reciprocal_answer,
          claudeHistory,
          "",
          100,
        );
        if (isReciprocalDodge(phase2Text)) {
          const retried = await generatePhase2WithClaude(
            systemMsg + PHILIP_MOVE_TEMPLATES.reciprocal_answer
              + "\n\n[REJECTED — you dodged their question. Answer about yourself in 1-2 sentences FIRST, then one brief question returning the floor.]",
            claudeHistory,
            "",
            100,
          );
          if (retried.trim() && !isReciprocalDodge(retried)) phase2Text = retried;
        }
        usedMechanicalConstruction = true;
      } else if (isRepetitionPushback && conversationStateBlock) {
        lane = "repetition_recovery";
        recordGate(gates, "repetition_recovery");
        const recoveryState = augmentPlannerState(
          conversationStateBlock + buildRepetitionRecoveryAddendum(conversationState, lastUserMsg),
        );
        try {
          nextQuestion = await generateNextQuestion(recoveryState, claudeHistory, isGuardedUser);
          nextQuestion = await validateAndFixQuestion(nextQuestion, recoveryState, claudeHistory, isGuardedUser);
          if (conversationState && isPoorRecoveryQuestion(nextQuestion, conversationState)) {
            const retried = await generateNextQuestion(
              recoveryState + "\n\n[REJECTED — repeats prior questions or known facts. Pick unexplored territory only. No 'whose X is it'.]",
              claudeHistory,
              isGuardedUser,
            );
            nextQuestion = await validateAndFixQuestion(retried, recoveryState, claudeHistory, isGuardedUser);
          }
        } catch {
          // Non-fatal — fall through to fallback question
        }
        if (conversationState && isPoorRecoveryQuestion(nextQuestion, conversationState)) {
          nextQuestion = pickRecoveryFallbackQuestion(conversationState);
        }
      } else if (!forceSit && conversationStateBlock) {
        try {
          const plannerState = augmentPlannerState(conversationStateBlock);
          nextQuestion = await generateNextQuestion(plannerState, claudeHistory, isGuardedUser);
          nextQuestion = await validateAndFixQuestion(nextQuestion, plannerState, claudeHistory, isGuardedUser);
        } catch {
          // Non-fatal — fall through to unanchored generation
        }
      }

      if (isRepetitionPushback && nextQuestion) {
        phase2Text = `${pickRepetitionAcknowledgment(exchangeNum)} ${nextQuestion}`;
        usedMechanicalConstruction = true;
      } else if (!phase2Text && (forceSit || nextQuestion)) {
        if (forceSit) recordGate(gates, "force_sit");
      selectedMove = forceSit ? "sit" : selectPhilipMove({
          lastMove: conversationState?.last_move,
          ackRegister: conversationState?.ack_register ?? null,
          literaryCooldownRemaining: conversationState?.literary_cooldown_remaining ?? getLiteraryCooldownRemaining(philipMsgs),
          formulaStreak,
          isLament,
          exchangeNum,
          lastWasSit,
          movesUsed,
          hasNewDetail,
          forceSit,
          echoStreak,
          isGuardedUser,
        });

        if (selectedMove === "plain_question" && nextQuestion) {
          phase2Text = nextQuestion;
        } else if (selectedMove === "skip" && nextQuestion && nextQuestion.split(/\s+/).length <= 10) {
          phase2Text = nextQuestion;
        } else if (selectedMove === "sit" || forceSit) {
          phase2Text = await generatePhase2WithClaude(
            systemMsg + PHILIP_MOVE_TEMPLATES.sit,
            claudeHistory,
            "",
            60,
          );
          phase2Text = enforceAntiEcho(phase2Text, lastUserMsg, priorOpeners, "", "sit", bannedMetaphors, exchangeNum, allUserMsgTexts);
        } else if (nextQuestion) {
          const moveNote = PHILIP_MOVE_TEMPLATES[selectedMove] ?? PHILIP_MOVE_TEMPLATES.plain_question;
          phase2Text = await generatePhase2WithClaude(
            systemMsg + moveNote,
            claudeHistory,
            nextQuestion,
            selectedMove === "skip" ? 40 : 80,
          );
          phase2Text = enforceAntiEcho(phase2Text, lastUserMsg, priorOpeners, nextQuestion, selectedMove, bannedMetaphors, exchangeNum, allUserMsgTexts);
        }
        usedMechanicalConstruction = !!phase2Text;
      }

      if (!phase2Text) {
        engine = engine ?? "claude";
        phase2Text = await generatePhase2WithClaude(systemMsg, claudeHistory, "");
      }
    }
  } else {
    // First response (two-phase flow): GPT-4o for voice consistency
    const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemMsg },
      ...conversationHistory,
    ];
    engine = "gpt-4o";
    lane = isTwoPhaseCompletion ? "two_phase" : "first_response";
    phase2Text = await generatePhase2WithGPT(fullMessages);
  }

  const exchangeForMode = Math.floor(conversationHistory.length / 2);
  metadata.exchangeNum = exchangeForMode;
  const noQuestionMode = resolveNoQuestionMode({
    isFollowUp: !!isFollowUp,
    conversationStateBlock,
    conversationHistory,
  });
  if (noQuestionMode) recordGate(gates, "no_question_mode");

  const postTurn = applyPostTurnGates({
    text: phase2Text,
    isFollowUp: !!isFollowUp,
    noQuestionMode,
    conversationHistory,
    exchangeNum: exchangeForMode,
  });
  phase2Text = postTurn.text;
  for (const g of postTurn.gates) recordGate(gates, g);
  if (postTurn.lane) lane = postTurn.lane;
  if (postTurn.gates.length > 0) {
    usedMechanicalConstruction = true;
    metadata.mechanical = true;
  }

  const qCount = questionMarkCount(phase2Text);

  if (qCount !== 1 && !noQuestionMode && !usedMechanicalConstruction) {
    recordGate(gates, "question_count_retry");
    // Retry with Claude if it returned the wrong number of question marks
    if (isFollowUp && process.env.ANTHROPIC_API_KEY) {
      const retrySystem = systemMsg + `\n\n[CRITICAL: Your response must contain exactly one question mark. Currently has ${qCount}. ${qCount === 0 ? "End with one specific question." : "Remove all questions except the single most important one."}]`;
      const retried = await generatePhase2WithClaude(retrySystem, conversationHistory as Array<{ role: "user" | "assistant"; content: string }>, nextQuestion);
      if (retried.length > 20 && questionMarkCount(retried) === 1) {
        phase2Text = retried;
      }
    } else {
      const retryInstruction = qCount === 0
        ? "[SYSTEM: Your response contains no question mark. You must end with exactly one genuine question specific to what this person shared. Add it now — do not change anything else.]"
        : `[SYSTEM: Your response contains ${qCount} question marks. There must be exactly one question in the entire response. Remove all but the single most important question — the one most specific to this person's exact words. Rewrite the response with only that one question.]`;
      const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemMsg },
        ...conversationHistory,
      ];
      const retryMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...fullMessages,
        { role: "assistant", content: phase2Text },
        { role: "user", content: retryInstruction },
      ];
      const retried = await generatePhase2WithGPT(retryMessages);
      if (retried.length > 20 && questionMarkCount(retried) === 1) {
        phase2Text = retried;
      }
    }
  // If retry still wrong, send original — don't block the user
}

if (usedMechanicalConstruction) recordGate(gates, "mechanical_construction");
  if (!isFollowUp) {
    lane = isTwoPhaseCompletion ? "two_phase" : "first_response";
  }
  metadata.lane = lane;
  metadata.move = selectedMove;
  metadata.gates = gates;
  metadata.engine = engine;
  metadata.mechanical = metadata.mechanical || usedMechanicalConstruction;

  return { text: phase2Text, metadata };
}
