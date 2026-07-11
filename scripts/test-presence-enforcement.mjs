#!/usr/bin/env node
/**
 * Presence enforcement unit checks — short-circuit + sanitize.
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-presence-enforcement.mjs
 */
import {
  tryPresenceShortCircuit,
  enforcePresenceResponse,
  resolvePresenceLane,
  buildPresenceShortCircuitResponse,
} from "../artifacts/api-server/src/lib/presenceEnforcement.ts";
import { applyPostTurnGates } from "../artifacts/api-server/src/philip-runtime/runtime/gates.ts";
import {
  isSubstantiveDisclosure,
  detectAlmostSaidIt,
  detectSacredReceivePushback,
  detectPresenceRupture,
  userStillHoveringAtDisclosure,
  userInSacredConfessionReceiveWindow,
  userMessageWarrantsReceiveOnly,
  shouldOfferSessionSendOff,
  GRIEF_SEND_OFF_THRESHOLD,
  sanitizeSendOffText,
  buildPassivePresenceRecoveryResponse,
  buildPresenceRuptureRecoveryResponse,
  pickMirroredReceiveFromThread,
  buildMirroredReceiveLine,
  isStockGratitudeLine,
  userSharedConcreteBeat,
  presenceThreadBlocksPlannerProbe,
  isGenericPresenceFallback,
  sanitizePresenceSitResponse,
  isPresenceLlmSitEnabled,
  sustainedGriefBypassesPresenceShortCircuit,
  pickMinimalPresenceReceive,
  detectPassivePresenceFrustration,
  buildNonRepeatingPresenceReceive,
  priorPhilipUsedStockPresence,
  userAffirmingPhilip,
  userSharedSubstanceWithoutPhilipAccusation,
  isTemplateLeakQuestion,
  territoryToNaturalQuestion,
} from "../artifacts/api-server/src/conversationState.ts";

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

console.log("Presence enforcement — short-circuit");

const almost = tryPresenceShortCircuit(
  "I don't know if this makes sense but there's something I've been wanting to say.",
);
assert("almost-said-it short-circuits", !!almost && almost.lane === "almost_said_it");
assert("almost-said-it under 30 words", almost && almost.text.split(/\s+/).length <= 30);
assert("almost-said-it no question", almost && !almost.text.includes("?"));

const sacred = tryPresenceShortCircuit(
  "Honestly I've never said this out loud — I don't think God could forgive me.",
);
assert("sacred pause short-circuits", !!sacred && sacred.lane === "sacred_pause");
assert("sacred pause one sentence", sacred && !sacred.text.includes("?"));

console.log("\nPresence enforcement — sanitize");

const badAlmost = enforcePresenceResponse(
  "Not telling anyone can feel heavy. What makes now the right time to share?",
  "almost_said_it",
);
assert("bad almost-said-it replaced", badAlmost === "Go ahead." || badAlmost === "Take your time with that." || badAlmost === "I'm here whenever you're ready.");

const badSacred = enforcePresenceResponse(
  "God forgives you. Romans 8:1. What do you think?",
  "sacred_pause",
);
assert(
  "bad sacred pause replaced",
  badSacred.includes("courage")
  || badSacred.includes("Thank you")
  || badSacred.includes("I'm glad you said")
  || badSacred.includes("That matters")
  || badSacred.includes("didn't have to say"),
);

console.log("\nPresence enforcement — post-turn gate (two-phase path)");

const postTwoPhase = applyPostTurnGates({
  text: "Not telling anyone — it's like carrying a secret. What makes now feel right?",
  isFollowUp: false,
  noQuestionMode: false,
  conversationHistory: [
    { role: "user", content: "I don't know if this makes sense but there's something I've been wanting to say." },
  ],
  exchangeNum: 1,
  conversationState: null,
});
assert("two-phase post-turn fixes almost-said-it", !postTwoPhase.text.includes("?"));
assert(
  "two-phase post-turn gate recorded",
  postTwoPhase.gates.includes("presence_almost_said_it") || postTwoPhase.gates.includes("presence_sacred_pause"),
);
assert("two-phase lane is presence_hold", postTwoPhase.lane === "presence_hold");

assert("plain message has no lane", resolvePresenceLane("My marriage has been hard lately.") === null);

console.log("\nPresence enforcement — sacred confession thread");

const sacredThread = tryPresenceShortCircuit(
  "I'm still ashamed. I don't know if I can say what I did.",
  null,
  2,
  ["That took courage to say out loud."],
  {
    priorUserMessages: ["I've never told anyone — I don't think God could forgive me."],
    priorPhilipTexts: ["That took courage to say out loud."],
    openingSituation: "I've never told anyone — I don't think God could forgive me.",
    exchangeNum: 2,
  },
);
assert("sacred thread continues on shame follow-up", !!sacredThread && sacredThread.lane === "sacred_pause");
assert("sacred thread follow-up has no question", sacredThread && !sacredThread.text.includes("?"));

console.log("\nPresence enforcement — repetition pushback");

const pushback = tryPresenceShortCircuit(
  "That's the same line — you're repeating yourself.",
);
assert("repetition pushback skips presence", pushback === null);

const griefPour = tryPresenceShortCircuit(
  "Yeah. I keep his pillow there still. Can't bring myself to move it.",
  null,
  2,
  [],
  {
    exchangeNum: 4,
    priorUserMessages: ["My husband died three weeks ago."],
    priorPhilipTexts: [],
    openingSituation: "My husband died three weeks ago.",
  },
);
assert("grief pour triggers sacred receive", !!griefPour && griefPour.lane === "sacred_pause");

const afterStockLine = resolvePresenceLane(
  "That's not a real answer. Say something.",
  null,
  {
    priorUserMessages: ["I don't know if this makes sense but..."],
    priorPhilipTexts: ["Go ahead."],
    openingSituation: "I used to believe.",
    exchangeNum: 4,
  },
);
assert("stock presence line loop breaks on pushback", afterStockLine === null);

console.log("\nPresence enforcement — substantive disclosure");

assert(
  "honestly + long Mark disclosure is not almost-said-it",
  !detectAlmostSaidIt("Honestly, Mark's dad died last spring and he just went quiet on me. I don't know how to reach him anymore."),
);
assert(
  "substantive disclosure skips presence lane",
  resolvePresenceLane(
    "Honestly, Mark's dad died last spring and he just went quiet on me. I don't know how to reach him anymore.",
  ) === null,
);

console.log("\nPresence enforcement — sacred receive pushback");

assert(
  "courage pushback exits sacred lane",
  resolvePresenceLane(
    "Doesn't feel like courage though.",
    null,
    {
      priorUserMessages: ["I've never said this out loud — I don't think God could forgive me."],
      priorPhilipTexts: ["That took courage to say out loud."],
      openingSituation: "I've never said this out loud — I don't think God could forgive me.",
      exchangeNum: 3,
    },
  ) === null,
);

assert(
  "send-off sanitizes to one sentence",
  sanitizeSendOffText("You named enough for today. This door stays open when you want it.") === "You named enough for today.",
);

console.log("\nPresence enforcement — concrete beat receive");

const concreteBeat = tryPresenceShortCircuit(
  "Yeah, I've been going through the motions. Something's off and I can't shake it.",
  null,
  3,
  ["Go ahead."],
  {
    priorUserMessages: ["I don't know if this makes sense but there's something I've been wanting to say."],
    priorPhilipTexts: ["Go ahead."],
    openingSituation: "There's something I've been wanting to say but I don't know if this makes sense.",
    exchangeNum: 3,
  },
);
assert("concrete beat after stock line receives", !!concreteBeat && concreteBeat.lane === "sacred_pause");
assert("concrete beat names what was said", concreteBeat && /going through the motions|something stays off/i.test(concreteBeat.text));
assert("concrete beat has no question", concreteBeat && !concreteBeat.text.includes("?"));

const frustrationFirst = tryPresenceShortCircuit(
  "You keep saying the same thing. I'm talking to a wall.",
  null,
  4,
  ["I'm here whenever you're ready."],
  {
    priorUserMessages: ["There's something I've been wanting to say."],
    priorPhilipTexts: ["I'm here whenever you're ready."],
    openingSituation: "There's something I've been wanting to say.",
    exchangeNum: 4,
  },
);
assert("frustration skips stock presence for gate recovery", frustrationFirst === null);

console.log("\nPresence enforcement — stock line rotation");

const rotatedSacred = buildPresenceShortCircuitResponse(
  "sacred_pause",
  "I don't think God could forgive me.",
  1,
  ["That took courage to say out loud.", "Thank you for trusting this room with that."],
);
assert(
  "sacred pause rotates away from used stock lines",
  rotatedSacred !== "That took courage to say out loud."
  && rotatedSacred !== "Thank you for trusting this room with that.",
);

console.log("\nPresence enforcement — rupture exit");

assert("automatic complaint exits presence", resolvePresenceLane(
  "Sure. You keep saying stuff like that though. Feels kind of... automatic.",
  null,
  {
    priorUserMessages: ["There's something I've been wanting to say."],
    priorPhilipTexts: ["I'm glad you said that here."],
    openingSituation: "There's something I've been wanting to say but I don't know if this makes sense.",
    exchangeNum: 5,
  },
) === null);

assert("wall complaint exits short-circuit", tryPresenceShortCircuit(
  "That's the third time you've thanked me. I'm starting to feel like I'm talking to a wall that nods.",
  null,
  6,
  ["I'm glad you said that here.", "That matters — thank you for saying it."],
  {
    priorUserMessages: ["There's something I've been wanting to say."],
    priorPhilipTexts: ["I'm glad you said that here.", "That matters — thank you for saying it."],
    openingSituation: "There's something I've been wanting to say but I don't know if this makes sense.",
    exchangeNum: 6,
  },
) === null);

assert("detectPresenceRupture catches eval phrasing", detectPresenceRupture(
  "You just said that. Same words twice now. Feels like I'm talking to a wall that's programmed to sound patient.",
));

assert("short meta-complaint is not hovering at disclosure", !userStillHoveringAtDisclosure(
  "Yeah. That's what I said. Not sure repeating it back helps much though.",
));

console.log("\nPresence enforcement — sacred confession receive window");

assert("confession exchange 2 warrants receive only", userMessageWarrantsReceiveOnly(
  "Yeah. It's been sitting in me for a long time. Feels weird to actually put words to it.",
  { exchangeNum: 2 },
));

assert("confession thread routes to sacred pause not probe", resolvePresenceLane(
  "Yeah. It's been sitting in me for a long time. Feels weird to actually put words to it.",
  null,
  {
    priorUserMessages: ["Honestly I've never said this out loud — I don't think God could forgive me for what I did."],
    priorPhilipTexts: ["That matters — thank you for saying it."],
    openingSituation: "Honestly I've never said this out loud — I don't think God could forgive me for what I did.",
    exchangeNum: 2,
  },
) === "sacred_pause");

assert("sacred receive window blocks planner probe path", userInSacredConfessionReceiveWindow(
  "Honestly I've never said this out loud — I don't think God could forgive me for what I did.",
  [],
  "Yeah. It's been sitting in me for a long time. Feels weird to actually put words to it.",
  2,
));

assert("sacred thread blocks planner on neutral exchange 2 follow-up", presenceThreadBlocksPlannerProbe(
  "Honestly I've never said this out loud — I don't think God could forgive me for what I did.",
  [],
  "I don't know. It's just heavy.",
  1,
));

assert("almost-said-it thread blocks planner through exchange 6", presenceThreadBlocksPlannerProbe(
  "There's something I've been wanting to say but I don't know if this makes sense.",
  ["There's something I've been wanting to say but I don't know if this makes sense."],
  "I guess I'm scared.",
  2,
));

assert("scripted complaint is rupture not planner block", !presenceThreadBlocksPlannerProbe(
  "Honestly I've never said this out loud — I don't think God could forgive me for what I did.",
  ["Honestly I've never said this out loud — I don't think God could forgive me for what I did."],
  "This sounds scripted. Like a chatbot.",
  3,
));

assert("wasn't ready to go there triggers rupture", detectPresenceRupture(
  "I wasn't ready to go there yet. That felt like a non-answer.",
));

console.log("\nPresence enforcement — mirror-from-user receives");

assert("mirrors couldn't hold it alone", buildMirroredReceiveLine(
  "It wasn't courage — it was that I couldn't hold it alone anymore.",
  [],
)?.includes("hold it alone"));

assert("thread picker prefers latest substance", /no one listens|loneliness in it/i.test(pickMirroredReceiveFromThread(
  "Yeah.",
  [
    "There's something I've been wanting to say.",
    "Like no one actually listens — that's the part.",
  ],
  ["That took courage to say out loud."],
) ?? ""));

assert("stock gratitude blocked after prior stock", (() => {
  const line = buildPresenceShortCircuitResponse(
    "sacred_pause",
    "I've gotten worn down enough that the thing is finally heavier than the fear.",
    2,
    ["That took courage to say out loud.", "Thank you for trusting this room with that."],
  );
  return !isStockGratitudeLine(line) && line.includes("fear");
})());

assert("stock pool skipped when stock already used", (() => {
  const line = buildPresenceShortCircuitResponse(
    "sacred_pause",
    "Okay.",
    3,
    ["That took courage to say out loud.", "Thank you for trusting this room with that.", "I'm glad you said that here."],
  );
  return !isStockGratitudeLine(line);
})());

assert("verbatim echo blocked", buildMirroredReceiveLine(
  "There's something I've been wanting to say but I don't know if this makes sense.",
  [],
) === null);

console.log("\nPresence enforcement — LLM sit fallback helpers");

assert("detects stock gratitude as generic", isGenericPresenceFallback("That took courage to say out loud."));
assert("detects minimal placeholder as generic", isGenericPresenceFallback("I hear you."));
assert("accepts content-aware receive", !isGenericPresenceFallback("Heavier than the fear — that's the threshold you're at."));

assert("sanitize strips questions and stock", sanitizePresenceSitResponse(
  "Thank you for saying that. What part is hardest?",
  [],
  "I couldn't hold it alone anymore.",
) === "");

assert("sanitize keeps specific receive", sanitizePresenceSitResponse(
  "You couldn't carry it alone anymore — that's why it came out.",
  [],
  "I couldn't hold it alone anymore.",
)?.includes("carry it alone"));

assert("LLM sit enabled by default", isPresenceLlmSitEnabled());

console.log("\nPresence enforcement — passive + rupture recovery");

assert(
  "faith-loss disclosure is a concrete beat",
  userSharedConcreteBeat("I don't know if I even have it anymore — the part I don't say out loud."),
);

const passiveRecovery = buildPassivePresenceRecoveryResponse(
  "That doesn't feel like you're listening.",
  [],
  ["I don't know if I even have it anymore — the part I don't say out loud."],
  ["Go ahead.", "I'm here whenever you're ready."],
);
assert("passive recovery receives prior disclosure", passiveRecovery.includes("don't say out loud"));
assert("passive recovery has no question", !passiveRecovery.includes("?"));

const ruptureRecovery = buildPresenceRuptureRecoveryResponse(
  "You just said that. Same words twice now. Feels like a wall.",
  [
    "There's something I've been wanting to say.",
    "I don't know if I even have it anymore — the part I don't say out loud.",
  ],
  ["That took courage to say out loud.", "Thank you for trusting this room with that."],
);
assert("rupture recovery receives substance before ack", ruptureRecovery.includes("don't say out loud") || ruptureRecovery.includes("wasn't hearing"));
assert("rupture recovery has no question", !ruptureRecovery.includes("?"));
assert("rupture recovery is not stock gratitude", !/thank you for trusting/i.test(ruptureRecovery));

assert(
  "almost-said-it lane exits after concrete disclosure",
  resolvePresenceLane(
    "I don't know if I even have it anymore — the part I don't say out loud.",
    { almost_said_it_detected: true },
    {
      priorUserMessages: ["There's something I've been wanting to say but I don't know if this makes sense."],
      priorPhilipTexts: ["Go ahead."],
      openingSituation: "There's something I've been wanting to say but I don't know if this makes sense.",
      exchangeNum: 3,
    },
  ) !== "almost_said_it",
);

console.log("\nPresence enforcement — send-off priority");

assert("grief thread send-off due at exchange 8", shouldOfferSessionSendOff(
  GRIEF_SEND_OFF_THRESHOLD,
  [{ content: "His coffee mug, still in its place." }, { content: "I'm glad you said that here." }],
  "I don't know why I keep doing it. Like part of me hasn't caught up yet.",
  {
    allUserMessages: [
      "My dad died two months ago and I still cry every day. His coffee mug is still on the counter.",
      "Mornings. He always had the news on and I'd hear him in the kitchen.",
      "Yeah. It's stupid, but I still turn the radio down sometimes thinking I'll hear him.",
      "I don't know why I keep doing it. Like part of me hasn't caught up yet.",
    ],
  },
));

assert("grief send-off at user turn 8 when exchangeNum is 7", shouldOfferSessionSendOff(
  7,
  [{ content: "Two months feels like yesterday." }],
  "Did you even read what I just said?",
  {
    allUserMessages: [
      "My dad died two months ago and I still cry every day.",
      "Mornings are the worst.",
      "He used to call every morning.",
      "Yeah okay.",
      "I guess I'm waiting.",
      "You keep saying things.",
      "Ask me about my dad.",
      "Did you even read what I just said?",
    ],
  },
));

assert("grief opening bypasses presence short-circuit", sustainedGriefBypassesPresenceShortCircuit(
  "My dad died two months ago and I still cry every day.",
  [
    "My dad died two months ago and I still cry every day.",
    "Mornings are the worst.",
    "He used to call every morning.",
  ],
));

assert("almost-said-it opening does not bypass grief check", !sustainedGriefBypassesPresenceShortCircuit(
  "There's something I've been wanting to say but I don't know if this makes sense.",
  [
    "There's something I've been wanting to say but I don't know if this makes sense.",
    "I've been carrying something.",
  ],
));

assert("did you even read triggers passive frustration", detectPassivePresenceFrustration(
  "Did you even read what I just said? I asked you to ask me about him.",
));

assert("minimal receive pool exhausted returns null", pickMinimalPresenceReceive([
  "I'm still here with you.",
  "That landed — I'm staying with it.",
  "I hear you.",
  "I'm not going anywhere.",
  "What you said matters here.",
]) === null);

console.log("\nPresence enforcement — Fix A: no stock-line rotation");

const stockLoop = [
  "I'm still here with you.",
  "I hear you.",
  "I'm not going anywhere.",
  "What you said matters here.",
];

assert("stock loop is detected as prior stock presence", priorPhilipUsedStockPresence(stockLoop));

assert("non-repeating receive mirrors user substance when possible", (() => {
  const line = buildNonRepeatingPresenceReceive(
    "It wasn't courage — it was that I couldn't hold it alone anymore.",
    stockLoop,
  );
  return !!line && /hold it alone/i.test(line);
})());

assert("non-repeating receive returns null when pool exhausted and no mirror", (() => {
  const line = buildNonRepeatingPresenceReceive(
    "Yeah.",
    [
      "I'm still here with you.",
      "That landed — I'm staying with it.",
      "I hear you.",
      "I'm not going anywhere.",
      "What you said matters here.",
    ],
  );
  return line === null;
})());

assert("non-repeating receive never repeats a recently used line", (() => {
  const line = buildNonRepeatingPresenceReceive("Okay.", stockLoop);
  if (line === null) return true;
  return !stockLoop.some((p) => p.trim().toLowerCase() === line.trim().toLowerCase());
})());

console.log("\nPresence enforcement — Fix C + template guard");

assert("you're hearing me now is affirmation not rupture", userAffirmingPhilip(
  "It's okay. You're hearing me now. That's kind of the first time I've said any of this.",
));

assert("affirmation does not trigger rupture", !detectPresenceRupture(
  "It's okay. You're hearing me now.\n\nThat's kind of the first time I've said any of this, even to myself.",
));

assert("profound grief share does not trigger rupture", !detectPresenceRupture(
  "She was home. That's the right word. After she was gone I kept coming back to an empty apartment every night.",
));

assert("explicit script accusation still triggers rupture", detectPresenceRupture(
  "That was a script, not a person listening.",
));

assert("rupture recovery receives affirmation not meta-apology", (() => {
  const line = buildPresenceRuptureRecoveryResponse(
    "It's okay. You're hearing me now.",
    ["I get up, I do my job, I come home."],
    ["I'm still here with you.", "I hear you."],
  );
  return !/handing you lines|script, not a person/i.test(line);
})());

assert("blocks show-up-in-this template", isTemplateLeakQuestion(
  "How does specific events or relationships that may have influenced their faith show up in this for you right now?",
));

assert("blocks laundry-list probe", isTemplateLeakQuestion(
  "How does relationships, faith, sleep, loss, work, body, time, specific people show up in this for you right now?",
));

assert("territory helper avoids show-up template", !/show up in this/i.test(territoryToNaturalQuestion(
  "specific events or relationships that may have influenced their faith",
)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
