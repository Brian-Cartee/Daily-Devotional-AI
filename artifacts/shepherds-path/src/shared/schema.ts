export type Verse = {
  id: number;
  reference: string;
  text: string;
  encouragement: string;
  reflectionPrompt: string | null;
  date: string;
};

export type JournalEntry = {
  id: number;
  sessionId: string;
  type: string;
  title: string | null;
  content: string;
  reference: string | null;
  verseDate: string | null;
  createdAt: Date;
};

export type MemoryVerse = {
  id: number;
  sessionId: string;
  reference: string;
  text: string;
  savedAt: string;
  reviewCount: number;
  lastReviewedAt: string | null;
};

export type TriviaQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  verseRef?: string;
};

export type Subscriber = {
  id: number;
  email: string;
  name: string | null;
  subscribedAt: Date | null;
  active: boolean;
  includeDailyArt: boolean;
  sessionId: string | null;
  lastEmailSentDate: string | null;
};

export type ProSubscriber = {
  id: number;
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: string;
  status: string;
  activatedAt: Date | null;
  expiresAt: Date | null;
};

export type PrayerWallEntry = {
  id: number;
  sessionId: string;
  displayName: string | null;
  request: string;
  prayCount: number;
  createdAt: Date;
};
