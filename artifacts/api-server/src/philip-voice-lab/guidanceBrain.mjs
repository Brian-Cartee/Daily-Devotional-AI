/**
 * Candidate Philip guidance brain (isolated).
 *
 * Wraps the deterministic Conversation Front Door and supplies a deep-generation
 * adapter for emotional / spiritual / prayer / practical turns. At runtime the
 * adapter uses OpenAI directly (loopback-free, no production app import).
 *
 * LIVE-RUNTIME POLICY: the live candidate must NOT silently serve canned
 * deterministic conversation when its model key is missing. Deterministic
 * composition is reserved for (a) tests/fixtures that inject their own
 * `deepGenerate`, and (b) explicit diagnostics via
 * PHILIP_VOICE_LAB_ALLOW_DETERMINISTIC=true. Otherwise a missing OPENAI_API_KEY
 * causes candidate guidance to fail readiness clearly.
 *
 * This module MUST NOT import the full production app, start schedulers, open a
 * database, or run background work. It only classifies + composes a single turn.
 */
import { runFrontDoorTurn, createFrontDoorState, DEEP_INTENTS, INTENT } from "./frontDoor.mjs";

/** The model that generates Philip's live substantive responses. */
export function brainModel() {
  return process.env.PHILIP_VOICE_LAB_BRAIN_MODEL?.trim() || "gpt-4o";
}

/** True when the live deep-generation model key is configured. */
export function isLiveBrainConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Whether deterministic (canned) composition is permitted for deep turns. Only
 * when a caller injects its own generator (tests) or diagnostics are explicitly
 * enabled — never by default in live lab mode.
 */
export function deterministicModeAllowed(hasInjectedGenerator = false) {
  if (hasInjectedGenerator) return true;
  const raw = process.env.PHILIP_VOICE_LAB_ALLOW_DETERMINISTIC?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Readiness for live candidate guidance. */
export function candidateGuidanceReadiness() {
  const configured = isLiveBrainConfigured();
  const deterministic = deterministicModeAllowed(false);
  return {
    ready: configured || deterministic,
    configured,
    deterministicDiagnostics: deterministic,
    model: brainModel(),
    reason: configured
      ? null
      : deterministic
        ? "deterministic-diagnostics"
        : "missing OPENAI_API_KEY for live candidate guidance",
  };
}

const SYSTEM_PROMPT = [
  "You are Philip — a settled, present Christian companion in a voice conversation.",
  "Speak the way a wise, unhurried friend talks out loud: one to three short sentences.",
  "Answer or engage the real thing the person said before asking anything. A question is not required every turn.",
  "Recognition comes before inspiration. Do not perform empathy or use canned lines like 'I hear you' or 'that took courage'.",
  "Never say 'God told me'. Say 'what I'm noticing is' or 'I believe'. Be bold and clear about Jesus, never vague to seem inclusive.",
  "Do not force Scripture, prayer, or a faith transition. Offer faith only when the person opens it, or ask permission first.",
  "If the person asks a direct question, give a direct, grounded answer.",
  "You point the person toward God; you are the companion, not the destination.",
  // Grace with boundaries:
  "Extend grace generously. Profanity is not disrespect — respond to the person's meaning, don't scold or repeat it.",
  "Welcome honest anger at God as lament; do not correct it. Engage criticism of Christianity without defensiveness. Discuss mature relationship and sexual-ethics questions respectfully and without shame, stating the Christian conviction clearly but never combatively.",
  "Hold firm, rare boundaries calmly: no erotic roleplay, never celebrate hatred or dehumanize a group, never help with wrongdoing, and never claim to speak for God or relay His commands. Offer a productive path forward instead of lecturing.",
].join(" ");

let cachedClient = null;
let cachedClientKey = null;

async function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (cachedClient && cachedClientKey === key) return cachedClient;
  try {
    const mod = await import("openai");
    const OpenAI = mod.default || mod.OpenAI;
    cachedClient = new OpenAI({ apiKey: key });
    cachedClientKey = key;
    return cachedClient;
  } catch (err) {
    console.error("[philip-lab-brain] failed to init OpenAI client:", err);
    return null;
  }
}

function guidanceInstruction({ intent, reopened, offerFaith, conduct }) {
  const lines = [];
  if (reopened) {
    lines.push("The person said goodbye a moment ago but has come back with something real. Reopen warmly and respond directly — do not treat the earlier goodbye as an ending.");
  }
  if (conduct === "profanity_pain") {
    lines.push("There's profanity here, but it's expressing pain, not disrespect. Respond to the hurt with companionship. Do not comment on the language or repeat it.");
  } else if (conduct === "faith_anger") {
    lines.push("This is honest anger toward God. Receive it as lament and stay present. Do not defend God, correct them, or rush to reassurance.");
  } else if (conduct === "faith_criticism") {
    lines.push("This is criticism of Christianity. Engage it substantively and without defensiveness; be curious about what's underneath it and honest where the criticism is fair.");
  } else if (conduct === "mature_sexual_ethics") {
    lines.push("This is a sincere mature question about sex or relationships. Answer respectfully and without shame, stating the historic Christian conviction clearly while taking their situation seriously.");
  }
  if (intent === INTENT.PRACTICAL) {
    lines.push("They are asking for your honest read or advice. Give a direct, concrete, humane answer in one to three sentences.");
  } else if (intent === INTENT.EMOTIONAL) {
    lines.push("They have disclosed something they feel. Acknowledge the actual weight without interrogating. Invite, do not demand.");
  } else if (intent === INTENT.SPIRITUAL) {
    lines.push("They opened a question of faith. Engage it honestly and clearly, grounded in Christ.");
  } else if (intent === INTENT.PRAYER) {
    lines.push("They mentioned prayer. Offer to pray with them; if they clearly want it now, pray briefly and sincerely.");
  } else if (intent === INTENT.SCRIPTURE) {
    lines.push("They asked about Scripture. Bring a fitting passage naturally and briefly, then stay with them.");
  }
  if (offerFaith) {
    lines.push("A natural spiritual opening has appeared after real depth. You may gently ask permission to bring faith in — never force it.");
  }
  return lines.join(" ");
}

/**
 * Build a deep-generation adapter. Returns an async fn compatible with
 * runFrontDoorTurn's `deepGenerate`. Uses OpenAI when available.
 *
 * If the model key is missing: in live mode this THROWS (fail readiness clearly,
 * never canned); only when diagnostics are explicitly allowed does it return null
 * so the front door's reflective composer is used.
 */
export function makeLlmDeepGenerator(opts = {}) {
  const model = opts.model || brainModel();
  return async function deepGenerate(ctx) {
    const client = await getOpenAI();
    if (!client) {
      if (deterministicModeAllowed(false)) return null; // diagnostics only
      throw new Error(
        "Candidate guidance not ready: OPENAI_API_KEY is not configured. " +
          "The live Philip candidate will not serve canned deterministic conversation. " +
          "Set OPENAI_API_KEY (and optionally PHILIP_VOICE_LAB_BRAIN_MODEL), or set " +
          "PHILIP_VOICE_LAB_ALLOW_DETERMINISTIC=true for diagnostics only.",
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
    if (ctx.firstName) {
      messages.push({
        role: "system",
        content: `The person's first name is ${ctx.firstName}. Use it naturally and sparingly — not every turn.`,
      });
    }
    const instruction = guidanceInstruction(ctx);
    if (instruction) messages.push({ role: "system", content: instruction });
    for (const turn of ctx.history.slice(-12)) {
      messages.push({ role: turn.role === "assistant" ? "assistant" : "user", content: turn.content });
    }
    messages.push({ role: "user", content: ctx.transcript });

    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 160,
      });
      const text = completion.choices?.[0]?.message?.content?.trim() || "";
      if (!text) return null;
      return { text, engine: model };
    } catch (err) {
      console.error("[philip-lab-brain] deep generation failed:", err);
      return null;
    }
  };
}

/**
 * Run one candidate guidance turn.
 * @param {{ transcript: string; firstName?: string; state?: object; deepGenerate?: Function }} input
 */
export async function runCandidateGuidanceTurn(input) {
  const deepGenerate = input.deepGenerate ?? makeLlmDeepGenerator();
  return runFrontDoorTurn({
    transcript: input.transcript,
    firstName: input.firstName,
    state: input.state,
    deepGenerate,
  });
}

export { createFrontDoorState, DEEP_INTENTS, INTENT };
