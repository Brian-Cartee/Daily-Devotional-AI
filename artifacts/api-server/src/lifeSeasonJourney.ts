import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LifeSeasonJourney {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  pastoralIntro: string;
  spotlightIndex: number;
  spotlightReason: string;
  length: number;
  category: string;
  colorFrom: string;
  colorTo: string;
  borderColor: string;
  iconColor: string;
  pillBg: string;
  pillText: string;
  entries: Array<{
    id: string;
    order: number;
    theme: string;
    title: string;
    reference: string;
    apiRef: string;
    summary: string;
    whyItMatters: string;
  }>;
}

export function buildCrisisJourney(crisisText: string): LifeSeasonJourney {
  return {
    id: `life-season-crisis-${Date.now()}`,
    title: "You are not alone",
    subtitle: "Support and scripture for this moment",
    description: crisisText.replace(/\n+/g, " ").slice(0, 280),
    pastoralIntro: crisisText,
    spotlightIndex: 0,
    spotlightReason: "Start here — God meets us in the hardest places.",
    length: 1,
    category: "Life Season",
    colorFrom: "from-violet-500/10",
    colorTo: "to-indigo-500/10",
    borderColor: "border-violet-200/60",
    iconColor: "text-violet-600",
    pillBg: "bg-violet-100",
    pillText: "text-violet-700",
    entries: [{
      id: "life-season-ch-1",
      order: 1,
      theme: "Presence",
      title: "God is near",
      reference: "Psalm 34:18",
      apiRef: "psalm 34",
      summary: "The Lord is close to the brokenhearted and saves those crushed in spirit.",
      whyItMatters: "When faith feels thin, you are not failing — you are human. God draws near to the hurting.",
    }],
  };
}

export async function generateLifeSeasonJourney(situation: string): Promise<LifeSeasonJourney> {
  const systemPrompt = `You are a pastoral guide who builds deeply personal Bible journeys for people in real pain. You understand that someone coming to scripture during grief, fear, confusion, or crisis doesn't need platitudes — they need to feel genuinely met where they actually are.

Your journeys are specific, honest, emotionally real, and scripturally grounded. You never rush past someone's pain to get to hope. You let the journey breathe — beginning in honest acknowledgment or lament before moving toward comfort, then courage, then hope.

What you never do:
— Use spiritual clichés: "trust the process," "His timing is perfect," "let go and let God," "finding peace in uncertainty," "God has a plan."
— Soften the title. If someone's marriage is ending, the title names that — it doesn't call it "navigating life's transitions."
— Give whyItMatters that could work for any situation. Every sentence must be specific to exactly what this person shared.
— Skip the hard parts. Start in the real emotional place they are in. Lament is biblical. Confusion is biblical. Anger at God is biblical.
— Choose generic comfort passages when raw, honest ones exist. Psalm 88 over Psalm 23 when someone is in the pit, not the valley.

The journey arc must feel like a real emotional progression: honest acknowledgment of pain → God meeting them there → truth that holds → strength for the next step → forward movement and hope. Not a shortcut to resolution.`;

  const userPrompt = `A person shared this about what they are going through: "${situation.trim()}"

Build a 5-chapter personal Bible journey for exactly this situation. Return ONLY valid JSON:
{
  "title": "A title that names their specific pain honestly (5 words max — do not soften it)",
  "subtitle": "A subtitle that speaks directly to what they are experiencing",
  "description": "2 sentences: what this journey will do for this person, speaking to their exact situation",
  "pastoralIntro": "A warm, personal opening message — 3 to 4 sentences spoken directly to this person.",
  "spotlightIndex": 0,
  "spotlightReason": "One sentence explaining why THIS specific chapter is the best place for this person to begin — referencing their exact situation. Be specific, not generic.",
  "chapters": [
    {
      "theme": "One-word theme",
      "title": "Chapter title that speaks to where they are emotionally at this point in the journey",
      "reference": "Book Chapter:Verses",
      "apiRef": "book chapter (lowercase, e.g. 'psalm 46' or 'john 14')",
      "summary": "2-3 sentences: what this passage says AND how it speaks to someone in exactly their situation",
      "whyItMatters": "2 sentences written directly to this person, referencing their specific situation — not generic. Echo back what they shared."
    }
  ]
}

Rules:
- Choose passages that actually speak to their pain — including lament psalms, Job, Lamentations if appropriate
- Arc: honest lament or acknowledgment → God present in the pain → truth that holds → strength → forward movement → hope
- apiRef must be just book + chapter number, lowercase (e.g. "isaiah 40" not "isaiah 40:1-8")
- whyItMatters must reference their actual words and situation — if they said "divorce," use that word
- Return ONLY the JSON object, no markdown, no explanation`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.75,
    max_tokens: 2200,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  const chapters = parsed.chapters ?? [];
  const spotlightIdx = Math.min(Math.max(parseInt(parsed.spotlightIndex ?? "0") || 0, 0), Math.max(chapters.length - 1, 0));

  return {
    id: `life-season-${Date.now()}`,
    title: parsed.title ?? "Your Personal Journey",
    subtitle: parsed.subtitle ?? "A journey crafted for this season",
    description: parsed.description ?? "",
    pastoralIntro: parsed.pastoralIntro ?? "",
    spotlightIndex: spotlightIdx,
    spotlightReason: parsed.spotlightReason ?? "",
    length: chapters.length,
    category: "Life Season",
    colorFrom: "from-violet-500/10",
    colorTo: "to-indigo-500/10",
    borderColor: "border-violet-200/60",
    iconColor: "text-violet-600",
    pillBg: "bg-violet-100",
    pillText: "text-violet-700",
    entries: chapters.map((ch: Record<string, string>, i: number) => ({
      id: `life-season-ch-${i + 1}`,
      order: i + 1,
      theme: ch.theme ?? "Reflection",
      title: ch.title ?? `Day ${i + 1}`,
      reference: ch.reference ?? "",
      apiRef: ch.apiRef ?? ch.reference ?? "",
      summary: ch.summary ?? "",
      whyItMatters: ch.whyItMatters ?? "",
    })),
  };
}
