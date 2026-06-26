import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
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
  /** Optional Instagram/TikTok handle for community recognition (voluntary). */
  socialHandle: text("social_handle"),
  /** Acquisition source: pro-connect-sheet, home-footer, tiktok-campaign, etc. */
  source: text("source"),
  /** Sent onboarding drip keys: day2, day4, day7_winback, day7_journeys */
  onboardingEmailsSent: jsonb("onboarding_emails_sent").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
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
  socialHandle: z.string().max(64).optional(),
  source: z.string().max(64).optional(),
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
  timezone: text("timezone").default("America/New_York").notNull(),
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

export const PRAYER_CATEGORIES = [
  "Anxiety / Fear",
  "Family",
  "Healing",
  "Grief",
  "Marriage / Relationship",
  "Direction / Decision",
  "Financial Stress",
  "Loneliness",
  "Thanksgiving / Praise",
  "Other",
] as const;
export type PrayerCategory = typeof PRAYER_CATEGORIES[number];

export const PRAYER_ENCOURAGEMENT_ACTIONS = ["prayed", "standing_with_you", "not_alone", "god_is_near"] as const;
export type PrayerEncouragementAction = typeof PRAYER_ENCOURAGEMENT_ACTIONS[number];

// App-based community prayer wall (web/mobile, sessionId-based, no phone required)
export const prayerWall = pgTable("prayer_wall", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  displayName: text("display_name"), // null = "Anonymous Believer"
  isAnonymous: boolean("is_anonymous").default(true).notNull(),
  request: text("request").notNull(),
  category: text("category").default("Other").notNull(),
  status: text("status").default("active").notNull(), // active | answered | hidden | removed
  answeredText: text("answered_text"),
  answeredAt: timestamp("answered_at"),
  reportCount: integer("report_count").default(0).notNull(),
  prayCount: integer("pray_count").default(0).notNull(), // legacy, kept for compat
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertPrayerWallSchema = createInsertSchema(prayerWall).omit({
  id: true, createdAt: true, prayCount: true, reportCount: true, status: true, answeredText: true, answeredAt: true,
}).extend({
  sessionId: z.string().min(1),
  request: z.string().min(5).max(500),
  displayName: z.string().max(40).optional(),
  isAnonymous: z.boolean().optional().default(true),
  category: z.enum(PRAYER_CATEGORIES).optional().default("Other"),
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

// Encouragement actions (4 types) — replaces legacy single pray button
export const prayerWallEncouragements = pgTable("prayer_wall_encouragements", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  sessionId: text("session_id").notNull(),
  actionType: text("action_type").notNull(), // prayed | standing_with_you | not_alone | god_is_near
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type PrayerWallEncouragement = typeof prayerWallEncouragements.$inferSelect;

// Reports — auto-hide at 3
export const prayerWallReports = pgTable("prayer_wall_reports", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  sessionId: text("session_id").notNull(),
  reason: text("reason").notNull(), // harmful | spam | inappropriate | divisive | personal_info | other
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type PrayerWallReport = typeof prayerWallReports.$inferSelect;

// Prayer circles — scaffold for future private group feature
export const prayerCircles = pgTable("prayer_circles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by").notNull(), // sessionId
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const circleMembers = pgTable("circle_members", {
  id: serial("id").primaryKey(),
  circleId: integer("circle_id").notNull(),
  sessionId: text("session_id").notNull(),
  role: text("role").default("member").notNull(), // owner | member
  joinedAt: timestamp("joined_at").default(sql`now()`).notNull(),
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
  phone: text("phone"),
  pinnedPaths: text("pinned_paths"),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;

// ── Mobile IAP Subscriptions (RevenueCat sync) ────────────────────────────────
export const mobileSubscriptions = pgTable("mobile_subscriptions", {
  sessionId: text("session_id").primaryKey(),
  isPro: boolean("is_pro").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});
export type MobileSubscription = typeof mobileSubscriptions.$inferSelect;

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

export const expoPushTokens = pgTable("expo_push_tokens", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  token: text("token").notNull(),
  hour: integer("hour").default(7).notNull(),
  minute: integer("minute").default(0).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export type ExpoPushToken = typeof expoPushTokens.$inferSelect;
export type InsertExpoPushToken = typeof expoPushTokens.$inferInsert;

// ── Sermon Mode Sessions (live in-service scripture detection) ─────────────────
export const sermonSessions = pgTable("sermon_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  title: text("title").default("Untitled Sermon").notNull(),
  startedAt: timestamp("started_at").default(sql`now()`).notNull(),
  endedAt: timestamp("ended_at"),
  scriptures: text("scriptures").array().default([]).notNull(),
  transcript: text("transcript"),
  keyPoints: text("key_points").array().default([]).notNull(),
  application: text("application"),
  durationSeconds: integer("duration_seconds"),
});

export type SermonSession = typeof sermonSessions.$inferSelect;
export type InsertSermonSession = typeof sermonSessions.$inferInsert;

// ── Prayer Recordings (Live Prayer Mode) ─────────────────────────────────────
export const prayerRecordings = pgTable("prayer_recordings", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  title: text("title").default("Prayer").notNull(),
  themes: text("themes").array().default([]).notNull(),
  scriptureRef: text("scripture_ref"),
  scriptureText: text("scripture_text"),
  reflection: text("reflection"),
  transcript: text("transcript"),
  durationSeconds: integer("duration_seconds"),
  prayedAt: timestamp("prayed_at").default(sql`now()`).notNull(),
});

export type PrayerRecording = typeof prayerRecordings.$inferSelect;
export type InsertPrayerRecording = typeof prayerRecordings.$inferInsert;

// ── AI Usage Logs (persistent, per-session feature tracking) ─────────────────
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  feature: text("feature").notNull(), // "passage_chat" | "guidance" | "verse_prayer" | "life_season"
  platform: text("platform").default("web").notNull(), // "web" | "mobile"
  daysWithApp: integer("days_with_app").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type InsertAiUsageLog = typeof aiUsageLogs.$inferInsert;

// ── Beta Feedback ─────────────────────────────────────────────────────────────
export const betaFeedback = pgTable("beta_feedback", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  name: text("name"),
  email: text("email"),
  overallRating: integer("overall_rating").notNull(), // 1-5
  favoriteFeature: text("favorite_feature"),
  improvementArea: text("improvement_area"),
  suggestions: text("suggestions"),
  wouldRecommend: boolean("would_recommend"),
  platform: text("platform").default("web").notNull(),
  submittedAt: timestamp("submitted_at").default(sql`now()`).notNull(),
});

export const insertBetaFeedbackSchema = createInsertSchema(betaFeedback).omit({
  id: true,
  submittedAt: true,
}).extend({
  sessionId: z.string().min(1),
  overallRating: z.number().int().min(1).max(5),
  name: z.string().max(80).optional(),
  email: z.string().email().optional().or(z.literal("")),
  favoriteFeature: z.string().max(500).optional(),
  improvementArea: z.string().max(500).optional(),
  suggestions: z.string().max(2000).optional(),
  wouldRecommend: z.boolean().optional(),
  platform: z.enum(["web", "mobile"]).optional().default("web"),
});

export type BetaFeedback = typeof betaFeedback.$inferSelect;
export type InsertBetaFeedback = z.infer<typeof insertBetaFeedbackSchema>;

// ── Pastor video recommendations (curated YouTube teaching clips) ───────────
export const pastorVideos = pgTable("pastor_videos", {
  id: serial("id").primaryKey(),
  pastorName: text("pastor_name").notNull(),
  churchName: text("church_name").notNull(),
  tier: integer("tier").notNull(),
  title: text("title").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  toneTags: text("tone_tags").array().notNull(),
  displayOrder: integer("display_order").notNull(),
});

export type PastorVideo = typeof pastorVideos.$inferSelect;
export type InsertPastorVideo = typeof pastorVideos.$inferInsert;

// Replit AI chat integration (conversations + messages)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

// ── Church organizations (portal layer — separate from personal Pro) ─────────

export const CHURCH_PLANS = ["none", "basic", "plus", "partner"] as const;
export type ChurchPlan = (typeof CHURCH_PLANS)[number];

export const CHURCH_ROLES = ["member", "leader", "admin", "owner"] as const;
export type ChurchRole = (typeof CHURCH_ROLES)[number];

export const CHURCH_MEMBERSHIP_STATUSES = ["active", "invited", "left", "removed"] as const;
export type ChurchMembershipStatus = (typeof CHURCH_MEMBERSHIP_STATUSES)[number];

export const CHURCH_STATUSES = ["active", "suspended", "archived"] as const;
export type ChurchStatus = (typeof CHURCH_STATUSES)[number];

export type ChurchPublicSettings = {
  welcomeMessage?: string;
  pastorVideoUrl?: string;
  resourceLinks?: { label: string; url: string }[];
};

export const churches = pgTable("churches", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  plan: text("plan").notNull().default("none"),
  status: text("status").notNull().default("active"),
  inviteCode: text("invite_code").notNull().unique(),
  settings: jsonb("settings").$type<ChurchPublicSettings>().default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const insertChurchSchema = createInsertSchema(churches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  slug: z.string().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(120),
  plan: z.enum(CHURCH_PLANS).optional().default("none"),
  status: z.enum(CHURCH_STATUSES).optional().default("active"),
  inviteCode: z.string().min(6).max(32),
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().max(32).optional(),
  settings: z
    .object({
      welcomeMessage: z.string().max(500).optional(),
      pastorVideoUrl: z.string().url().optional().or(z.literal("")),
      resourceLinks: z
        .array(z.object({ label: z.string().max(80), url: z.string().url() }))
        .max(20)
        .optional(),
    })
    .optional(),
});

export type Church = typeof churches.$inferSelect;
export type InsertChurch = z.infer<typeof insertChurchSchema>;

export const churchMemberships = pgTable("church_memberships", {
  id: serial("id").primaryKey(),
  churchId: text("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  email: text("email"),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  joinedAt: timestamp("joined_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const insertChurchMembershipSchema = createInsertSchema(churchMemberships).omit({
  id: true,
  joinedAt: true,
  updatedAt: true,
}).extend({
  churchId: z.string().uuid(),
  sessionId: z.string().min(1).max(128),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(CHURCH_ROLES),
  status: z.enum(CHURCH_MEMBERSHIP_STATUSES).optional().default("active"),
});

export type ChurchMembership = typeof churchMemberships.$inferSelect;
export type InsertChurchMembership = z.infer<typeof insertChurchMembershipSchema>;

