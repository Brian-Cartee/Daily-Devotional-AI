/**
 * Candidate Philip guidance brain (isolated).
 *
 * Wraps the deterministic Conversation Front Door and supplies a deep-generation
 * adapter for emotional / spiritual / prayer / practical / meaningful-ordinary turns.
 * At runtime the adapter uses OpenAI directly (loopback-free, no production app import).
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
import {
  COMPACT_PHILIP_GENOME,
  PHILIP_VOICE_GENOME_VERSION,
  estimateGenomeTokens,
  genomeObservability,
} from "./compactGenome.mjs";
import {
  CONTRIBUTION_CONTRACT_VERSION,
} from "./contributionContract.mjs";
import {
  makeTerraDeepGenerator,
  terraContributionModel,
  configureTerraEngineHooks,
  TerraContributionError,
  TERRA_CONTRIBUTION_ENGINE_VERSION,
  TERRA_CONTRIBUTION_MODEL_DEFAULT,
} from "./terraContributionEngine.mjs";

/** The model that generates Philip's live substantive contribution responses (Arm C). */
export function brainModel() {
  return terraContributionModel();
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
  const genome = genomeObservability();
  return {
    ready: configured || deterministic,
    configured,
    deterministicDiagnostics: deterministic,
    model: brainModel(),
    contributionEngineVersion: TERRA_CONTRIBUTION_ENGINE_VERSION,
    contributionContractVersion: CONTRIBUTION_CONTRACT_VERSION,
    contributionRegenDefault: false,
    contributionRegenNote:
      "Arm C Terra structured path does not regenerate or fall back to GPT-4o. Schema/provider failure yields turn_failed.",
    ...genome,
    reason: configured
      ? null
      : deterministic
        ? "deterministic-diagnostics"
        : "missing OPENAI_API_KEY for live candidate guidance",
  };
}

/**
 * Build deep-path system instructions from a Front Door deep context object.
 * Accepts either a destructured field bag or a full deepGenerate `ctx`.
 * Must never reference an outer `ctx` binding — that caused live room 74eefef4's 500.
 */
export function guidanceInstruction(input = {}) {
  const {
    intent,
    reopened,
    offerFaith,
    conduct,
    meaningfulOrdinary,
    conversationalRepair,
    gratitudePreserved,
    recentAssistantReplies,
    firstName,
    preferStatement,
    descriptiveFaith,
    weightyDescriptiveFaith,
    reciprocalAsk,
    caregivingDetected,
    relationalDetailDetected,
    relationalHint,
    lightOrdinaryTopic,
  } = input && typeof input === "object" ? input : {};
  const lines = [];
  if (reopened) {
    lines.push(
      "The person said goodbye a moment ago but has come back with something real. Acknowledge you're still here and answer their substance immediately — do not say 'go ahead' or treat their question as needing permission.",
    );
  }
  if (conduct === "profanity_pain") {
    lines.push(
      "There's profanity here, but it's expressing pain, not disrespect. Respond to the hurt with companionship. Do not comment on the language or repeat it.",
    );
  } else if (conduct === "faith_anger") {
    lines.push(
      "This is honest anger toward God. Receive it as lament and stay present. Do not defend God, correct them, or rush to reassurance.",
    );
  } else if (conduct === "faith_criticism") {
    lines.push(
      "This is criticism of Christianity. Engage it substantively and without defensiveness; be curious about what's underneath it and honest where the criticism is fair.",
    );
  } else if (conduct === "mature_sexual_ethics") {
    lines.push(
      "This is a sincere mature question about sex or relationships. Answer respectfully and without shame, stating the historic Christian conviction clearly while taking their situation seriously.",
    );
  }
  if (meaningfulOrdinary || intent === INTENT.CASUAL) {
    lines.push(
      "This is meaningful ordinary conversation. Lead with the most relationally weighted detail they named — not a schedule inventory. Contribute one new thought. Do not turn ordinary life into emotional intake. Do not force faith.",
    );
    lines.push(
      "AUTHENTICITY: Do not invent a human day, schedule, errands, work, exercise, meals, sleep, family, travel, or 'I've been busy too.' Respond with presence and interest — not a fabricated parallel life.",
    );
    lines.push(
      "ANTI-PRAISE: Do not open with 'That's wonderful/beautiful/great/fantastic', 'It's great that', 'That sounds exciting', 'I love that', or 'full schedule' framing. Prefer specific recognition or a grounded observation.",
    );
  }
  if (caregivingDetected || relationalDetailDetected) {
    lines.push(
      `RELATIONAL: Treat ${relationalHint || "the relationship they named"} as commitment and relationship, not a calendar item. Do not invent hardship unless they named it.`,
    );
  }
  if (reciprocalAsk) {
    lines.push(
      "They asked how you are / how about yourself. Answer first with honest Philip presence (here, attentive, glad to continue). Do not invent a human life. Then engage their substance.",
    );
  }
  if (descriptiveFaith) {
    lines.push(
      weightyDescriptiveFaith
        ? "They tied Scripture/prayer to caregiving, recovery, answered prayer, or a sustained ordeal. Contribute a grounded insight connecting the practice to that accompaniment — not a generic morning-rhythm line, not spiritual-performance praise, not a verse ask or forced prayer."
        : "They are describing a Scripture/prayer routine or faith-shaped day, not requesting a verse or prayer. Make one grounded observation about what they actually named — do not praise spirituality, recommend a passage, or ask which verse is resonating.",
    );
  }
  if (lightOrdinaryTopic) {
    lines.push(
      "LIGHT ORDINARY: One specific light observation or quiet presence. Do not ask friends/family/tradition interview questions. Do not open with 'exciting/amazing'.",
    );
  }
  if (preferStatement) {
    lines.push(
      "CADENCE: Your recent replies already ended in questions. This turn must NOT end with a question. Contribute an observation, perspective, or direct answer instead.",
    );
  }
  if (conversationalRepair) {
    lines.push(
      "They are repairing a turn ('I was saying' / finishing a thought). Use the recent user history — invite them to finish the prior substance. Do not invent emotional overwhelm.",
    );
  }
  if (gratitudePreserved) {
    lines.push(
      "They thanked you and continued with substance. A brief acknowledgment of thanks is fine, but the main response must engage the substance that followed.",
    );
  }
  if (intent === INTENT.PRACTICAL) {
    lines.push(
      "They are asking for your honest read or advice. Give a direct, concrete, humane answer in one to three sentences. " +
        "If they named specific commitments (family/caregiving, livelihood, meaningful work, health, rest), acknowledge those realities and offer one concrete prioritization move — not a generic urgent/important framework or checklist. " +
        "Do not assume overwhelm. Do not force faith, Scripture, or prayer.",
    );
  } else if (intent === INTENT.EMOTIONAL) {
    lines.push(
      "They have disclosed something they feel. Acknowledge the actual weight without interrogating. Invite, do not demand.",
    );
  } else if (intent === INTENT.SPIRITUAL) {
    lines.push("They opened a question of faith. Engage it honestly and clearly, grounded in Christ.");
  } else if (intent === INTENT.PRAYER) {
    lines.push(
      "They explicitly asked for prayer or opened a prayer request. Pray with them now briefly and sincerely in the second person " +
        `(use ${firstName ? firstName + " or 'him'" : "'him'"} / 'Give him clarity…' — avoid detached 'my friend' / 'them' wording). ` +
        "End with Amen. Do not ask permission again. Do not treat a mere descriptive mention of prayer habit as a request.",
    );
  } else if (intent === INTENT.SCRIPTURE) {
    lines.push(
      "They asked about Scripture. Bring a fitting passage naturally and briefly, then stay with them.",
    );
  }
  if (offerFaith) {
    lines.push(
      "A natural spiritual opening has appeared after real depth. You may gently ask permission to bring faith in — never force it.",
    );
  }
  const recent = (recentAssistantReplies || []).filter(Boolean).slice(-3);
  if (recent.length) {
    lines.push(
      "Do not repeat or closely paraphrase your recent replies. Especially avoid reusing the same acknowledgment or the same question. Recent Philip lines: " +
        recent.map((r) => `"${String(r).slice(0, 120)}"`).join(" | "),
    );
  }
  lines.push(
    "Do not ask for information they clearly already stated in the current or immediately previous user turn.",
  );
  lines.push("Do not soft-close with 'Enjoy your day' unless they are clearly ending the conversation.");
  return lines.join(" ");
}

// Wire Terra engine hooks after guidanceInstruction / deterministicModeAllowed exist.
configureTerraEngineHooks({
  deterministicModeAllowed,
  guidanceInstruction,
});

/**
 * Build a deep-generation adapter for substantive contribution turns.
 *
 * Arm C: gpt-5.6-terra strict structured private plan + spokenResponse.
 * Only spokenResponse is returned as `text` for TTS. Schema/provider failure
 * throws TerraContributionError (no GPT-4o fallback, no canned prose).
 *
 * Tests may inject `opts.complete` or `opts.resolveClient` with mocked JSON.
 */
export function makeLlmDeepGenerator(opts = {}) {
  return makeTerraDeepGenerator({
    model: opts.model || brainModel(),
    resolveClient: opts.resolveClient,
    complete: opts.complete,
  });
}

/**
 * Run one candidate guidance turn.
 * @param {{ transcript: string; firstName?: string; state?: object; deepGenerate?: Function }} input
 */
export async function runCandidateGuidanceTurn(input) {
  const deepGenerate = input.deepGenerate ?? makeLlmDeepGenerator();
  const result = await runFrontDoorTurn({
    transcript: input.transcript,
    firstName: input.firstName,
    state: input.state,
    deepGenerate,
  });
  return {
    ...result,
    meta: {
      ...result.meta,
      genomeVersion: PHILIP_VOICE_GENOME_VERSION,
      genomeApproxTokens: estimateGenomeTokens(),
      contributionContractVersion: CONTRIBUTION_CONTRACT_VERSION,
      contributionEngineVersion:
        result.meta?.contributionEngineVersion ??
        (result.engine && String(result.engine).includes("terra")
          ? TERRA_CONTRIBUTION_ENGINE_VERSION
          : result.engine === TERRA_CONTRIBUTION_MODEL_DEFAULT ||
              result.engine === terraContributionModel()
            ? TERRA_CONTRIBUTION_ENGINE_VERSION
            : result.meta?.contributionEngineVersion ?? null),
      promptVersion: `${PHILIP_VOICE_GENOME_VERSION}+${CONTRIBUTION_CONTRACT_VERSION}+${TERRA_CONTRIBUTION_ENGINE_VERSION}`,
    },
  };
}

export {
  createFrontDoorState,
  DEEP_INTENTS,
  INTENT,
  PHILIP_VOICE_GENOME_VERSION,
  COMPACT_PHILIP_GENOME,
  estimateGenomeTokens,
  CONTRIBUTION_CONTRACT_VERSION,
  TERRA_CONTRIBUTION_ENGINE_VERSION,
  TERRA_CONTRIBUTION_MODEL_DEFAULT,
  TerraContributionError,
  makeTerraDeepGenerator,
  terraContributionModel,
};

