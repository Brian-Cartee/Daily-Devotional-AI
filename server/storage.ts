import { db } from "./db";
import { verses, subscribers, journalEntries, streaks, proSubscribers, pushSubscriptions, smsConversations, prayerRequests, prayerAmens, verseArt, referralCodes, referrals, memoryVerses, prayerWall, prayerWallPrays, triviaQuestions, triviaChallenges, type InsertVerse, type Verse, type InsertSubscriber, type Subscriber, type JournalEntry, type InsertJournalEntry, type Streak, type ProSubscriber, type PushSubscription, type InsertPushSubscription, type SmsConversation, type SmsMessage, type PrayerRequest, type VerseArt, type ReferralCode, type MemoryVerse, type InsertMemoryVerse, type PrayerWallEntry, type InsertPrayerWallEntry, type TriviaQuestion, type TriviaChallenge } from "@shared/schema";
import { eq, and, desc, isNull, isNotNull, lt, lte, sql as sqlExpr } from "drizzle-orm";

export interface IStorage {
  getVerseByDate(date: string): Promise<Verse | undefined>;
  getVerseById(id: number): Promise<Verse | undefined>;
  createVerse(verse: InsertVerse): Promise<Verse>;
  getAllActiveSubscribers(): Promise<Subscriber[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  deactivateSubscriber(email: string): Promise<void>;
  updateSubscriberSession(email: string, sessionId: string): Promise<void>;
  getJournalEntries(sessionId: string): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  deleteJournalEntry(id: number, sessionId: string): Promise<void>;
  recordStreak(sessionId: string): Promise<{ currentStreak: number; longestStreak: number; isNewDay: boolean; visitDates: string[] }>;
  getStreak(sessionId: string): Promise<{ currentStreak: number; longestStreak: number; visitDates: string[] } | null>;
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
  upsertSmsConversation(phone: string, messages: SmsMessage[], exchangeCount: number, ctaSent: boolean, opts?: { dailyCount?: number; dailyCountDate?: string; optedOut?: boolean; enrolledForDaily?: boolean; joinedPrayerNetwork?: boolean }): Promise<SmsConversation>;
  getSmsOptedInNumbers(): Promise<SmsConversation[]>;
  getPrayerNetworkNumbers(): Promise<SmsConversation[]>;
  createPrayerRequest(phone: string, originalRequest: string, formattedRequest: string): Promise<PrayerRequest>;
  getPrayerRequest(id: number): Promise<PrayerRequest | undefined>;
  addAmen(requestId: number, phone: string): Promise<number>;
  markPrayerBroadcast(requestId: number): Promise<void>;
  getPrayerRequestsForFollowUp(): Promise<PrayerRequest[]>;
  markFollowUpSent(requestId: number): Promise<void>;
  getVerseArt(verseDate: string): Promise<VerseArt | undefined>;
  saveVerseArt(verseDate: string, verseReference: string, imageUrl: string): Promise<VerseArt>;
  getOrCreateReferralCode(sessionId: string): Promise<ReferralCode>;
  recordReferral(code: string, referredSessionId: string): Promise<{ success: boolean; referrerSessionId: string | null }>;
  getReferralStats(sessionId: string): Promise<{ code: string; referralCount: number; proExpiresAt: Date | null } | null>;
  hasReferralPro(sessionId: string): Promise<boolean>;
  getMemoryVerses(sessionId: string): Promise<MemoryVerse[]>;
  saveMemoryVerse(data: InsertMemoryVerse): Promise<MemoryVerse>;
  deleteMemoryVerse(id: number, sessionId: string): Promise<void>;
  recordMemoryReview(id: number, sessionId: string): Promise<void>;
  getPrayerWallEntries(): Promise<PrayerWallEntry[]>;
  createPrayerWallEntry(data: InsertPrayerWallEntry): Promise<PrayerWallEntry>;
  recordPrayerWallPray(requestId: number, sessionId: string): Promise<{ prayCount: number; alreadyPrayed: boolean }>;
  hasPrayedFor(requestId: number, sessionId: string): Promise<boolean>;
  setReminderForPray(requestId: number, sessionId: string, remindAt: Date): Promise<void>;
  getDuePrayerReminders(): Promise<Array<{ requestId: number; sessionId: string; request: string; displayName: string | null }>>;
  clearPrayerReminder(requestId: number, sessionId: string): Promise<void>;
  getTriviaQuestions(category: string): Promise<TriviaQuestion[] | null>;
  saveTriviaQuestions(category: string, questions: TriviaQuestion[]): Promise<void>;
  saveTriviaChallenge(id: string, data: { challengerName: string; category: string; categoryLabel: string; score: number; total: number; questions: TriviaQuestion[] }): Promise<TriviaChallenge>;
  getTriviaChallenge(id: string): Promise<TriviaChallenge | undefined>;
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

  async updateSubscriberSession(email: string, sessionId: string): Promise<void> {
    await db.update(subscribers).set({ sessionId }).where(eq(subscribers.email, email));
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

  private _addVisitDate(dates: string[], today: string): string[] {
    if (dates.includes(today)) return dates;
    const updated = [...dates, today];
    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    return updated.filter(d => d >= cutoff).slice(-14);
  }

  async recordStreak(sessionId: string): Promise<{ currentStreak: number; longestStreak: number; isNewDay: boolean; visitDates: string[] }> {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const [existing] = await db.select().from(streaks).where(eq(streaks.sessionId, sessionId));

    if (!existing) {
      const visitDates = [today];
      await db.insert(streaks).values({ sessionId, currentStreak: 1, longestStreak: 1, lastVisitDate: today, visitDates: JSON.stringify(visitDates) });
      return { currentStreak: 1, longestStreak: 1, isNewDay: true, visitDates };
    }

    const visitDates = this._addVisitDate(JSON.parse(existing.visitDates || "[]"), today);

    if (existing.lastVisitDate === today) {
      return { currentStreak: existing.currentStreak, longestStreak: existing.longestStreak, isNewDay: false, visitDates };
    }

    const newStreak = existing.lastVisitDate === yesterday ? existing.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, existing.longestStreak);

    await db.update(streaks).set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastVisitDate: today,
      visitDates: JSON.stringify(visitDates),
    }).where(eq(streaks.sessionId, sessionId));

    return { currentStreak: newStreak, longestStreak: newLongest, isNewDay: true, visitDates };
  }

  async getStreak(sessionId: string): Promise<{ currentStreak: number; longestStreak: number; visitDates: string[] } | null> {
    const [existing] = await db.select().from(streaks).where(eq(streaks.sessionId, sessionId));
    if (!existing) return null;
    const visitDates: string[] = (() => { try { return JSON.parse(existing.visitDates || "[]"); } catch { return []; } })();
    return { currentStreak: existing.currentStreak, longestStreak: existing.longestStreak, visitDates };
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

  async upsertSmsConversation(phone: string, messages: SmsMessage[], exchangeCount: number, ctaSent: boolean, opts?: { dailyCount?: number; dailyCountDate?: string; optedOut?: boolean; enrolledForDaily?: boolean; joinedPrayerNetwork?: boolean }): Promise<SmsConversation> {
    const extraFields = {
      ...(opts?.dailyCount !== undefined && { dailyCount: opts.dailyCount }),
      ...(opts?.dailyCountDate !== undefined && { dailyCountDate: opts.dailyCountDate }),
      ...(opts?.optedOut !== undefined && { optedOut: opts.optedOut }),
      ...(opts?.enrolledForDaily !== undefined && { enrolledForDaily: opts.enrolledForDaily }),
      ...(opts?.joinedPrayerNetwork !== undefined && { joinedPrayerNetwork: opts.joinedPrayerNetwork }),
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
    return db.select().from(smsConversations).where(
      and(eq(smsConversations.optedOut, false), eq(smsConversations.enrolledForDaily, true))
    );
  }

  async getPrayerNetworkNumbers(): Promise<SmsConversation[]> {
    return db.select().from(smsConversations).where(
      and(eq(smsConversations.optedOut, false), eq(smsConversations.joinedPrayerNetwork, true))
    );
  }

  async createPrayerRequest(phone: string, originalRequest: string, formattedRequest: string): Promise<PrayerRequest> {
    const [row] = await db.insert(prayerRequests).values({ requesterPhone: phone, originalRequest, formattedRequest }).returning();
    return row;
  }

  async getPrayerRequest(id: number): Promise<PrayerRequest | undefined> {
    const [row] = await db.select().from(prayerRequests).where(eq(prayerRequests.id, id));
    return row;
  }

  async addAmen(requestId: number, phone: string): Promise<number> {
    const existing = await db.select().from(prayerAmens).where(
      and(eq(prayerAmens.requestId, requestId), eq(prayerAmens.phone, phone))
    );
    if (existing.length > 0) {
      const [pr] = await db.select().from(prayerRequests).where(eq(prayerRequests.id, requestId));
      return pr?.amenCount ?? 0;
    }
    await db.insert(prayerAmens).values({ requestId, phone });
    const [updated] = await db
      .update(prayerRequests)
      .set({ amenCount: sqlExpr`${prayerRequests.amenCount} + 1` })
      .where(eq(prayerRequests.id, requestId))
      .returning();
    return updated?.amenCount ?? 1;
  }

  async markPrayerBroadcast(requestId: number): Promise<void> {
    await db.update(prayerRequests).set({ broadcastAt: new Date() }).where(eq(prayerRequests.id, requestId));
  }

  async getPrayerRequestsForFollowUp(): Promise<PrayerRequest[]> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return db.select().from(prayerRequests).where(
      and(isNotNull(prayerRequests.broadcastAt), isNull(prayerRequests.followUpSentAt), lt(prayerRequests.broadcastAt, cutoff))
    );
  }

  async markFollowUpSent(requestId: number): Promise<void> {
    await db.update(prayerRequests).set({ followUpSentAt: new Date() }).where(eq(prayerRequests.id, requestId));
  }

  async getVerseArt(verseDate: string): Promise<VerseArt | undefined> {
    const [row] = await db.select().from(verseArt).where(eq(verseArt.verseDate, verseDate));
    return row;
  }

  async saveVerseArt(verseDate: string, verseReference: string, imageUrl: string): Promise<VerseArt> {
    const [row] = await db
      .insert(verseArt)
      .values({ verseDate, verseReference, imageUrl })
      .onConflictDoUpdate({ target: verseArt.verseDate, set: { imageUrl, verseReference } })
      .returning();
    return row;
  }

  async getOrCreateReferralCode(sessionId: string): Promise<ReferralCode> {
    const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.sessionId, sessionId));
    if (existing) return existing;
    const code = sessionId.replace(/-/g, "").slice(0, 8).toUpperCase();
    const uniqueCode = `SP${code}`;
    const [created] = await db
      .insert(referralCodes)
      .values({ sessionId, code: uniqueCode })
      .onConflictDoUpdate({ target: referralCodes.sessionId, set: { sessionId } })
      .returning();
    return created;
  }

  async recordReferral(code: string, referredSessionId: string): Promise<{ success: boolean; referrerSessionId: string | null }> {
    const [referrer] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
    if (!referrer) return { success: false, referrerSessionId: null };
    if (referrer.sessionId === referredSessionId) return { success: false, referrerSessionId: null };
    const [alreadyReferred] = await db.select().from(referrals).where(eq(referrals.referredSessionId, referredSessionId));
    if (alreadyReferred) return { success: false, referrerSessionId: referrer.sessionId };
    await db.insert(referrals).values({ referralCode: code, referredSessionId }).onConflictDoNothing();
    const now = new Date();
    const currentExpiry = referrer.proExpiresAt && referrer.proExpiresAt > now ? referrer.proExpiresAt : now;
    const newExpiry = new Date(currentExpiry.getTime() + 14 * 24 * 60 * 60 * 1000);
    await db.update(referralCodes)
      .set({ referralCount: sqlExpr`${referralCodes.referralCount} + 1`, proExpiresAt: newExpiry })
      .where(eq(referralCodes.code, code));
    return { success: true, referrerSessionId: referrer.sessionId };
  }

  async getReferralStats(sessionId: string): Promise<{ code: string; referralCount: number; proExpiresAt: Date | null } | null> {
    const [row] = await db.select().from(referralCodes).where(eq(referralCodes.sessionId, sessionId));
    if (!row) return null;
    return { code: row.code, referralCount: row.referralCount, proExpiresAt: row.proExpiresAt };
  }

  async hasReferralPro(sessionId: string): Promise<boolean> {
    const [row] = await db.select().from(referralCodes).where(eq(referralCodes.sessionId, sessionId));
    if (!row || !row.proExpiresAt) return false;
    return row.proExpiresAt > new Date();
  }

  async getMemoryVerses(sessionId: string): Promise<MemoryVerse[]> {
    return db.select().from(memoryVerses).where(eq(memoryVerses.sessionId, sessionId)).orderBy(desc(memoryVerses.id));
  }

  async saveMemoryVerse(data: InsertMemoryVerse): Promise<MemoryVerse> {
    const [row] = await db.insert(memoryVerses).values(data).returning();
    return row;
  }

  async deleteMemoryVerse(id: number, sessionId: string): Promise<void> {
    await db.delete(memoryVerses).where(and(eq(memoryVerses.id, id), eq(memoryVerses.sessionId, sessionId)));
  }

  async recordMemoryReview(id: number, sessionId: string): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    await db.update(memoryVerses)
      .set({ reviewCount: sqlExpr`${memoryVerses.reviewCount} + 1`, lastReviewedAt: today })
      .where(and(eq(memoryVerses.id, id), eq(memoryVerses.sessionId, sessionId)));
  }

  async getPrayerWallEntries(): Promise<PrayerWallEntry[]> {
    return db.select().from(prayerWall).orderBy(desc(prayerWall.createdAt)).limit(50);
  }

  async createPrayerWallEntry(data: InsertPrayerWallEntry): Promise<PrayerWallEntry> {
    const [row] = await db.insert(prayerWall).values(data).returning();
    return row;
  }

  async recordPrayerWallPray(requestId: number, sessionId: string): Promise<{ prayCount: number; alreadyPrayed: boolean }> {
    const existing = await db.select().from(prayerWallPrays)
      .where(and(eq(prayerWallPrays.requestId, requestId), eq(prayerWallPrays.sessionId, sessionId)));
    if (existing.length > 0) {
      const [entry] = await db.select().from(prayerWall).where(eq(prayerWall.id, requestId));
      return { prayCount: entry?.prayCount ?? 0, alreadyPrayed: true };
    }
    await db.insert(prayerWallPrays).values({ requestId, sessionId });
    const [updated] = await db.update(prayerWall)
      .set({ prayCount: sqlExpr`${prayerWall.prayCount} + 1` })
      .where(eq(prayerWall.id, requestId))
      .returning();
    return { prayCount: updated?.prayCount ?? 0, alreadyPrayed: false };
  }

  async hasPrayedFor(requestId: number, sessionId: string): Promise<boolean> {
    const rows = await db.select().from(prayerWallPrays)
      .where(and(eq(prayerWallPrays.requestId, requestId), eq(prayerWallPrays.sessionId, sessionId)));
    return rows.length > 0;
  }

  async setReminderForPray(requestId: number, sessionId: string, remindAt: Date): Promise<void> {
    await db.update(prayerWallPrays)
      .set({ remindAt })
      .where(and(eq(prayerWallPrays.requestId, requestId), eq(prayerWallPrays.sessionId, sessionId)));
  }

  async getDuePrayerReminders(): Promise<Array<{ requestId: number; sessionId: string; request: string; displayName: string | null }>> {
    const now = new Date();
    return db.select({
      requestId: prayerWallPrays.requestId,
      sessionId: prayerWallPrays.sessionId,
      request: prayerWall.request,
      displayName: prayerWall.displayName,
    })
    .from(prayerWallPrays)
    .innerJoin(prayerWall, eq(prayerWallPrays.requestId, prayerWall.id))
    .where(and(isNotNull(prayerWallPrays.remindAt), lte(prayerWallPrays.remindAt, now)));
  }

  async clearPrayerReminder(requestId: number, sessionId: string): Promise<void> {
    await db.update(prayerWallPrays)
      .set({ remindAt: null })
      .where(and(eq(prayerWallPrays.requestId, requestId), eq(prayerWallPrays.sessionId, sessionId)));
  }

  async getTriviaQuestions(category: string): Promise<TriviaQuestion[] | null> {
    const [row] = await db.select().from(triviaQuestions).where(eq(triviaQuestions.category, category));
    if (!row) return null;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (row.generatedAt < sevenDaysAgo) return null;
    return row.questions as TriviaQuestion[];
  }

  async saveTriviaQuestions(category: string, questions: TriviaQuestion[]): Promise<void> {
    const existing = await db.select({ id: triviaQuestions.id }).from(triviaQuestions).where(eq(triviaQuestions.category, category));
    if (existing.length > 0) {
      await db.update(triviaQuestions)
        .set({ questions: questions as any, generatedAt: new Date() })
        .where(eq(triviaQuestions.category, category));
    } else {
      await db.insert(triviaQuestions).values({ category, questions: questions as any });
    }
  }

  async saveTriviaChallenge(id: string, data: { challengerName: string; category: string; categoryLabel: string; score: number; total: number; questions: TriviaQuestion[] }): Promise<TriviaChallenge> {
    const [row] = await db.insert(triviaChallenges).values({
      id,
      challengerName: data.challengerName,
      category: data.category,
      categoryLabel: data.categoryLabel,
      score: data.score,
      total: data.total,
      questions: data.questions as any,
    }).returning();
    return row;
  }

  async getTriviaChallenge(id: string): Promise<TriviaChallenge | undefined> {
    const [row] = await db.select().from(triviaChallenges).where(eq(triviaChallenges.id, id));
    return row;
  }
}

export const storage = new DatabaseStorage();
