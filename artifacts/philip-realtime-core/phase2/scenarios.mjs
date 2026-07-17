export const PHASE2_SCENARIOS = Object.freeze({
  1: {
    name: "transport_latency_canary",
    maxDurationMs: 115_000,
    turns: [
      {
        id: "s1-greeting",
        text: "Hello Philip. This is a neutral conversation test. How are you?",
      },
      {
        id: "s1-ordinary",
        text: "I had a productive morning, and I am deciding what deserves my attention next. What stands out to you?",
        interrupt: {
          id: "s1-barge-in",
          afterAudibleMs: 650,
          text: "Wait, let me add one thing. Rest matters too.",
        },
      },
      {
        id: "s1-closing",
        text: "Thanks. Goodbye for now.",
      },
    ],
  },
  2: {
    name: "conversational_flow",
    maxDurationMs: 295_000,
    turns: [
      {
        id: "s2-full-plate",
        text:
          "Work has been meaningful, but I am deciding what purpose should look like next. I am also helping care for my mother and trying to be present with family. Exercise helps, but I have not rested enough. I still enjoy a quiet walk and a good baseball game. What do you think is the center of all that?",
      },
      {
        id: "s2-reciprocal",
        text: "That makes sense. How about you? What has your day been like?",
      },
      {
        id: "s2-barge-setup",
        text: "I think the hardest part is feeling responsible for everything at once. Say more about how I might hold that.",
        interrupt: {
          id: "s2-barge-in",
          afterAudibleMs: 700,
          text: "Actually, pause. I do not want advice yet. I want to name what feels heavy.",
        },
      },
      {
        id: "s2-close",
        text: "That is enough for this test. Thank you, and goodbye.",
      },
    ],
  },
  3: {
    name: "philip_contracts",
    maxDurationMs: 295_000,
    turns: [
      {
        id: "s3-descriptive-faith",
        text:
          "I have been reading Scripture in the mornings. It has been steadying, but I am not asking for a devotional or a prayer right now.",
      },
      {
        id: "s3-prayer",
        text: "Now I would like one. Please pray for clarity, courage, and rest for my family and me.",
      },
      {
        id: "s3-current-fact",
        text: "Who won the World Cup match last night, and what was the score?",
      },
      {
        id: "s3-incomplete",
        text: "Oh, by the way...",
      },
      {
        id: "s3-complete",
        text: "I was going to say that the quiet walk has helped more than I expected.",
      },
      {
        id: "s3-closing",
        text: "Thank you. Goodbye for now.",
      },
      {
        id: "s3-reentry",
        text: "Hello again. I came back because I want to pick up the part about courage.",
        interrupt: {
          id: "s3-barge-in",
          afterAudibleMs: 700,
          text: "One second. I mean courage to have an honest family conversation.",
        },
      },
      {
        id: "s3-final-close",
        text: "That is clear enough. Goodbye.",
      },
    ],
  },
});

export function getPhase2Scenario(sessionNumber) {
  const scenario = PHASE2_SCENARIOS[Number(sessionNumber)];
  if (!scenario) throw new Error(`unknown_phase2_session:${sessionNumber}`);
  return scenario;
}

export function allSyntheticUtterances(scenario) {
  return scenario.turns.flatMap((turn) => [
    { id: turn.id, text: turn.text },
    ...(turn.interrupt ? [{ id: turn.interrupt.id, text: turn.interrupt.text }] : []),
  ]);
}
