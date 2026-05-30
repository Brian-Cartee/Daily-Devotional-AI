/** Quick picks for Guidance / Talk It Through — matches App Store marketing flows. */

export type SituationTopic = {
  id: string;
  label: string;
  /** Pre-filled text sent to Guidance */
  situation: string;
};

export const SITUATION_TOPICS: SituationTopic[] = [
  {
    id: "anxiety",
    label: "Anxiety",
    situation: "I'm feeling anxious and overwhelmed, and I need God's peace for what I'm carrying right now.",
  },
  {
    id: "grief",
    label: "Grief",
    situation: "I'm walking through grief and loss. I need comfort and Scripture that meets me in this pain.",
  },
  {
    id: "doubt",
    label: "Doubt",
    situation: "I'm struggling with doubt and questions about faith. I want honest guidance grounded in Scripture.",
  },
  {
    id: "loneliness",
    label: "Loneliness",
    situation: "I feel deeply alone tonight. I need to know God sees me and that I'm not walking this by myself.",
  },
  {
    id: "anger",
    label: "Anger",
    situation: "I'm angry and unsettled about something that happened. Help me bring this honestly before God.",
  },
  {
    id: "overwhelm",
    label: "Overwhelm",
    situation: "Everything feels like too much right now. I need Scripture and prayer that steadies my heart.",
  },
];

/** Short chips on the home “You’re safe here” arrival card → full Guidance situation text. */
export const ARRIVAL_CARE_PRESETS = [
  { chip: "I feel alone", topicId: "loneliness" },
  { chip: "I'm anxious", topicId: "anxiety" },
  { chip: "I'm grieving", topicId: "grief" },
  { chip: "I'm exhausted", topicId: "overwhelm" },
] as const;

export function situationForArrivalChip(chip: string): string {
  const preset = ARRIVAL_CARE_PRESETS.find((p) => p.chip === chip);
  if (preset) {
    const topic = SITUATION_TOPICS.find((t) => t.id === preset.topicId);
    if (topic) return topic.situation;
  }
  return chip.trim();
}
