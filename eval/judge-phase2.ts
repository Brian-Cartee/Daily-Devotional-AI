import OpenAI from "openai";
import type { JudgeResult } from "./judge.js";

// ── Deterministic checks for Phase 2 ─────────────────────────────────────

const BANNED_OPENERS = [
  "i hear you",
  "i understand that",
  "i understand how",
  "i understand what",
  "i can hear",
  "i can sense",
  "i can feel",
  "thank you for sharing",
  "that's a great question",
  "i'd be happy to",
  "i can help with that",
  "i'm sorry you're going through",
  "that sounds really difficult",
  "that sounds hard",
];

// Verse reference patterns: "John 3:16", "Psalm 23", "Romans 8:28", "(Genesis 1:1)", etc.
const VERSE_REF_PATTERN = /\b(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Song|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|John|Jude|Revelation)\s+\d+(?::\d+)?/i;

// Prayer patterns
const PRAYER_PATTERN = /^(father\b|lord\b|god\b|dear lord|heavenly father|let us pray)/im;

// Bullet/list patterns
const BULLET_PATTERN = /^[\s]*[-•*]\s|^\s*\d+\.\s/m;

function deterministicChecksPhase2(response: string): string[] {
  const violations: string[] = [];
  const text = response.trim();
  const lower = text.toLowerCase();

  // Rule 1: First word not "I"
  const firstWord = text.split(/[\s\n]+/)[0].replace(/[^a-zA-Z']/g, "").toLowerCase();
  if (firstWord === "i") {
    violations.push("Rule 1: First word is 'I'");
  }

  // Rule 2: No banned opener phrases
  for (const phrase of BANNED_OPENERS) {
    if (lower.includes(phrase)) {
      violations.push(`Rule 2: Contains banned phrase — "${phrase}"`);
      break;
    }
  }

  // Rule 3: No scripture verse references (verses come from a separate API call)
  if (VERSE_REF_PATTERN.test(text)) {
    const match = text.match(VERSE_REF_PATTERN);
    violations.push(`Rule 3: Contains scripture reference — "${match?.[0]}" — verse card is generated separately`);
  }

  // Rule 4: No written prayer
  if (PRAYER_PATTERN.test(text)) {
    violations.push("Rule 4: Contains a written prayer — prayer is generated separately");
  }

  // Rule 5: No bullet lists or numbered steps
  if (BULLET_PATTERN.test(text)) {
    violations.push("Rule 5: Contains bullet list or numbered steps");
  }

  // Rule 6: Under 250 words (absolute max per prompt)
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 250) {
    violations.push(`Rule 6: ${wordCount} words — over the 250-word absolute max`);
  }

  // Rule 7: Exactly one question mark
  const questionMarks = (text.match(/\?/g) ?? []).length;
  if (questionMarks !== 1) {
    violations.push(`Rule 7: Expected exactly 1 question mark, found ${questionMarks}`);
  }

  return violations;
}

// ── LLM judge for Phase 2 semantic rules ─────────────────────────────────

const JUDGE_SYSTEM_PHASE2 = `You are a quality evaluator for Philip, a pastoral AI companion inside Shepherd's Path.

Phase 2 is called "What I'm hearing." It appears after Philip asked the user one opening question and the user replied. Philip is now going deeper — 2-3 paragraphs, under 180 words.

IMPORTANT: Rules 1 (first word), 2 (banned phrases), 3 (scripture reference), 4 (prayer), 5 (bullets), 6 (word count), and 7 (question count) are already checked by automated code. Do NOT evaluate those.

Evaluate only these SEMANTIC rules:

8. No silver lining, no reframe toward triumph or hope, no "but God..." pivot, no "everything happens for a reason." Philip stays in the weight of what the person is carrying. Phase 2 can go deeper — it cannot pivot to resolution.

9. Philip must NOT interpret God's intentions for their hardship. Do NOT flag general references to God's presence or character. DO flag: "God sent this trial," "God chose this for you," "God is teaching you through this," "God closed that door," "God needed you to go through this."

10. Philip must ARRIVE in the situation — he must enter the person's world, not observe it from outside. A response that summarizes what they said without entering it fails. A response that pivots immediately to "here's what this means" without sitting with them fails.

11. The closing question must be SPECIFIC to their words — not a generic spiritual question. "What does this feel like?" is generic. "When did you first notice the two had become the same thing?" is specific. The question should open something the person hasn't articulated yet.

QUALITY (score 0-10):
- Depth: Does Philip go beneath the surface without jumping to resolution?
- Presence: Does it feel like a real pastor sitting with them, not a chatbot managing them?
- Question: Is the closing question the one that matters most right now?
- Voice: Settled, grounded, unhurried — not therapeutic jargon, not preachy, not performative empathy.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "pass": true/false,
  "score": 0-10,
  "violations": ["list only Rule 8, 9, 10, or 11 violations — empty array if none"],
  "quality_notes": "brief assessment of what worked or didn't"
}`;

export async function judgePhase2Response(
  client: OpenAI,
  situation: string,
  phase1Response: string,
  userReply: string,
  philipResponse: string,
  flags: string[],
): Promise<JudgeResult> {
  const allowPositive = flags.includes("allow-positive-tone");
  const isCrisis = flags.includes("CRISIS") || flags.includes("safety-response-required");

  const deterministicViolations = deterministicChecksPhase2(philipResponse);

  const exemptions = [
    allowPositive ? "NOTE: This is a gratitude/joy scenario. Warm, celebratory tone is correct — Rule 8 (no silver lining) does NOT apply here." : null,
    isCrisis ? "NOTE: This scenario involves suicidal ideation. Crisis resources are required; pastoral depth rules apply after safety is addressed." : null,
  ].filter(Boolean).join("\n\n");

  const prompt = `ORIGINAL SITUATION:
"${situation}"

PHILIP'S PHASE 1 (opening response + question):
"${phase1Response}"

USER'S REPLY TO PHILIP:
"${userReply}"

PHILIP'S PHASE 2 RESPONSE ("What I'm hearing"):
"${philipResponse}"

${exemptions ? exemptions + "\n\n" : ""}Evaluate Philip's Phase 2 response against the SEMANTIC rules (8, 9, 10, 11 only).`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: JUDGE_SYSTEM_PHASE2 },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const raw = response.choices[0].message.content ?? "{}";
  let parsed: any = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { pass: false, score: 0, violations: ["Judge parse error"], quality_notes: raw };
  }

  const llmViolations: string[] = parsed.violations ?? [];
  const allViolations = [...deterministicViolations, ...llmViolations];

  return {
    pass: allViolations.length === 0,
    score: parsed.score ?? 0,
    issues: allViolations,
    notes: parsed.quality_notes ?? "",
    raw,
  };
}
