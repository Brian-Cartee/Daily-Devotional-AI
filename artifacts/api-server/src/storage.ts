import { db } from "./db";
import {
  parseVisitPayload,
  serializeVisitPayload,
  freezeAvailable,
  computeStreakAfterGap,
  currentMonthKey,
} from "./streakLogic";
import { verses, subscribers, journalEntries, streaks, proSubscribers, pushSubscriptions, smsConversations, prayerRequests, prayerAmens, verseArt, referralCodes, referrals, memoryVerses, prayerWall, prayerWallPrays, triviaQuestions, triviaChallenges, sermonVideos, sermonSegments, userProfiles, userMemory, expoPushTokens, aiUsageLogs, betaFeedback, mobileSubscriptions, pastorVideos, type InsertVerse, type Verse, type InsertSubscriber, type Subscriber, type JournalEntry, type InsertJournalEntry, type Streak, type ProSubscriber, type PushSubscription, type InsertPushSubscription, type SmsConversation, type SmsMessage, type PrayerRequest, type VerseArt, type ReferralCode, type MemoryVerse, type InsertMemoryVerse, type PrayerWallEntry, type InsertPrayerWallEntry, type TriviaQuestion, type TriviaChallenge, type SermonVideo, type SermonSegment, type UserMemoryRow, type EmotionPattern, type ExpoPushToken, type AiUsageLog, type InsertAiUsageLog, type BetaFeedback, type InsertBetaFeedback, type MobileSubscription, type PastorVideo } from "@workspace/db";
import { eq, and, or, ne, desc, isNull, isNotNull, lt, lte, sql as sqlExpr, count, gte, asc } from "drizzle-orm";

export interface IStorage {
  getVerseByDate(date: string): Promise<Verse | undefined>;
  getVerseById(id: number): Promise<Verse | undefined>;
  createVerse(verse: InsertVerse): Promise<Verse>;
  deleteVerseByDate(date: string): Promise<void>;
  getAllActiveSubscribers(): Promise<Subscriber[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  getActiveSubscriberBySession(sessionId: string): Promise<Subscriber | undefined>;
  getActiveSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  deactivateSubscriber(email: string): Promise<void>;
  updateSubscriberSession(email: string, sessionId: string): Promise<void>;
  updateSubscriberLastEmailDate(id: number, date: string): Promise<void>;
  claimSubscriberEmailSlot(id: number, date: string): Promise<boolean>;
  claimOnboardingEmailStep(id: number, step: string): Promise<boolean>;
  markOnboardingEmailSent(id: number, step: string): Promise<void>;
  getJournalEntries(sessionId: string): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  deleteJournalEntry(id: number, sessionId: string): Promise<void>;
  recordStreak(
    sessionId: string,
    isPro?: boolean,
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    isNewDay: boolean;
    visitDates: string[];
    freezeApplied?: boolean;
    freezeAvailable?: boolean;
  }>;
  getStreak(
    sessionId: string,
    isPro?: boolean,
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    visitDates: string[];
    freezeAvailable?: boolean;
    freezeUsedThisMonth?: boolean;
  } | null>;
  getProSubscriberByEmail(email: string): Promise<ProSubscriber | undefined>;
  getAllActiveProSubscribers(): Promise<ProSubscriber[]>;
  linkProEmailToSession(email: string, sessionId: string): Promise<void>;
  upsertSubscriberIdentity(data: {
    email: string;
    sessionId: string;
    name?: string;
    socialHandle?: string;
    source?: string;
  }): Promise<Subscriber>;
  isSessionPro(sessionId: string): Promise<boolean>;
  getMobileSubscription(sessionId: string): Promise<MobileSubscription | undefined>;
  upsertMobileSubscription(data: {
    sessionId: string;
    isPro: boolean;
    expiresAt?: Date | null;
  }): Promise<MobileSubscription>;
  upsertMobileProEmail(email: string, plan: "ios" | "android"): Promise<ProSubscriber>;
  getProSubscriberByCustomerId(customerId: string): Promise<ProSubscriber | undefined>;
  upsertProSubscriber(data: { email: string; stripeCustomerId: string; stripeSubscriptionId: string; plan: string; status: string }): Promise<ProSubscriber>;
  updateProSubscriberStatus(stripeSubscriptionId: string, status: string): Promise<void>;
  upsertPushSubscription(data: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscription(sessionId: string): Promise<PushSubscription | undefined>;
  updatePushSettings(sessionId: string, settings: Partial<Pick<PushSubscription, 'morningEnabled'|'morningTime'|'eveningEnabled'|'eveningTime'|'middayEnabled'|'streakReminder'|'weeklySummary'|'timezone'>>): Promise<void>;
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
  recordReferral(
    code: string,
    referredSessionId: string,
  ): Promise<{
    success: boolean;
    referrerSessionId: string | null;
    referredProUntil: string | null;
    referrerProUntil: string | null;
    referralCount: number;
    alreadyRecorded: boolean;
  }>;
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
  getUserProfileName(sessionId: string): Promise<string | null>;
  setUserProfileName(sessionId: string, name: string): Promise<void>;
  getUserMemory(sessionId: string): Promise<UserMemoryRow | undefined>;
  upsertUserMemory(sessionId: string, data: Partial<Omit<UserMemoryRow, "sessionId" | "updatedAt">>): Promise<UserMemoryRow>;
  upsertExpoPushToken(sessionId: string, token: string, hour: number, minute: number): Promise<ExpoPushToken>;
  deleteExpoPushToken(sessionId: string): Promise<void>;
  getExpoPushTokensForHourMinute(hour: number, minute: number): Promise<ExpoPushToken[]>;
  logAiUsage(data: InsertAiUsageLog): Promise<void>;
  getAiUsageLogs(limit?: number): Promise<AiUsageLog[]>;
  getAiUsageBySession(sessionId: string): Promise<AiUsageLog[]>;
  getAiUsageSummary(): Promise<{ feature: string; count: number }[]>;
  submitBetaFeedback(data: InsertBetaFeedback): Promise<BetaFeedback>;
  getAllBetaFeedback(): Promise<BetaFeedback[]>;
  getPastorVideoByTone(tone: string): Promise<Pick<PastorVideo, "pastorName" | "churchName" | "tier" | "title" | "youtubeUrl"> | null>;
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

  async deleteVerseByDate(date: string): Promise<void> {
    await db.delete(verses).where(eq(verses.date, date));
  }

  async getAllActiveSubscribers(): Promise<Subscriber[]> {
    return db.select().from(subscribers).where(eq(subscribers.active, true));
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    return subscriber;
  }

  async getActiveSubscriberBySession(sessionId: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.sessionId, sessionId), eq(subscribers.active, true)));
    return subscriber;
  }

  async getActiveSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const subscriber = await this.getSubscriberByEmail(email.toLowerCase().trim());
    return subscriber?.active ? subscriber : undefined;
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

  async updateSubscriberLastEmailDate(id: number, date: string): Promise<void> {
    await db.update(subscribers).set({ lastEmailSentDate: date }).where(eq(subscribers.id, id));
  }

  // Atomic claim — only updates (and returns true) if not already sent today.
  // Prevents duplicates even if the scheduler runs twice in the same day.
  async claimSubscriberEmailSlot(id: number, date: string): Promise<boolean> {
    const result = await db
      .update(subscribers)
      .set({ lastEmailSentDate: date })
      .where(and(
        eq(subscribers.id, id),
        or(isNull(subscribers.lastEmailSentDate), ne(subscribers.lastEmailSentDate, date))
      ))
      .returning({ id: subscribers.id });
    return result.length > 0;
  }

  async claimOnboardingEmailStep(id: number, step: string): Promise<boolean> {
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.id, id));
    if (!subscriber) return false;

    const sent = Array.isArray(subscriber.onboardingEmailsSent)
      ? subscriber.onboardingEmailsSent
      : [];
    if (sent.includes(step)) return false;

    return true;
  }

  async markOnboardingEmailSent(id: number, step: string): Promise<void> {
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.id, id));
    if (!subscriber) return;

    const sent = Array.isArray(subscriber.onboardingEmailsSent)
      ? subscriber.onboardingEmailsSent
      : [];
    if (sent.includes(step)) return;

    await db
      .update(subscribers)
      .set({ onboardingEmailsSent: [...sent, step] })
      .where(eq(subscribers.id, id));
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

  async recordStreak(
    sessionId: string,
    isPro = false,
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    isNewDay: boolean;
    visitDates: string[];
    freezeApplied?: boolean;
    freezeAvailable?: boolean;
  }> {
    const today = new Date().toISOString().split("T")[0];

    const [existing] = await db.select().from(streaks).where(eq(streaks.sessionId, sessionId));

    if (!existing) {
      const visitDates = [today];
      await db.insert(streaks).values({
        sessionId,
        currentStreak: 1,
        longestStreak: 1,
        lastVisitDate: today,
        visitDates: serializeVisitPayload(visitDates, null),
      });
      return {
        currentStreak: 1,
        longestStreak: 1,
        isNewDay: true,
        visitDates,
        freezeApplied: false,
        freezeAvailable: isPro,
      };
    }

    const { dates: priorDates, freezeMonth } = parseVisitPayload(existing.visitDates);
    const visitDates = this._addVisitDate(priorDates, today);

    if (existing.lastVisitDate === today) {
      return {
        currentStreak: existing.currentStreak,
        longestStreak: existing.longestStreak,
        isNewDay: false,
        visitDates,
        freezeApplied: false,
        freezeAvailable: freezeAvailable(isPro, freezeMonth, today),
      };
    }

    const { newStreak, freezeApplied, newFreezeMonth } = computeStreakAfterGap({
      lastVisitDate: existing.lastVisitDate,
      currentStreak: existing.currentStreak,
      freezeMonth,
      isPro,
      today,
    });
    const newLongest = Math.max(newStreak, existing.longestStreak);

    await db.update(streaks).set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastVisitDate: today,
      visitDates: serializeVisitPayload(visitDates, newFreezeMonth),
    }).where(eq(streaks.sessionId, sessionId));

    return {
      currentStreak: newStreak,
      longestStreak: newLongest,
      isNewDay: true,
      visitDates,
      freezeApplied,
      freezeAvailable: freezeAvailable(isPro, newFreezeMonth, today),
    };
  }

  async getStreak(sessionId: string, isPro = false): Promise<{
    currentStreak: number;
    longestStreak: number;
    visitDates: string[];
    freezeAvailable?: boolean;
    freezeUsedThisMonth?: boolean;
  } | null> {
    const [existing] = await db.select().from(streaks).where(eq(streaks.sessionId, sessionId));
    if (!existing) return null;
    const { dates: visitDates, freezeMonth } = parseVisitPayload(existing.visitDates);
    const today = new Date().toISOString().split("T")[0];
    const month = currentMonthKey(today);
    return {
      currentStreak: existing.currentStreak,
      longestStreak: existing.longestStreak,
      visitDates,
      freezeAvailable: freezeAvailable(isPro, freezeMonth, today),
      freezeUsedThisMonth: freezeMonth === month,
    };
  }

  async getProSubscriberByEmail(email: string): Promise<ProSubscriber | undefined> {
    const [row] = await db.select().from(proSubscribers).where(eq(proSubscribers.email, email.toLowerCase()));
    return row;
  }

  async getAllActiveProSubscribers(): Promise<ProSubscriber[]> {
    return db.select().from(proSubscribers).where(eq(proSubscribers.status, "active"));
  }

  async linkProEmailToSession(email: string, sessionId: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    const existing = await this.getSubscriberByEmail(normalized);
    if (existing) {
      await this.updateSubscriberSession(normalized, sessionId);
      return;
    }
    await this.createSubscriber({ email: normalized, sessionId });
  }

  async upsertSubscriberIdentity(data: {
    email: string;
    sessionId: string;
    name?: string;
    socialHandle?: string;
    source?: string;
  }): Promise<Subscriber> {
    const normalized = data.email.toLowerCase().trim();
    const existing = await this.getSubscriberByEmail(normalized);
    const patch: Partial<Subscriber> = {
      sessionId: data.sessionId,
      active: true,
    };
    if (data.name?.trim()) patch.name = data.name.trim();
    if (data.socialHandle) patch.socialHandle = data.socialHandle;
    if (data.source) patch.source = data.source;

    if (existing) {
      const [row] = await db
        .update(subscribers)
        .set(patch)
        .where(eq(subscribers.email, normalized))
        .returning();
      return row;
    }

    const [row] = await db
      .insert(subscribers)
      .values({
        email: normalized,
        sessionId: data.sessionId,
        name: data.name?.trim() || null,
        socialHandle: data.socialHandle ?? null,
        source: data.source ?? null,
        active: true,
      })
      .returning();
    return row;
  }

  async getMobileSubscription(sessionId: string): Promise<MobileSubscription | undefined> {
    const [row] = await db
      .select()
      .from(mobileSubscriptions)
      .where(eq(mobileSubscriptions.sessionId, sessionId));
    return row;
  }

  async upsertMobileSubscription(data: {
    sessionId: string;
    isPro: boolean;
    expiresAt?: Date | null;
  }): Promise<MobileSubscription> {
    const [row] = await db
      .insert(mobileSubscriptions)
      .values({
        sessionId: data.sessionId,
        isPro: data.isPro,
        expiresAt: data.expiresAt ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: mobileSubscriptions.sessionId,
        set: {
          isPro: data.isPro,
          expiresAt: data.expiresAt ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async isSessionPro(sessionId: string): Promise<boolean> {
    const mobile = await this.getMobileSubscription(sessionId);
    if (mobile?.isPro) {
      if (!mobile.expiresAt || mobile.expiresAt > new Date()) return true;
    }
    if (await this.hasReferralPro(sessionId)) return true;

    const [linked] = await db
      .select({ email: subscribers.email })
      .from(subscribers)
      .where(eq(subscribers.sessionId, sessionId));
    if (linked?.email) {
      const pro = await this.getProSubscriberByEmail(linked.email);
      if (pro?.status === "active") return true;
    }
    return false;
  }

  async upsertMobileProEmail(email: string, plan: "ios" | "android"): Promise<ProSubscriber> {
    const normalized = email.toLowerCase().trim();
    const existing = await this.getProSubscriberByEmail(normalized);
    if (existing) {
      if (existing.status !== "active") {
        await db
          .update(proSubscribers)
          .set({ status: "active", plan })
          .where(eq(proSubscribers.email, normalized));
      }
      const [row] = await db
        .select()
        .from(proSubscribers)
        .where(eq(proSubscribers.email, normalized));
      return row!;
    }

    const [row] = await db
      .insert(proSubscribers)
      .values({
        email: normalized,
        plan,
        status: "active",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      })
      .returning();
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
    const setOnConflict: Partial<InsertPushSubscription> = {
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
    };
    if (data.timezone !== undefined) setOnConflict.timezone = data.timezone;
    if (data.morningEnabled !== undefined) setOnConflict.morningEnabled = data.morningEnabled;
    if (data.morningTime !== undefined) setOnConflict.morningTime = data.morningTime;
    if (data.eveningEnabled !== undefined) setOnConflict.eveningEnabled = data.eveningEnabled;
    if (data.eveningTime !== undefined) setOnConflict.eveningTime = data.eveningTime;
    if (data.middayEnabled !== undefined) setOnConflict.middayEnabled = data.middayEnabled;
    if (data.streakReminder !== undefined) setOnConflict.streakReminder = data.streakReminder;
    if (data.weeklySummary !== undefined) setOnConflict.weeklySummary = data.weeklySummary;

    const [row] = await db
      .insert(pushSubscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: pushSubscriptions.sessionId,
        set: setOnConflict,
      })
      .returning();
    return row;
  }

  async getPushSubscription(sessionId: string): Promise<PushSubscription | undefined> {
    const [row] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.sessionId, sessionId));
    return row;
  }

  async updatePushSettings(sessionId: string, settings: Partial<Pick<PushSubscription, 'morningEnabled'|'morningTime'|'eveningEnabled'|'eveningTime'|'middayEnabled'|'streakReminder'|'weeklySummary'|'timezone'>>): Promise<void> {
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

  async addReferralProDays(sessionId: string, days: number): Promise<Date> {
    const { addProDays } = await import("./referralRewards");
    const row = await this.getOrCreateReferralCode(sessionId);
    const newExpiry = addProDays(row.proExpiresAt, days);
    await db.update(referralCodes).set({ proExpiresAt: newExpiry }).where(eq(referralCodes.sessionId, sessionId));
    return newExpiry;
  }

  async recordReferral(
    code: string,
    referredSessionId: string,
  ): Promise<{
    success: boolean;
    referrerSessionId: string | null;
    referredProUntil: string | null;
    referrerProUntil: string | null;
    referralCount: number;
    alreadyRecorded: boolean;
  }> {
    const { addProDays, REFERRAL_DAYS_PER_FRIEND, REFERRAL_WELCOME_DAYS } = await import("./referralRewards");
    const [referrer] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
    if (!referrer) {
      return {
        success: false,
        referrerSessionId: null,
        referredProUntil: null,
        referrerProUntil: null,
        referralCount: 0,
        alreadyRecorded: false,
      };
    }
    if (referrer.sessionId === referredSessionId) {
      return {
        success: false,
        referrerSessionId: null,
        referredProUntil: null,
        referrerProUntil: null,
        referralCount: referrer.referralCount,
        alreadyRecorded: false,
      };
    }
    const [alreadyReferred] = await db.select().from(referrals).where(eq(referrals.referredSessionId, referredSessionId));
    if (alreadyReferred) {
      const stats = await this.getReferralStats(referredSessionId);
      return {
        success: false,
        referrerSessionId: referrer.sessionId,
        referredProUntil: stats?.proExpiresAt?.toISOString() ?? null,
        referrerProUntil: referrer.proExpiresAt?.toISOString() ?? null,
        referralCount: referrer.referralCount,
        alreadyRecorded: true,
      };
    }

    await db.insert(referrals).values({ referralCode: code, referredSessionId }).onConflictDoNothing();

    const referrerExpiry = addProDays(referrer.proExpiresAt, REFERRAL_DAYS_PER_FRIEND);
    await db.update(referralCodes)
      .set({ referralCount: sqlExpr`${referralCodes.referralCount} + 1`, proExpiresAt: referrerExpiry })
      .where(eq(referralCodes.code, code));

    const referredExpiry = await this.addReferralProDays(referredSessionId, REFERRAL_WELCOME_DAYS);

    const [updatedReferrer] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));

    return {
      success: true,
      referrerSessionId: referrer.sessionId,
      referredProUntil: referredExpiry.toISOString(),
      referrerProUntil: updatedReferrer?.proExpiresAt?.toISOString() ?? referrerExpiry.toISOString(),
      referralCount: updatedReferrer?.referralCount ?? referrer.referralCount + 1,
      alreadyRecorded: false,
    };
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

  async getUserProfileName(sessionId: string): Promise<string | null> {
    const [row] = await db.select({ name: userProfiles.name }).from(userProfiles).where(eq(userProfiles.sessionId, sessionId));
    return row?.name ?? null;
  }

  async setUserProfileName(sessionId: string, name: string): Promise<void> {
    await db.insert(userProfiles).values({ sessionId, name }).onConflictDoUpdate({
      target: userProfiles.sessionId,
      set: { name, updatedAt: new Date() },
    });
  }

  async getUserMemory(sessionId: string): Promise<UserMemoryRow | undefined> {
    const [row] = await db.select().from(userMemory).where(eq(userMemory.sessionId, sessionId));
    return row;
  }

  async upsertUserMemory(
    sessionId: string,
    data: Partial<Omit<UserMemoryRow, "sessionId" | "updatedAt">>
  ): Promise<UserMemoryRow> {
    const [row] = await db
      .insert(userMemory)
      .values({ sessionId, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userMemory.sessionId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async upsertExpoPushToken(sessionId: string, token: string, hour: number, minute: number): Promise<ExpoPushToken> {
    const [row] = await db
      .insert(expoPushTokens)
      .values({ sessionId, token, hour, minute, enabled: true, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: expoPushTokens.sessionId,
        set: { token, hour, minute, enabled: true, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async deleteExpoPushToken(sessionId: string): Promise<void> {
    await db.delete(expoPushTokens).where(eq(expoPushTokens.sessionId, sessionId));
  }

  async getExpoPushTokensForHourMinute(hour: number, minute: number): Promise<ExpoPushToken[]> {
    return db
      .select()
      .from(expoPushTokens)
      .where(and(eq(expoPushTokens.hour, hour), eq(expoPushTokens.minute, minute), eq(expoPushTokens.enabled, true)));
  }

  async logAiUsage(data: InsertAiUsageLog): Promise<void> {
    await db.insert(aiUsageLogs).values(data);
  }

  async getAiUsageLogs(limit = 500): Promise<AiUsageLog[]> {
    return db.select().from(aiUsageLogs).orderBy(desc(aiUsageLogs.createdAt)).limit(limit);
  }

  async getAiUsageBySession(sessionId: string): Promise<AiUsageLog[]> {
    return db.select().from(aiUsageLogs).where(eq(aiUsageLogs.sessionId, sessionId)).orderBy(desc(aiUsageLogs.createdAt));
  }

  async getAiUsageSummary(): Promise<{ feature: string; count: number }[]> {
    const rows = await db
      .select({ feature: aiUsageLogs.feature, count: count() })
      .from(aiUsageLogs)
      .groupBy(aiUsageLogs.feature);
    return rows.map(r => ({ feature: r.feature, count: Number(r.count) }));
  }

  async submitBetaFeedback(data: InsertBetaFeedback): Promise<BetaFeedback> {
    const [row] = await db.insert(betaFeedback).values(data).returning();
    return row;
  }

  async getAllBetaFeedback(): Promise<BetaFeedback[]> {
    return db.select().from(betaFeedback).orderBy(desc(betaFeedback.submittedAt));
  }

  async getPastorVideoByTone(
    tone: string,
  ): Promise<Pick<PastorVideo, "pastorName" | "churchName" | "tier" | "title" | "youtubeUrl"> | null> {
    const [row] = await db
      .select({
        pastorName: pastorVideos.pastorName,
        churchName: pastorVideos.churchName,
        tier: pastorVideos.tier,
        title: pastorVideos.title,
        youtubeUrl: pastorVideos.youtubeUrl,
      })
      .from(pastorVideos)
      .where(sqlExpr`${pastorVideos.toneTags} @> ARRAY[${tone}]::text[]`)
      .orderBy(asc(pastorVideos.tier), sqlExpr`RANDOM()`)
      .limit(1);
    return row ?? null;
  }
}

export const storage = new DatabaseStorage();
