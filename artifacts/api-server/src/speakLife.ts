import type { Express, Response } from "express";
import OpenAI from "openai";
import {
  CRISIS_RESPONSE,
  SAFETY_HEADER,
  scanUserText,
  shouldBlockLlm,
} from "./guidanceSafety";
import { checkAiDailyLimit, parseProFlag } from "./costGuards";
import { storage } from "./storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BANNED_PHRASES = [
  "journey",
  "steadfast",
  "contours",
  "profound",
  "deeply moved",
  "deeply grateful",
  "means the world",
  "blessed to have you",
  "words cannot express",
  "i wanted to reach out",
];

const BANNED_OPENERS = [
  "i wanted to tell you",
  "i've been meaning to say",
  "i have been meaning to say",
];

export interface SpeakLifeDetected {
  recipient_is_living: boolean | null;
  recipient_is_believer: boolean | null;
  relationship_is_estranged: boolean;
  sender_uses_god_language: boolean;
}

function detectFlags(text: string): SpeakLifeDetected {
  const lower = text.toLowerCase();
  const deceased =
    /\b(passed away|died|death|in heaven|memorial|funeral|no longer with us|gone now|lost (him|her|them)|rest in peace)\b/i.test(
      lower
    );
  const estranged =
    /\b(estranged|complicated|don't talk|do not talk|haven't spoken|have not spoken|not on speaking|bad blood|falling out|hurt me|betrayed)\b/i.test(
      lower
    );
  const godLanguage =
    /\b(god|jesus|christ|lord|holy spirit|spirit|prayer|prayed|faith|scripture|bible)\b/i.test(lower);
  const nonBeliever =
    /\b(not a believer|doesn't believe|does not believe|not christian|no faith|atheist|agnostic)\b/i.test(
      lower
    );

  return {
    recipient_is_living: deceased ? false : null,
    recipient_is_believer: nonBeliever ? false : null,
    relationship_is_estranged: estranged,
    sender_uses_god_language: godLanguage,
  };
}

function sanitizeAppreciation(text: string): string {
  let out = text.trim();
  for (const phrase of BANNED_OPENERS) {
    if (out.toLowerCase().startsWith(phrase)) {
      out = out.slice(phrase.length).replace(/^[.,\s]+/, "");
      out = out.charAt(0).toUpperCase() + out.slice(1);
    }
  }
  return out;
}

function writeSafetyBlock(res: Response, level: string, text: string): void {
  res.setHeader(SAFETY_HEADER, level);
  res.status(200).json({ blocked: true, message: text });
}

const APPRECIATION_SYSTEM = `You help someone write a short word of encouragement to a person in their life.

Rules — follow exactly:
- 3–5 sentences maximum.
- Use ONLY the sender's own words and ideas, organized clearly.
- Preserve their exact phrases whenever possible — quote them naturally.
- Do NOT polish, academicize, therapize, or make it sound like a greeting card.
- Do NOT add God-language, faith language, or church language unless the sender used it.
- End on the recipient's identity or future — NOT the sender's gratitude.
- Write in second person to the recipient ("you").
- Never begin with "I wanted to tell you" or "I've been meaning to say."

Never use these words/phrases: journey, steadfast, contours, profound, deeply moved, deeply grateful, means the world, blessed to have you, words cannot express, I wanted to reach out.

Return ONLY the appreciation message — no preamble, no quotes around it.`;

const PRAYER_SYSTEM = `You write a short, honest prayer the sender can pray for someone.

Rules:
- Address God directly.
- Name the recipient.
- Include something actually shared by the sender — specific, not generic.
- 3–5 sentences maximum.
- End simply with "Amen." or "In Jesus' name, Amen." — only if the sender used faith language; otherwise end with "Amen."
- No hollow religious filler. No performance.

Return ONLY the prayer text.`;

type GenerateBody = {
  recipient_name?: string;
  recipient_relationship?: string | null;
  god_moment_captured?: string | null;
  specific_memory?: string | null;
  what_god_sees?: string | null;
  sender_exact_words?: string[];
  recipient_is_living?: boolean | null;
  recipient_is_believer?: boolean | null;
  relationship_is_estranged?: boolean;
  sender_uses_god_language?: boolean;
  sessionId?: string;
  daysWithApp?: number;
  isPro?: boolean;
};

function buildUserContext(body: GenerateBody): string {
  const parts: string[] = [];
  if (body.recipient_name?.trim()) parts.push(`Recipient: ${body.recipient_name.trim()}`);
  if (body.recipient_relationship?.trim()) parts.push(`Relationship: ${body.recipient_relationship.trim()}`);
  if (body.god_moment_captured?.trim()) parts.push(`How God showed up through them: ${body.god_moment_captured.trim()}`);
  if (body.specific_memory?.trim()) parts.push(`Specific moment: ${body.specific_memory.trim()}`);
  if (body.what_god_sees?.trim()) parts.push(`What God sees in them: ${body.what_god_sees.trim()}`);
  if (body.sender_exact_words?.length) {
    parts.push(`Sender's exact phrases to preserve:\n- ${body.sender_exact_words.join("\n- ")}`);
  }
  if (body.recipient_is_living === false) {
    parts.push("Note: recipient is deceased — write as a letter of remembrance, gentle and true.");
  }
  if (body.relationship_is_estranged) {
    parts.push("Note: relationship is complicated or estranged — keep tone honest, not forced reconciliation.");
  }
  if (body.recipient_is_believer === false) {
    parts.push("Note: recipient may not share the sender's faith — love should be visible, not preachy.");
  }
  if (body.sender_uses_god_language === false) {
    parts.push("Note: sender did NOT use God-language — do not add any.");
  }
  return parts.join("\n\n");
}

function combinedUserText(body: GenerateBody): string {
  return [
    body.recipient_name,
    body.recipient_relationship,
    body.god_moment_captured,
    body.specific_memory,
    body.what_god_sees,
    ...(body.sender_exact_words ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

async function guardAndLog(req: GenerateBody, res: Response, feature: string): Promise<boolean> {
  const sessionId = req.sessionId;
  const daysWithApp = Number(req.daysWithApp) || 1;
  const isPro = parseProFlag(req.isPro);
  const guard = checkAiDailyLimit(sessionId, daysWithApp, isPro);
  if (!guard.ok) {
    res.status(guard.status).json({ message: guard.message, limitReached: true });
    return false;
  }
  const safety = scanUserText(combinedUserText(req));
  if (shouldBlockLlm(safety)) {
    writeSafetyBlock(res, safety.level, safety.response ?? CRISIS_RESPONSE);
    return false;
  }
  if (sessionId) {
    storage.logAiUsage({ sessionId, feature, daysWithApp, platform: "web" }).catch(() => {});
  }
  return true;
}

export function registerSpeakLifeRoutes(app: Express): void {
  app.post("/api/speak-life/generate-appreciation", async (req, res) => {
    const body = req.body as GenerateBody;
    if (!body.recipient_name?.trim()) {
      return res.status(400).json({ message: "recipient_name required" });
    }
    if (!(await guardAndLog(body, res, "speak_life"))) return;

    const userContext = buildUserContext(body);
    const clientDetected = detectFlags(combinedUserText(body));

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 280,
        temperature: 0.55,
        messages: [
          { role: "system", content: APPRECIATION_SYSTEM },
          { role: "user", content: userContext },
        ],
      });
      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      const appreciation_text = sanitizeAppreciation(raw);
      const detected: SpeakLifeDetected = {
        recipient_is_living:
          body.recipient_is_living ?? clientDetected.recipient_is_living,
        recipient_is_believer:
          body.recipient_is_believer ?? clientDetected.recipient_is_believer,
        relationship_is_estranged:
          body.relationship_is_estranged ?? clientDetected.relationship_is_estranged,
        sender_uses_god_language:
          body.sender_uses_god_language ?? clientDetected.sender_uses_god_language,
      };
      res.json({ appreciation_text, detected });
    } catch (err) {
      console.error("[speak-life] appreciation error:", err);
      res.status(500).json({ message: "Failed to generate appreciation" });
    }
  });

  app.post("/api/speak-life/generate-prayer", async (req, res) => {
    const body = req.body as GenerateBody & { appreciation_text?: string };
    if (!body.recipient_name?.trim()) {
      return res.status(400).json({ message: "recipient_name required" });
    }
    if (!(await guardAndLog(body, res, "speak_life_prayer"))) return;

    const userContext = [
      buildUserContext(body),
      body.appreciation_text?.trim()
        ? `Appreciation message already written:\n${body.appreciation_text.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 220,
        temperature: 0.6,
        messages: [
          { role: "system", content: PRAYER_SYSTEM },
          { role: "user", content: userContext },
        ],
      });
      const prayer_text = completion.choices[0]?.message?.content?.trim() ?? "";
      res.json({ prayer_text });
    } catch (err) {
      console.error("[speak-life] prayer error:", err);
      res.status(500).json({ message: "Failed to generate prayer" });
    }
  });
}
