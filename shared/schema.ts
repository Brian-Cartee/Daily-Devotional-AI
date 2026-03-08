import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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
});

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({
  id: true,
  subscribedAt: true,
  active: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
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
  type: z.enum(["prayer", "reflection", "verse", "note"]),
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
