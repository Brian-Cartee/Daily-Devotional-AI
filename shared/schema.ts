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
