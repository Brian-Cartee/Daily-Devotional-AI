import { db } from "./db";
import { verses, type InsertVerse, type Verse } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getVerseByDate(date: string): Promise<Verse | undefined>;
  createVerse(verse: InsertVerse): Promise<Verse>;
}

export class DatabaseStorage implements IStorage {
  async getVerseByDate(date: string): Promise<Verse | undefined> {
    const [verse] = await db.select().from(verses).where(eq(verses.date, date));
    return verse;
  }

  async createVerse(insertVerse: InsertVerse): Promise<Verse> {
    const [verse] = await db.insert(verses).values(insertVerse).returning();
    return verse;
  }
}

export const storage = new DatabaseStorage();
