import { estimateConversationCost, GPT_REALTIME_21_PRICING } from "../src/index.mjs";

const durations = [5, 10, 20];
const rows = durations.map((durationMinutes) => estimateConversationCost({ durationMinutes }));

console.log(
  JSON.stringify(
    {
      note: "Phase 1 estimate only — no paid calls. Anchors: OpenAI gpt-realtime-2.1 pricing docs.",
      pricing: GPT_REALTIME_21_PRICING,
      estimates: rows.map((r) => ({
        durationMinutes: r.durationMinutes,
        usd: r.usd,
        breakdown: r.breakdown,
      })),
      phase2Suggestion: {
        maxCalls: 3,
        maxMinutesPerCall: 5,
        conservativeDollarCap: 5,
        rationale:
          "Three short WebRTC smoke calls against gpt-realtime-2.1 with budget guard, enough to validate barge-in and speech-end→first-audio without open-ended spend.",
      },
    },
    null,
    2,
  ),
);
