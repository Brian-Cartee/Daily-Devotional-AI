import { db } from "./db";
import { verses, subscribers, journalEntries, streaks, proSubscribers, pushSubscriptions, smsConversations, type InsertVerse, type Verse, type InsertSubscriber, type Subscriber, type JournalEntry, type InsertJournalEntry, type Streak, type ProSubscriber, type PushSubscription, type InsertPushSubscription, type SmsConversation, type SmsMessage } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getVerseByDate(date: string): Promise<Verse | undefined>;
  getVerseById(id: number): Promise<Verse | undefined>;
  createVerse(verse: InsertVerse): Promise<Verse>;
  getAllActiveSubscribers(): Promise<Subscriber[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  deactivateSubscriber(email: string): Promise<void>;
  getJournalEntries(sessionId: string): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  deleteJournalEntry(id: number, sessionId: string): Promise<void>;
  recordStreak(sessionId: string): Promise<{ currentStreak: number; longestStreak: number; isNewDay: boolean }>;
  getProSubscriberByEmail(email: string): Promise<ProSubscriber | undefined>;
  getProSubscriberByCustomerId(customerId: string): Promise<ProSubscriber | undefined>;
  upsertProSubscriber(data: { email: string; stripeCustomerId: string; stripeSubscriptionId: string; plan: string; status: string }): Promise<ProSubscriber>;
  updateProSubscriberStatus(stripeSubscriptionId: string, status: string): Promise<void>;
  upsertPushSubscription(data: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscription(sessionId: string): Promise<PushSubscription | undefined>;
  updatePushSettings(sessionId: string, settings: Partial<Pick<PushSubscription, 'morningEnabled'|'morningTime'|'eveningEnabled'|'eveningTime'|'middayEnabled'|'streakReminder'|'weeklySummary'>>): Promise<void>;
  deletePushSubscription(sessionId: string): Promise<void>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  getSmsConversation(phone: string): Promise<SmsConversation | undefined>;
  upsertSmsConversation(phone: string, messages: SmsMessage[], exchangeCount: number, ctaSent: boolean, opts?: { dailyCount?: number; dailyCountDate?: string; optedOut?: boolean; enrolledForDaily?: boolean }): Promise<SmsConversation>;
  getSmsOptedInNumbers(): Promise<SmsConversation[]>;
}

export class DatabaseStorage implements IStorage {
  async getVerseByDate(date: string): Promise<Verse | undefined> {
    const [verse] = await db.select().from(verses).where(eq(verses.date, date));
    return verse;
  }

  async getVerseById(id: number): Promise<Verse | undefined> {
    const [verse] = await db.select().from(verses).where(eq(verses.id, id));
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

  async recordStreak(sessionId: string): Promise<{ currentStreak: number; longestStreak: number; isNewDay: boolean }> {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const [existing] = await db.select().from(streaks).where(eq(streaks.sessionId, sessionId));

    if (!existing) {
      await db.insert(streaks).values({ sessionId, currentStreak: 1, longestStreak: 1, lastVisitDate: today });
      return { currentStreak: 1, longestStreak: 1, isNewDay: true };
    }

    if (existing.lastVisitDate === today) {
      return { currentStreak: existing.currentStreak, longestStreak: existing.longestStreak, isNewDay: false };
    }

    const newStreak = existing.lastVisitDate === yesterday ? existing.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, existing.longestStreak);

    await db.update(streaks).set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastVisitDate: today,
    }).where(eq(streaks.sessionId, sessionId));

    return { currentStreak: newStreak, longestStreak: newLongest, isNewDay: true };
  }

  async getProSubscriberByEmail(email: string): Promise<ProSubscriber | undefined> {
    const [row] = await db.select().from(proSubscribers).where(eq(proSubscribers.email, email.toLowerCase()));
    return row;
  }

  async getProSubscriberByCustomerId(customerId: string): Promise<ProSubscriber | undefined> {
    const [row] = await db.select().from(proSubscribers).where(eq(proSubscribers.stripeCustomerId, customerId));
    return row;
  }

  async upsertProSubscriber(data: { email: string; stripeCustomerId: string; stripeSubscriptionId: string; plan: string; status: string }): Promise<ProSubscriber> {
    const [row] = await db
      .insert(proSubscribers)
      .values({ ...data, email: data.email.toLowerCase() })
      .onConflictDoUpdate({
        target: proSubscribers.email,
        set: {
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          plan: data.plan,
          status: data.status,
        },
      })
      .returning();
    return row;
  }

  async updateProSubscriberStatus(stripeSubscriptionId: string, status: string): Promise<void> {
    await db
      .update(proSubscribers)
      .set({ status })
      .where(eq(proSubscribers.stripeSubscriptionId, stripeSubscriptionId));
  }

  async upsertPushSubscription(data: InsertPushSubscription): Promise<PushSubscription> {
    const [row] = await db
      .insert(pushSubscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: pushSubscriptions.sessionId,
        set: {
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
        },
      })
      .returning();
    return row;
  }

  async getPushSubscription(sessionId: string): Promise<PushSubscription | undefined> {
    const [row] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.sessionId, sessionId));
    return row;
  }

  async updatePushSettings(sessionId: string, settings: Partial<Pick<PushSubscription, 'morningEnabled'|'morningTime'|'eveningEnabled'|'eveningTime'|'middayEnabled'|'streakReminder'|'weeklySummary'>>): Promise<void> {
    await db.update(pushSubscriptions).set(settings).where(eq(pushSubscriptions.sessionId, sessionId));
  }

  async deletePushSubscription(sessionId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.sessionId, sessionId));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions);
  }

  async getSmsConversation(phone: string): Promise<SmsConversation | undefined> {
    const [row] = await db.select().from(smsConversations).where(eq(smsConversations.phone, phone));
    return row;
  }

  async upsertSmsConversation(phone: string, messages: SmsMessage[], exchangeCount: number, ctaSent: boolean, opts?: { dailyCount?: number; dailyCountDate?: string; optedOut?: boolean; enrolledForDaily?: boolean }): Promise<SmsConversation> {
    const extraFields = {
      ...(opts?.dailyCount !== undefined && { dailyCount: opts.dailyCount }),
      ...(opts?.dailyCountDate !== undefined && { dailyCountDate: opts.dailyCountDate }),
      ...(opts?.optedOut !== undefined && { optedOut: opts.optedOut }),
      ...(opts?.enrolledForDaily !== undefined && { enrolledForDaily: opts.enrolledForDaily }),
    };
    const [row] = await db
      .insert(smsConversations)
      .values({ phone, messages, exchangeCount, ctaSent, lastMessageAt: new Date(), ...extraFields })
      .onConflictDoUpdate({
        target: smsConversations.phone,
        set: { messages, exchangeCount, ctaSent, lastMessageAt: new Date(), ...extraFields },
      })
      .returning();
    return row;
  }

  async getSmsOptedInNumbers(): Promise<SmsConversation[]> {
    const { and, eq: eq2 } = await import("drizzle-orm");
    return db.select().from(smsConversations).where(
      and(eq2(smsConversations.optedOut, false), eq2(smsConversations.enrolledForDaily, true))
    );
  }
}

export const storage = new DatabaseStorage();
