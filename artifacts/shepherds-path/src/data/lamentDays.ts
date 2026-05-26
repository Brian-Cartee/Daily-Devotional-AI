/** Seven-day Lament Pathway — curated, no AI generation per day. */

export type LamentDayContent = {
  day: number;
  psalmFragment: string;
  reference: string;
  question: string;
  /** Day 7 companion verse (full short passage) */
  companion?: { text: string; reference: string };
};

export const LAMENT_DAYS: LamentDayContent[] = [
  {
    day: 1,
    psalmFragment: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.",
    reference: "Psalm 23:4",
    question: "What loss feels heaviest today — name it honestly, even if only to God?",
  },
  {
    day: 2,
    psalmFragment: "Jesus wept.",
    reference: "John 11:35",
    question: "What tears have you been holding back? You do not have to perform strength here.",
  },
  {
    day: 3,
    psalmFragment: "My soul is bereft of peace; I have forgotten what happiness is… But this I call to mind, and therefore I have hope: The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.",
    reference: "Lamentations 3:17–23",
    question: "Can you tell God one true thing about how dark it feels — without fixing it yet?",
  },
  {
    day: 4,
    psalmFragment: "Blessed be the God and Father of our Lord Jesus Christ, the Father of mercies and God of all comfort, who comforts us in all our affliction.",
    reference: "2 Corinthians 1:3–4",
    question: "Where do you need comfort that does not rush you past the pain?",
  },
  {
    day: 5,
    psalmFragment: "For I am sure that neither death nor life… nor anything else in all creation, will be able to separate us from the love of God in Christ Jesus our Lord.",
    reference: "Romans 8:38–39",
    question: "What fear whispers that love has been taken from you? Speak it plainly.",
  },
  {
    day: 6,
    psalmFragment: "He will wipe away every tear from their eyes, and death shall be no more.",
    reference: "Revelation 21:4",
    question: "What do you long for that grief has interrupted? God can hold that longing too.",
  },
  {
    day: 7,
    psalmFragment: "The Lord is near to the brokenhearted and saves the crushed in spirit.",
    reference: "Psalm 34:18",
    question: "As this week closes, what one sentence do you want God to hear from you tonight?",
    companion: {
      text: "Cast all your anxiety on him because he cares for you.",
      reference: "1 Peter 5:7",
    },
  },
];
