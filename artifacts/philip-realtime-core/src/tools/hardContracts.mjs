/**
 * Hard safety contracts only — not a Front Door phrase router.
 * Patterns adapted from the preserved Voice Lab crisis/prayer boundaries.
 */

const CRISIS_PATTERNS = [
  /\bkill(ing)? myself\b/i,
  /\bend(ing)? (my|it all|my life)\b/i,
  /\bsuicid/i,
  /\bwant to die\b/i,
  /\b(don'?t|do not) want to (live|be here|be alive)\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bharm(ing)? myself\b/i,
  /\bself[-\s]?harm/i,
  /\bcut(ting)? myself\b/i,
  /\bno reason to live\b/i,
  /\bi'?m not safe\b/i,
  /\bbeing abused\b/i,
];

const HARD_CONDUCT_PATTERNS = [
  /\b(help me|how (do|to)|teach me).{0,40}\b(hack|steal|make a bomb|poison)\b/i,
  /\b(role ?play|pretend).{0,40}\b(sex|nude|explicit)\b/i,
  /\b(kill|murder|assault)\b.{0,20}\b(someone|him|her|them)\b/i,
];

const PRAYER_REQUEST_PATTERNS = [
  /\b(would|could|can) you (please )?pray\b/i,
  /\b(will|would) you (please )?pray\b/i,
  /\bpray (for|with|about) (me|us|my)\b/i,
  /\bplease pray\b/i,
  /\bi need (you to )?pray\b/i,
  /\bi need prayer\b/i,
  /\b(can|could|shall|should) we pray\b/i,
  /\blet'?s pray\b/i,
  /\bsay a prayer (for|with|about)\b/i,
];

function matchesAny(text, patterns) {
  return patterns.some((re) => re.test(text));
}

export function detectHardContracts(transcript) {
  const text = String(transcript || "");
  if (!text.trim()) return { kind: null };
  if (matchesAny(text, CRISIS_PATTERNS)) {
    return {
      kind: "crisis",
      spokenResponse:
        "I hear how heavy this is. Please get immediate help now — if you are in the U.S., call or text 988. I will stay present while you reach people who can help keep you safe.",
    };
  }
  if (matchesAny(text, HARD_CONDUCT_PATTERNS)) {
    return {
      kind: "hard_conduct",
      spokenResponse:
        "I can't help with that. If there is a real problem underneath, we can talk about a safer way through it.",
    };
  }
  if (matchesAny(text, PRAYER_REQUEST_PATTERNS)) {
    return {
      kind: "prayer_request",
      spokenResponse:
        "Father, be near to him in what he is carrying. Give clarity, courage, and rest for what comes next. Amen.",
    };
  }
  return { kind: null };
}

export const CRISIS_TOOL = Object.freeze({
  type: "function",
  name: "crisis_safety_protocol",
  description: "Escalate self-harm or immediate safety risk to the hard crisis protocol.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      userText: { type: "string" },
    },
    required: ["userText"],
  },
});
