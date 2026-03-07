import { db } from "./db";
import { verses, subscribers, journalEntries, type InsertVerse, type Verse, type InsertSubscriber, type Subscriber, type JournalEntry, type InsertJournalEntry } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getVerseByDate(date: string): Promise<Verse | undefined>;
  createVerse(verse: InsertVerse): Promise<Verse>;
  getAllActiveSubscribers(): Promise<Subscriber[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  deactivateSubscriber(email: string): Promise<void>;
  getJournalEntries(sessionId: string): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  deleteJournalEntry(id: number, sessionId: string): Promise<void>;
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

  async getAllActiveSubscribers(): Promise<Subscriber[]> {
    return db.select().from(subscribers).where(eq(subscribers.active, true));
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    return subscriber;
  }

  async createSubscriber(insertSubscriber: InsertSubscriber): Promise<Subscriber> {
    const [subscriber] = await db
      .insert(subscribers)
      .values({ ...insertSubscriber, active: true })
      .returning();
    return subscriber;
  }

  async deactivateSubscriber(email: string): Promise<void> {
    await db.update(subscribers).set({ active: false }).where(eq(subscribers.email, email));
  }

  async getJournalEntries(sessionId: string): Promise<JournalEntry[]> {
    return db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.sessionId, sessionId))
      .orderBy(desc(journalEntries.createdAt));
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [result] = await db.insert(journalEntries).values(entry).returning();
    return result;
  }

  async deleteJournalEntry(id: number, sessionId: string): Promise<void> {
    await db.delete(journalEntries).where(
      and(eq(journalEntries.id, id), eq(journalEntries.sessionId, sessionId))
    );
  }
}

export const storage = new DatabaseStorage();
