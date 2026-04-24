import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const verses = pgTable("verses", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull(),
  text: text("text").notNull(),
  encouragement: text("encouragement").notNull(),
  reflectionPrompt: text("reflection_prompt").default(""),
  date: text("date").notNull().unique(), // e.g. "2023-10-01"
});

export const insertVerseSchema = createInsertSchema(verses).omit({ id: true });
export type Verse = typeof verses.$inferSelect;
export type InsertVerse = z.infer<typeof insertVerseSchema>;

export const generateRequestSchema = z.object({
  verseId: z.number(),
  type: z.enum(["reflection", "prayer"]),
  lang: z.string().optional(),
  reflectionContext: z.string().optional(),
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const generateResponseSchema = z.object({
  content: z.string(),
});
export type GenerateResponse = z.infer<typeof generateResponseSchema>;

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  subscribedAt: timestamp("subscribed_at").default(sql`now()`),
  active: boolean("active").default(true).notNull(),
  includeDailyArt: boolean("include_daily_art").default(false).notNull(),
  sessionId: text("session_id"),
  lastEmailSentDate: text("last_email_sent_date"),
});

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({
  id: true,
  subscribedAt: true,
  active: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  includeDailyArt: z.boolean().optional().default(false),
  sessionId: z.string().optional(),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  reference: text("reference"),
  verseDate: text("verse_date"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(["prayer", "reflection", "verse", "note", "guidance_memory"]),
  sessionId: z.string().min(1),
  content: z.string().min(1),
  title: z.string().optional(),
  reference: z.string().optional(),
  verseDate: z.string().optional(),
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export const proSubscribers = pgTable("pro_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").notNull().default("monthly"), // "monthly" | "annual" | "lifetime"
  status: text("status").notNull().default("active"), // "active" | "cancelled" | "past_due"
  activatedAt: timestamp("activated_at").default(sql`now()`),
  expiresAt: timestamp("expires_at"),
});

export const insertProSubscriberSchema = createInsertSchema(proSubscribers).omit({
  id: true,
  activatedAt: true,
});

export type ProSubscriber = typeof proSubscribers.$inferSelect;
export type InsertProSubscriber = z.infer<typeof insertProSubscriberSchema>;

export const streaks = pgTable("streaks", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  currentStreak: integer("current_streak").default(1).notNull(),
  longestStreak: integer("longest_streak").default(1).notNull(),
  lastVisitDate: text("last_visit_date").notNull(),
  visitDates: text("visit_dates").default("[]").notNull(),
});

export type Streak = typeof streaks.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  morningEnabled: boolean("morning_enabled").default(true).notNull(),
  morningTime: text("morning_time").default("07:00").notNull(),
  eveningEnabled: boolean("evening_enabled").default(true).notNull(),
  eveningTime: text("evening_time").default("20:00").notNull(),
  middayEnabled: boolean("midday_enabled").default(false).notNull(),
  streakReminder: boolean("streak_reminder").default(true).notNull(),
  weeklySummary: boolean("weekly_summary").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

export type SmsMessage = { role: "user" | "assistant"; content: string; ts: string };

export const smsConversations = pgTable("sms_conversations", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  messages: jsonb("messages").$type<SmsMessage[]>().notNull().default([]),
  exchangeCount: integer("exchange_count").default(0).notNull(),
  ctaSent: boolean("cta_sent").default(false).notNull(),
  dailyCount: integer("daily_count").default(0).notNull(),
  dailyCountDate: text("daily_count_date").default("").notNull(),
  optedOut: boolean("opted_out").default(false).notNull(),
  enrolledForDaily: boolean("enrolled_for_daily").default(true).notNull(),
  joinedPrayerNetwork: boolean("joined_prayer_network").default(false).notNull(),
  lastMessageAt: timestamp("last_message_at").default(sql`now()`).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type SmsConversation = typeof smsConversations.$inferSelect;

export const prayerRequests = pgTable("prayer_requests", {
  id: serial("id").primaryKey(),
  requesterPhone: text("requester_phone").notNull(),
  originalRequest: text("original_request").notNull(),
  formattedRequest: text("formatted_request").notNull(),
  amenCount: integer("amen_count").default(0).notNull(),
  broadcastAt: timestamp("broadcast_at"),
  followUpSentAt: timestamp("follow_up_sent_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type PrayerRequest = typeof prayerRequests.$inferSelect;

export const prayerAmens = pgTable("prayer_amens", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  code: text("code").notNull().unique(),
  referralCount: integer("referral_count").default(0).notNull(),
  proExpiresAt: timestamp("pro_expires_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referralCode: text("referral_code").notNull(),
  referredSessionId: text("referred_session_id").notNull().unique(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type Referral = typeof referrals.$inferSelect;

// One AI-generated image per verse date, shared across all users (cached)
export const verseArt = pgTable("verse_art", {
  id: serial("id").primaryKey(),
  verseDate: text("verse_date").notNull().unique(),
  verseReference: text("verse_reference").notNull(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type VerseArt = typeof verseArt.$inferSelect;

export const memoryVerses = pgTable("memory_verses", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  reference: text("reference").notNull(),
  text: text("text").notNull(),
  savedAt: text("saved_at").notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
  lastReviewedAt: text("last_reviewed_at"),
});

export const insertMemoryVerseSchema = createInsertSchema(memoryVerses).omit({ id: true }).extend({
  sessionId: z.string().min(1),
  reference: z.string().min(1),
  text: z.string().min(1),
  savedAt: z.string().min(1),
});

export type MemoryVerse = typeof memoryVerses.$inferSelect;
export type InsertMemoryVerse = z.infer<typeof insertMemoryVerseSchema>;

// App-based community prayer wall (web/mobile, sessionId-based, no phone required)
export const prayerWall = pgTable("prayer_wall", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  displayName: text("display_name"), // null = "Anonymous Believer"
  request: text("request").notNull(),
  prayCount: integer("pray_count").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertPrayerWallSchema = createInsertSchema(prayerWall).omit({ id: true, createdAt: true, prayCount: true }).extend({
  sessionId: z.string().min(1),
  request: z.string().min(10).max(280),
  displayName: z.string().max(40).optional(),
});

export type PrayerWallEntry = typeof prayerWall.$inferSelect;
export type InsertPrayerWallEntry = z.infer<typeof insertPrayerWallSchema>;

export const prayerWallPrays = pgTable("prayer_wall_prays", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  remindAt: timestamp("remind_at"),
});

// ── Bible Trivia ─────────────────────────────────────────────────────────────

export type TriviaQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  verseRef?: string;
};

export const triviaQuestions = pgTable("trivia_questions", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().unique(),
  questions: jsonb("questions").notNull().$type<TriviaQuestion[]>(),
  generatedAt: timestamp("generated_at").default(sql`now()`).notNull(),
});

export type TriviaQuestionRow = typeof triviaQuestions.$inferSelect;

export const triviaChallenges = pgTable("trivia_challenges", {
  id: text("id").primaryKey(),
  challengerName: text("challenger_name").notNull(),
  category: text("category").notNull(),
  categoryLabel: text("category_label").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  questions: jsonb("questions").notNull().$type<TriviaQuestion[]>(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type TriviaChallenge = typeof triviaChallenges.$inferSelect;

// ─── Sermon Library ───────────────────────────────────────────────────────────

export const sermonVideos = pgTable("sermon_videos", {
  id: serial("id").primaryKey(),
  youtubeId: text("youtube_id").notNull().unique(),
  title: text("title").notNull(),
  preacher: text("preacher").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: integer("duration_seconds"),
  processedAt: timestamp("processed_at").default(sql`now()`).notNull(),
});

export const sermonSegments = pgTable("sermon_segments", {
  id: serial("id").primaryKey(),
  youtubeId: text("youtube_id").notNull(),
  preacher: text("preacher").notNull(),
  startSeconds: integer("start_seconds").notNull(),
  endSeconds: integer("end_seconds").notNull(),
  summary: text("summary").notNull(),
  quote: text("quote"),
  emotionTags: text("emotion_tags").array().notNull(),
  helpsWith: text("helps_with"),
  momentTitle: text("moment_title"),
});

export type SermonVideo = typeof sermonVideos.$inferSelect;
export type SermonSegment = typeof sermonSegments.$inferSelect;

// ── User Profiles (name persistence across sessions/browsers) ─────────────────
export const userProfiles = pgTable("user_profiles", {
  sessionId: text("session_id").primaryKey(),
  name: text("name"),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;

// ── User Memory (emotional + spiritual pattern tracking) ──────────────────────
export type EmotionPattern = { count: number; lastSeen: string };

export const userMemory = pgTable("user_memory", {
  sessionId:         text("session_id").primaryKey(),
  // { anxiety: { count: 3, lastSeen: "2026-04-20T..." }, ... }
  emotionalPatterns: jsonb("emotional_patterns")
                       .$type<Record<string, EmotionPattern>>()
                       .default({})
                       .notNull(),
  // "just-starting" | "returning" | "growing" | "struggling"
  spiritualState:    text("spiritual_state").default("just-starting").notNull(),
  // "new" | "occasional" | "regular" | "deep"
  engagementLevel:   text("engagement_level").default("new").notNull(),
  // ordered list of last 10 detected emotions (most recent first)
  recentEmotions:    text("recent_emotions").array().default([]).notNull(),
  updatedAt:         timestamp("updated_at").default(sql`now()`).notNull(),
});

export type UserMemoryRow = typeof userMemory.$inferSelect;
