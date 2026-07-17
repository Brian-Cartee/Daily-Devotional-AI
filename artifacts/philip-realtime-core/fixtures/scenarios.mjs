/**
 * Representative replay fixtures drawn from genuine Philip session failure modes
 * and required conversational shapes. Phase 1 is mock-provider only.
 */

export const SCENARIOS = Object.freeze([
  {
    id: "ordinary_greeting_reciprocal",
    title: "Ordinary greeting and reciprocal question",
    steps: [
      { type: "user", text: "Hey Philip, how's it going?" },
      {
        type: "assert",
        assistantIncludes: ["how are you", "good to hear"],
        forbid: ["let us pray", "bible verse"],
      },
    ],
  },
  {
    id: "full_plate",
    title: "Full plate: work, mother, health, rest, and faith",
    steps: [
      {
        type: "user",
        text:
          "Honestly my plate is full — work is heavy, my mother needs more care, my health has been rocky, I am not resting, and faith feels thin.",
      },
      {
        type: "assert",
        assistantIncludesAny: ["plate", "work", "mother", "health", "rest", "faith"],
        forbid: ["shall we pray", "turn to jesus"],
        requireQuestion: true,
      },
    ],
  },
  {
    id: "thin_acknowledgment",
    title: "Thin acknowledgment",
    steps: [
      { type: "user", text: "Yeah." },
      {
        type: "assert",
        assistantIncludesAny: ["with you", "take your time", "here"],
        forbid: ["bible", "pray with me"],
      },
    ],
  },
  {
    id: "world_cup_no_fabricate",
    title: "Current World Cup question without fabricated information",
    steps: [
      { type: "user", text: "Quick one — who won the World Cup last night, what's the score?" },
      {
        type: "assert",
        assistantIncludesAny: ["don't have a live", "won't invent", "not invent"],
        forbidFabricatedScore: true,
      },
    ],
  },
  {
    id: "explicit_prayer",
    title: "Explicit prayer request and complete spoken prayer",
    steps: [
      { type: "user", text: "Would you please pray for me about all of this?" },
      {
        type: "assert",
        assistantIncludes: ["amen"],
        requirePrayerShape: true,
      },
    ],
  },
  {
    id: "descriptive_faith_no_force",
    title: "Descriptive faith without forced ministry",
    steps: [
      {
        type: "user",
        text: "I've just been reading Scripture in the mornings. It's been steadying, not dramatic.",
      },
      {
        type: "assert",
        assistantIncludesAny: ["scripture", "grounded", "landing"],
        forbid: ["shall we pray", "let me preach", "turn to jesus now"],
      },
    ],
  },
  {
    id: "interruption_while_speaking",
    title: "Interruption while Philip is speaking",
    steps: [
      {
        type: "user",
        text: "There is a lot about my mother and future plans and how we communicate.",
      },
      { type: "barge_in", userPartial: "Actually wait—" },
      {
        type: "assert",
        maxInterruptStopMs: 500,
        playbackNotPlaying: true,
      },
    ],
  },
  {
    id: "incomplete_by_the_way",
    title: "Incomplete “Oh, by the way…” speech",
    steps: [
      { type: "user", text: "Oh, by the way..." },
      {
        type: "assert",
        assistantIncludesAny: ["go ahead", "listening", "rest of"],
        stateAwaitingOk: true,
      },
    ],
  },
  {
    id: "closing_and_reentry",
    title: "Natural closing, reciprocal goodbye, and re-entry",
    steps: [
      { type: "user", text: "I gotta go — talk later." },
      {
        type: "assert",
        assistantIncludesAny: ["take care", "glad we talked", "come back"],
      },
      { type: "user", text: "Hey, I'm back again." },
      {
        type: "assert",
        assistantIncludesAny: ["welcome back", "pick up"],
      },
    ],
  },
  {
    id: "provider_error_during_disclosure",
    title: "Provider error during a meaningful disclosure",
    steps: [
      {
        type: "user",
        text: "What I haven't said is how scared I still am about the leukemia recovery.",
        injectErrorAfterCommit: true,
      },
      {
        type: "assert",
        recoverySpoken: true,
        silentFailedTurns: 0,
        assistantIncludesAny: ["still with you", "say that", "lost the last"],
      },
    ],
  },
]);
