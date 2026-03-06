import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const verses = pgTable("verses", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull(),
  text: text("text").notNull(),
  encouragement: text("encouragement").notNull(),
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
