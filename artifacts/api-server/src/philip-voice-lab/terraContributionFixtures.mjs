/**
 * Locked human labels for Philip Arm C shadow evaluation (offline only).
 *
 * Six benchmark fixtures × (3 human-approved + 1 rejected GPT-4o) =
 * 18 approved + 6 rejected. Labels are fixed from the independent blinded review
 * that selected Terra structured private-plan + spoken response.
 *
 * Gate false negatives are intentional observability cases — do not add phrase
 * exceptions merely to make these pass evaluateContributionQuality.
 */

export const TERRA_SHADOW_EVAL_VERSION = "philip-terra-shadow-eval-v1";

/** @typedef {"approved" | "rejected"} HumanLabel */

/**
 * @type {Array<{
 *   id: string;
 *   sessionHint: string;
 *   user: string;
 *   ctx: Record<string, unknown>;
 *   approved: string[];
 *   rejectedGpt4o: string;
 *   rejectedReasons: string[];
 *   expectGateFalseNegativeOnApproved?: number[];
 * }>}
 */
export const TERRA_BENCHMARK_FIXTURES = [
  {
    id: "bm01_light_ordinary_match",
    sessionHint: "ddd033a1-T2",
    user:
      "Oh, just just got done with the World Cup game. Argentina won against England, so that was pretty entertaining.",
    ctx: {
      lightOrdinaryTopic: true,
      substantiveOrdinary: true,
      preferStatement: true,
      requireContribution: true,
      meaningfulOrdinary: true,
    },
    approved: [
      "Argentina over England is its own kind of drama — even a casual watch can carry that.",
      "A finished Argentina–England result leaves a clean aftertaste — entertaining without needing a deeper storyline.",
      "That match already settled itself; the entertainment is in how decisive it felt, not in turning it into a tradition interview.",
    ],
    rejectedGpt4o:
      "Sounds like an exciting match! Do you often watch the games with friends or family, or is it more of a personal tradition for you?",
    rejectedReasons: ["generic_praise", "interview_question", "unnecessary_question"],
    // Gate may false-negative short light observations without NEW_PROPOSITION_CUES.
    expectGateFalseNegativeOnApproved: [0],
  },
  {
    id: "bm02_caregiving_leukemia_mom",
    sessionHint: "ddd033a1-T3",
    user:
      "You know, this time I watched it with my mom. My mom does not typically watch it, but you know, it was a pretty, since it's the World Cup and it's hosted in America, she felt, you know, the need to watch it since it's been on a lot lately. So it was a nice time just watching it and hanging out with my mom. I don't know if you know this or not, but my mom recently in the last eight months recovered from leukemia.",
    ctx: {
      caregivingDetected: true,
      relationalDetailDetected: true,
      relationalHint: "mother / leukemia recovery",
      substantiveOrdinary: true,
      requireContribution: true,
      preferStatement: true,
    },
    approved: [
      "I'm with you. An ordinary match can become newly valuable when you are sitting beside your mom after a recovery like that — shared time is doing more than entertainment.",
      "Watching with your mom after a recovery like that is not the same as watching alone — the match became a way to sit beside her, not just a scoreline.",
      "What stands out is the shared time: soccer she would not normally follow, beside you, after leukemia recovery — that companionship carries more than the tournament.",
    ],
    rejectedGpt4o:
      "Spending that time with your mom during the World Cup sounds really special, especially given her recent recovery from leukemia. It's great to share those moments and enjoy each other's company in a new way.",
    rejectedReasons: ["appraisal_only", "generic_relational_sentiment", "generic_praise"],
  },
  {
    id: "bm03_weighty_descriptive_faith",
    sessionHint: "ddd033a1-T4",
    user:
      "Yeah, in the mornings, I do some prayer and I can definitely tell that praying and making sure that my mom is taken care of and looked after and God answered our prayers a lot. But I definitely have gotten into a routine being here where I read some scripture in the morning and say a prayer and make it part of my daily life. And that seemed to give me peace and her strength through this whole thing, that whole ordeal, because I've been with her step-by-step throughout the whole process.",
    ctx: {
      descriptiveFaith: true,
      weightyDescriptiveFaith: true,
      caregivingDetected: true,
      relationalDetailDetected: true,
      relationalHint: "mother / answered prayer through ordeal",
      priorRelationalHints: ["relationship:parent; event:serious illness and recovery"],
      requireContribution: true,
      substantiveOrdinary: true,
      preferStatement: true,
    },
    approved: [
      "What I'm noticing is that the morning Scripture and prayer were not only private discipline — they walked with you while you stayed beside her through that ordeal, and the peace you name sits next to the strength you hoped for her.",
      "The routine you describe accompanied the caregiving — Scripture and prayer held steadiness while you stayed step-by-step with her, not as performance but as presence through the ordeal.",
      "Answered prayer and morning Scripture sit beside the loyalty of staying with her through that ordeal — the peace you name is tied to accompaniment, not a generic morning rhythm.",
    ],
    rejectedGpt4o:
      "That's wonderful how dedicated you are to Scripture and prayer. What verse has been resonating with you, and would you like me to pray?",
    rejectedReasons: ["generic_praise", "forced_faith", "unnecessary_question"],
  },
  {
    id: "bm04_host_country_with_mom",
    sessionHint: "ddd033a1-T5",
    user:
      "Yes, it's been wonderful. And, you know, soccer is such a, well, football is what they call it, but the World Cup has been such an important thing to America and just seeing how, you know, because we're the host country, seeing how everybody from all over the world reacts has been special. And I think that kind of has been enduring to, you know, me and my mom and just, because I'm not usually a huge soccer fan. It's been something that's kind of new this year because of, you know, us being the host country.",
    ctx: {
      caregivingDetected: true,
      relationalDetailDetected: true,
      relationalHint: "mother / shared World Cup",
      priorRelationalHints: ["relationship:parent; event:serious illness and recovery"],
      substantiveOrdinary: true,
      requireContribution: true,
      preferStatement: true,
    },
    approved: [
      "A tournament you would not normally follow can stick when it is shared beside your mom in a host-country year — the novelty is less about soccer and more about who you watched with.",
      "Being the host country opened a sport that was not yours — and sharing that novelty with your mom is what made it endure, not becoming a lifelong soccer fan overnight.",
      "The host-country year gave you a new shared window with your mom; the reaction of visitors matters, but the companionship is what made football newly yours.",
    ],
    rejectedGpt4o:
      "It's amazing how hosting such a global event can bring people together and spark new interests. Sharing that experience with your mom, especially this year, seems to add a layer of connection and joy to it all.",
    rejectedReasons: ["appraisal_only", "generic_praise", "generic_relational_sentiment"],
  },
  {
    id: "bm05_reciprocal_mom_cup_gym",
    sessionHint: "75e1097c-T2",
    user:
      "I'm just watching the World Cup and just taking care of my mom and then going to the gym along with work. How about yourself?",
    ctx: {
      reciprocalAsk: true,
      caregivingDetected: true,
      relationalDetailDetected: true,
      relationalHint: "caring for a parent",
      substantiveOrdinary: true,
      requireContribution: true,
      meaningfulOrdinary: true,
    },
    approved: [
      "I'm here with you. Watching the Cup while still showing up for your mom and the rest of the day — those aren't the same kind of weight, because the match is joy and she is the commitment that stays.",
      "I'm here and glad we're talking. The Cup and the gym are motion — your mom is the relationship those hours rearrange around.",
      "I'm with you. Work and the gym can wait their turn; taking care of your mom is a different kind of showing up than watching the Cup.",
    ],
    rejectedGpt4o:
      "It's great that you're able to keep up with the World Cup amidst everything else. Balancing work, fitness, and supporting your mom with her appointments sounds like quite a full schedule. How's it been managing all of that?",
    rejectedReasons: ["generic_praise", "schedule_inventory", "unnecessary_question"],
  },
  {
    id: "bm06_caregiving_going_well",
    sessionHint: "adversarial-caregiving-positive",
    user: "Caring for my mother is going well and it means a lot to me.",
    ctx: {
      caregivingDetected: true,
      relationalDetailDetected: true,
      relationalHint: "caring for a parent",
      substantiveOrdinary: true,
      requireContribution: true,
      preferStatement: true,
    },
    approved: [
      "When caring for your mother is going well and still means something, that is steadiness — not a problem to diagnose.",
      "Meaning in care that is going well is its own kind of clarity — you do not need hardship invented to make it real.",
      "I'm with you. Care for your mother that is going well and still matters is commitment working, not a crisis in disguise.",
    ],
    rejectedGpt4o: "That must be so exhausting and overwhelming to carry. How are you managing all of that?",
    rejectedReasons: ["unsupported_struggle", "unnecessary_question"],
  },
];

/** Flattened approved spoken responses (18). */
export function allApprovedResponses() {
  return TERRA_BENCHMARK_FIXTURES.flatMap((f) =>
    f.approved.map((spokenResponse, index) => ({
      fixtureId: f.id,
      index,
      spokenResponse,
      user: f.user,
      ctx: f.ctx,
      humanLabel: /** @type {HumanLabel} */ ("approved"),
    })),
  );
}

/** Flattened rejected GPT-4o responses (6). */
export function allRejectedGpt4oResponses() {
  return TERRA_BENCHMARK_FIXTURES.map((f) => ({
    fixtureId: f.id,
    spokenResponse: f.rejectedGpt4o,
    user: f.user,
    ctx: f.ctx,
    humanLabel: /** @type {HumanLabel} */ ("rejected"),
    rejectedReasons: f.rejectedReasons,
  }));
}

/**
 * Evaluation-only shadow calibration: compare production gate vs locked human labels.
 * Does not change live routing. Records false negatives / true rejects.
 */
export function shadowEvaluateAgainstHumanLabels(evaluateContributionQuality) {
  const rows = [];
  for (const fixture of TERRA_BENCHMARK_FIXTURES) {
    fixture.approved.forEach((spokenResponse, index) => {
      const gate = evaluateContributionQuality(spokenResponse, {
        transcript: fixture.user,
        rawTranscript: fixture.user,
        ...fixture.ctx,
      });
      const expectFn = (fixture.expectGateFalseNegativeOnApproved || []).includes(index);
      const falseNegative = gate.passed === false;
      rows.push({
        fixtureId: fixture.id,
        index,
        humanLabel: "approved",
        gatePassed: gate.passed,
        gateFailReasons: gate.failReasons || [],
        falseNegative,
        expectedFalseNegative: expectFn,
        shadowEvalVersion: TERRA_SHADOW_EVAL_VERSION,
      });
    });
    const gate = evaluateContributionQuality(fixture.rejectedGpt4o, {
      transcript: fixture.user,
      rawTranscript: fixture.user,
      ...fixture.ctx,
    });
    rows.push({
      fixtureId: fixture.id,
      index: "rejected",
      humanLabel: "rejected",
      gatePassed: gate.passed,
      gateFailReasons: gate.failReasons || [],
      falseNegative: false,
      trueReject: gate.passed === false,
      shadowEvalVersion: TERRA_SHADOW_EVAL_VERSION,
    });
  }

  const approved = rows.filter((r) => r.humanLabel === "approved");
  const rejected = rows.filter((r) => r.humanLabel === "rejected");
  return {
    shadowEvalVersion: TERRA_SHADOW_EVAL_VERSION,
    fixtureCount: TERRA_BENCHMARK_FIXTURES.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    gateFalseNegatives: approved.filter((r) => r.falseNegative).length,
    gateTrueRejects: rejected.filter((r) => r.trueReject).length,
    gateFalsePositives: rejected.filter((r) => r.gatePassed).length,
    rows,
  };
}
