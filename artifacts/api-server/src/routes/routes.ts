import { subscriberCookieOptions } from "../subscriberCookies";
import { config } from "../config";
import express from "express";
import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import { Readable } from "stream";
import { storage } from "../storage";
import { db, pool } from "../db";
import { api, chatRequestSchema, type ChatMessage } from "../sharedRoutes";
import { insertSubscriberSchema, insertJournalEntrySchema, insertPrayerWallSchema, insertBetaFeedbackSchema, PRAYER_CATEGORIES, PRAYER_ENCOURAGEMENT_ACTIONS, type SmsMessage } from "@workspace/db";
import { z } from "zod";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import Stripe from "stripe";
import webpush from "web-push";
import twilio from "twilio";
import { getTodayVerseFromSheet, getRawSheetRows, getEasternDateString } from "../googleSheets";
import { generateImageBuffer } from "../replit_integrations/image/client";
import { updateMemory, getMemoryContext, buildMemoryPromptNote } from "../lib/userMemory";
import {
  parseGuidanceMemoryContent,
  serializeGuidanceMemory,
  extractMemoryJsonFromModel,
  sanitizeCarryForwardForSpeech,
} from "../lib/guidanceMemory";
import { getVoiceProfile, buildVoicePromptNote } from "../lib/voiceProfile";
import { getCulturalMomentNote } from "../culturalMoments";
import { getUncachableResendClient, buildDailyVerseEmailHtml, buildDailyVerseEmailText, buildWelcomeEmailHtml, buildWelcomeEmailText } from "../resend";
import { scheduleDailyEmails } from "../emailScheduler";
import { scheduleDailyVerseSync } from "../verseSyncScheduler";
import { scheduleOnboardingEmails } from "../onboardingEmailScheduler";
import { schedulePushNotifications, scheduleExpoPushNotifications, scheduleGuidanceFollowUp } from "../pushScheduler";
import { scheduleProWeeklySpiritualWeatherEmails } from "../spiritualWeatherScheduler";
import { ensureIdentitySchema } from "../identityMigrations";
import {
  identityConnectSchema,
  mobileSyncProSchema,
  normalizeEmail,
  normalizeSocialHandle,
} from "../identityConnect";
import { scheduleDailySms } from "../smsScheduler";
import { buildCrisisJourney, generateLifeSeasonJourney } from "../lifeSeasonJourney";
import {
  TALK_IT_THROUGH_PHASE1_SYSTEM_PROMPT,
  TALK_IT_THROUGH_SYSTEM_PROMPT,
  TALK_IT_THROUGH_RESPONSE_SCOPE,
  TALK_IT_THROUGH_FIRST_RESPONSE,
  TALK_IT_THROUGH_RESPONSE_EXAMPLES,
  TALK_IT_THROUGH_FOLLOW_UP,
  buildTalkItThroughVersePrayerPrompt,
  buildTalkItThroughVersePrayerUserContent,
  TALK_IT_THROUGH_WALK_TODAY_SYSTEM_PROMPT,
} from "../talkItThroughPrompt";
import { buildVariantSystemPrompt, isAbTestEnabled } from "../talkItThroughVariants";
import { generateConversationState, buildStatePromptBlock, detectConversationClosing, type ConversationState } from "../conversationState";
import { logAbInteraction, incrementMessageCount, detectCrisisSignal } from "../abTracking";
import {
  CRISIS_RESPONSE,
  scanUserText,
  scanGuidanceTexts,
  shouldBlockLlm,
  concerningSystemNote,
  SAFETY_HEADER,
} from "../guidanceSafety";
import {
  resolveDailyArtDir,
  writeDailyArtImageFile,
  ensureDailyArtImageFile,
  stockQueryForVerse,
  imageMatchesStaticFallback,
  fetchStockImageBuffer,
  refreshDailyArtImage,
} from "../dailyArtUtil";
import { buildThresholdPayload, buildWeeklyWeather, buildVerseFrame } from "../homeExperience";
import { buildJournalArchive } from "../journalArchive";
import {
  bindRateLimiter,
  checkAiDailyLimit,
  checkFeatureBudget,
  parseProFlag,
  aiDailyCap,
} from "../costGuards";
import { checkListenPolicy, getListenAllowance, type ListenScope } from "../listenLimits";
import { getAiDailyLimits } from "../aiLimits";
import { checkGuidanceWeeklyLimit, recordGuidanceConversationStart } from "../guidanceWeeklyLimits";
import { freeTrialGrants } from "../freeTrialConfig";
import { getServerDaysWithApp, touchSessionFirstSeen, getGuidanceConversationCount, incrementGuidanceConversationCount } from "../sessionFirstSeen";
import { getTriviaSeed } from "../triviaSeed";
import type { TriviaQuestion } from "@workspace/db";
import {
  PASTOR_TIER_AI_GUIDE,
  resolvePastorYouTubeVideo,
  fetchYouTubeSearchItems,
  buildYouTubeSearchUrl,
} from "../pastorTiers";

const stripe = new Stripe(config.stripeSecretKey!, { apiVersion: "2026-04-22.dahlia" });

function setSubscriberCookies(res: express.Response, email: string): void {
  const opts = subscriberCookieOptions(process.env.NODE_ENV === "production");
  res.cookie("sp_subscriber_email", normalizeEmail(email), opts);
  res.cookie("sp_email_subscribed", "true", opts);
}

// Daily sermon cache — key: "YYYY-MM-DD:verseId", value: sermon result object
// One sermon per verse per day; cleared on server restart (fine — sessionStorage handles client-side persistence)
const dailySermonCache = new Map<string, any>();

// Scripture context cache — key: normalized verse reference, value: context object
// Stable data; safe to cache indefinitely per server run
const scriptureContextCache = new Map<string, any>();

// In-memory TTS cache — key: "voice::text_hash", value: Buffer of mp3 bytes
// Capped to prevent unbounded memory growth
const MAX_TTS_CACHE = 120;
const ttsCache = new Map<string, Buffer>();
function ttsCacheKey(text: string, voice: string) {
  return crypto.createHash("sha256").update(`${voice}\0${text}`).digest("hex").slice(0, 40);
}

// Disk cache — persists across server restarts
const TTS_DISK_CACHE_DIR = path.resolve(process.cwd(), "server/tts-cache");
if (!fs.existsSync(TTS_DISK_CACHE_DIR)) fs.mkdirSync(TTS_DISK_CACHE_DIR, { recursive: true });

function readDiskCache(key: string): Buffer | null {
  const filePath = path.join(TTS_DISK_CACHE_DIR, `${key}.mp3`);
  try { return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null; } catch { return null; }
}

function writeDiskCache(key: string, buffer: Buffer): void {
  const filePath = path.join(TTS_DISK_CACHE_DIR, `${key}.mp3`);
  try { fs.writeFileSync(filePath, buffer); } catch (e) { console.warn("TTS disk cache write failed:", e); }
}

const ELEVENLABS_PHILIP_VOICE_ID = "4bt9GD5FhAuJpgPoDNut";
const ELEVENLABS_MODEL = "eleven_turbo_v2_5";

/**
 * Stream ElevenLabs TTS directly to an Express response.
 * Audio chunks arrive within ~300ms vs ~4-5s for the full blob.
 * Caller is responsible for setting Content-Type before calling.
 */
async function streamElevenLabsTTSToResponse(
  text: string,
  res: import("express").Response,
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_PHILIP_VOICE_ID}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: 0.68,
          similarity_boost: 0.80,
          style: 0.15,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    }
  );

  if (!response.ok) throw new Error(`ElevenLabs stream TTS failed: ${response.status}`);
  if (!response.body) throw new Error("ElevenLabs stream: no body");

  const chunks: Buffer[] = [];
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    chunks.push(chunk);
    if (!res.writableEnded) res.write(chunk);
  }

  return Buffer.concat(chunks);
}

async function getElevenLabsTTS(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_PHILIP_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: 0.68,
          similarity_boost: 0.80,
          style: 0.15,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    }
  );
  if (!response.ok) throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function getTTSAudio(text: string, voice: string, scope?: string): Promise<Buffer> {
  const input = text.trim();
  if (!input) throw new Error("Empty TTS text");
  const cacheKey = ttsCacheKey(input, scope === "guidance" ? "elevenlabs-philip" : voice);
  // 1. Memory cache (instant)
  if (ttsCache.has(cacheKey)) return ttsCache.get(cacheKey)!;
  // 2. Disk cache (fast, survives restarts)
  const diskHit = readDiskCache(cacheKey);
  if (diskHit) { ttsCache.set(cacheKey, diskHit); return diskHit; }

  let buffer: Buffer;

  if (scope === "guidance" && process.env.ELEVENLABS_API_KEY) {
    // Philip's Pro voice — ElevenLabs with OpenAI fallback
    try {
      buffer = await getElevenLabsTTS(input);
    } catch (err) {
      console.error("ElevenLabs TTS failed, falling back to OpenAI:", err);
      const speech = await openaiTTS.audio.speech.create({
        model: "tts-1", voice: "onyx", input: input.slice(0, 4096),
      });
      buffer = Buffer.from(await speech.arrayBuffer());
    }
  } else {
    // All other scopes — OpenAI TTS
    const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const safeVoice = allowedVoices.includes(voice) ? voice : "onyx";
    const speech = await openaiTTS.audio.speech.create({
      model: "tts-1",
      voice: safeVoice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: input.slice(0, 4096),
    });
    buffer = Buffer.from(await speech.arrayBuffer());
  }

  // Evict oldest entry when cache is full
  if (ttsCache.size >= MAX_TTS_CACHE) {
    const firstKey = ttsCache.keys().next().value;
    if (firstKey) ttsCache.delete(firstKey);
  }
  ttsCache.set(cacheKey, buffer);
  writeDiskCache(cacheKey, buffer);
  return buffer;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Separate client for TTS — uses direct OpenAI key (integration proxy doesn't support audio)
const openaiTTS = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ── Per-session rate limiter ──────────────────────────────────────────────────
// Prevents a single user from hammering expensive AI endpoints
const rateLimitStore = new Map<string, number[]>();
function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(key) ?? []).filter(t => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    rateLimitStore.set(key, timestamps);
    return true;
  }
  rateLimitStore.set(key, [...timestamps, now]);
  return false;
}
function getDailyHardLimit(daysWithApp: number): number {
  return getAiDailyLimits(daysWithApp).hardLimit;
}

bindRateLimiter(isRateLimited);

function getDailyUsageCount(sessionId: string): number {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(`daily:${sessionId}`) ?? []).filter(t => now - t < 86_400_000);
  return timestamps.length;
}

// Prune the rate limit store every hour to prevent memory growth
setInterval(() => {
  const cutoff = Date.now() - 3_600_000;
  for (const [key, timestamps] of Array.from(rateLimitStore)) {
    const recent = timestamps.filter((t: number) => t > cutoff);
    if (recent.length === 0) rateLimitStore.delete(key);
    else rateLimitStore.set(key, recent);
  }
}, 3_600_000);

async function syncTodayVerseFromSheet(): Promise<void> {
  try {
    const { sanitizeSheetVerse, verseTextHasRestoreSoulTypo } = await import("../verseTextSanitize");
    const today = getEasternDateString();
    let existing = await storage.getVerseByDate(today);
    if (existing && verseTextHasRestoreSoulTypo(existing.text)) {
      await storage.deleteVerseByDate(today);
      existing = undefined;
    }

    const sheetVerseRaw = await getTodayVerseFromSheet();
    const sheetVerse = sheetVerseRaw ? sanitizeSheetVerse(sheetVerseRaw) : null;
    if (!sheetVerse) {
      if (existing) return;
      console.warn("No matching row found in Google Sheet for today. Using fallback.");
      await storage.createVerse({
        reference: "Philippians 4:6-7",
        text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
        encouragement: "When you feel overwhelmed, remember that you don't have to carry the burden alone. Bring your worries to God, and He will replace your anxiety with His perfect peace.",
        reflectionPrompt: "What worries can you surrender to God today?",
        date: today,
      });
      return;
    }

    if (existing) {
      const sameReference = existing.reference === sheetVerse.reference;
      const sameText = existing.text === sheetVerse.verseText;
      const sameEncouragement = (existing.encouragement || "") === (sheetVerse.encouragement || "");
      const samePrompt = (existing.reflectionPrompt || "") === (sheetVerse.reflectionPrompt || "");
      if (sameReference && sameText && sameEncouragement && samePrompt) return;
      await storage.deleteVerseByDate(today);
    }

    await storage.createVerse({
      reference: sheetVerse.reference,
      text: sheetVerse.verseText,
      encouragement: sheetVerse.encouragement,
      reflectionPrompt: sheetVerse.reflectionPrompt,
      date: today,
    });

    console.log(`Synced today's verse from Google Sheet: ${sheetVerse.reference}`);
  } catch (err) {
    console.error("Error syncing verse from Google Sheet:", err);
    // Google Sheets is unreachable — store the fallback verse so users aren't left stranded
    try {
      const today = getEasternDateString();
      const existing = await storage.getVerseByDate(today);
      if (!existing) {
        await storage.createVerse({
          reference: "Philippians 4:6-7",
          text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
          encouragement: "When you feel overwhelmed, remember that you don't have to carry the burden alone. Bring your worries to God, and He will replace your anxiety with His perfect peace.",
          reflectionPrompt: "What worries can you surrender to God today?",
          date: today,
        });
        console.log("[Verse] Stored fallback verse for today after Google Sheets error.");
      }
    } catch (fallbackErr) {
      console.error("Could not store fallback verse:", fallbackErr);
    }
  }
}

import { registerVoiceStreamWS } from "./voiceStream";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerVoiceStreamWS(httpServer);

  await ensureIdentitySchema().catch((err) => {
    console.error("[identity] schema ensure failed:", err);
  });

  // Sync today's verse from Google Sheets at startup
  syncTodayVerseFromSheet().catch(console.error);

  // Start the daily email scheduler — only in the deployed production environment.
  // Skipped in dev to prevent duplicate sends when both environments share the same
  // subscriber email addresses but maintain separate databases.
  if (config.shouldRunSchedulers) {
    scheduleDailyVerseSync(syncTodayVerseFromSheet);
    scheduleDailyEmails().catch(console.error);
    scheduleOnboardingEmails().catch(console.error);
    scheduleProWeeklySpiritualWeatherEmails();
  } else {
    console.log("[email] Scheduler skipped. Set ENABLE_EMAIL_SCHEDULER=true on your VPS to enable.");
  }

  // ── AI usage counter (per-session daily stats) ────────────────────────────
  app.get("/api/ai-usage", (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const daysWithApp = Math.max(1, Number(req.query.daysWithApp) || 1);
    const isPro = parseProFlag(req.query.isPro);
    const { displayLimit, phase } = getAiDailyLimits(daysWithApp);
    const hardLimit = aiDailyCap(daysWithApp, isPro);
    const effectiveLimit = isPro ? hardLimit : displayLimit;
    if (!sessionId) {
      return res.json({
        used: 0,
        limit: effectiveLimit,
        hardLimit,
        remaining: effectiveLimit,
        phase,
        isPro,
      });
    }
    const used = getDailyUsageCount(sessionId);
    return res.json({
      used,
      limit: effectiveLimit,
      hardLimit,
      remaining: Math.max(0, effectiveLimit - used),
      phase,
      isPro,
    });
  });

  // ── AI usage — last 7 days per session ───────────────────────────────────
  app.get("/api/ai-usage/weekly", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const daysWithApp = Math.max(1, Number(req.query.daysWithApp) || 1);
    const { displayLimit: dailyLimit } = getAiDailyLimits(daysWithApp);

    // Build a 7-element array: today at index 6, 6 days ago at index 0
    const days: { date: string; dayName: string; count: number; limit: number }[] = [];
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ date: dateStr, dayName: DAY_NAMES[d.getDay()], count: 0, limit: dailyLimit });
    }

    if (sessionId) {
      try {
        const result = await pool.query(
          `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as day, COUNT(*)::int as count
           FROM ai_usage_logs
           WHERE session_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
           GROUP BY DATE(created_at)
           ORDER BY day`,
          [sessionId]
        );
        for (const row of result.rows) {
          const entry = days.find(d => d.date === row.day);
          if (entry) entry.count = row.count;
        }
      } catch (_e) {
        // return zeros on error
      }
    }

    return res.json({ days, dailyLimit });
  });

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/api/health", async (_req, res) => {
    const services: Record<string, { ok: boolean; message: string }> = {};

    // 1. Database — actual query
    try {
      await import("../db").then(({ pool }) => pool.query("SELECT 1"));
      services.database = { ok: true, message: "Connected" };
    } catch (err: any) {
      console.error("[health] DB check failed:", err);
      services.database = { ok: false, message: err?.message ?? "Query failed" };
    }

    // 2. Today's verse cached in DB (sync first — same as /api/verses/daily)
    try {
      await syncTodayVerseFromSheet();
      const today = getEasternDateString();
      const verse = await storage.getVerseByDate(today);
      services.dailyVerse = verse
        ? { ok: true, message: `Today's verse: ${verse.reference}` }
        : { ok: false, message: "No verse cached for today — check Google Sheet row or GOOGLE_SHEET_WEB_APP_URL" };
    } catch {
      services.dailyVerse = { ok: false, message: "Could not query verse table" };
    }

    // 3. OpenAI
    const hasOpenAI = !!(process.env.OPENAI_API_KEY);
    services.openai = hasOpenAI
      ? { ok: true, message: "API key configured" }
      : { ok: false, message: "No API key found" };

    // 4. Email — Resend (via Replit integration connector)
    const hasResend = !!process.env.RESEND_API_KEY;
    services.email = hasResend
      ? { ok: true, message: "RESEND_API_KEY configured" }
      : { ok: false, message: "RESEND_API_KEY not set" };

    // 5. Push notifications — VAPID
    const hasPush = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    services.push = hasPush
      ? { ok: true, message: "VAPID keys configured" }
      : { ok: false, message: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set" };

    // 6. SMS — Twilio
    const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    services.sms = hasTwilio
      ? { ok: true, message: "Twilio configured" }
      : { ok: false, message: "TWILIO_ACCOUNT_SID / AUTH_TOKEN / PHONE_NUMBER missing" };

    const hasUnsplash = !!process.env.UNSPLASH_ACCESS_KEY?.trim();
    const hasPexels = !!process.env.PEXELS_API_KEY?.trim();
    services.dailyArtStock = hasUnsplash || hasPexels
      ? {
          ok: true,
          message: [hasUnsplash && "Unsplash", hasPexels && "Pexels"].filter(Boolean).join(" + ") + " configured",
        }
      : { ok: false, message: "Set UNSPLASH_ACCESS_KEY and/or PEXELS_API_KEY in artifacts/api-server/.env" };

    // 7. Google Sheets — if today's verse loaded, sheets is working
    services.googleSheets = services.dailyVerse?.ok
      ? { ok: true, message: "Syncing successfully" }
      : process.env.GOOGLE_SHEET_WEB_APP_URL
        ? { ok: true, message: "GOOGLE_SHEET_WEB_APP_URL configured" }
        : process.env.GOOGLE_SERVICE_ACCOUNT_JSON
          ? { ok: true, message: "Service account configured" }
          : { ok: false, message: "Set GOOGLE_SHEET_WEB_APP_URL or GOOGLE_SERVICE_ACCOUNT_JSON" };

    const allOk = Object.values(services).every(s => s.ok);
    const criticalOk = services.database?.ok && services.openai?.ok;
    const overallStatus = allOk ? "ok" : criticalOk ? "degraded" : "down";

    res.status(overallStatus === "down" ? 503 : 200).json({
      status: overallStatus,
      ts: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services,
    });
  });

  const PASTOR_VIDEO_TONES = new Set([
    "hope",
    "strength",
    "presence",
    "grief",
    "identity",
    "faith",
    "encouragement",
    "perseverance",
    "not alone",
    "waiting",
    "anxiety",
    "shame",
    "prayer",
    "doubt",
    "loneliness",
    "overwhelm",
  ]);

  app.get("/api/pastor-video", async (req, res) => {
    const tone = String(req.query.tone ?? "").trim().toLowerCase();
    if (!tone || !PASTOR_VIDEO_TONES.has(tone)) {
      return res.json(null);
    }
    try {
      const video = await storage.getPastorVideoByTone(tone);
      if (!video) return res.json(null);
      res.json({
        pastor_name: video.pastorName,
        church_name: video.churchName,
        tier: video.tier,
        title: video.title,
        youtube_url: video.youtubeUrl,
      });
    } catch (err) {
      console.error("[pastor-video] lookup failed:", err);
      res.json(null);
    }
  });

  // ── User profile phone ───────────────────────────────────────────────────────
  app.get("/api/user/pinned-paths", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.json({ paths: [] });
    try {
      const paths = await storage.getUserPinnedPaths(sessionId);
      res.json({ paths });
    } catch {
      res.json({ paths: [] });
    }
  });

  app.post("/api/user/pinned-paths", async (req, res) => {
    const { sessionId, paths } = req.body as { sessionId?: string; paths?: string[] };
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    if (!Array.isArray(paths)) return res.status(400).json({ message: "paths must be array" });
    try {
      await storage.setUserPinnedPaths(sessionId, paths.slice(0, 4));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "failed" });
    }
  });

  app.get("/api/user-phone", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.json({ phone: null });
    try {
      const phone = await storage.getUserProfilePhone(sessionId);
      res.json({ phone });
    } catch {
      res.json({ phone: null });
    }
  });

  app.post("/api/user-phone", async (req, res) => {
    const { sessionId, phone } = req.body as { sessionId?: string; phone?: string };
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    const trimmed = typeof phone === "string" ? phone.trim() : "";
    if (!trimmed) return res.status(400).json({ message: "phone required" });
    try {
      await storage.setUserProfilePhone(sessionId, trimmed);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "failed" });
    }
  });

  // ── User profile name (persists across Safari/iOS localStorage clears) ────────
  app.get("/api/user-name", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.json({ name: null, prompted: false });
    try {
      const { getNamePromptedOnServer } = await import("../userNameState");
      const name = await storage.getUserProfileName(sessionId);
      const prompted = !!name || (await getNamePromptedOnServer(sessionId));
      res.json({ name, prompted });
    } catch {
      res.json({ name: null, prompted: false });
    }
  });

  app.post("/api/user-name", async (req, res) => {
    const { sessionId, name, prompted } = req.body as {
      sessionId?: string;
      name?: string;
      prompted?: boolean;
    };
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId required" });
    }
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed && prompted !== true) {
      return res.status(400).json({ message: "name or prompted required" });
    }
    try {
      const { setNamePromptedOnServer } = await import("../userNameState");
      if (trimmed) {
        await storage.setUserProfileName(sessionId, trimmed);
        await setNamePromptedOnServer(sessionId);
      } else if (prompted === true) {
        await setNamePromptedOnServer(sessionId);
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "failed" });
    }
  });

  app.get("/api/splash-prog", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.json({ prog: null });
    try {
      const { getSplashProgFromServer } = await import("../splashProgState");
      const prog = await getSplashProgFromServer(sessionId);
      res.json({ prog });
    } catch {
      res.json({ prog: null });
    }
  });

  app.post("/api/splash-prog", async (req, res) => {
    const { sessionId, prog } = req.body as { sessionId?: string; prog?: unknown };
    if (!sessionId || !prog || typeof prog !== "object") {
      return res.status(400).json({ message: "sessionId and prog required" });
    }
    try {
      const { setSplashProgOnServer, getSplashProgFromServer } = await import("../splashProgState");
      const incoming = prog as {
        v?: number;
        onboarding?: number;
        dailyDate?: string;
        dailyOpens?: number;
        dailyFeature?: number;
        dailySecond?: number | null;
        lastImage?: string | null;
      };
      if (incoming.v !== 1 || typeof incoming.onboarding !== "number") {
        return res.status(400).json({ message: "invalid prog" });
      }
      const existing = await getSplashProgFromServer(sessionId);
      const today = getEasternDateString();
      let onboarding = Math.max(incoming.onboarding, existing?.onboarding ?? 0);
      let dailyDate = incoming.dailyDate ?? existing?.dailyDate ?? today;
      let dailyOpens = incoming.dailyOpens ?? 0;
      let dailyFeature = incoming.dailyFeature ?? existing?.dailyFeature ?? 0;
      let dailySecond = incoming.dailySecond ?? existing?.dailySecond ?? null;
      if (existing && existing.dailyDate === today && incoming.dailyDate === today) {
        dailyOpens = Math.max(dailyOpens, existing.dailyOpens);
        onboarding = Math.max(onboarding, existing.onboarding);
      }
      const merged = {
        v: 1 as const,
        onboarding,
        dailyDate,
        dailyOpens,
        dailyFeature,
        dailySecond,
        lastImage: incoming.lastImage ?? existing?.lastImage ?? null,
      };
      await setSplashProgOnServer(sessionId, merged);
      res.json({ ok: true, prog: merged });
    } catch {
      res.status(500).json({ message: "failed" });
    }
  });

  // Get today's verse (reads from DB cache, which was synced from Google Sheet)
  app.get(api.verses.getDaily.path, async (req, res) => {
    try {
      const easternToday = getEasternDateString();
      const requestedDate = (req.query.date as string) || easternToday;
      if (req.query.refresh === "1") {
        await storage.deleteVerseByDate(requestedDate);
      }
      // Return from DB immediately — never block the response on Google Sheets
      let verse = await storage.getVerseByDate(requestedDate);

      // Only sync if verse is genuinely missing from DB
      if (!verse && requestedDate === easternToday) {
        await syncTodayVerseFromSheet();
        verse = await storage.getVerseByDate(requestedDate);
      }

      if (!verse) {
        return res.status(404).json({ message: "No verse found for today." });
      }

      const { sanitizeStoredVerse } = await import("../verseTextSanitize");
      res.json(sanitizeStoredVerse(verse));
    } catch (err) {
      console.error("getDaily verse error:", err);
      res.status(500).json({ message: "Could not load today's verse." });
    }
  });

  /** Shareable verse page — OG HTML for link previews; redirects humans to /v/:date */
  // ── Personalized Share Links ──────────────────────────────────────────────────
  // POST /api/share/create  → stores share payload, returns { id, url }
  // GET  /api/share/moment/:id → returns share payload for landing page
  // TTL: 7 days; cleaned up lazily on create.
  interface ShareMoment {
    verse: string;
    reference: string;
    senderName: string | null;
    note: string | null;
    heroDate: string | null;
    createdAt: number;
  }
  const SHARE_STORE = new Map<string, ShareMoment>();
  const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function pruneShares() {
    const now = Date.now();
    for (const [id, s] of SHARE_STORE) {
      if (now - s.createdAt > SHARE_TTL_MS) SHARE_STORE.delete(id);
    }
  }

  function generateShareId(): string {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  app.post("/api/share/create", (req, res) => {
    pruneShares();
    const { verse, reference, senderName, note, heroDate } = req.body as Partial<ShareMoment>;
    if (!verse?.trim() || !reference?.trim()) {
      return res.status(400).json({ message: "verse and reference required" });
    }
    const id = generateShareId();
    SHARE_STORE.set(id, {
      verse: verse.trim().slice(0, 600),
      reference: reference.trim().slice(0, 80),
      senderName: senderName?.trim().slice(0, 60) || null,
      note: note?.trim().slice(0, 300) || null,
      heroDate: heroDate?.trim() || null,
      createdAt: Date.now(),
    });
    const appUrl = (process.env.APP_URL || "https://www.shepherdspathai.com").replace(/\/$/, "");
    res.json({ id, url: `${appUrl}/s/${id}` });
  });

  app.get("/api/share/moment/:id", (req, res) => {
    const { id } = req.params;
    const share = SHARE_STORE.get(id);
    if (!share) return res.status(404).json({ message: "Share not found or expired" });
    if (Date.now() - share.createdAt > SHARE_TTL_MS) {
      SHARE_STORE.delete(id);
      return res.status(404).json({ message: "Share link has expired" });
    }
    res.json(share);
  });

  app.get("/api/share/verse/:date", async (req, res) => {
    try {
      const { date } = req.params;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).send("Invalid date");
      }
      let verse = await storage.getVerseByDate(date);
      if (!verse) {
        await syncTodayVerseFromSheet();
        verse = await storage.getVerseByDate(date);
      }
      if (!verse) {
        return res.status(404).send("Verse not found");
      }
      const appUrl = (process.env.APP_URL || "https://www.shepherdspathai.com").replace(/\/$/, "");
      const pageUrl = `${appUrl}/v/${date}`;
      const esc = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const desc =
        verse.text.length > 200 ? `${verse.text.slice(0, 197)}…` : verse.text;
      const verseArtDir = path.resolve(process.cwd(), "server/verse-art-cache");
      const localArt = path.join(verseArtDir, `${date}.png`);
      const ogImage = fs.existsSync(localArt)
        ? `${appUrl}/api/verse-art/image/${date}`
        : `${appUrl}/og-image.jpg?v=5`;
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(verse.reference)} — Shepherd's Path</title>
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:title" content="${esc(verse.reference)} — Shepherd's Path" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(verse.reference)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />
  <meta http-equiv="refresh" content="0;url=${esc(pageUrl)}" />
  <link rel="canonical" href="${esc(pageUrl)}" />
</head>
<body style="font-family:Georgia,serif;background:#0a0612;color:#f5f0ff;padding:2rem;text-align:center">
  <p style="opacity:0.7">Opening Scripture…</p>
  <p style="font-size:1.25rem;margin:1.5rem 0;font-style:italic">"${esc(verse.text)}"</p>
  <p style="font-weight:bold">— ${esc(verse.reference)}</p>
  <p><a href="${esc(pageUrl)}" style="color:#c4b5fd">Continue on Shepherd's Path</a></p>
</body>
</html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(html);
    } catch (e) {
      console.error("share verse HTML error:", e);
      res.status(500).send("Error");
    }
  });

  app.get("/api/home/threshold", async (req, res) => {
    const sessionId = (req.query.sessionId as string) || "";
    const daysWithApp = Math.max(0, parseInt(String(req.query.daysWithApp ?? "0"), 10) || 0);
    const isPro = req.query.isPro === "true";
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    try {
      const threshold = await buildThresholdPayload(sessionId, daysWithApp, isPro);
      res.json({ threshold });
    } catch (err) {
      console.error("[home/threshold]", err);
      res.status(500).json({ error: "Could not load threshold" });
    }
  });

  app.get("/api/home/weekly-weather", async (req, res) => {
    const sessionId = (req.query.sessionId as string) || "";
    const isPro = req.query.isPro === "true";
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    try {
      const weather = await buildWeeklyWeather(sessionId, {
        isPro,
        withSeasonLetter: isPro,
      });
      res.json({ weather });
    } catch (err) {
      console.error("[home/weekly-weather]", err);
      res.status(500).json({ error: "Could not load weekly weather" });
    }
  });

  app.get("/api/home/verse-frame", async (req, res) => {
    const reference = (req.query.reference as string) || "";
    const text = (req.query.text as string) || "";
    const sessionId = (req.query.sessionId as string) || "";
    const isPro = parseProFlag(req.query.isPro);
    if (!reference || !text) return res.status(400).json({ error: "reference and text required" });
    const frameGuard = checkFeatureBudget(sessionId, "verse-frame", isPro);
    if (!frameGuard.ok) {
      return res.status(frameGuard.status).json({ error: frameGuard.message, code: frameGuard.code });
    }
    try {
      const frame = await buildVerseFrame(openai, reference, text);
      res.json({ frame });
    } catch (err) {
      console.error("[home/verse-frame]", err);
      res.json({ frame: "One word for today — let it walk with you." });
    }
  });

  // Debug endpoint: inspect raw sheet rows to confirm column mapping
  app.get("/api/download/growth-plan", (_req, res) => {
    const pdfPath = path.resolve(process.cwd(), "scripts/shepherds-path-growth-plan.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=\"shepherds-path-growth-plan.pdf\"");
    res.sendFile(pdfPath, (err) => {
      if (err) res.status(404).json({ message: "PDF not found." });
    });
  });

  app.get("/api/debug/sheet-rows", async (req, res) => {
    try {
      const rows = await getRawSheetRows();
      res.json({ rows: rows.slice(0, 5) }); // First 5 rows only
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/listen/allowance", (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const isPro = req.query.isPro === "true";
    if (!sessionId) return res.json({ isPro, devotionalChainsRemaining: isPro ? null : 1, requestsRemaining: isPro ? null : 50 });
    return res.json(getListenAllowance(sessionId, isPro));
  });

  // Text-to-speech using OpenAI — returns audio/mpeg
  // GET endpoint (used by preload hook) — verse-only for free users
  app.get("/api/tts", async (req, res) => {
    const text = (req.query.text as string)?.trim();
    if (!text) return res.status(400).json({ message: "text required" });
    const sessionId = req.query.sessionId as string | undefined;
    const isPro = req.query.isPro === "true";
    const scope = (req.query.scope as ListenScope) || "verse";
    const policy = checkListenPolicy({ sessionId, isPro, scope, textLen: text.length });
    if (!policy.ok) return res.status(policy.status).json({ code: policy.code, message: policy.message });
    try {
      const buffer = await getTTSAudio(text, "onyx");
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=604800");
      res.send(buffer);
    } catch (err: any) {
      const isQuota = err?.code === "insufficient_quota" || err?.code === "billing_hard_limit_reached" || err?.status === 429;
      if (!res.headersSent) res.status(isQuota ? 503 : 500).json({ message: isQuota ? "Audio temporarily unavailable" : "TTS failed" });
    }
  });

  // POST endpoint (used by devotional listen button — allows voice selection)
  app.post("/api/tts", async (req, res) => {
    const { text, voice, scope, chainStart, sessionId, isPro } = req.body as {
      text: string;
      voice?: string;
      scope?: ListenScope;
      chainStart?: boolean;
      sessionId?: string;
      isPro?: boolean;
    };
    if (!text?.trim()) return res.status(400).json({ message: "text required" });
    const listenScope = scope ?? "snippet";
    // Guidance TTS (Philip's voice) is gated by the guidance weekly-limit system, not the listen policy.
    // Verify Pro server-side to pick ElevenLabs vs OpenAI, then skip listen policy for this scope.
    if (listenScope === "guidance") {
      let resolvedPro = isPro === true;
      if (!resolvedPro && sessionId) {
        resolvedPro = await storage.isSessionPro(sessionId).catch(() => false);
      }
      // 7-day trial users get ElevenLabs too — it's the sales pitch
      const daysWithApp = sessionId ? getServerDaysWithApp(sessionId) : 999;
      const trialEligible = daysWithApp <= 7;
      const effectiveScope = (resolvedPro || trialEligible) ? "guidance" : "guidance-free";
      try {
        const buffer = await getTTSAudio(text.trim(), "onyx", effectiveScope);
        res.set("Content-Type", "audio/mpeg");
        res.set("Cache-Control", "public, max-age=604800");
        return res.send(buffer);
      } catch (err: any) {
        const isQuota = err?.code === "insufficient_quota" || err?.status === 429;
        if (!res.headersSent) res.status(isQuota ? 503 : 500).json({ message: isQuota ? "Audio temporarily unavailable" : "TTS failed" });
        return;
      }
    }
    const policy = checkListenPolicy({
      sessionId,
      isPro: isPro === true,
      scope: listenScope,
      chainStart: chainStart === true,
      textLen: text.trim().length,
    });
    if (!policy.ok) return res.status(policy.status).json({ code: policy.code, message: policy.message });
    const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = allowedVoices.includes(voice ?? "") ? voice! : "onyx";
    try {
      const buffer = await getTTSAudio(text.trim(), selectedVoice, listenScope);
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=604800");
      res.send(buffer);
    } catch (err: any) {
      const isQuota = err?.code === "insufficient_quota" || err?.code === "billing_hard_limit_reached" || err?.status === 429;
      if (!res.headersSent) res.status(isQuota ? 503 : 500).json({ message: isQuota ? "Audio temporarily unavailable" : "TTS failed" });
    }
  });

  // Streaming TTS for Philip's guidance voice — cache-first, then ElevenLabs stream.
  // TTFB: ~300ms (vs ~4-5s for blob). Client plays audio as chunks arrive via MediaSource.
  app.post("/api/tts/stream", async (req, res) => {
    const { text, sessionId, isPro } = req.body as {
      text: string;
      sessionId?: string;
      isPro?: boolean;
    };
    if (!text?.trim()) return res.status(400).json({ message: "text required" });

    // Verify Pro/trial eligibility (same rules as blob TTS)
    let resolvedPro = isPro === true;
    if (!resolvedPro && sessionId) {
      resolvedPro = await storage.isSessionPro(sessionId).catch(() => false);
    }
    const daysWithApp = sessionId ? getServerDaysWithApp(sessionId) : 999;
    const trialEligible = daysWithApp <= 7;
    if (!resolvedPro && !trialEligible) {
      return res.status(403).json({ message: "Pro required for streaming voice" });
    }

    const input = text.trim();
    const cacheKey = ttsCacheKey(input, "elevenlabs-philip");

    // 1. Memory cache — instant
    const memHit = ttsCache.get(cacheKey);
    if (memHit) {
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=604800");
      res.set("X-TTS-Cache", "memory");
      return res.send(memHit);
    }

    // 2. Disk cache — fast, survives restarts
    const diskHit = readDiskCache(cacheKey);
    if (diskHit) {
      ttsCache.set(cacheKey, diskHit);
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=604800");
      res.set("X-TTS-Cache", "disk");
      return res.send(diskHit);
    }

    // 3. ElevenLabs stream (or OpenAI blob fallback if ElevenLabs key not set)
    try {
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "no-store");
      res.set("X-TTS-Cache", "miss");

      let fullBuffer: Buffer;
      if (process.env.ELEVENLABS_API_KEY) {
        fullBuffer = await streamElevenLabsTTSToResponse(input, res);
      } else {
        // Fallback — OpenAI blob (no streaming, but avoids silent failure)
        const speech = await openaiTTS.audio.speech.create({
          model: "tts-1", voice: "onyx", input: input.slice(0, 4096),
        });
        fullBuffer = Buffer.from(await speech.arrayBuffer());
        if (!res.writableEnded) res.write(fullBuffer);
      }

      // Save to both caches for future requests (instant replay)
      if (ttsCache.size >= MAX_TTS_CACHE) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, fullBuffer);
      writeDiskCache(cacheKey, fullBuffer);

      if (!res.writableEnded) res.end();
    } catch (err: any) {
      console.error("TTS stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "TTS stream failed" });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  // Sermon transcription — audio → Whisper transcript → AI summary
  const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
  app.post("/api/transcribe", audioUpload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No audio file provided" });
    const sessionId = (req.body as { sessionId?: string })?.sessionId;
    const isPro = parseProFlag((req.body as { isPro?: boolean })?.isPro);
    const transcribeGuard = checkFeatureBudget(sessionId, "transcribe", isPro);
    if (!transcribeGuard.ok) {
      return res.status(transcribeGuard.status).json({ message: transcribeGuard.message, code: transcribeGuard.code });
    }
    try {
      const audioFile = new File([req.file.buffer], req.file.originalname || "sermon.webm", {
        type: req.file.mimetype || "audio/webm",
      });
      const transcription = await openaiTTS.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      if (!transcription.text?.trim()) {
        return res.json({ transcript: "", title: "Sermon Notes", keyPoints: [], scriptures: [], application: "" });
      }
      const summaryRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You summarize sermons. Respond with valid JSON only, no markdown." },
          {
            role: "user",
            content: `Analyze this sermon transcript and respond with JSON containing:
- "title": suggested sermon title (4-8 words)
- "keyPoints": array of 3-5 key points (each 1-2 sentences)
- "scriptures": array of scripture references mentioned (e.g. ["John 3:16", "Psalm 23"])
- "application": one sentence of personal application for the listener

Transcript:
${transcription.text.slice(0, 8000)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      let summary: { title?: string; keyPoints?: string[]; scriptures?: string[]; application?: string } = {};
      try { summary = JSON.parse(summaryRes.choices[0].message.content ?? "{}"); } catch { }
      res.json({
        transcript: transcription.text,
        title: summary.title ?? "Sermon Notes",
        keyPoints: summary.keyPoints ?? [],
        scriptures: summary.scriptures ?? [],
        application: summary.application ?? "",
      });
    } catch (err: any) {
      console.error("Transcription error:", err);
      res.status(500).json({ message: "Transcription failed. Please try again." });
    }
  });

  // ── Sermon Mode ──────────────────────────────────────────────────────────────
  // POST /api/sermon/chunk — fast scripture detection from a live audio chunk
  const sermonChunkUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  app.post("/api/sermon/chunk", sermonChunkUpload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No audio provided" });
    const sessionId = (req.body as { sessionId?: string })?.sessionId;
    const isPro = parseProFlag((req.body as { isPro?: boolean })?.isPro);
    const chunkGuard = checkFeatureBudget(sessionId, "sermon-chunk", isPro);
    if (!chunkGuard.ok) {
      return res.status(chunkGuard.status).json({ message: chunkGuard.message, code: chunkGuard.code });
    }
    try {
      const audioFile = new File([req.file.buffer], req.file.originalname || "chunk.m4a", {
        type: req.file.mimetype || "audio/mp4",
      });
      const transcription = await openaiTTS.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      const text = transcription.text?.trim() || "";
      if (!text) return res.json({ text: "", scriptures: [] });
      const scriptureRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You extract Bible scripture references from text. Respond with valid JSON only." },
          {
            role: "user",
            content: `Extract all Bible scripture references from this text. Return JSON with a single key "scriptures" containing an array of strings like ["John 3:16", "Psalm 23:1"]. If none, return {"scriptures":[]}.\n\nText: ${text}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 200,
      });
      let scriptures: string[] = [];
      try {
        const parsed = JSON.parse(scriptureRes.choices[0].message.content ?? "{}");
        scriptures = Array.isArray(parsed.scriptures) ? parsed.scriptures : [];
      } catch { }
      res.json({ text, scriptures });
    } catch (err: any) {
      console.error("Sermon chunk error:", err);
      res.status(500).json({ message: "Chunk processing failed" });
    }
  });

  // POST /api/sermon/sessions — save a completed sermon session
  app.post("/api/sermon/sessions", async (req, res) => {
    const { sessionId, title, scriptures, transcript, keyPoints, application, durationSeconds } = req.body;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const { sermonSessions } = await import("@workspace/db");
      const [session] = await db.insert(sermonSessions).values({
        sessionId,
        title: title || "Untitled Sermon",
        scriptures: scriptures || [],
        transcript: transcript || null,
        keyPoints: keyPoints || [],
        application: application || null,
        durationSeconds: durationSeconds || null,
        endedAt: new Date(),
      }).returning();
      res.json(session);
    } catch (err: any) {
      console.error("Save sermon session error:", err);
      res.status(500).json({ message: "Failed to save sermon session" });
    }
  });

  // GET /api/sermon/sessions — get sessions for a user (last 3 for free, all for Pro implied by caller)
  app.get("/api/sermon/sessions", async (req, res) => {
    const { sessionId, limit } = req.query;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const { sermonSessions } = await import("@workspace/db");
      const { desc, eq } = await import("drizzle-orm");
      const maxResults = limit ? Math.min(parseInt(limit as string), 50) : 50;
      const sessions = await db.select({
        id: sermonSessions.id,
        title: sermonSessions.title,
        startedAt: sermonSessions.startedAt,
        endedAt: sermonSessions.endedAt,
        scriptures: sermonSessions.scriptures,
        durationSeconds: sermonSessions.durationSeconds,
      })
        .from(sermonSessions)
        .where(eq(sermonSessions.sessionId, sessionId as string))
        .orderBy(desc(sermonSessions.startedAt))
        .limit(maxResults);
      res.json(sessions);
    } catch (err: any) {
      console.error("Fetch sermon sessions error:", err);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // GET /api/sermon/sessions/:id — get full detail for a single session
  app.get("/api/sermon/sessions/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    try {
      const { sermonSessions } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      const [session] = await db.select().from(sermonSessions).where(eq(sermonSessions.id, id)).limit(1);
      if (!session) return res.status(404).json({ message: "Not found" });
      res.json(session);
    } catch (err: any) {
      console.error("Fetch sermon session error:", err);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // POST /api/sermon/sessions/:id/summarize — Pro: generate AI summary for a saved session
  app.post("/api/sermon/sessions/:id/summarize", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    try {
      const { sermonSessions } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      const [session] = await db.select().from(sermonSessions).where(eq(sermonSessions.id, id)).limit(1);
      if (!session) return res.status(404).json({ message: "Not found" });
      if (!session.transcript) return res.status(400).json({ message: "No transcript to summarize" });
      const summaryRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You summarize sermons. Respond with valid JSON only, no markdown." },
          {
            role: "user",
            content: `Analyze this sermon transcript and respond with JSON containing:
- "title": suggested sermon title (4-8 words)
- "keyPoints": array of 3-5 key points (each 1-2 sentences)
- "scriptures": array of scripture references mentioned
- "application": one sentence of personal application for the listener

Transcript:
${session.transcript.slice(0, 8000)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      let summary: { title?: string; keyPoints?: string[]; scriptures?: string[]; application?: string } = {};
      try { summary = JSON.parse(summaryRes.choices[0].message.content ?? "{}"); } catch { }
      const [updated] = await db.update(sermonSessions).set({
        title: summary.title || session.title,
        keyPoints: summary.keyPoints || [],
        scriptures: [...new Set([...session.scriptures, ...(summary.scriptures || [])])],
        application: summary.application || null,
      }).where(eq(sermonSessions.id, id)).returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Summarize sermon error:", err);
      res.status(500).json({ message: "Summarization failed" });
    }
  });

  // POST /api/sermon/ask — Pro: ask a question about a sermon session
  app.post("/api/sermon/ask", async (req, res) => {
    const { sessionId: sessionDbId, question } = req.body;
    if (!sessionDbId || !question) return res.status(400).json({ message: "sessionId and question required" });
    try {
      const { sermonSessions } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      const [session] = await db.select().from(sermonSessions).where(eq(sermonSessions.id, parseInt(sessionDbId))).limit(1);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const context = session.transcript
        ? `Full transcript:\n${session.transcript.slice(0, 6000)}`
        : `Scriptures mentioned: ${session.scriptures.join(", ")}\nKey points: ${session.keyPoints.join("; ")}`;
      const askRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant answering questions about a church sermon. Be concise, faithful to the text, and spiritually encouraging. Keep answers to 2-4 sentences.",
          },
          { role: "user", content: `${context}\n\nQuestion: ${question}` },
        ],
        temperature: 0.4,
        max_tokens: 300,
      });
      res.json({ answer: askRes.choices[0].message.content || "" });
    } catch (err: any) {
      console.error("Sermon ask error:", err);
      res.status(500).json({ message: "Failed to answer question" });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Prayer Mode ───────────────────────────────────────────────────────────────
  // POST /api/prayer/chunk — transcribe audio chunk + extract prayer themes
  const prayerChunkUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  app.post("/api/prayer/chunk", prayerChunkUpload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No audio provided" });
    try {
      const audioFile = new File([req.file.buffer], req.file.originalname || "chunk.m4a", {
        type: req.file.mimetype || "audio/mp4",
      });
      const transcription = await openaiTTS.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      const text = transcription.text?.trim() || "";
      if (!text) return res.json({ text: "", themes: [] });
      const themeRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You identify spiritual and emotional themes in prayers. Respond with valid JSON only." },
          {
            role: "user",
            content: `Extract the main spiritual/emotional themes from this prayer text. Return JSON with a single key "themes" containing an array of 1-4 concise theme words (e.g., ["healing", "peace", "guidance", "gratitude"]). Focus on what the person is bringing to God.\n\nPrayer: ${text}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 100,
      });
      let themes: string[] = [];
      try {
        const parsed = JSON.parse(themeRes.choices[0].message.content ?? "{}");
        themes = Array.isArray(parsed.themes) ? parsed.themes : [];
      } catch { }
      res.json({ text, themes });
    } catch (err: any) {
      console.error("Prayer chunk error:", err);
      res.status(500).json({ message: "Prayer chunk processing failed" });
    }
  });

  // POST /api/prayer/sessions — save a completed prayer with AI reflection
  app.post("/api/prayer/sessions", async (req, res) => {
    const { sessionId, transcript, themes = [], durationSeconds } = req.body;
    if (!sessionId || !transcript) return res.status(400).json({ message: "sessionId and transcript required" });
    try {
      const { prayerRecordings } = await import("@workspace/db");
      // Generate AI reflection + scripture
      const reflectionRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a compassionate spiritual companion who reflects back what someone prayed. Respond with valid JSON only, no markdown.",
          },
          {
            role: "user",
            content: `This person just prayed aloud. Gently reflect it back to them. Respond with JSON containing:
- "title": a 3-6 word title for this prayer (e.g., "Prayer for Family Healing")
- "themes": array of 2-4 spiritual/emotional theme words
- "scriptureRef": one Bible verse reference most relevant to this prayer (e.g., "Philippians 4:6-7")
- "scriptureText": the text of that verse (ESV or NIV, brief)
- "reflection": 2-3 warm, affirming sentences reflecting what they brought to God. Start with "God heard..." or "You brought..." — never preachy, always gentle.

Prayer transcript:
${transcript.slice(0, 3000)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });
      let reflection: {
        title?: string; themes?: string[]; scriptureRef?: string; scriptureText?: string; reflection?: string;
      } = {};
      try { reflection = JSON.parse(reflectionRes.choices[0].message.content ?? "{}"); } catch { }

      const [record] = await db.insert(prayerRecordings).values({
        sessionId,
        title: reflection.title || "Prayer",
        themes: reflection.themes || themes,
        scriptureRef: reflection.scriptureRef || null,
        scriptureText: reflection.scriptureText || null,
        reflection: reflection.reflection || null,
        transcript,
        durationSeconds: durationSeconds || null,
      }).returning();
      res.json(record);
    } catch (err: any) {
      console.error("Save prayer error:", err);
      res.status(500).json({ message: "Failed to save prayer" });
    }
  });

  // GET /api/prayer/sessions — get prayer history for a user
  app.get("/api/prayer/sessions", async (req, res) => {
    const { sessionId, limit } = req.query;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const { prayerRecordings } = await import("@workspace/db");
      const { desc, eq } = await import("drizzle-orm");
      const maxResults = limit ? Math.min(parseInt(limit as string), 50) : 50;
      const records = await db.select({
        id: prayerRecordings.id,
        title: prayerRecordings.title,
        themes: prayerRecordings.themes,
        scriptureRef: prayerRecordings.scriptureRef,
        scriptureText: prayerRecordings.scriptureText,
        reflection: prayerRecordings.reflection,
        transcript: prayerRecordings.transcript,
        durationSeconds: prayerRecordings.durationSeconds,
        prayedAt: prayerRecordings.prayedAt,
      })
        .from(prayerRecordings)
        .where(eq(prayerRecordings.sessionId, sessionId as string))
        .orderBy(desc(prayerRecordings.prayedAt))
        .limit(maxResults);
      res.json(records);
    } catch (err: any) {
      console.error("Fetch prayer sessions error:", err);
      res.status(500).json({ message: "Failed to fetch prayers" });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────────

  // Push notification VAPID public key
  app.get("/api/push/vapid-key", (_req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || "";
    const configured = !!(publicKey && process.env.VAPID_PRIVATE_KEY?.trim());
    res.json({ publicKey: configured ? publicKey : "", configured });
  });

  // Subscribe or update push subscription
  app.post("/api/push/subscribe", async (req, res) => {
    const body = req.body as {
      sessionId: string;
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
      timezone?: string;
      morningEnabled?: boolean;
      morningTime?: string;
      eveningEnabled?: boolean;
      eveningTime?: string;
      middayEnabled?: boolean;
      streakReminder?: boolean;
      weeklySummary?: boolean;
    };
    const { sessionId, subscription } = body;
    if (!sessionId || !subscription?.endpoint) return res.status(400).json({ message: "invalid" });
    try {
      const timezone = body.timezone?.trim() || "America/New_York";
      const row = await storage.upsertPushSubscription({
        sessionId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        timezone,
        ...(body.morningEnabled !== undefined ? { morningEnabled: body.morningEnabled } : {}),
        ...(body.morningTime !== undefined ? { morningTime: body.morningTime } : {}),
        ...(body.eveningEnabled !== undefined ? { eveningEnabled: body.eveningEnabled } : {}),
        ...(body.eveningTime !== undefined ? { eveningTime: body.eveningTime } : {}),
        ...(body.middayEnabled !== undefined ? { middayEnabled: body.middayEnabled } : {}),
        ...(body.streakReminder !== undefined ? { streakReminder: body.streakReminder } : {}),
        ...(body.weeklySummary !== undefined ? { weeklySummary: body.weeklySummary } : {}),
      });

      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || "mailto:admin@shepherdspathAI.com",
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } },
          JSON.stringify({ title: "A quiet place is here.", body: "Whenever you're ready, there's a moment waiting for you.", tag: "welcome", url: "/devotional" })
        ).catch(() => { });
      }

      res.json(row);
    } catch (err: any) {
      console.error("[push] subscribe error:", err);
      res.status(500).json({ message: "subscribe failed" });
    }
  });

  // Get current push settings for a session
  app.get("/api/push/settings/:sessionId", async (req, res) => {
    try {
      const sub = await storage.getPushSubscription(req.params.sessionId);
      if (!sub) return res.status(404).json({ message: "not found" });
      res.json(sub);
    } catch (err) {
      console.error("[push] get settings error:", err);
      res.status(500).json({ message: "Could not load push settings" });
    }
  });

  // Update push notification settings
  app.patch("/api/push/settings", async (req, res) => {
    const { sessionId, ...settings } = req.body as {
      sessionId: string;
      morningEnabled?: boolean; morningTime?: string;
      eveningEnabled?: boolean; eveningTime?: string;
      middayEnabled?: boolean; streakReminder?: boolean; weeklySummary?: boolean;
      timezone?: string;
    };
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      await storage.updatePushSettings(sessionId, settings);
      res.json({ ok: true });
    } catch (err) {
      console.error("[push] update settings error:", err);
      res.status(500).json({ message: "Could not update push settings" });
    }
  });

  // Unsubscribe push
  app.delete("/api/push/subscribe/:sessionId", async (req, res) => {
    try {
      await storage.deletePushSubscription(req.params.sessionId);
      res.json({ ok: true });
    } catch (err) {
      console.error("[push] delete subscription error:", err);
      res.status(500).json({ message: "Could not remove push subscription" });
    }
  });

  // Register Expo push token for mobile daily verse notifications
  app.post("/api/expo-push-token", async (req, res) => {
    const { sessionId, token, hour, minute } = req.body as {
      sessionId: string;
      token: string;
      hour: number;
      minute: number;
    };
    if (!sessionId || !token || hour === undefined || minute === undefined) {
      return res.status(400).json({ message: "sessionId, token, hour, and minute are required" });
    }
    const h = Number(hour);
    const m = Number(minute);
    if (!Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(m) || m < 0 || m > 59) {
      return res.status(400).json({ message: "hour must be 0–23 and minute must be 0–59" });
    }
    try {
      const row = await storage.upsertExpoPushToken(sessionId, token, h, m);
      res.json({ ok: true, id: row.id });
    } catch (err) {
      console.error("[expo-push] register token error:", err);
      res.status(500).json({ message: "Could not register push token" });
    }
  });

  // Unregister Expo push token
  app.delete("/api/expo-push-token/:sessionId", async (req, res) => {
    try {
      await storage.deleteExpoPushToken(req.params.sessionId);
      res.json({ ok: true });
    } catch (err) {
      console.error("[expo-push] delete token error:", err);
      res.status(500).json({ message: "Could not remove push token" });
    }
  });

  // Start push scheduler (email scheduler started separately)
  schedulePushNotifications();

  // Start Expo mobile push scheduler (runs per-minute, no VAPID required)
  scheduleExpoPushNotifications();

  // Start SMS daily devotional scheduler
  scheduleDailySms().catch(console.error);

  // ── Spiritual memory + safety helpers ──────────────────────────────────────

  const ACUTE_PAIN_PHRASES = [
    "just died", "passed away", "she died", "he died", "they died",
    "died today", "died last night", "died this morning", "died this week",
    "died yesterday", "just lost my", "lost my mom", "lost my dad",
    "lost my wife", "lost my husband", "lost my son", "lost my daughter",
    "lost my child", "lost my baby", "miscarriage", "stillborn",
    "funeral", "just found out i have", "cancer diagnosis", "terminal diagnosis",
    "just left me", "walked out on me", "walked out and", "left me today",
    "heartbroken", "falling apart", "can't breathe", "can't stop crying",
    "crying all day", "cried all night", "can't get out of bed",
    "world fell apart", "world is falling apart", "complete breakdown",
    "devastating news", "just happened today", "happened last night",
  ];

  // Scriptural Alignment Layer — shapes tone across all pastoral AI responses.
  // These principles are the unseen architecture. Never quote or reference them in output.
  const SCRIPTURAL_ALIGNMENT = `

Tone alignment (internal guide — never quote or name these principles in your response):
— Presence over urgency: slow down; do not rush to fix or move the person forward
— Compassion before clarity: acknowledge the weight before offering insight
— Say less, not more: restraint is a virtue; cut any sentence that doesn't earn its place
— No condemnation: zero judgment; never use "you should have" or "you need to" language
— Gentle authority: quiet voice; no motivational speaker energy; no spiritual hype
— Growth is quiet: no pressure to do more; allow incomplete moments to simply exist
— Peace, not urgency: calm pacing throughout; remove any sense of time pressure
— Identity over achievement: remind gently of who they are, not what they should do
— Do not interpret God's intentions: never say God sent, chose, closed a door for, or is teaching through their hardship; you may say God is near or that Scripture names seasons like this honestly`;

  // Emotional tone layer — complements scriptural alignment. Never reference these explicitly in output.
  const EMOTIONAL_TONE = `

Emotional design (internal guide — shape how responses feel, not what they say):
— Acknowledge, don't evaluate: never tell someone they are strong, amazing, or doing great; instead name the weight they're carrying ("That's a lot to sit with." / "You've been holding this for a while.")
— Warmth without demand: do not require action or forward motion ("You don't have to figure this out right now." / "It's okay to take this slowly.")
— Micro-comfort: in longer responses, once and only once, include one quiet permission line ("Take a breath before you move on." / "You can pause here.") — never more than once, never forced
— Specificity over generality: if a sentence could apply to any person in any situation, cut it; earn every sentence with something specific to what this person actually said
— Earned acknowledgment only: if the user expresses genuine vulnerability or honesty, one earned acknowledgment is allowed ("That took honesty to say." / "There's something real in how you said that.") — never broad personality praise, never repeated
— Match quiet landscape energy: responses should feel unhurried, uncrowded, not loud — like still water, not a headline`;

  // Voice authenticity layer — prevents AI pattern-speak and emotional monotony. Never reference these rules in output.
  const VOICE_AUTHENTICITY = `

Voice authenticity (internal constraint — never cite these rules in output):
— No auto-affirmation openers: never begin a response or a sentiment with "That makes sense," "I'm really glad you shared that," "That sounds really hard," or "You're not alone" — these are script patterns; if the meaning is genuine and earned, find language specific to this exact moment
— Never say "You've got this," "God has a plan for you," or "Everything happens for a reason" — these are clichés that flatten real pain into a formula and reduce God to a motivational concept
— No filler soft-starts: do not open with "It sounds like…", "Maybe…", "I wonder if…", or "Perhaps…" — these add distance; start closer to the truth
— Default is honesty, not kindness: kindness is present but not performed; default to clarity and emotional accuracy before warmth
— Permission to be direct: if something is clear in what the person shared, say it plainly — "You already know what this is — you're just hesitating" is more useful than "You might be feeling some uncertainty about this"
— Vary the structure: do not default to empathy → insight → scripture → prayer; sometimes one true observation is the whole response; sometimes a single question; sometimes two sentences and nothing more
— Restraint is a response: when something heavy or clear is expressed, do not over-explain, do not provide multiple takeaways, do not summarize — reflect one true thing and leave space
— Failure test: if the response sounds like a therapy script, feels emotionally repetitive, or could apply to any person in any situation — it has failed; cut it down or rewrite it
— Success test: the response should feel like someone who actually listened and didn't feel the need to smooth everything over — real, grounded, slightly unexpected but true`;

  function isAcutePain(text: string): boolean {
    const lower = text.toLowerCase();
    return ACUTE_PAIN_PHRASES.some(p => lower.includes(p));
  }

  function writeSafetyBlock(res: express.Response, level: string, text: string): void {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(SAFETY_HEADER, level);
    res.write(text);
    res.end();
  }

  // ── Session context cache — 10-minute TTL, avoids re-fetching unchanged data on every turn ──
  interface SessionCtxEntry {
    journalContext: { context: string; count: number };
    recentEcho: string;
    savedVerses: string;
    userMemCtx: Awaited<ReturnType<typeof getMemoryContext>>;
    cachedAt: number;
  }
  const SESSION_CTX_CACHE = new Map<string, SessionCtxEntry>();
  const SESSION_CTX_TTL = 10 * 60 * 1000; // 10 minutes

  async function getOrFetchSessionContext(sessionId: string): Promise<SessionCtxEntry> {
    const cached = SESSION_CTX_CACHE.get(sessionId);
    if (cached && Date.now() - cached.cachedAt < SESSION_CTX_TTL) return cached;
    const [journalContext, recentEcho, savedVerses, userMemCtx] = await Promise.all([
      getJournalContext(sessionId),
      getRecentJournalEcho(sessionId),
      getMemoryVerseNote(sessionId),
      getMemoryContext(sessionId),
    ]);
    const entry: SessionCtxEntry = { journalContext, recentEcho, savedVerses, userMemCtx, cachedAt: Date.now() };
    SESSION_CTX_CACHE.set(sessionId, entry);
    return entry;
  }

  async function getJournalContext(sessionId: string): Promise<{ context: string; count: number }> {
    if (!sessionId) return { context: "", count: 0 };
    try {
      const entries = await storage.getJournalEntries(sessionId);
      if (!entries || entries.length === 0) return { context: "", count: 0 };
      const memories = entries.filter(e => e.type === "guidance_memory").slice(0, 3);
      const visible = entries.filter(e => e.type !== "guidance_memory").slice(0, 5);
      const allContext = [...memories, ...visible];
      const context = allContext.map(e => {
        const label = e.type === "guidance_memory" ? "Previous conversation" : e.type === "prayer" ? "Prayer" : e.type === "reflection" ? "Reflection" : e.type === "verse" ? "Scripture" : "Note";
        const body = e.type === "guidance_memory" ? parseGuidanceMemoryContent(e.content).summary : e.content;
        const snippet = body.replace(/\n+/g, " ").slice(0, 220);
        return `[${label}${e.title ? ` — ${e.title}` : ""}]: ${snippet}`;
      }).join("\n");
      return { context, count: entries.filter(e => e.type !== "guidance_memory").length };
    } catch { return { context: "", count: 0 }; }
  }

  /** Optional devotional continuity — never includes guidance_memory; max 48h. */
  async function getDevotionalContinuityEcho(sessionId: string): Promise<string> {
    if (!sessionId) return "";
    try {
      const entries = await storage.getJournalEntries(sessionId);
      if (!entries || entries.length === 0) return "";
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      const recent = entries
        .filter(
          (e) =>
            e.type !== "guidance_memory" &&
            new Date(e.createdAt).getTime() > cutoff,
        )
        .slice(0, 3);
      if (recent.length === 0) return "";
      return recent
        .map((e) => {
          const dayLabel = (() => {
            const diffDays = Math.floor(
              (Date.now() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24),
            );
            if (diffDays === 0) return "today";
            if (diffDays === 1) return "yesterday";
            return `${diffDays} days ago`;
          })();
          const label =
            e.type === "prayer" ? "Prayer" : e.type === "reflection" ? "Reflection" : "Note";
          const snippet = e.content.replace(/\n+/g, " ").slice(0, 160);
          return `[${label}, written ${dayLabel}${e.title ? ` — ${e.title}` : ""}]: ${snippet}`;
        })
        .join("\n");
    } catch {
      return "";
    }
  }

  // Recent personal journal entries from the last 7 days (reflections, prayers, notes — not AI memories)
  async function getRecentJournalEcho(sessionId: string): Promise<string> {
    if (!sessionId) return "";
    try {
      const entries = await storage.getJournalEntries(sessionId);
      if (!entries || entries.length === 0) return "";
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = entries
        .filter(e =>
          e.type !== "guidance_memory" &&
          new Date(e.createdAt).getTime() > cutoff
        )
        .slice(0, 4);
      if (recent.length === 0) return "";
      const lines = recent.map(e => {
        const dayLabel = (() => {
          const diffDays = Math.floor((Date.now() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) return "today";
          if (diffDays === 1) return "yesterday";
          return `${diffDays} days ago`;
        })();
        const label = e.type === "prayer" ? "Prayer" : e.type === "reflection" ? "Reflection" : "Note";
        const snippet = e.content.replace(/\n+/g, " ").slice(0, 180);
        return `[${label}, written ${dayLabel}${e.title ? ` — ${e.title}` : ""}]: ${snippet}`;
      }).join("\n");
      return lines;
    } catch { return ""; }
  }

  // Memory verses saved by this person
  async function getMemoryVerseNote(sessionId: string): Promise<string> {
    if (!sessionId) return "";
    try {
      const verses = await storage.getMemoryVerses(sessionId);
      if (!verses || verses.length === 0) return "";
      return verses.slice(0, 6).map(v => `${v.reference} — "${v.text.slice(0, 100)}"`).join("\n");
    } catch { return ""; }
  }

  async function streamCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    res: import("express").Response,
    options: { model?: string; maxTokens?: number; temperature?: number; req?: import("express").Request } = {}
  ) {
    const { model = "gpt-4o-mini", maxTokens, temperature } = options;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    try {
      const stream = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) res.write(content);
      }
    } catch (err: any) {
      throw err;
    }
    if (!res.writableEnded) res.end();
  }

  // ── Seed prayer wall with 3 starter entries on first run ──────────────────
  (async () => {
    try {
      const entries = await storage.getPrayerWallEntries();
      const alreadySeeded = entries.some(e => e.sessionId === "sp-shepherd");
      if (alreadySeeded) return;
      const seeds = [
        {
          sessionId: "sp-shepherd",
          displayName: "Maria",
          isAnonymous: false,
          category: "Healing" as const,
          request: "Please pray for my mom — she was just diagnosed with cancer. I'm scared and I keep reminding myself that God is still good, but I need help holding on to that right now.",
        },
        {
          sessionId: "sp-shepherd",
          displayName: "Anonymous Believer",
          isAnonymous: true,
          category: "Loneliness" as const,
          request: "Struggling with loneliness after moving to a new city. I'm trying to trust that God brought me here for a reason. Would appreciate prayers for community and peace.",
        },
        {
          sessionId: "sp-shepherd",
          displayName: "James",
          isAnonymous: false,
          category: "Direction / Decision" as const,
          request: "Job interview tomorrow for a position I really need. Praying for clarity and calm, and that God's will would be done. Thank you for standing with me.",
        },
      ];
      for (const seed of seeds) {
        await storage.createPrayerWallEntry(seed);
      }
      console.log("[seed] Prayer wall seeded with 3 starter entries");
    } catch (err) {
      console.error("[seed] Prayer wall seeding failed:", err);
    }
  })();

  function buildModeNote(mode: string): string {
    if (mode === "coach") {
      return `\n\nTone guidance: This person has intentionally chosen a direct, accountability-focused mode. They want to be called higher, not just comforted. Be warm but honest — challenge them gently where you see avoidance or room for growth. Speak like a faithful coach who believes they are capable of more than they are currently living. Do not soften difficult truths out of politeness, but never be harsh for its own sake. Root everything in grace and scripture. If you sense they are avoiding something, name it clearly but gently.\n\nCritical exception: If this person is expressing clear pain, grief, deep emotional distress, or crisis — set the coach tone aside completely and lead with pastoral presence. Accountability is for the comfortable. Compassion is for the hurting.`;
    }
    return "";
  }

  // ── Holiday / high-observance day detection ──────────────────────────────────
  function getEasterDate(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  }

  function shiftDate(d: Date, days: number): Date {
    const r = new Date(d); r.setDate(r.getDate() + days); return r;
  }

  function getHolidayNote(dateStr?: string): string {
    const date = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
    const year = date.getFullYear();
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    const today = `${m}/${day}`;
    const easter = getEasterDate(year);

    if (today === fmt(easter))
      return `\n\nThis is Easter Sunday — the resurrection of Jesus Christ, the most significant day in the Christian calendar. Do not preach it. Simply let your response carry what this day holds: that death does not have the last word. If the person shares something today, hold it in that light quietly. If they are grieving, the resurrection does not cancel that grief — it simply means something is stronger.`;
    if (today === fmt(shiftDate(easter, -2)))
      return `\n\nFor many, today is Good Friday — the day of the crucifixion. It is a day of solemnity and weight. Do not rush toward resurrection or comfort. Honor the darkness and what it cost. If this person is suffering, do not reach for silver linings. Stay in the weight with them. Grief today is appropriate.`;
    if (today === fmt(shiftDate(easter, -1)))
      return `\n\nFor many, today is Holy Saturday — the silent day between death and resurrection. A day of not-yet. Of waiting without knowing. If this person is in a season of waiting or silence, this day's posture is quietly present in how you respond. Be unhurried. Be still.`;
    if (today === fmt(shiftDate(easter, -7)))
      return `\n\nFor many, today is Palm Sunday — the beginning of Holy Week. A day that holds both welcome and the shadow of what is coming. The crowd celebrated; the cross was days away. If this feels relevant, let it surface naturally without announcement.`;
    if (today === fmt(shiftDate(easter, -46)))
      return `\n\nFor many, today is Ash Wednesday — the beginning of Lent. "Remember that you are dust, and to dust you shall return." A day of honesty about mortality and dependence on God. If the person is in a reflective or humble place, this gravity can quietly inform your response.`;
    if (today === fmt(shiftDate(easter, 49)))
      return `\n\nFor many, today is Pentecost — when the Holy Spirit came upon the disciples. A day about the Spirit's presence in ordinary people living ordinary lives. If the person feels dry or distant from God, this day's meaning is quietly relevant.`;
    if (m === 12 && day === 25)
      return `\n\nFor many, today is Christmas Day — the celebration of God becoming human. A day of joy for many, but also loneliness, grief, and memory for others. Do not assume this day is joyful for this person. Meet them wherever they are. If they are celebrating, be present in that. If they are carrying something heavy today, hold them in it.`;
    if (m === 12 && day === 24)
      return `\n\nFor many, today is Christmas Eve — a day of quiet anticipation. For some, a day that is heavy with loneliness or the memory of people no longer here. Meet the person wherever they are tonight.`;

    // Advent: 4 Sundays before Christmas
    const christmas = new Date(year, 11, 25);
    const adventStart = shiftDate(christmas, -(christmas.getDay() === 0 ? 28 : (christmas.getDay() + 21)));
    if (date >= adventStart && date <= new Date(year, 11, 24))
      return `\n\nFor many, this is the season of Advent — a time of waiting, preparation, and expectant hope. The posture of Advent is active, not passive. If this person is in a season of waiting for something in their own life, this season's meaning may be quietly present.`;

    return "";
  }

  function buildRelationshipNote(daysWithApp: number, entryCount: number): string {
    if (daysWithApp <= 2) {
      return `\n\nRelationship context: This person has been here once or twice. They may be exploring, returning after a long absence, or simply trying. You don't know which — and it doesn't matter. Meet them as if today is the whole story. Keep it simple. Keep it safe. The experience should feel so undemanding that returning tomorrow feels natural. Do not assume belief. Do not assume anything. Just be present, and be the kind of presence that makes someone glad they came.`;
    } else if (daysWithApp <= 7) {
      return `\n\nRelationship context: This person has been coming back for ${daysWithApp} days. Something is beginning to form. Let the reflection carry a slightly warmer sense of familiarity — not forced, not announced, just present. You are still learning who they are. They may not yet know what they're looking for, but they keep returning. That matters. Honor the fact that a small rhythm is taking shape without labeling it or celebrating it.`;
    } else if (daysWithApp <= 14) {
      return `\n\nRelationship context: This person has been walking with the app for ${daysWithApp} days${entryCount > 0 ? ` and has written ${entryCount} journal entries` : ""}. You are still learning who they are. Be attentive to what matters to them and what they carry. Let the relationship develop at their pace. If they seem to be measuring themselves — against who they think they should be, how much they should be praying or growing — quietly refuse to reinforce that. You are not here to evaluate their progress. When the moment is right, gently affirm their own capacity to hear from God — not just through this conversation, but in their own quiet time with scripture and prayer.`;
    } else if (daysWithApp <= 30) {
      return `\n\nRelationship context: This person has walked faithfully for ${daysWithApp} days${entryCount > 0 ? `, writing ${entryCount} journal entries` : ""}. You have real rapport now. Speak with genuine warmth — the warmth of a friend who has been paying attention. If you sense they are carrying pressure about spiritual performance — speak grace into that plainly. And watch for signs that this person is beginning to develop their own voice with God. When they say something that shows they have been sitting with scripture on their own, praying on their own, noticing God in their own life — pause and name it. Not to praise them, but to confirm what is quietly happening: they are learning to walk.`;
    } else {
      return `\n\nRelationship context: This person has been walking alongside this app for ${daysWithApp} days${entryCount > 0 ? `, writing ${entryCount} journal entries` : ""}. You are a trusted companion who has been present across seasons. Speak with the quiet confidence of someone who genuinely knows them. They are not a newcomer. And if they return after a stretch of silence, receive them the way a good friend does — without ceremony.\n\nAt this stage, your role is shifting. Less guide, more fellow traveler. Your deepest act of care now is to point them clearly toward the relationship with Jesus that does not require this app — their own prayer, their own reading, their own capacity to hear God's voice in the ordinary moments of their life. When you sense they are growing into that — celebrate it simply. The training wheels are coming off. That is the whole point.`;
    }
  }

  // ── Devotional reflect-listen — empathy + one question before full reflection ─
  app.post("/api/devotional/reflect-listen", async (req, res) => {
    const { verseText, verseReference, reflectionInput, userName, sessionId } = req.body as {
      verseText?: string;
      verseReference?: string;
      reflectionInput?: string;
      userName?: string;
      sessionId?: string;
    };
    if (!verseText?.trim() || !verseReference?.trim() || !reflectionInput?.trim()) {
      return res.status(400).json({ message: "verseText, verseReference, and reflectionInput required" });
    }
    if (reflectionInput.trim().length > 2000) return res.status(400).json({ message: "Input too long" });

    const daysWithApp: number = Number((req.body as { daysWithApp?: number }).daysWithApp) || 1;
    const isProReflectListen = parseProFlag((req.body as { isPro?: boolean }).isPro);
    const aiGuardReflectListen = checkAiDailyLimit(sessionId, daysWithApp, isProReflectListen);
    if (!aiGuardReflectListen.ok) {
      return res.status(aiGuardReflectListen.status).json({
        message: aiGuardReflectListen.message,
        limitReached: true,
      });
    }
    if (sessionId) {
      storage.logAiUsage({ sessionId, feature: "reflection", daysWithApp, platform: "web" }).catch(() => {});
    }

    const nameNote = userName?.trim()
      ? `\n\nTheir name is ${userName.trim().split(/\s+/)[0]}. You may use it once, gently, only if it feels natural.`
      : "";

    const reflectListenSystem = `You are a quiet, wise presence sitting with someone who just shared what a Bible verse stirred in them. Your only job right now is to:
1. Reflect back what you heard in 1-2 sentences so they feel truly seen
2. Ask ONE question — the single most important thing you'd want to know before responding more fully

Rules:
- Under 80 words total. Hard limit — cut before exceeding it.
- No verse quote, no prayer, no advice, no theology lesson
- Do NOT name their emotion as the first word or phrase
- Do NOT start with 'I', 'It sounds like', or 'That must be'
- Do NOT reframe toward the positive
- Ask something that goes DEEPER into what they shared, not away from it
- Good example: 'What part of that has stayed with you the longest?'
- Good example: 'Is this something you've brought to God before, or does it feel new today?'
- Tone: like a trusted friend leaning in, genuinely curious`;

    const userContent = `The verse today is ${verseReference.trim()}: '${verseText.trim().slice(0, 500)}'. Here is what this person shared: '${reflectionInput.trim().slice(0, 1500)}'`;

    const reflectSafety = scanUserText(reflectionInput.trim());
    if (shouldBlockLlm(reflectSafety)) {
      writeSafetyBlock(res, reflectSafety.level, reflectSafety.response ?? CRISIS_RESPONSE);
      return;
    }

    try {
      await streamCompletion(
        [
          { role: "system", content: `${reflectListenSystem}${nameNote}${SCRIPTURAL_ALIGNMENT}${EMOTIONAL_TONE}${VOICE_AUTHENTICITY}` },
          { role: "user", content: userContent },
        ],
        res,
        { temperature: 0.78, maxTokens: 120, req },
      );
    } catch (err) {
      console.error("devotional reflect-listen error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Failed" });
    }
  });

  // ── Devotional gratitude-listen — acknowledgment + one question before closing prayer ─
  app.post("/api/devotional/gratitude-listen", async (req, res) => {
    const { gratitudeInput, verseReference, userName, sessionId } = req.body as {
      gratitudeInput?: string;
      verseReference?: string;
      userName?: string;
      sessionId?: string;
    };
    if (!gratitudeInput?.trim()) {
      return res.status(400).json({ message: "gratitudeInput required" });
    }
    if (gratitudeInput.trim().length > 2000) return res.status(400).json({ message: "Input too long" });

    const daysWithApp: number = Number((req.body as { daysWithApp?: number }).daysWithApp) || 1;
    const isProGratitudeListen = parseProFlag((req.body as { isPro?: boolean }).isPro);
    const aiGuardGratitudeListen = checkAiDailyLimit(sessionId, daysWithApp, isProGratitudeListen);
    if (!aiGuardGratitudeListen.ok) {
      return res.status(aiGuardGratitudeListen.status).json({
        message: aiGuardGratitudeListen.message,
        limitReached: true,
      });
    }
    if (sessionId) {
      storage.logAiUsage({ sessionId, feature: "prayer", daysWithApp, platform: "web" }).catch(() => {});
    }

    const nameNote = userName?.trim()
      ? `\n\nTheir name is ${userName.trim().split(/\s+/)[0]}. You may use it once, gently, only if it feels natural.`
      : "";

    const gratitudeListenSystem = `You are a quiet, warm presence sitting with someone who just named something they're grateful for. Your only job is:
1. Reflect back what they named in one sentence so they feel it was truly received
2. Ask ONE gentle question that goes deeper into the gift — not broader

Rules:
- Under 70 words total. Hard limit — cut before exceeding it.
- Do NOT restate the gift as a category ('gratitude', 'blessing')
- Use their specific words
- The question should help them feel the gift more fully, not explain it
- Do NOT ask them to list more things they're grateful for
- Tone: warm, unhurried, like a friend leaning in over coffee
- Good example: 'What made today the day that landed?'
- Good example: 'Is this something you've had before, or does it feel new?'`;

    const ref = verseReference?.trim() || "today's verse";
    const userContent = `The verse today is ${ref}. This person named this as their gift today: '${gratitudeInput.trim().slice(0, 1500)}'`;

    const gratitudeSafety = scanUserText(gratitudeInput.trim());
    if (shouldBlockLlm(gratitudeSafety)) {
      writeSafetyBlock(res, gratitudeSafety.level, gratitudeSafety.response ?? CRISIS_RESPONSE);
      return;
    }

    try {
      await streamCompletion(
        [
          { role: "system", content: `${gratitudeListenSystem}${nameNote}${SCRIPTURAL_ALIGNMENT}${EMOTIONAL_TONE}${VOICE_AUTHENTICITY}` },
          { role: "user", content: userContent },
        ],
        res,
        { temperature: 0.78, maxTokens: 100, req },
      );
    } catch (err) {
      console.error("devotional gratitude-listen error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Failed" });
    }
  });

  // ── Generate AI reflection or prayer based on today's verse ───────────────
  app.post(api.ai.generate.path, async (req, res) => {
    try {
      const input = api.ai.generate.input.parse(req.body);
      const verse = await storage.getVerseById(input.verseId);
      const langInstruction2: Record<string, string> = {
        es: " Respond entirely in Spanish (Español).",
        fr: " Respond entirely in French (Français).",
        pt: " Respond entirely in Portuguese (Português).",
      };
      const lang2: string = (req.body as any).lang || "en";
      const langNote2 = langInstruction2[lang2] || "";

      if (!verse) {
        return res.status(404).json({ message: "Verse not found to reflect on." });
      }

      const { sanitizeStoredVerse } = await import("../verseTextSanitize");
      const safeVerse = sanitizeStoredVerse(verse);

      let systemPrompt = "";
      let userPrompt = "";

      const sessionId2: string = (req.body as any).sessionId || "";
      let userName2: string = String((req.body as any).userName || "").trim();
      if (!userName2 && sessionId2) {
        try {
          userName2 = (await storage.getUserProfileName(sessionId2))?.trim() || "";
        } catch {
          /* noop */
        }
      }
      const firstName2 = userName2.split(/\s+/)[0] || "";
      const daysWithApp2: number = Number((req.body as any).daysWithApp) || 1;
      const generateMode: string = (req.body as any).guidanceMode || "encouraging";
      const generateModeNote = buildModeNote(generateMode);
      const nameNote2 = firstName2
        ? ` The reader's first name is ${firstName2}. You must address them as "${firstName2}" exactly once in the first paragraph (for example: "${firstName2}, this verse..." or "...and ${firstName2}, that matters"). Do not skip the name. Do not use it more than once.`
        : "";
      const quickPersonalize = !!(req.body as { quickPersonalize?: boolean }).quickPersonalize;
      const continuityIntent: string = quickPersonalize
        ? "fresh"
        : (req.body as { continuityIntent?: string }).continuityIntent === "continue"
          ? "continue"
          : "fresh";
      const journalCount2 = quickPersonalize
        ? 0
        : (await getJournalContext(sessionId2)).count;
      let memoryNote2 = "";
      if (!quickPersonalize && continuityIntent === "continue" && sessionId2) {
        const echo = await getDevotionalContinuityEcho(sessionId2);
        if (echo) {
          memoryNote2 = `\n\nThe person chose to connect today's devotional to what may still be on their heart. Recent journal only (last 48 hours — never assume older burdens still apply):\n${echo}\n\nHold this lightly: let today's verse lead. Only weave prior context if it truly fits; they may have moved on.`;
        }
      }
      const relationshipNote2 = buildRelationshipNote(daysWithApp2, journalCount2);
      const probeNote = `\n\nApproximately 1 in 4 responses — when it feels genuinely earned, not formulaic — close with a single question. Not a prompt, not a challenge. A real question a caring friend would ask because they are genuinely curious about this person's life. Make it specific to this verse and this moment.`;

      const holidayNote2 = getHolidayNote(verse.date ?? undefined);
      const culturalMomentNote2 = getCulturalMomentNote(verse.date ?? undefined);

      const isLateNight2: boolean = !!(req.body as any).isLateNight;
      const lateNightReflectionNote = isLateNight2
        ? `\n\nNight context: This person opened their devotional in the middle of the night. Let your reflection be a little quieter and more unhurried — like a lamp held steady in a dark room rather than a light switched on. They chose, at this late hour, to spend time in the Word. Honor the quiet act of that. Don't be bright or energizing. Simply be present with them in the stillness.`
        : "";
      const lateNightPrayerNote = isLateNight2
        ? `\n\nNight context: This person is praying in the middle of the night. Let the prayer carry the intimacy of that — the honesty of someone who reached for God in the dark. It might carry exhaustion, searching, or quiet surrender. Let it sound like someone talking to God when the world is asleep and guards are down.`
        : "";

      if (input.type === "reflection") {
        systemPrompt =
          `You are a deeply thoughtful spiritual companion — the kind of trusted friend who has walked with God for years and reads the Bible not as a textbook but as a living letter written to real people in real struggle and real joy.

Write a brief devotional reflection on the provided verse. Two short paragraphs at most — this is read on a phone screen, so every sentence must earn its place.

Begin by holding space for where the person might actually be today — not where they should be. People open this app carrying things: exhaustion, loneliness, doubt, quiet grief, unspoken fear, or just the ordinary weight of a Tuesday. Let the verse meet them there, in that actual place, before it asks anything of them.

Speak from inside the verse, not about it from a distance. Find what is alive in this specific passage for a person living a real life today. Be honest — including about the weight of it, the challenge of it, the comfort in it. Don't soften it or inflate it. Write the way a wise, close friend speaks: natural, unhurried, real.

What you never do:
— Give a bulleted list. Never.
— Use spiritual clichés: "lean into," "unpack," "walk in His truth," "let go and let God," "sit with this." Use real words.
— Use theological jargon: no "justification," "sanctification," "hermeneutics," "eschatological," or similar academic language. If a concept must be named, name it in plain terms.
— Tell the person what they "should" or "must" do. The Spirit does that. You reflect.
— Open with hollow affirmation ("What a beautiful verse!").
— Rush to application. Sometimes a verse needs to land before it is acted on.
— Repeat the verse text — they can already see it.
— Capitalize pronouns (He, Him, His) only when they unmistakably refer to God, Jesus Christ, or the Holy Spirit. Never capitalize "you" or "your" when addressing the reader — those are always lowercase.

When a verse carries the truth of God's love — His pursuit of people, His refusal to let go, His knowledge of each person by name — let that come through fully. Not as a theological point to make, but as something that might actually reach a person who hasn't felt loved or seen in a long time. Let it land before asking anything of them.

When a verse speaks to human worth, dignity, or being known — being formed, being named, being chosen — let it reach the person who may have spent years being told, by experience or by people, that they don't measure up. The most powerful thing a reflection can do is help someone see themselves the way God sees them, even for a moment.

When a verse carries hope in the middle of darkness — not easy comfort, but the kind that has earned the right to speak — write it for the person who genuinely cannot see how things could be different. The steadiness of biblical hope is not pretending the darkness isn't real. It is knowing something the darkness doesn't.

Purpose of this reflection: You are not the destination. The Word is. This reflection exists to help a person hear scripture as a living thing spoken to them — and then to meet Jesus in it themselves. When you write well, a person does not think about the reflection. They think about God. Aim for that.${nameNote2}${relationshipNote2}${memoryNote2}${probeNote}${generateModeNote}${lateNightReflectionNote}${holidayNote2}${culturalMomentNote2}${daysWithApp2 <= 3 ? `\n\nSeeker safety — some people reading this reflection may not be sure what they believe. They may be curious, doubting, or simply in pain and reaching for something. This text is for all of them. Do not assume settled faith. Let the verse be what it is — something that speaks to a human life — and trust that it can do its own work. You do not need to assert what someone should believe. Simply show what is here: what this text says, and why it might matter to a person living a real life today.` : ""}${daysWithApp2 >= 30 ? `\n\nDepth note — this person has walked with this daily practice for ${daysWithApp2} days. The structure is familiar to them — that familiarity is part of the value, not a problem to solve. Do not add novelty or surprise. Instead, go deeper. Trust them with the harder angle on this scripture — the interpretation that requires more. The less obvious entry point. They don't need to be eased in anymore.` : ""}${SCRIPTURAL_ALIGNMENT}${EMOTIONAL_TONE}${VOICE_AUTHENTICITY}${langNote2}`;
        userPrompt = `Write a brief reflection on: ${safeVerse.reference} - "${safeVerse.text}"`;
        if (safeVerse.reflectionPrompt) {
          userPrompt += `\n\nReflection prompt to guide you: ${safeVerse.reflectionPrompt}`;
        }
        const reflectionInput = (req.body as { reflectionInput?: string }).reflectionInput?.trim() || "";
        const reflectListenReply = (req.body as { reflectListenReply?: string }).reflectListenReply?.trim() || "";
        if (reflectionInput) {
          userPrompt += `\n\nWhat this person shared about the verse:\n"${reflectionInput.slice(0, 1500)}"`;
        }
        if (reflectListenReply) {
          userPrompt += `\n\nWhen I asked them to share more, they added: '${reflectListenReply.slice(0, 800)}'`;
        }
      } else if (input.type === "prayer") {
        const reflCtx: string = (req.body as { reflectionContext?: string }).reflectionContext?.trim() || "";
        const userReflectionReply = (req.body as { userReflectionReply?: string }).userReflectionReply?.trim() || "";
        const userReplyPrayerNote = userReflectionReply
          ? `

CRITICAL — OPENING RULE:
This person, in their own words, said: "${userReflectionReply.slice(0, 800)}"
The prayer MUST open with that exact thing — not a category, not a 
paraphrase, not a reference to the time of day.
First sentence example: "Lord, Brian carries a real desire to love 
others better — that longing is the first thing he brings to You."
Do NOT open with "I come before You", "in this quiet hour", 
"Heavenly Father we gather", or any time-of-day reference.
The opening must use what they said in their own words.`
          : "";
        const reflectionContextPrayerNote = reflCtx
          ? `\n\nThe person just told you what feels like a gift today: that detail is in the reflection context. Open the prayer with that specific thing — not a category ('gratitude', 'love') but the actual thing they named.

NOT: 'Lord, thank You for the gifts in my life'
YES: 'Lord, [the specific thing they wrote]...'

If they wrote something small or simple, that is perfect. Small specifics make the most honest prayers. Do not upgrade or spiritualize what they said. Use their words.`
          : "";
        systemPrompt =
          `You are a deeply thoughtful spiritual companion writing a prayer on behalf of the person who will pray these words today.

A good prayer sounds like someone actually talking to God — not reciting. Write in first person so the person can pray it as their own. Be specific to this verse. Carry the emotional weight of what this scripture actually says. It might hold honesty, longing, gratitude, surrender, or confession — follow where the verse leads.

Keep it brief: 3 to 6 sentences of real prayer. This is not a sermon wrapped in "Amen."

If the person's journal reveals specific burdens or themes, weave them in naturally — but only if it flows; never force it.

What you never do:
— Use filler phrases: "We just ask," "Lord we just," "Father God," "Thank You for this beautiful day."
— Never open with 'Lord, thank You for this beautiful day'
— Never open with 'Heavenly Father, we come before You'
— Open with the specific gift they named (when reflection context is provided) or the specific weight of today's verse
— Write something generic enough to work for any verse. This prayer belongs to this text, this moment, this person.
— Preach inside the prayer.

Pronoun capitalization: When addressing God directly in prayer, capitalize You, Your, Yours, He, Him, His. When referring to the person praying, use lowercase (their, they, them).

When the verse or the person's situation touches on loneliness, rejection, feeling worthless, forgotten, or beyond love's reach — let the prayer carry the full honest weight of God's unconditional love for this specific person. Not as a cliché. As a real truth spoken directly to God on their behalf — that they are known, that they are held, that nothing can separate them from a love that will not let them go.

Begin with "Lord," or "Heavenly Father," and close with "Amen."

One more thing: write this prayer so it feels like a beginning — not a finished, polished product. Real prayers are rarely tidy. Leave a slight sense of something still being said. Do not wrap it up too completely. A good prayer opens a door; it does not close one.${userReplyPrayerNote}${reflectionContextPrayerNote}${nameNote2}${relationshipNote2}${memoryNote2}${generateModeNote}${lateNightPrayerNote}${holidayNote2}${culturalMomentNote2}${SCRIPTURAL_ALIGNMENT}${EMOTIONAL_TONE}${VOICE_AUTHENTICITY}${langNote2}`;
        userPrompt = reflCtx
          ? `Please write a prayer based on this verse: ${safeVerse.reference} - "${safeVerse.text}"\n\nThe person has just read this reflection on the verse:\n"${reflCtx}"\n\nLet the prayer emerge from the same emotional space as that reflection — the same honest place it landed on. Don't reference the reflection directly; let its spirit inform the prayer.`
          : `Please write a prayer based on this verse: ${safeVerse.reference} - "${safeVerse.text}"`;
      }

      const isProGen = parseProFlag((req.body as { isPro?: boolean }).isPro);
      const reflectionInputForGuard = (req.body as { reflectionInput?: string }).reflectionInput?.trim() || "";
      const reflectListenReplyForGuard = (req.body as { reflectListenReply?: string }).reflectListenReply?.trim() || "";
      const isReflectListenCompletion =
        input.type === "reflection" && !!(reflectionInputForGuard && reflectListenReplyForGuard);

      if (isReflectListenCompletion) {
        if (!sessionId2) {
          return res.status(400).json({ message: "session required", limitReached: true });
        }
        const cap = aiDailyCap(daysWithApp2, isProGen);
        if (getDailyUsageCount(sessionId2) > cap) {
          return res.status(429).json({
            message: isProGen
              ? "You've had a very full day of reflection. Pick up tomorrow — we're still here."
              : "You've had a full day of reflection. Rest with what you've received — or continue with Pro.",
            limitReached: true,
          });
        }
      } else {
        const aiGuardGen = checkAiDailyLimit(sessionId2, daysWithApp2, isProGen);
        if (!aiGuardGen.ok) {
          return res.status(aiGuardGen.status).json({
            message: aiGuardGen.message,
            limitReached: true,
          });
        }
        if (sessionId2) {
          storage.logAiUsage({
            sessionId: sessionId2,
            feature: input.type === "reflection" ? "reflection" : "prayer",
            daysWithApp: daysWithApp2,
            platform: "web",
          }).catch(() => {});
        }
      }

      const maxTokens =
        input.type === "prayer"
          ? 180
          : quickPersonalize
            ? 380
            : undefined;

      const {
        buildDevotionalFallbackPrayer,
        buildDevotionalFallbackReflection,
        isOpenAIFailure,
        writePlainTextResponse,
      } = await import("../devotionalFallback");

      const serveDevotionalFallback = () => {
        const reflCtx: string = (req.body as { reflectionContext?: string }).reflectionContext || "";
        const content =
          input.type === "reflection"
            ? buildDevotionalFallbackReflection(safeVerse, firstName2)
            : buildDevotionalFallbackPrayer(safeVerse, reflCtx, firstName2);
        writePlainTextResponse(res, content);
      };

      if (
        process.env.NODE_ENV === "development" &&
        process.env.DEVOTIONAL_FORCE_FALLBACK === "1"
      ) {
        serveDevotionalFallback();
        return;
      }

      try {
        await streamCompletion(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          res,
          { maxTokens },
        );
      } catch (streamErr) {
        if (!res.headersSent && isOpenAIFailure(streamErr)) {
          console.warn("[devotional] OpenAI unavailable — serving pre-written fallback", {
            type: input.type,
            code: (streamErr as { code?: string })?.code,
          });
          serveDevotionalFallback();
          return;
        }
        throw streamErr;
      }
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Follow-up chat endpoint — maintains full conversation context anchored to the verse
  app.post(api.ai.chat.path, async (req, res) => {
    try {
      const input = chatRequestSchema.parse(req.body);
      const verse = await storage.getVerseById(input.verseId);

      if (!verse) {
        return res.status(404).json({ message: "Verse not found." });
      }

      const chatUserName: string = (req.body as any).userName || "";
      const chatSessionId: string = (req.body as any).sessionId || "";
      const chatDaysWithApp: number = Number((req.body as any).daysWithApp) || 1;
      const chatMode: string = (req.body as any).guidanceMode || "encouraging";
      const chatModeNote = buildModeNote(chatMode);
      const chatNameNote = chatUserName ? ` The user's name is ${chatUserName}. Use their name naturally when appropriate.` : "";

      const chatSafety = scanUserText(input.question);
      if (shouldBlockLlm(chatSafety)) {
        res.setHeader(SAFETY_HEADER, chatSafety.level);
        return res.status(200).json({ content: chatSafety.response ?? CRISIS_RESPONSE });
      }

      const isProChat = parseProFlag((req.body as { isPro?: boolean }).isPro);
      const aiGuardChat = checkAiDailyLimit(chatSessionId, chatDaysWithApp, isProChat);
      if (!aiGuardChat.ok) {
        return res.status(aiGuardChat.status).json({
          message: aiGuardChat.message,
          limitReached: true,
        });
      }
      if (chatSessionId) {
        storage.logAiUsage({
          sessionId: chatSessionId,
          feature: "devotional_chat",
          daysWithApp: chatDaysWithApp,
          platform: "web",
        }).catch(() => {});
      }

      const { context: chatJournalCtx, count: chatEntryCount } = await getJournalContext(chatSessionId);
      const chatMemoryNote = chatJournalCtx
        ? `\n\nRecent spiritual context for this person — use to personalize your responses naturally:\n${chatJournalCtx}`
        : "";
      const chatRelationshipNote = buildRelationshipNote(chatDaysWithApp, chatEntryCount);

      const systemPrompt =
        `You are a deeply thoughtful spiritual companion. The person you are speaking with has been reflecting on this verse:

"${verse.text}" — ${verse.reference}

You are in a real conversation. Someone is thinking, questioning, struggling, or curious — and they have brought it to you. You are not here to deliver a lecture. You are here to be fully present with what they actually said.

You know the Bible — its history, context, languages, and storylines — but you wear that knowledge lightly. You use it to illuminate, never to impress. Meet people emotionally before you meet them intellectually. If someone is carrying something heavy, don't open with a commentary. Open with them.

Say one important thing well. Not five things adequately. Be honest — if a question is genuinely hard, say so. If a verse is uncomfortable, don't sanitize it. Speak plainly: no jargon, no clichés, no spiritual filler.

When writing prayers: begin with "Lord," or "Heavenly Father," close with "Amen." Make them specific to this moment — not generic enough to work for any situation.

Keep responses to 2–4 short paragraphs. This is a conversation, not a sermon. Often — roughly 1 in 3 responses — close with a single question that comes from genuine curiosity about this person's life, not from a formula.

What you never do:
— Open with hollow affirmations ("Great question!", "That's such a beautiful reflection!").
— Use clichés: "lean into," "unpack," "journey," "walk in His truth," "let go and let God."
— Tell the person what they "should" or "need to" do.
— Give bulleted lists as your primary response form.
— Be preachy. Ever.
— Capitalize "you" or "your" when addressing the reader. Capitalize He, Him, His only when unmistakably referring to God, Jesus, or the Holy Spirit. In prayers you write, capitalize You, Your when addressing God directly.${chatNameNote}${chatRelationshipNote}${chatMemoryNote}${chatModeNote}${SCRIPTURAL_ALIGNMENT}${EMOTIONAL_TONE}${VOICE_AUTHENTICITY}`;

      const conversationHistory = input.messages.map((m: ChatMessage) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: input.question },
        ],
      });

      const content = response.choices[0]?.message?.content || "Could not generate response.";
      res.status(200).json({ content });
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Inline Bible term lookup — "Who is this person/place?"
  app.post("/api/bible/lookup", async (req, res) => {
    const { term, context } = req.body as { term?: string; context?: string };
    if (!term || term.length < 2 || term.length > 60) {
      return res.status(400).json({ message: "term required" });
    }
    try {
      const openai = new OpenAI();
      const contextNote = context ? ` The reader is currently in ${context}.` : "";
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content: `You are a warm, knowledgeable Bible companion — like a friend who has studied scripture for years and loves helping people understand it. When someone taps on a name or place in the Bible, give a brief, plain-language explanation. Return only valid JSON:\n{"type":"person"|"place"|"thing"|"concept","summary":"2-3 sentences, plain language, no jargon. Who/what is this, why do they matter, what should the reader know?"}`
          },
          {
            role: "user",
            content: `Who or what is "${term}" in the Bible?${contextNote} Keep it brief and personal.`
          }
        ]
      });
      const raw = response.choices[0].message.content?.trim() ?? "{}";
      let parsed: { type?: string; summary?: string } = {};
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { }
      res.json({ term, type: parsed.type ?? "person", summary: parsed.summary ?? "No information found." });
    } catch (err) {
      console.error("bible lookup error:", err);
      res.status(500).json({ message: "Could not look up term" });
    }
  });

  // Bible chapter text proxy (uses bible-api.com)
  app.get("/api/bible", async (req, res) => {
    const ref = req.query.ref as string;
    const translation = (req.query.translation as string) || "kjv";
    if (!ref) {
      return res.json({ reference: "Psalm 23:1", text: "The Lord is my shepherd; I shall not want." });
    }
    try {
      const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${encodeURIComponent(translation)}`;
      const resp = await fetch(url);
      if (!resp.ok) return res.status(404).json({ message: "Passage not found" });
      const data: any = await resp.json();
      const text: string = (data.verses as Array<{ verse: number; text: string }>)
        .map((v) => `[${v.verse}] ${v.text.trim()}`)
        .join("\n");
      res.json({ reference: data.reference, text });
    } catch (err) {
      console.error("Bible API error:", err);
      res.status(500).json({ message: "Could not fetch passage" });
    }
  });

  // AI chat for arbitrary passage (used by Understand and Read pages)
  app.post("/api/chat/passage", async (req, res) => {
    const { passageRef, passageText, messages, lang, userName, sessionId: passageSessionId } = req.body;
    if (!passageRef || !passageText || !Array.isArray(messages)) {
      return res.status(400).json({ message: "passageRef, passageText, and messages are required" });
    }

    const userReflectionReply = String((req.body as { userReflectionReply?: string }).userReflectionReply || "").trim();
    const userReplyPassageNote = userReflectionReply
      ? `

CRITICAL — OPENING RULE:
This person, in their own words, said: "${userReflectionReply.slice(0, 800)}"
The prayer MUST open with that exact thing — not a category, not a 
paraphrase, not a reference to the time of day.
First sentence example: "Lord, Brian carries a real desire to love 
others better — that longing is the first thing he brings to You."
Do NOT open with "I come before You", "in this quiet hour", 
"Heavenly Father we gather", or any time-of-day reference.
The opening must use what they said in their own words.`
      : "";

    const chatPassageSafety = scanGuidanceTexts({
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: String(m.content ?? ""),
      })),
    });
    if (shouldBlockLlm(chatPassageSafety)) {
      writeSafetyBlock(res, chatPassageSafety.level, chatPassageSafety.response ?? CRISIS_RESPONSE);
      return;
    }
    const passageDaysWithApp: number = Number((req.body as any).daysWithApp) || 1;
    const isProPassage = parseProFlag((req.body as any).isPro);
    const aiGuardPassage = checkAiDailyLimit(passageSessionId, passageDaysWithApp, isProPassage);
    if (!aiGuardPassage.ok) {
      return res.status(aiGuardPassage.status).json({ message: aiGuardPassage.message, limitReached: true });
    }
    if (passageSessionId) storage.logAiUsage({ sessionId: passageSessionId, feature: "passage_chat", daysWithApp: passageDaysWithApp, platform: "web" }).catch(() => { });

    const langInstruction: Record<string, string> = {
      es: "Respond entirely in Spanish (Español).",
      fr: "Respond entirely in French (Français).",
      pt: "Respond entirely in Portuguese (Português).",
    };
    const langNote = langInstruction[lang] ? ` ${langInstruction[lang]}` : "";
    const passageNameNote = userName ? ` The person you are speaking with is named ${userName}. Use their name naturally when appropriate.` : "";
    const { context: passageJournalCtx, count: passageEntryCount } = await getJournalContext(passageSessionId || "");
    const passageMemoryNote = passageJournalCtx
      ? `\n\nRecent spiritual context for this person — weave naturally into responses when relevant:\n${passageJournalCtx}`
      : "";
    const passageRelationshipNote = buildRelationshipNote(passageDaysWithApp, passageEntryCount);

    const systemPrompt =
      `You are a deeply thoughtful Bible companion helping someone study ${passageRef}. The passage they are reading:

${passageText}

They have a question or a thought about what they just read. Engage it honestly — the way a wise friend with deep Bible knowledge would. Not a professor delivering notes. A companion thinking through it alongside them.

You know this text — its history, original context, the author's purpose, how it fits the larger arc of Scripture. Bring that knowledge forward when it genuinely sheds light. Don't bring it forward to demonstrate that you have it.

Be honest: some passages are difficult. Some have been misused historically. Some sit in real theological tension. You don't fake certainty you don't have, and you don't smooth over what is genuinely hard.

Be warm without being soft. Truth spoken with love is the standard. Notice the emotional dimension of what someone is asking — answer the question, but also answer the person.

Keep responses to 2–4 short paragraphs. Often — roughly 1 in 3 responses — close with a single thoughtful question that draws them deeper into the passage or their own experience of faith.

What you never do:
— Open with hollow affirmations or filler.
— Use spiritual clichés or jargon.
— Give bulleted lists as your primary response.
— Tell people what they "should" believe or do.
— Pad the response with things that don't serve the question.
— Capitalize "you" or "your" when addressing the reader. Capitalize He, Him, His only when unmistakably referring to God, Jesus, or the Holy Spirit. In any prayers you write, capitalize You, Your when addressing God directly.${userReplyPassageNote}${passageNameNote}${passageRelationshipNote}${passageMemoryNote}${langNote}`;

    try {
      await streamCompletion(
        [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        res,
        { maxTokens: 600, temperature: 0.7 }
      );
    } catch (err) {
      console.error("Passage AI error:", err);
      if (!res.headersSent) res.status(500).json({ message: "AI generation failed" });
    }
  });

  app.get("/api/subscribe/status", async (req, res) => {
    try {
      const sessionId =
        typeof req.query.sessionId === "string" ? req.query.sessionId.trim() : undefined;
      const emailRaw =
        typeof req.query.email === "string" ? req.query.email.trim() : undefined;
      const cookieEmail =
        typeof req.cookies?.sp_subscriber_email === "string"
          ? req.cookies.sp_subscriber_email.trim()
          : undefined;
      const resolvedRaw = emailRaw || cookieEmail;
      const email = resolvedRaw?.includes("@") ? normalizeEmail(resolvedRaw) : undefined;

      let subscriber = sessionId
        ? await storage.getActiveSubscriberBySession(sessionId)
        : undefined;

      if (!subscriber && email) {
        subscriber = await storage.getActiveSubscriberByEmail(email);
        if (subscriber && sessionId) {
          await storage.updateSubscriberSession(subscriber.email, sessionId);
        }
      }

      if (subscriber) {
        setSubscriberCookies(res, subscriber.email);
      }

      res.json({
        subscribed: !!subscriber,
        email: subscriber?.email ?? null,
      });
    } catch (err) {
      console.error("[subscribe/status]", err);
      res.status(500).json({ subscribed: false, email: null });
    }
  });

  // Subscribe to daily email
  app.post("/api/subscribe", async (req, res) => {
    try {
      const input = insertSubscriberSchema.parse(req.body);
      const socialHandle = normalizeSocialHandle(input.socialHandle);
      const source = input.source?.trim().slice(0, 64) || undefined;

      const existing = await storage.getSubscriberByEmail(input.email);
      if (existing) {
        if (existing.active) {
          if (input.sessionId) {
            await storage.upsertSubscriberIdentity({
              email: input.email,
              sessionId: input.sessionId,
              name: input.name,
              socialHandle,
              source,
            });
          }
          setSubscriberCookies(res, input.email);
          return res.status(409).json({
            message: "This email is already subscribed.",
            subscribed: true,
            email: normalizeEmail(input.email),
          });
        }
        await db_reactivate(input.email);
        if (input.sessionId) {
          await storage.upsertSubscriberIdentity({
            email: input.email,
            sessionId: input.sessionId,
            name: input.name,
            socialHandle,
            source,
          });
        }
        setSubscriberCookies(res, input.email);
        return res.status(200).json({ message: "Welcome back! Your subscription has been reactivated." });
      }

      await storage.createSubscriber({
        ...input,
        socialHandle,
        source,
      });

      // Send a welcome email
      try {
        const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
        const videoUrl = process.env.WELCOME_VIDEO_URL || null;
        const { client, fromEmail } = await getUncachableResendClient();
        const welcomeData = { name: input.name ?? null, email: input.email, appUrl, videoUrl };
        await client.emails.send({
          from: fromEmail,
          to: input.email,
          subject: "You're subscribed — daily Scripture from Shepherd's Path",
          html: buildWelcomeEmailHtml(welcomeData),
          text: buildWelcomeEmailText(welcomeData),
        });
        console.log(`[welcome] Email sent to ${input.email}`);
      } catch (emailErr) {
        console.error("Welcome email failed (non-fatal):", emailErr);
      }

      setSubscriberCookies(res, input.email);
      res.status(201).json({
        message: "You're subscribed! Check your inbox for a welcome email.",
        subscribed: true,
        email: normalizeEmail(input.email),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Could not subscribe. Please try again." });
    }
  });

  app.post("/api/mobile/sync-pro", async (req, res) => {
    try {
      const input = mobileSyncProSchema.parse(req.body);
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      const tier = input.tier ?? (input.isPro ? "pro" : "free");
      await storage.upsertMobileSubscription({
        sessionId: input.sessionId,
        isPro: input.isPro,
        expiresAt,
      });
      res.json({ synced: true, isPro: input.isPro, tier });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid request" });
      }
      console.error("[mobile/sync-pro]", err);
      res.status(500).json({ message: "Could not sync subscription." });
    }
  });

  app.post("/api/identity/connect", async (req, res) => {
    try {
      const input = identityConnectSchema.parse(req.body);
      const email = normalizeEmail(input.email);
      const socialHandle = normalizeSocialHandle(input.socialHandle);
      const source = input.source?.trim().slice(0, 64) || "identity-connect";

      const existingBefore = await storage.getSubscriberByEmail(email);
      const emailPro = await storage.getProSubscriberByEmail(email);
      const sessionPro = await storage.isSessionPro(input.sessionId);
      const isPro = sessionPro || emailPro?.status === "active";

      const subscriber = await storage.upsertSubscriberIdentity({
        email,
        sessionId: input.sessionId,
        name: input.name,
        socialHandle,
        source,
      });

      if (isPro) {
        const mobile = await storage.getMobileSubscription(input.sessionId);
        const plan: "ios" | "android" =
          input.source?.includes("android") || emailPro?.plan === "android"
            ? "android"
            : mobile?.isPro
              ? "ios"
              : "ios";
        if (!emailPro || emailPro.status !== "active") {
          await storage.upsertMobileProEmail(email, plan);
        }
      }

      if (input.subscribeDaily && !existingBefore) {
        try {
          const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
          const videoUrl = process.env.WELCOME_VIDEO_URL || null;
          const { client, fromEmail } = await getUncachableResendClient();
          const welcomeData = { name: input.name ?? null, email, appUrl, videoUrl };
          await client.emails.send({
            from: fromEmail,
            to: email,
            subject: "You're connected — daily Scripture from Shepherd's Path",
            html: buildWelcomeEmailHtml(welcomeData),
            text: buildWelcomeEmailText(welcomeData),
          });
        } catch (emailErr) {
          console.error("[identity/connect] welcome email failed (non-fatal):", emailErr);
        }
      }

      res.json({
        connected: true,
        isPro,
        dailySubscribed: subscriber.active,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid request" });
      }
      console.error("[identity/connect]", err);
      res.status(500).json({ message: "Could not save your email. Please try again." });
    }
  });

  // SMS subscribe — web opt-in for daily devotional texts
  app.post("/api/sms/subscribe", async (req, res) => {
    try {
      const { phone } = req.body as { phone?: string };
      if (!phone?.trim()) return res.status(400).json({ message: "Phone number is required." });

      // Normalize to E.164 (+1XXXXXXXXXX for US numbers)
      const digits = phone.replace(/\D/g, "");
      let e164: string;
      if (digits.length === 10) {
        e164 = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith("1")) {
        e164 = `+${digits}`;
      } else {
        return res.status(400).json({ message: "Please enter a valid US phone number." });
      }

      // Check if already enrolled
      const existing = await storage.getSmsConversation(e164);
      if (existing?.enrolledForDaily && !existing.optedOut) {
        return res.status(409).json({ message: "This number is already signed up for daily texts." });
      }

      // Enroll them
      await storage.upsertSmsConversation(e164, existing?.messages ?? [], existing?.exchangeCount ?? 0, existing?.ctaSent ?? false, {
        enrolledForDaily: true,
        optedOut: false,
      });

      // Send a welcome text
      try {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const auth = process.env.TWILIO_AUTH_TOKEN;
        const fromNum = process.env.TWILIO_PHONE_NUMBER;
        if (sid && auth && fromNum) {
          const client = twilio(sid, auth);
          await client.messages.create({
            body: `Welcome to Shepherd's Path! 🙏 Each morning you'll receive a scripture and devotional reflection by text — a quiet moment with God to start your day.\n\nReply VERSE for today's verse, DEVOTIONAL for today's reflection, or anything on your heart.\nReply STOP any time to unsubscribe.`,
            from: fromNum,
            to: e164,
          });
        }
      } catch (smsErr) {
        console.error("[sms/subscribe] Welcome text failed (non-fatal):", smsErr);
      }

      res.status(201).json({ message: "You're signed up! Look for your first text tomorrow morning." });
    } catch (err) {
      console.error("[sms/subscribe] error:", err);
      res.status(500).json({ message: "Could not subscribe. Please try again." });
    }
  });

  // Unsubscribe
  app.get("/api/unsubscribe", async (req, res) => {
    const { email } = req.query;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required." });
    }
    try {
      await storage.deactivateSubscriber(decodeURIComponent(email));
      res.status(200).json({ message: "You've been unsubscribed successfully." });
    } catch (err) {
      console.error("[unsubscribe] error:", err);
      res.status(500).json({ message: "Could not process unsubscribe. Please try again." });
    }
  });

  // Force-regenerate today's Take a Moment image (admin only)
  app.post("/api/admin/refresh-daily-art", async (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const provided = req.headers["x-admin-password"] || req.body?.adminPassword;
    if (!adminPassword || provided !== adminPassword) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    try {
      const today = getEasternDateString();
      const imgFile = path.join(DAILY_ART_DIR, `${today}.jpg`);
      const metaFile = path.join(DAILY_ART_DIR, `${today}.json`);
      if (fs.existsSync(imgFile)) fs.unlinkSync(imgFile);

      const [y, mo, da] = today.split("-").map(Number);
      const dayOfYear = Math.floor((Date.UTC(y, mo - 1, da) - Date.UTC(y, 0, 0)) / 86_400_000);
      const poolEntry = VERSE_POOL[dayOfYear % VERSE_POOL.length];
      const { query: _poolQuery, ...poolScripture } = poolEntry;

      let dailyVerse = await storage.getVerseByDate(today);
      if (!dailyVerse) {
        await syncTodayVerseFromSheet();
        dailyVerse = await storage.getVerseByDate(today);
      }

      const scriptureData = dailyVerse
        ? {
            scripture: dailyVerse.text,
            reference: dailyVerse.reference,
            reflection: dailyVerse.encouragement || poolScripture.reflection,
          }
        : poolScripture;

      const stockQuery = stockQueryForVerse(
        scriptureData.scripture,
        scriptureData.reference,
        dayOfYear,
        VERSE_POOL,
      );

      const result = await writeDailyArtImageFile(
        imgFile,
        stockQuery,
        scriptureData.scripture,
        scriptureData.reference,
      );
      let artSource = result.source;
      if (!result.ok) {
        const ensured = ensureDailyArtImageFile(imgFile, DAILY_ART_DIR);
        artSource = ensured.source;
      }

      const meta = {
        ...scriptureData,
        artSource: artSource ?? "fallback",
        isPlaceholder: artSource === "fallback",
      };
      fs.mkdirSync(DAILY_ART_DIR, { recursive: true });
      fs.writeFileSync(metaFile, JSON.stringify(meta));

      return res.json({
        ok: true,
        date: today,
        artSource,
        isPlaceholder: artSource === "fallback",
        imageUrl: fs.existsSync(imgFile) ? `/api/daily-art/image/${today}` : null,
      });
    } catch (err) {
      console.error("[admin/refresh-daily-art]", err);
      return res.status(500).json({ message: "Could not refresh daily art" });
    }
  });

  // Manually trigger daily email send (admin only — requires ADMIN_PASSWORD)
  app.post("/api/admin/send-daily-email", async (req, res) => {
    // Auth check
    const adminPassword = process.env.ADMIN_PASSWORD;
    const provided = req.headers["x-admin-password"] || req.body?.adminPassword;
    if (!adminPassword || provided !== adminPassword) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const verse = await storage.getVerseByDate(today);
      if (!verse) return res.status(404).json({ message: "No verse for today." });

      const activeSubscribers = await storage.getAllActiveSubscribers();
      if (activeSubscribers.length === 0) {
        return res.status(200).json({ message: "No active subscribers.", sent: 0 });
      }

      // Always use APP_URL or the canonical domain — never req.headers.host (causes broken logos)
      const appUrl = process.env.APP_URL || "https://www.shepherdspathai.com";
      const { client, fromEmail } = await getUncachableResendClient();

      let sent = 0;
      let skipped = 0;
      for (const subscriber of activeSubscribers) {
        // Skip subscribers who already received today's email
        if (subscriber.lastEmailSentDate === today) {
          skipped++;
          continue;
        }
        try {
          const html = buildDailyVerseEmailHtml({ ...verse, appUrl }).replace("{{email}}", encodeURIComponent(subscriber.email));
          const text = buildDailyVerseEmailText({ ...verse, appUrl });
          const displayFrom = fromEmail.includes('@') && !fromEmail.startsWith('"')
            ? `Shepherd's Path <${fromEmail}>`
            : fromEmail;
          await client.emails.send({
            from: displayFrom,
            to: subscriber.email,
            replyTo: 'hello@shepherdspathai.com',
            subject: `${verse.reference} — a word for your morning`,
            html,
            text,
          });
          await storage.updateSubscriberLastEmailDate(subscriber.id, today);
          sent++;
        } catch (err) {
          console.error(`Failed to send to ${subscriber.email}:`, err);
        }
      }

      res.status(200).json({ message: `Sent to ${sent} subscribers. Skipped ${skipped} (already received today).`, sent, skipped });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to send emails." });
    }
  });

  // ── Streak Routes ───────────────────────────────────────────────────────────

  app.get("/api/streak", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const isPro = req.query.isPro === "true";
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const result = await storage.getStreak(sessionId, isPro);
      res.json(result ?? { currentStreak: 0, longestStreak: 0, visitDates: [], freezeAvailable: isPro, freezeUsedThisMonth: false });
    } catch (err) {
      res.status(500).json({ message: "Failed to get streak" });
    }
  });

  app.post("/api/streak", async (req, res) => {
    const { sessionId, isPro } = req.body as { sessionId?: string; isPro?: boolean };
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const result = await storage.recordStreak(sessionId, isPro === true);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to record streak" });
    }
  });

  // ── Client UI flags (Why panel caps — survives WebView storage loss) ─────────

  app.get("/api/client/why-panel", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const { getWhyPanelServerState } = await import("../whyPanelState");
      const state = await getWhyPanelServerState(sessionId);
      res.json(
        state ?? { autoShows: 0, dismissals: 0, done: false },
      );
    } catch (err) {
      console.error("[why-panel] get failed:", err);
      res.status(500).json({ message: "Failed to load why panel state" });
    }
  });

  app.post("/api/client/why-panel", async (req, res) => {
    const body = req.body as {
      sessionId?: string;
      autoShows?: number;
      dismissals?: number;
      done?: boolean;
    };
    if (!body.sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const { saveWhyPanelServerState } = await import("../whyPanelState");
      const merged = await saveWhyPanelServerState(body.sessionId, {
        autoShows: Math.max(0, Number(body.autoShows) || 0),
        dismissals: Math.max(0, Number(body.dismissals) || 0),
        done: body.done === true,
      });
      res.json(merged);
    } catch (err) {
      console.error("[why-panel] save failed:", err);
      res.status(500).json({ message: "Failed to save why panel state" });
    }
  });

  // ── Journal Routes ──────────────────────────────────────────────────────────

  // ── Community Prayer Wall ──────────────────────────────────────────────────

  // Content safety check — keyword + OpenAI moderation
  async function checkPrayerSafety(text: string): Promise<{ safe: boolean; selfHarm: boolean; reason?: string }> {
    const lower = text.toLowerCase();
    // Phone/email/link pattern check
    if (/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(text)) return { safe: false, selfHarm: false, reason: "personal_info" };
    if (/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/.test(lower)) return { safe: false, selfHarm: false, reason: "personal_info" };
    // Self-harm keywords — flag before moderation API for speed
    const selfHarmWords = ["kill myself", "end my life", "suicide", "suicidal", "want to die", "hurting myself", "self harm", "self-harm"];
    if (selfHarmWords.some(w => lower.includes(w))) return { safe: false, selfHarm: true };
    try {
      const mod = await openaiTTS.moderations.create({ input: text });
      const r = mod.results[0];
      if (r.flagged) {
        const isSelfHarm = r.categories["self-harm" as keyof typeof r.categories] || r.categories["self-harm/intent" as keyof typeof r.categories];
        return { safe: false, selfHarm: !!isSelfHarm, reason: "moderation" };
      }
    } catch { /* proceed if moderation API fails */ }
    return { safe: true, selfHarm: false };
  }

  // In-memory daily prayer post counter (Free: 1/day, Pro: 5/day)
  const prayerPostCounts = new Map<string, { date: string; count: number }>();
  function getPrayerPostCount(sessionId: string): number {
    const today = new Date().toISOString().split("T")[0];
    const entry = prayerPostCounts.get(sessionId);
    if (!entry || entry.date !== today) return 0;
    return entry.count;
  }
  function incrementPrayerPostCount(sessionId: string): void {
    const today = new Date().toISOString().split("T")[0];
    const entry = prayerPostCounts.get(sessionId);
    if (!entry || entry.date !== today) prayerPostCounts.set(sessionId, { date: today, count: 1 });
    else entry.count++;
  }

  // In-memory daily encouragement counter (Free: 20/day, Pro: unlimited)
  const encouragementCounts = new Map<string, { date: string; count: number }>();
  function getEncouragementCount(sessionId: string): number {
    const today = new Date().toISOString().split("T")[0];
    const entry = encouragementCounts.get(sessionId);
    if (!entry || entry.date !== today) return 0;
    return entry.count;
  }
  function incrementEncouragementCount(sessionId: string): void {
    const today = new Date().toISOString().split("T")[0];
    const entry = encouragementCounts.get(sessionId);
    if (!entry || entry.date !== today) encouragementCounts.set(sessionId, { date: today, count: 1 });
    else entry.count++;
  }

  app.get("/api/prayer-wall", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const category = req.query.category as string | undefined;
    try {
      let query = `
        SELECT pw.*,
          COALESCE(ec.prayed, 0)::int AS enc_prayed,
          COALESCE(ec.standing_with_you, 0)::int AS enc_standing,
          COALESCE(ec.not_alone, 0)::int AS enc_not_alone,
          COALESCE(ec.god_is_near, 0)::int AS enc_god_is_near
        FROM prayer_wall pw
        LEFT JOIN (
          SELECT request_id,
            COUNT(CASE WHEN action_type = 'prayed' THEN 1 END) as prayed,
            COUNT(CASE WHEN action_type = 'standing_with_you' THEN 1 END) as standing_with_you,
            COUNT(CASE WHEN action_type = 'not_alone' THEN 1 END) as not_alone,
            COUNT(CASE WHEN action_type = 'god_is_near' THEN 1 END) as god_is_near
          FROM prayer_wall_encouragements GROUP BY request_id
        ) ec ON ec.request_id = pw.id
        WHERE pw.status IN ('active', 'answered')
      `;
      const params: any[] = [];
      if (category && PRAYER_CATEGORIES.includes(category as any)) {
        params.push(category);
        query += ` AND pw.category = $${params.length}`;
      }
      query += ` ORDER BY pw.created_at DESC LIMIT 50`;
      const result = await pool.query(query, params);

      let myActions: Record<number, string[]> = {};
      if (sessionId) {
        const actRes = await pool.query(
          `SELECT request_id, action_type FROM prayer_wall_encouragements WHERE session_id = $1`,
          [sessionId]
        );
        for (const row of actRes.rows) {
          if (!myActions[row.request_id]) myActions[row.request_id] = [];
          myActions[row.request_id].push(row.action_type);
        }
      }

      const entries = result.rows.map((e: any) => ({
        id: e.id,
        sessionId: e.session_id,
        displayName: e.is_anonymous ? null : (e.display_name || null),
        isAnonymous: e.is_anonymous,
        request: e.request,
        category: e.category,
        status: e.status,
        answeredText: e.answered_text,
        answeredAt: e.answered_at,
        createdAt: e.created_at,
        isOwner: sessionId ? e.session_id === sessionId : false,
        encouragements: {
          prayed: e.enc_prayed,
          standing_with_you: e.enc_standing,
          not_alone: e.enc_not_alone,
          god_is_near: e.enc_god_is_near,
          total: e.enc_prayed + e.enc_standing + e.enc_not_alone + e.enc_god_is_near,
        },
        myActions: myActions[e.id] || [],
      }));
      res.json(entries);
    } catch (err) {
      res.status(500).json({ message: "Failed to load prayer wall" });
    }
  });

  app.get("/api/prayer-wall/answered", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, display_name, is_anonymous, request, category, answered_text, answered_at, created_at
         FROM prayer_wall WHERE status = 'answered' ORDER BY answered_at DESC LIMIT 20`
      );
      res.json(result.rows.map((e: any) => ({
        id: e.id,
        displayName: e.is_anonymous ? null : (e.display_name || null),
        request: e.request,
        category: e.category,
        answeredText: e.answered_text,
        answeredAt: e.answered_at,
        createdAt: e.created_at,
      })));
    } catch {
      res.status(500).json({ message: "Failed to load answered prayers" });
    }
  });

  app.post("/api/prayer-wall", async (req, res) => {
    const parsed = insertPrayerWallSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
    const { sessionId, request, category, isAnonymous, displayName } = parsed.data;

    // Daily post limit check (isPro passed from client — honour-based; server side is free=1, pro=5)
    const isPro = req.body.isPro === true;
    const dailyLimit = isPro ? 5 : 1;
    if (getPrayerPostCount(sessionId) >= dailyLimit) {
      return res.status(429).json({
        message: isPro
          ? "You've shared your 5 prayer requests for today. Check back tomorrow."
          : "free_limit",
        limit: dailyLimit,
      });
    }

    // Content safety
    const safety = await checkPrayerSafety(request);
    if (safety.selfHarm) {
      return res.status(422).json({
        message: "self_harm",
        crisis: "You are not alone, and your life matters. If you may hurt yourself or are in immediate danger, please call emergency services now. In the U.S., call or text 988 for the Suicide & Crisis Lifeline.",
      });
    }
    if (!safety.safe) {
      return res.status(422).json({ message: "content_unsafe", reason: safety.reason });
    }

    try {
      const result = await pool.query(
        `INSERT INTO prayer_wall (session_id, display_name, is_anonymous, request, category, status)
         VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
        [sessionId, isAnonymous ? null : (displayName || null), isAnonymous ?? true, request, category || "Other"]
      );
      incrementPrayerPostCount(sessionId);
      res.json(result.rows[0]);
    } catch {
      res.status(500).json({ message: "Failed to submit prayer request" });
    }
  });

  app.post("/api/prayer-wall/:id/encourage", async (req, res) => {
    const id = parseInt(req.params.id);
    const { sessionId, actionType, isPro } = req.body as { sessionId?: string; actionType?: string; isPro?: boolean };
    if (!sessionId || isNaN(id) || !PRAYER_ENCOURAGEMENT_ACTIONS.includes(actionType as any)) {
      return res.status(400).json({ message: "Invalid request" });
    }
    // Daily encouragement limit (Free: 20/day)
    if (!isPro && getEncouragementCount(sessionId) >= 20) {
      return res.status(429).json({ message: "encouragement_limit" });
    }
    try {
      // Check not already done this action on this request
      const existing = await pool.query(
        `SELECT id FROM prayer_wall_encouragements WHERE request_id = $1 AND session_id = $2 AND action_type = $3`,
        [id, sessionId, actionType]
      );
      if (existing.rows.length > 0) return res.json({ ok: true, duplicate: true });
      await pool.query(
        `INSERT INTO prayer_wall_encouragements (request_id, session_id, action_type) VALUES ($1, $2, $3)`,
        [id, sessionId, actionType]
      );
      incrementEncouragementCount(sessionId);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Failed to record encouragement" });
    }
  });

  app.post("/api/prayer-wall/:id/answer", async (req, res) => {
    const id = parseInt(req.params.id);
    const { sessionId, answeredText } = req.body as { sessionId?: string; answeredText?: string };
    if (!sessionId || isNaN(id)) return res.status(400).json({ message: "Invalid request" });
    try {
      const result = await pool.query(
        `UPDATE prayer_wall SET status = 'answered', answered_text = $1, answered_at = NOW()
         WHERE id = $2 AND session_id = $3 RETURNING id`,
        [answeredText || null, id, sessionId]
      );
      if (result.rowCount === 0) return res.status(403).json({ message: "Not your prayer or not found" });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Failed to mark prayer answered" });
    }
  });

  app.post("/api/prayer-wall/:id/report", async (req, res) => {
    const id = parseInt(req.params.id);
    const { sessionId, reason } = req.body as { sessionId?: string; reason?: string };
    const validReasons = ["harmful", "spam", "inappropriate", "divisive", "personal_info", "other"];
    if (!sessionId || isNaN(id) || !validReasons.includes(reason || "")) {
      return res.status(400).json({ message: "Invalid request" });
    }
    try {
      // One report per session per request
      const existing = await pool.query(
        `SELECT id FROM prayer_wall_reports WHERE request_id = $1 AND session_id = $2`,
        [id, sessionId]
      );
      if (existing.rows.length > 0) return res.json({ ok: true, duplicate: true });
      await pool.query(
        `INSERT INTO prayer_wall_reports (request_id, session_id, reason) VALUES ($1, $2, $3)`,
        [id, sessionId, reason]
      );
      // Increment report count and auto-hide at 3
      const updated = await pool.query(
        `UPDATE prayer_wall SET report_count = report_count + 1
         WHERE id = $1 RETURNING report_count`,
        [id]
      );
      if ((updated.rows[0]?.report_count ?? 0) >= 3) {
        await pool.query(`UPDATE prayer_wall SET status = 'hidden' WHERE id = $1`, [id]);
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  app.post("/api/prayer-wall/:id/pray", async (req, res) => {
    const id = parseInt(req.params.id);
    const sessionId = req.body.sessionId as string;
    if (!sessionId || isNaN(id)) return res.status(400).json({ message: "Invalid request" });
    try {
      const result = await storage.recordPrayerWallPray(id, sessionId);
      res.json(result);
    } catch {
      res.status(500).json({ message: "Failed to record prayer" });
    }
  });

  app.get("/api/journal", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const entries = await storage.getJournalEntries(sessionId);
      res.json(entries);
    } catch (err) {
      res.status(500).json({ message: "Failed to load journal" });
    }
  });

  app.get("/api/journal/archive", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    const isPro = req.query.isPro === "true";
    const q = (req.query.q as string) || "";
    const type = (req.query.type as string) || "";
    const day = (req.query.day as string) || "";
    try {
      const entries = await storage.getJournalEntries(sessionId);
      const archive = buildJournalArchive(entries, { isPro, q, type, day });
      res.json(archive);
    } catch (err) {
      console.error("[journal/archive]", err);
      res.status(500).json({ message: "Failed to load archive" });
    }
  });

  app.post("/api/journal", async (req, res) => {
    const parsed = insertJournalEntrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid entry", errors: parsed.error.flatten() });
    try {
      const entry = await storage.createJournalEntry(parsed.data);
      res.status(201).json(entry);
    } catch (err) {
      res.status(500).json({ message: "Failed to save entry" });
    }
  });

  app.delete("/api/journal/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { sessionId } = req.body;
    if (!sessionId || isNaN(id)) return res.status(400).json({ message: "Invalid request" });
    try {
      await storage.deleteJournalEntry(id, sessionId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  // ── Journal Flashback ─────────────────────────────────────────────────────────
  app.get("/api/journal/flashback", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const entries = await storage.getJournalEntries(sessionId);
      const now = Date.now();
      const minAge = 25 * 24 * 60 * 60 * 1000;
      const maxAge = 180 * 24 * 60 * 60 * 1000;
      const past = entries.filter(e => {
        const age = now - new Date(e.createdAt).getTime();
        return age >= minAge && age <= maxAge &&
          (e.type === "prayer" || e.type === "reflection") &&
          e.content?.trim().length > 20;
      });
      if (past.length === 0) return res.json(null);
      const pick = past[Math.floor(Math.random() * past.length)];
      res.json(pick);
    } catch {
      res.status(500).json({ message: "Failed" });
    }
  });

  // ── Spiritual Letter ─────────────────────────────────────────────────────────
  app.post("/api/journal/spiritual-letter", async (req, res) => {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    if (isRateLimited(`letter:${sessionId}`, 3, 3_600_000)) {
      return res.status(429).json({ message: "Too many requests" });
    }
    try {
      const entries = await storage.getJournalEntries(sessionId);
      const textEntries = entries.filter(e => e.type !== "note" && e.content?.trim());
      if (textEntries.length < 3) return res.status(400).json({ message: "Not enough entries yet" });

      const context = textEntries
        .slice(0, 20)
        .map(e => `[${e.type.toUpperCase()} — ${new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}]\n${e.title ? e.title + ": " : ""}${e.content.slice(0, 350)}`)
        .join("\n\n");

      const dayRange = Math.max(1, Math.round(
        (new Date(textEntries[0].createdAt).getTime() - new Date(textEntries[textEntries.length - 1].createdAt).getTime()) / 86400000
      ));

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 650,
        messages: [
          {
            role: "system",
            content: `You are a wise, caring pastoral companion. You have been given someone's private journal entries — prayers, reflections, and thoughts — from the past ${dayRange} days. Write them a short personal letter (4–5 paragraphs) that:

1. Opens by gently naming 1-2 recurring spiritual themes you noticed (e.g., "You keep coming back to fear of the future" or "There's a deep longing for peace running through what you've written")
2. Reflects on what you notice God doing or what they seem to be learning — be specific to their actual words, not generic
3. Offers one piece of gentle, earned encouragement — something they might not be able to see about themselves yet
4. Closes with a single scripture verse that speaks to the whole arc of what they've shared, and a 1-sentence blessing

Tone: Like a letter from a trusted spiritual director — honest, warm, specific. NOT preachy. NOT generic. Do NOT use their name (you don't know it). Start with "These past days..." or "Reading what you've written..." or similar. Do NOT start with "Dear friend" or "Hello." Keep it under 300 words total.${SCRIPTURAL_ALIGNMENT}${EMOTIONAL_TONE}${VOICE_AUTHENTICITY}`,
          },
          { role: "user", content: context },
        ],
      });
      const letter = completion.choices[0]?.message?.content?.trim() ?? "";
      res.json({ letter, entryCount: textEntries.length });
    } catch (err) {
      console.error("spiritual letter error:", err);
      res.status(500).json({ message: "Failed to generate letter" });
    }
  });

  // ── Scripture Memory Routes ─────────────────────────────────────────────────

  app.get("/api/memory-verses", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const rows = await storage.getMemoryVerses(sessionId);
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Failed to load memory verses" });
    }
  });

  app.post("/api/memory-verses", async (req, res) => {
    const { insertMemoryVerseSchema } = await import("@workspace/db");
    const parsed = insertMemoryVerseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    try {
      const row = await storage.saveMemoryVerse(parsed.data);
      res.status(201).json(row);
    } catch {
      res.status(500).json({ message: "Failed to save memory verse" });
    }
  });

  app.delete("/api/memory-verses/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const sessionId = req.query.sessionId as string;
    if (!sessionId || isNaN(id)) return res.status(400).json({ message: "Invalid request" });
    try {
      await storage.deleteMemoryVerse(id, sessionId);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete memory verse" });
    }
  });

  app.patch("/api/memory-verses/:id/review", async (req, res) => {
    const id = parseInt(req.params.id);
    const { sessionId } = req.body;
    if (!sessionId || isNaN(id)) return res.status(400).json({ message: "Invalid request" });
    try {
      await storage.recordMemoryReview(id, sessionId);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to record review" });
    }
  });

  // ── Guidance Phase 1 — empathy + one question (streaming) ───────────────────

  const guidanceAudioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
  app.post("/api/guidance/transcribe", guidanceAudioUpload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No audio provided" });
    const sessionId = (req.body as { sessionId?: string })?.sessionId;
    const isPro = parseProFlag((req.body as { isPro?: boolean })?.isPro);
    const guard = checkFeatureBudget(sessionId, "guidance-transcribe", isPro);
    if (!guard.ok) {
      return res.status(guard.status).json({ message: guard.message, code: guard.code });
    }
    try {
      const audioFile = new File([req.file.buffer], req.file.originalname || "guidance.m4a", {
        type: req.file.mimetype || "audio/mp4",
      });
      const transcription = await openaiTTS.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
      });
      res.json({ text: transcription.text?.trim() || "" });
    } catch (err: any) {
      console.error("Guidance transcribe error:", err);
      res.status(500).json({ message: "Transcription failed" });
    }
  });

  app.post("/api/guidance/recap", async (req, res) => {
    const { situation, reflection, verseReference, prayer, sessionId, isPro } = req.body as {
      situation?: string;
      reflection?: string;
      verseReference?: string;
      prayer?: string;
      sessionId?: string;
      isPro?: boolean;
    };
    if (!situation?.trim() || !reflection?.trim()) {
      return res.status(400).json({ message: "situation and reflection required" });
    }
    const pro = parseProFlag(isPro);
    const aiGuard = checkAiDailyLimit(sessionId, Number((req.body as any).daysWithApp) || 1, pro);
    if (!aiGuard.ok) {
      return res.status(aiGuard.status).json({ message: aiGuard.message });
    }
    try {
      const verseLine = verseReference?.trim() ? `Scripture shared: ${verseReference.trim()}.` : "";
      const prayerLine = prayer?.trim() ? `Prayer offered: ${prayer.trim().slice(0, 400)}` : "";
      const context = [situation.trim(), reflection.trim(), verseLine, prayerLine].filter(Boolean).join("\n\n");

      const summaryRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: pro
              ? "You write pastoral session recaps for a faith app. Warm, human, never clinical. Return JSON only."
              : "You write very short pastoral recaps (2-3 sentences max). Warm, human. Return JSON only.",
          },
          {
            role: "user",
            content: pro
              ? `Write a session recap as JSON with keys:
- "recap": 2-3 sentence gentle summary for the user
- "detailed": longer notes (4-6 sentences) with themes heard, Scripture anchor, and one encouragement

Session:
${context.slice(0, 6000)}`
              : `Write JSON with one key "recap" — 2-3 sentences summarizing what they shared and what mattered. No bullet points.

Session:
${context.slice(0, 4000)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: pro ? 500 : 180,
      });
      let parsed: { recap?: string; detailed?: string } = {};
      try {
        parsed = JSON.parse(summaryRes.choices[0].message.content ?? "{}");
      } catch {
        /* noop */
      }
      const recap = parsed.recap?.trim();
      if (!recap) return res.status(500).json({ message: "Recap generation failed" });
      res.json({
        recap,
        detailed: pro ? parsed.detailed?.trim() || null : null,
      });
    } catch (err: any) {
      console.error("Guidance recap error:", err);
      res.status(500).json({ message: "Recap failed" });
    }
  });

  // ── Philip daily home-screen greeting ────────────────────────────────────────
  app.get("/api/philip/daily-greeting", async (req, res) => {
    const firstName = (req.query.firstName as string) || "";
    const timeOfDay = (req.query.timeOfDay as string) || "morning";
    const sessionId = (req.query.sessionId as string) || "";
    if (sessionId) touchSessionFirstSeen(sessionId);

    const namePart = firstName ? `The user's first name is ${firstName}. ` : "";
    const systemPrompt = `You are Philip, the Shepherd's Path spiritual companion — modeled after Philip the Evangelist in Acts 6 and Acts 8: Spirit-filled, direct, courageous, and attentive.

You are not a chatbot. Not a motivational speaker. Not a preacher on a stage.
You are a Spirit-filled shepherd who tells the truth calmly, personally, and without apology.

Write one short spoken greeting for the user opening the Shepherd's Path home screen right now.

Tone: warm, direct, spiritually confident, calm, human, brief, unashamedly Christian. Never cheesy, never performative, never vague encouragement.

Rules:
- One sentence only.
- 12–28 words.
- Sounds natural when spoken aloud.
- Do NOT quote Scripture directly.
- Do NOT say "good morning."
- Do NOT use clichés like "you've got this," "God's got a plan," "everything happens for a reason."
- Do NOT push or sell. Invite honesty with God.
- Make the person feel noticed — not marketed to.
- Bold without being combative. Direct without being sharp. Confident without debating.

${namePart}Time of day: ${timeOfDay}.

Return only the greeting line.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate today's Philip greeting." },
        ],
        temperature: 0.9,
        max_tokens: 60,
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      return res.json({ text, date: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      console.error("philip/daily-greeting error:", err);
      return res.status(500).json({ message: "greeting failed" });
    }
  });

  // ── Philip-led conversation opening ──────────────────────────────────────────
  app.get("/api/guidance/opening", async (req, res) => {
    const sessionId = (req.query.sessionId as string) || "";
    const userName = (req.query.userName as string) || "";
    if (sessionId) touchSessionFirstSeen(sessionId);

    const convCount = sessionId ? getGuidanceConversationCount(sessionId) : 0;
    let memNote = "";
    if (sessionId) {
      try {
        const ctx = await getMemoryContext(sessionId);
        memNote = buildMemoryPromptNote(ctx);
      } catch { /* noop */ }
    }

    const namePart = userName ? `Their name is ${userName}. ` : "";
    const nameGreet = userName ? `${userName}. ` : "";

    let systemPrompt: string;
    let userMsg: string;

    if (convCount === 0) {
      systemPrompt = `You are Philip — a Spirit-filled companion who is direct, intellectually sharp, and carries an unashamed, confident faith. ${namePart}This is the very first time this person has opened Talk It Through. You have 2–3 sentences. Use the first to land your presence — something warm but with weight, not a greeting-card opener. Then ask one genuine question about where they actually are in life right now. Not "what's on your heart today" — something more specific, more unexpected. Unhurried. No platitudes. No "I'm here for you." Just real.`;
      userMsg = `Open the first-ever Talk It Through conversation. Begin with "${nameGreet}" if a name is given.`;
    } else if (convCount <= 2) {
      systemPrompt = `You are Philip — direct, warm, and carries an unashamed confident faith. ${namePart}${memNote ? `Memory context: ${memNote}\n\n` : ""}You've walked with this person before. Open with 2–3 sentences: one brief acknowledgment that you remember them (grounded in what you actually know — not generic), then invite them straight into what they're carrying today. No ceremony. Natural momentum.`;
      userMsg = `Open today's Talk It Through. Begin with "${nameGreet}" if a name is given.`;
    } else {
      systemPrompt = `You are Philip — you know this person, you speak with confident clarity, and you don't waste words. ${namePart}${memNote ? `Memory context: ${memNote}\n\n` : ""}2–3 sentences max. Skip pleasantries — you have history. Open with something direct and personal, then move them immediately toward what matters. The opening should feel like picking up mid-conversation with someone who actually knows you.`;
      userMsg = `Open this Talk It Through session. Begin with "${nameGreet}" if a name is given.`;
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        temperature: 0.85,
        max_tokens: 160,
      });
      const line = completion.choices[0]?.message?.content?.trim() ?? "";
      return res.json({ line, convCount });
    } catch (err) {
      console.error("guidance/opening error:", err);
      return res.status(500).json({ message: "opening failed" });
    }
  });

  // ── Guidance weekly allowance — includes 7-day new-user trial ────────────────
  app.get("/api/guidance/weekly-allowance", async (req, res) => {
    const sessionId = (req.query.sessionId as string) || "";
    const isPro = req.query.isPro === "true";

    // Use server-computed days — never trust the client-sent value
    const daysWithApp = sessionId ? getServerDaysWithApp(sessionId) : 999;

    // Pro users: unlimited
    if (isPro) return res.json({ unlimited: true, used: 0, limit: null, remaining: null });

    // 7-day new user trial: unlimited Talk It Through for first week
    if (daysWithApp <= 7) return res.json({ unlimited: true, used: 0, limit: null, remaining: null, trial: true });

    // Check rotating free trial (e.g. "Unlimited Talk It Through" fortnight)
    if (freeTrialGrants("talk_it_through")) return res.json({ unlimited: true, used: 0, limit: null, remaining: null, trial: true });

    // Standard free: 3 conversations per week
    const check = checkGuidanceWeeklyLimit(sessionId);
    const remaining = Math.max(0, check.limit - check.used);
    return res.json({ unlimited: false, used: check.used, limit: check.limit, remaining });
  });

  app.post("/api/guidance/phase1", async (req, res) => {
    const { situation, sessionId } = req.body as {
      situation?: string;
      situationTopicId?: string;
      sessionId?: string;
    };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    if (situation.trim().length > 2000) return res.status(400).json({ message: "Input too long" });
    // Touch server-side first-seen so daysWithApp can't be spoofed via the weekly-allowance endpoint
    if (sessionId) touchSessionFirstSeen(sessionId);
    if (sessionId) incrementGuidanceConversationCount(sessionId);
    const daysWithApp: number = sessionId ? getServerDaysWithApp(sessionId) : (Number((req.body as any).daysWithApp) || 1);
    const isProGuidance = parseProFlag((req.body as any).isPro);
    const aiGuardPhase1 = checkAiDailyLimit(sessionId, daysWithApp, isProGuidance);
    if (!aiGuardPhase1.ok) {
      return res.status(aiGuardPhase1.status).json({
        message: aiGuardPhase1.message,
        limitReached: true,
      });
    }
    if (sessionId) storage.logAiUsage({ sessionId, feature: "guidance", daysWithApp, platform: "web" }).catch(() => { });
    // Track weekly conversation count for free users (trial and pro bypass the limit check)
    if (sessionId && !isProGuidance && daysWithApp > 7 && !freeTrialGrants("talk_it_through")) {
      recordGuidanceConversationStart(sessionId);
    }

    const phase1Safety = scanUserText(situation.trim());
    if (shouldBlockLlm(phase1Safety)) {
      writeSafetyBlock(res, phase1Safety.level, phase1Safety.response ?? CRISIS_RESPONSE);
      return;
    }
    const phase1SafetyNote = concerningSystemNote(phase1Safety);

    const companionMode = (req.body as any).companionMode as string | undefined;
    const isSoloMode = companionMode === "solo";
    const userName = (req.body as any).userName as string | undefined;
    const nameNote = userName
      ? `\n\nTheir name is ${userName}. You may use it once, gently, only if it feels natural.`
      : "";
    const phase1HeartCtx = ((req.body as any).heartContext as string | undefined)?.trim() || "";
    const phase1HeartNote = phase1HeartCtx
      ? `\n\nHeart check context: ${phase1HeartCtx} Let this quietly shape your tone — don't reference it directly, just meet them where they are.`
      : "";
    const soloSystemPrompt = `You are providing Christian spiritual guidance inside Shepherd's Path. Do not refer to yourself as Philip. Do not use companion-persona language. Do not say "I'm here with you." Offer calm, biblical, emotionally honest guidance. Be direct, gentle, and grounded in Scripture. One faithful question to go deeper. Under 100 words. No verse, no prayer, no advice yet.`;

    try {
      const systemPrompt = isSoloMode
        ? `${soloSystemPrompt}${nameNote}${phase1SafetyNote}`
        : `${buildVariantSystemPrompt(sessionId ?? "", "phase1").prompt}${nameNote}${phase1HeartNote}${phase1SafetyNote}`;
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: situation.trim() },
      ];

      // Phase 1 is short (~80 words). Generate non-streaming so we can enforce
      // the "never start with I" rule with a retry before sending to the client.
      // 20s timeout per attempt — well under nginx's 60s limit even with retry.
      const generate = async (msgs: OpenAI.Chat.ChatCompletionMessageParam[]) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20_000);
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: msgs,
            max_tokens: 95,
            temperature: 0.72,
          }, { signal: controller.signal });
          return (completion.choices[0]?.message?.content ?? "").trim();
        } finally {
          clearTimeout(timer);
        }
      };

      let phase1Text = await generate(messages);

      // If response starts with "I", retry once with an explicit correction note.
      const startsWithI = (t: string) =>
        /^I\s/.test(t) || t.startsWith("I'") || t.startsWith("I,") || t.startsWith("I.");
      if (startsWithI(phase1Text)) {
        const retryMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          ...messages,
          { role: "assistant", content: phase1Text },
          { role: "user", content: "[SYSTEM: Your response began with the word 'I'. This violates a hard rule. Rewrite the entire response from scratch. The FIRST WORD must not be 'I'. Begin with what the person said, the situation, or the emotional weight — never 'I'.]" },
        ];
        const retried = await generate(retryMessages);
        if (retried.length > 10 && !startsWithI(retried)) {
          phase1Text = retried;
        } else if (retried.length > 10) {
          // Retry also started with I — capitalize second sentence as opener
          const withoutLeadI = retried.replace(/^I[\s',.]?\s*/i, "");
          if (withoutLeadI.length > 20) phase1Text = withoutLeadI.charAt(0).toUpperCase() + withoutLeadI.slice(1);
        }
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.write(phase1Text);
      res.end();

      if (sessionId) {
        const { variant: p1Variant } = buildVariantSystemPrompt(sessionId, "phase1");
        const p1MsgCount = incrementMessageCount(sessionId);
        const crisisTriggered = detectCrisisSignal(situation ?? "");
        void logAbInteraction({ sessionId, variant: p1Variant, phase: "phase1", messageCount: p1MsgCount, crisisTriggered });
      }
    } catch (err) {
      console.error("guidance phase1 error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Failed" });
    }
  });

  // ── Guidance: first pastoral response to a shared situation (streaming) ────

  app.post("/api/guidance/response", async (req, res) => {
    const { situation, messages, userName } = req.body as {
      situation?: string;
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
      userName?: string;
      phase1Response?: string;
      phase1UserReply?: string;
    };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    if (situation.trim().length > 2000) return res.status(400).json({ message: "Input too long" });
    const sessionId = (req.body as any).sessionId as string | undefined;
    const guidanceMode: string = (req.body as any).guidanceMode || "encouraging";
    const daysWithApp: number = Number((req.body as any).daysWithApp) || 1;
    const isProGuidance = parseProFlag((req.body as any).isPro);
    const modeNote = buildModeNote(guidanceMode);
    const phase1Response = (req.body as any).phase1Response as string | undefined;
    const phase1UserReply = (req.body as any).phase1UserReply as string | undefined;
    const isTwoPhaseCompletion = !!(phase1Response?.trim() && phase1UserReply?.trim());

    if (isTwoPhaseCompletion) {
      if (!sessionId) {
        return res.status(400).json({ message: "session required", limitReached: true });
      }
      const cap = aiDailyCap(daysWithApp, isProGuidance);
      if (getDailyUsageCount(sessionId) > cap) {
        return res.status(429).json({
          message: isProGuidance
            ? "You've had a very full day of conversation. Pick up tomorrow — we're still here."
            : "You've had a full day of reflection. Rest with what you've received — or continue with Pro.",
          limitReached: true,
        });
      }
    } else {
      const aiGuardGuidance = checkAiDailyLimit(sessionId, daysWithApp, isProGuidance);
      if (!aiGuardGuidance.ok) {
        return res.status(aiGuardGuidance.status).json({
          message: aiGuardGuidance.message,
          limitReached: true,
        });
      }
      if (sessionId) storage.logAiUsage({ sessionId, feature: "guidance", daysWithApp, platform: "web" }).catch(() => { });
    }

    const guidanceSafety = scanGuidanceTexts({
      situation: situation.trim(),
      phase1UserReply,
      messages,
    });
    if (shouldBlockLlm(guidanceSafety)) {
      writeSafetyBlock(res, guidanceSafety.level, guidanceSafety.response ?? CRISIS_RESPONSE);
      return;
    }
    const guidanceSafetyNote = concerningSystemNote(guidanceSafety);

    const presenceMode: string = (req.body as any).presenceMode || "normal";
    const isSighRoom = presenceMode === "sigh";

    if (isSighRoom) {
      const sighNameNote = userName
        ? ` Their name is ${userName}. Use it once, gently, only if natural.`
        : "";
      const sighModeNote = buildModeNote(guidanceMode);
      const sighSystem = `You are in the Sigh Room — a quiet pastoral space. Someone has shared something heavy.${sighNameNote}

Your ONLY job right now is MIRRORING — not fixing, not preaching, not offering Scripture or prayer yet.

Write 1–2 sentences (under 70 words total) that reflect back what they shared — the emotion beneath the words, not a summary of facts. Be specific to their words. Humble tone: you may say "What you shared carries weight" but NEVER "I completely understand" or "God told me."

Do NOT offer advice, action steps, bullet lists, or questions unless one soft optional question is truly needed (prefer zero questions).

Do NOT include Scripture references or prayer in this response.

${sighModeNote}

Sacred restraint: fewer words are better.`;

      const sighHistory: OpenAI.Chat.ChatCompletionMessageParam[] = messages?.length
        ? messages.map((m) => ({ role: m.role, content: m.content }))
        : [{ role: "user", content: situation.trim() }];

      try {
        await streamCompletion(
          [{ role: "system", content: sighSystem }, ...sighHistory],
          res,
          { temperature: 0.75, maxTokens: 120, req },
        );
      } catch (err) {
        console.error("sigh mirror error:", err);
        if (!res.headersSent) res.status(500).json({ message: "Failed" });
      }
      return;
    }

    const isFollowUp = !isTwoPhaseCompletion && messages && messages.length > 1;
    const lateNight: boolean = !!(req.body as any).isLateNight;

    // twoPhaseContext is now passed as conversation history (see conversationHistory below)
    // rather than re-injected into the system prompt — same context, ~200 fewer tokens/call.

    const nameNote = userName
      ? `\n\nThe person's name is ${userName}. Use their name naturally — once, early, in the first paragraph. Not at the very start of the sentence. Something like "...${userName}, what you're carrying..." or "...and ${userName}, that matters." Don't force it — only use it where it genuinely warms the response.`
      : "";

    // Fetch journal context, recent journal echo, memory verses, and user memory —
    // cached per session for 10 minutes so multi-turn conversations don't re-query on every turn
    const {
      journalContext: { context: journalCtx, count: journalEntryCount },
      recentEcho,
      savedVerses,
      userMemCtx,
    } = await getOrFetchSessionContext(sessionId || "");

    const memoryNote = journalCtx
      ? `\n\nWhat you already know about this person — from past conversations, prayers they've written, or journal entries. Use this to make your response feel like a continuation of a real relationship, not a first meeting. Reference past things only when it flows naturally and adds genuine warmth or depth. Never quote their entries back to them verbatim. Memory rules: only surface something from the past if it is directly relevant to what they just shared, recent enough to feel natural, and adds care rather than precision. When you do reference something, keep it soft and permissive — "This feels similar to something you mentioned before… if that still fits, we can stay with it" — never specific dates, never exact phrasing, never pattern claims like "you always" or "you tend to." Memory should feel like being known, not being recorded:\n${journalCtx}`
      : "";

    // #5 — Journal echo: recent personal writings from the last 7 days
    const journalEchoNote = recentEcho
      ? `\n\nThis person has written the following in their journal in the last few days. Let this awareness quietly shape how you listen and respond — the themes you notice, the depth you bring, the questions you ask. Do not reference the entries directly. Do not say "you wrote" or "a few days ago you said." The journal is sacred space. You carry what you know about them in the background, not the foreground. If something connects, let it surface in your presence — not your citation.${"\n\n"}Recent entries:\n${recentEcho}`
      : "";

    // #3 — Memory verse integration: verses they've saved to memorize
    const memoryVerseNote = savedVerses
      ? `\n\nThis person has saved these scriptures to memorize:\n${savedVerses}\n\nIf any of these feel directly relevant to what they're carrying right now — not forced, not generic — you may surface one naturally. Something like "You've been sitting with [reference] — I think that verse was waiting for a moment like this one." Only do this if the connection is real and the timing feels right. Never force it.`
      : "";

    // #1 — Walking the path: tonal shift based on genuine engagement signals
    // Triggered when someone has been journaling consistently, has saved scripture
    // to memorize, and has been returning long enough for real formation to have happened.
    // No announcement. No milestone. The guide simply begins trusting them differently.
    const isWalkingThePath =
      journalEntryCount >= 7 &&    // they've been writing their inner life
      !!savedVerses &&              // they're engaging scripture intentionally
      daysWithApp >= 21;            // enough return for patterns to form

    const walkingThePathNote = isWalkingThePath
      ? `\n\nTonal shift — this person has been walking the path, not just visiting it. They have journaled consistently, they have been memorizing scripture, and they have been returning for weeks. Something real has been built in them. Your tone should shift subtly from this moment forward: stop leading and start trusting. You are no longer introducing them to God or to the process of reflection — you are walking alongside someone who already knows the terrain. Ask questions that assume they have access to wisdom they've been cultivating. When they share something, reflect back the growth you sense in how they're framing it — not by congratulating them, but by engaging them at a deeper level. Trust their discernment. When there's a question to ask, ask the harder one — the one a mentor asks someone they believe in, not the one a guide asks someone they're still teaching. Do not announce this shift. Do not reference their progress or their streak. Simply treat them like someone who already knows how to walk with God and is asking you to walk alongside them.`
      : "";

    // #2 — Acute pain mode: when someone is in raw, immediate grief or shock
    const acutePainMode = !isFollowUp && isAcutePain(situation);
    const acutePainNote = acutePainMode
      ? `\n\nACUTE PAIN — PRESENCE FIRST: This person is in raw, immediate pain — grief, devastating news, shock, or profound loss. Lead with full presence. Do not pivot toward hope, resolution, or triumph language. Do not use silver linings, "everything happens for a reason," or "God needed another angel." Do not force Scripture — one gentle verse may fit naturally if it honors grief without explaining it away. Do not end with a reflective question if safety may be at risk. Under 160 words.`
      : "";

    const relationshipNote = buildRelationshipNote(daysWithApp, journalEntryCount);

    const lateNightNote = lateNight
      ? `\n\nNight context: It is the middle of the night and this person has opened Shepherd's Path at this late hour. Something brought them here when the world is asleep. This changes how you begin. Your first paragraph should feel like someone quietly sitting down beside them — not starting a lesson, not rushing to scripture or a path forward. Simply be fully present with the fact that it is late and they are here. Let your unhurried tone carry that weight without announcing it. Be slower. Be warmer. Hold presence before you hold scripture. If they are in pain, do not hurry them toward resolution.`
      : "";

    // #6 — Deep conversation note: after 4+ exchanges, gently point beyond the app once
    const conversationDepth = messages?.length ?? 0;
    const deepConversationNote = conversationDepth >= 8
      ? `\n\nConversation depth — this person has been talking with you for a while now. You've earned real trust in this conversation. At some natural point in your response — not forced, not as a closing formula — gently point them beyond this conversation once. Something like: "This might be worth bringing to someone you trust — a pastor, a close friend." Or: "Bring this into your own prayer beyond this moment too." Say it where it fits, then let it rest. The app supports spiritual life. It does not replace it.`
      : "";

    const userPatternNote = buildMemoryPromptNote(userMemCtx);

    const voiceProfile = getVoiceProfile(userMemCtx.spiritualState);
    const voiceNote = buildVoicePromptNote(voiceProfile);

    const { prompt: variantPrompt, variant: responseVariant } = buildVariantSystemPrompt(sessionId ?? "", "response");

    const heartContext = ((req.body as any).heartContext as string | undefined)?.trim() || "";
    const heartNote = heartContext
      ? `\n\nHeart check context — before this conversation began, this person shared how they're doing: ${heartContext} Let this quietly shape your emotional register and opening — not as something to reference directly ("you mentioned you're feeling heavy"), but as context that informs how you receive and respond to them. Meet them where they actually are.`
      : "";

    // Generate structured conversation state for follow-up exchanges
    // This gives Philip an explicit map of what's been heard, asked, and explored
    let conversationStateBlock = "";
    if (isFollowUp && messages?.length) {
      try {
        const state = await generateConversationState(openai, situation.trim(), messages);
        conversationStateBlock = buildStatePromptBlock(state);
      } catch {
        // Non-fatal — continue without state block
      }
    } else if (!isFollowUp) {
      // Check closing intent for two-phase flow too
      const lastMsg = phase1UserReply?.trim() ?? "";
      if (detectConversationClosing(lastMsg)) {
        conversationStateBlock = buildStatePromptBlock({
          core_issue: situation.slice(0, 80),
          facts_learned: [], areas_explored: [], areas_unexplored: [],
          questions_asked: [], metaphors_used: [], user_exact_words: [],
          conversation_closing: true,
        });
      }
    }

    const systemMsg = `${variantPrompt}

${TALK_IT_THROUGH_RESPONSE_SCOPE}

${isFollowUp ? TALK_IT_THROUGH_FOLLOW_UP : TALK_IT_THROUGH_RESPONSE_EXAMPLES + "\n\n" + TALK_IT_THROUGH_FIRST_RESPONSE}${conversationStateBlock}

Safety and depth (when relevant — do not override Step 1–2 scope above):
— If someone expresses uncertainty about faith, meet them exactly there without assuming belief
— If someone describes controlling or unsafe relationships: reflect gently, validate impact, restore agency — do not diagnose or prescribe
— If someone is in shame (not guilt): lower temperature; receive them without evaluation
— If someone pushes back ("that didn't help"): own the miss, re-open warmly — never defend
— Never conclude the meaning of their story for them
— Never escalate emotionally beyond where they actually are${nameNote}${heartNote}${relationshipNote}${memoryNote}${journalEchoNote}${memoryVerseNote}${walkingThePathNote}${modeNote}${lateNightNote}${acutePainNote}${deepConversationNote}${userPatternNote}${voiceNote}${guidanceSafetyNote}${SCRIPTURAL_ALIGNMENT}${EMOTIONAL_TONE}${VOICE_AUTHENTICITY}`;

    // Build conversation history — for two-phase flow, include phase1 exchange as proper
    // message turns rather than re-injecting them into the system prompt
    let conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[];
    if (isTwoPhaseCompletion) {
      conversationHistory = [
        { role: "user", content: situation.trim() },
        { role: "assistant", content: phase1Response!.trim() },
        { role: "user", content: phase1UserReply!.trim() },
      ];
    } else if (messages?.length) {
      conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
    } else {
      conversationHistory = [{ role: "user", content: situation.trim() }];
    }

    // Step 1 of two-step generation: pick the best next question before writing anything.
    // This breaks the metaphor-recycling loop by forcing explicit movement to new territory.
    const generateNextQuestion = async (
      state: string,
      history: Array<{ role: "user" | "assistant"; content: string }>,
    ): Promise<string> => {
      const lastUserMessage = [...history].reverse().find(m => m.role === "user")?.content ?? "";
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 80,
        system: `You are helping a pastoral AI called Philip decide what to ask next.

Given the conversation state and history, output ONLY the single best question Philip should ask — nothing else. No preamble, no explanation.

Rules:
- The question must explore territory NOT YET covered (see state)
- It must NOT repeat or rephrase any question already asked (see state)
- It must connect directly to what the user JUST said: "${lastUserMessage.slice(0, 200)}"
- It must be specific to this person, not generic
- Under 20 words
- End with ?

Output the question only.`,
        messages: [{ role: "user", content: state }],
      });
      for (const block of response.content) {
        if (block.type === "text") return block.text.trim();
      }
      return "";
    };

    // Step 2: write Philip's response anchored to the pre-chosen question
    const generatePhase2WithClaude = async (
      system: string,
      history: Array<{ role: "user" | "assistant"; content: string }>,
      anchoredQuestion: string,
    ) => {
      const anchorInstruction = anchoredQuestion
        ? `\n\nYour response MUST end with this exact question (you may adjust wording slightly for flow, but stay faithful to its intent and keep it specific):\n"${anchoredQuestion}"`
        : "";
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 120,
        system: system + anchorInstruction,
        messages: history,
      });
      for (const block of response.content) {
        if (block.type === "text") return block.text.trim();
      }
      return "";
    };

    const generatePhase2WithGPT = async (msgs: OpenAI.Chat.ChatCompletionMessageParam[]) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: msgs,
          max_tokens: 290,
          temperature: 0.78,
        }, { signal: controller.signal });
        return (completion.choices[0]?.message?.content ?? "").trim();
      } finally {
        clearTimeout(timer);
      }
    };

    const questionMarkCount = (t: string) => (t.match(/\?/g) ?? []).length;

    try {
      let phase2Text: string;

      let nextQuestion = "";
      let usedMechanicalConstruction = false;
      if (isFollowUp && process.env.ANTHROPIC_API_KEY) {
        const claudeHistory = conversationHistory as Array<{ role: "user" | "assistant"; content: string }>;
        const isClosing = conversationStateBlock.includes("CLOSING");

        if (isClosing) {
          // User is leaving — one brief warm sentence, no question
          const closingSystem = `You are Philip, a pastoral companion. The person is ending this conversation.
Write exactly 1-2 warm sentences acknowledging the conversation. Do NOT ask any question. Do NOT include a "?". Under 30 words.`;
          phase2Text = await generatePhase2WithClaude(closingSystem, claudeHistory, "");
        } else {
          // Step 1: choose the best next question explicitly
          if (conversationStateBlock) {
            try {
              nextQuestion = await generateNextQuestion(conversationStateBlock, claudeHistory);
            } catch {
              // Non-fatal — fall through to unanchored generation
            }
          }

          if (nextQuestion) {
            // Use the pre-decided question as the entire response.
            // A genuinely new, specific question scores better than any poetic preamble.
            phase2Text = nextQuestion;
            usedMechanicalConstruction = true;
          } else {
            phase2Text = await generatePhase2WithClaude(systemMsg, claudeHistory, "");
          }
        }
      } else {
        // First response (two-phase flow): GPT-4o for voice consistency
        const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: "system", content: systemMsg },
          ...conversationHistory,
        ];
        phase2Text = await generatePhase2WithGPT(fullMessages);
      }

      const qCount = questionMarkCount(phase2Text);

      if (qCount !== 1 && !conversationStateBlock.includes("CLOSING") && !usedMechanicalConstruction) {
        // Retry with Claude if it returned the wrong number of question marks
        if (isFollowUp && process.env.ANTHROPIC_API_KEY) {
          const retrySystem = systemMsg + `\n\n[CRITICAL: Your response must contain exactly one question mark. Currently has ${qCount}. ${qCount === 0 ? "End with one specific question." : "Remove all questions except the single most important one."}]`;
          const retried = await generatePhase2WithClaude(retrySystem, conversationHistory as Array<{ role: "user" | "assistant"; content: string }>, nextQuestion);
          if (retried.length > 20 && questionMarkCount(retried) === 1) {
            phase2Text = retried;
          }
        } else {
          const retryInstruction = qCount === 0
            ? "[SYSTEM: Your response contains no question mark. You must end with exactly one genuine question specific to what this person shared. Add it now — do not change anything else.]"
            : `[SYSTEM: Your response contains ${qCount} question marks. There must be exactly one question in the entire response. Remove all but the single most important question — the one most specific to this person's exact words. Rewrite the response with only that one question.]`;
          const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: systemMsg },
            ...conversationHistory,
          ];
          const retryMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            ...fullMessages,
            { role: "assistant", content: phase2Text },
            { role: "user", content: retryInstruction },
          ];
          const retried = await generatePhase2WithGPT(retryMessages);
          if (retried.length > 20 && questionMarkCount(retried) === 1) {
            phase2Text = retried;
          }
        }
        // If retry still wrong, send original — don't block the user
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.write(phase2Text);
      res.end();

      if (sessionId) {
        const responseMsgCount = incrementMessageCount(sessionId);
        void logAbInteraction({ sessionId, variant: responseVariant, phase: "response", messageCount: responseMsgCount });
      }
    } catch (err) {
      console.error("guidance response error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Failed" });
    }
  });

  // ── Guidance: save silent memory from a completed guidance session ──────────
  app.post("/api/guidance/save-memory", async (req, res) => {
    const { situation, response, sessionId, stage } = req.body as {
      situation?: string; response?: string; sessionId?: string; stage?: "pending" | "complete";
    };
    if (!situation?.trim() || !sessionId) {
      return res.status(400).json({ message: "missing fields" });
    }
    const isPending = stage === "pending";
    if (!isPending && !response?.trim()) {
      return res.status(400).json({ message: "missing fields" });
    }
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: isPending ? 100 : 180,
        messages: [
          {
            role: "system",
            content: isPending
              ? `From what this person just shared, return JSON only:
{"summary":"1 sentence internal note","carryForward":"ONE sentence, second person, ≤25 words — emotional weight they are carrying, NOT proper names or diagnoses. Hold the door open; do not declare facts. Good: You were carrying something heavy about someone you love. Bad: You were dealing with a difficult time."}`
              : `Extract a spiritual memory from a Talk It Through session. Return JSON only:
{"summary":"1-2 sentences for internal context","carryForward":"ONE sentence, second person, ≤25 words — emotional register and weight, NOT proper names or medical labels. No 'I remember'. Good: You were carrying a lot as something heavy with health drew near. Bad: You were going through a difficult time."}

Rules: specific emotional weight not generic; do not permanently label their whole life as grief/crisis from one conversation.`,
          },
          {
            role: "user",
            content: isPending
              ? `They just shared: "${situation.slice(0, 600)}"`
              : `Their situation: "${situation.slice(0, 600)}"\n\nThe guidance they received began: "${(response ?? "").slice(0, 400)}"`,
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content?.trim();
      const parsed = raw ? extractMemoryJsonFromModel(raw) : null;
      const summary = parsed?.summary ?? raw;
      if (summary && summary.length > 12) {
        const payload = parsed ?? { summary };
        const cf = payload.carryForward ? sanitizeCarryForwardForSpeech(payload.carryForward) : undefined;
        const entry = await storage.createJournalEntry({
          sessionId,
          type: "guidance_memory",
          content: serializeGuidanceMemory({ summary: payload.summary, carryForward: cf }),
          title: undefined,
        });
        return res.status(200).json({ ok: true, id: String(entry.id) });
      }
      res.status(200).json({ ok: true, id: null });
    } catch (err) {
      console.error("[memory] save failed:", err);
      res.status(500).json({ message: "failed" });
    }
  });

  // ── Hold This With Me — Philip receives and returns prayer holds ──────────────
  app.post("/api/guidance/hold-receive", async (req, res) => {
    const { holdText, userName } = req.body as { holdText?: string; userName?: string };
    if (!holdText?.trim()) return res.status(400).json({ message: "holdText required" });
    const namePart = userName ? `The person's name is ${userName}. ` : "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: `You are Philip — a Spirit-filled shepherd in Shepherd's Path. ${namePart}Someone just handed you something to hold before God in prayer. Respond in 1–2 sentences. Receive it warmly. Do not analyze it. Do not offer advice. Do not promise an outcome. Just receive it and commit to returning to it. Your voice: plain, warm, faithful. Never say "God told me." Never claim to know how God will answer. Sound like a shepherd, not a chatbot.`,
        }, {
          role: "user",
          content: `They asked you to hold this in prayer: "${holdText.trim()}"`,
        }],
        temperature: 0.8,
        max_tokens: 80,
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      return res.json({ text });
    } catch (err) {
      console.error("hold-receive error:", err);
      return res.status(500).json({ message: "failed" });
    }
  });

  app.post("/api/guidance/hold-return", async (req, res) => {
    const { holdText, daysHeld, userName } = req.body as { holdText?: string; daysHeld?: number; userName?: string };
    if (!holdText?.trim()) return res.status(400).json({ message: "holdText required" });
    const namePart = userName ? `Their name is ${userName}. ` : "";
    const daysLine = daysHeld ? `You have been holding this for ${daysHeld} day${daysHeld !== 1 ? "s" : ""}.` : "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: `You are Philip — a Spirit-filled shepherd returning to something a person asked you to hold before God. ${namePart}${daysLine} In 1–2 sentences, return to it — not as a reminder, but as a shepherd who has been carrying this alongside them. Ask one gentle, open question about where their heart is now with it. Do not claim to know what God has done. Do not offer outcomes. Sound like someone returning to a real conversation, not triggering a notification.`,
        }, {
          role: "user",
          content: `You have been holding this: "${holdText.trim()}". Return to it now.`,
        }],
        temperature: 0.82,
        max_tokens: 90,
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      return res.json({ text });
    } catch (err) {
      console.error("hold-return error:", err);
      return res.status(500).json({ message: "failed" });
    }
  });

  // ── The Pattern Philip Has Been Holding ───────────────────────────────────────
  app.post("/api/guidance/pattern", async (req, res) => {
    const { situation, sessionId, userName } = req.body as {
      situation?: string; sessionId?: string; userName?: string;
    };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });

    const namePart = userName ? `Their name is ${userName}. ` : "";
    let memNote = "";
    if (sessionId) {
      try {
        const ctx = await getMemoryContext(sessionId);
        const parts: string[] = [];
        if (ctx.dominantEmotion) parts.push(`Dominant emotion across conversations: ${ctx.dominantEmotion}`);
        if (ctx.recentEmotions.length) parts.push(`Recent emotions: ${ctx.recentEmotions.slice(0, 5).join(", ")}`);
        if (ctx.recentTrend) parts.push(`Trend: ${ctx.recentTrend}`);
        if (ctx.spiritualState) parts.push(`Spiritual state: ${ctx.spiritualState}`);
        if (ctx.naturalLanguageHint) parts.push(`Pattern note: ${ctx.naturalLanguageHint}`);
        memNote = parts.join(". ");
      } catch { /* noop */ }
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: `You are Philip — a Spirit-filled shepherd who has walked with someone through several conversations. ${namePart}

You are writing ONE pattern statement — the thread you have been noticing across their conversations that they have not fully named themselves. This is not diagnosis. Not therapy. Not analytics. It is shepherding.

Rules:
- 2–4 sentences only
- Begin with "The pattern I'm noticing is not…" or "What I keep hearing beneath your words is…" or a similar humble, permission-seeking frame
- Name what is underneath the presenting issue — the fear under the productivity, the grief under the anger, the calling under the exhaustion
- Never say "God told me" or "I know that" — say "I'm noticing" or "I may be wrong, but…" or "Can I say what I'm hearing?"
- Never use clinical language: no "trauma," "attachment issues," "behavior patterns"
- Never claim certainty about God's specific will
- If memory context is weak, name one honest thing from the current situation rather than inventing a pattern
- End with one question that invites the person to weigh in: "Does that feel true, or am I off?"

Memory context: ${memNote || "limited — work from the current situation only"}`,
        }, {
          role: "user",
          content: `Current session situation: "${situation.trim().slice(0, 800)}"`,
        }],
        temperature: 0.78,
        max_tokens: 140,
      });
      const pattern = completion.choices[0]?.message?.content?.trim() ?? "";
      return res.json({ pattern });
    } catch (err) {
      console.error("pattern error:", err);
      return res.status(500).json({ message: "failed" });
    }
  });

  // ── Guidance: Witness Letter ─────────────────────────────────────────────────
  app.post("/api/guidance/witness-letter", async (req, res) => {
    const { situation, messages, phase1Response, userName, sessionId } = req.body as {
      situation?: string;
      messages?: Array<{ role: string; content: string }>;
      phase1Response?: string;
      userName?: string;
      sessionId?: string;
    };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });

    const namePart = userName ? `The person's name is ${userName}. ` : "";
    const convo = [
      situation.trim(),
      phase1Response?.trim(),
      ...(messages ?? []).map((m) => `${m.role === "user" ? "They said" : "Philip said"}: ${m.content}`),
    ].filter(Boolean).join("\n\n").slice(0, 3000);

    const systemPrompt = `You are Philip — a Spirit-filled shepherd inside Shepherd's Path. ${namePart}

You just walked with someone through a meaningful conversation. Now you are writing a Witness Letter.

A Witness Letter is NOT:
- A summary
- A diagnosis
- Therapy notes
- Advice
- A list of takeaways

A Witness Letter IS:
What you saw in the person while they were talking. Not the topic — the person.

Structure — write in this order:
1. "I saw…" — name one thing you genuinely witnessed in them (faith, courage, grief, hiding, longing, honesty, fear, love)
2. "I also saw…" — name something underneath the first thing, or alongside it
3. "Do not forget…" — one thing worth holding
4. One closing sentence of blessing, truth, or gentle courage — no platitudes

Rules:
- 120–200 words total
- Speak directly to them, second person ("you", not "they")
- Philip's voice: warm, plain, spiritually unafraid — not poetic performance
- Never say "God told me" — say "I saw" or "I noticed" or "what I witnessed"
- Never minimize what was hard. Never rush to triumph.
- If they were hiding or deflecting, name it gently — not as accusation, as invitation
- Sound like a trusted shepherd who has been paying attention, not an AI generating content`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is what was shared in the conversation:\n\n${convo}\n\nWrite the Witness Letter.` },
        ],
        temperature: 0.82,
        max_tokens: 280,
      });
      const letter = completion.choices[0]?.message?.content?.trim() ?? "";
      return res.json({ letter });
    } catch (err) {
      console.error("witness-letter error:", err);
      return res.status(500).json({ message: "failed" });
    }
  });

  // ── Guidance: personalized session send-off ──────────────────────────────────
  app.post("/api/guidance/send-off", async (req, res) => {
    const { situation, userName, sessionId, timezone, verseReference } = req.body as {
      situation?: string; userName?: string; sessionId?: string; timezone?: string; verseReference?: string;
    };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    const nameNote = userName?.trim() ? ` Their name is ${userName.trim()}.` : "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 60,
        temperature: 0.85,
        messages: [
          {
            role: "system",
            content: `You write a single closing sentence — a send-off — for someone who just finished a Talk It Through session.${nameNote}

Rules:
- ONE sentence only. Under 18 words.
- Do NOT quote or paraphrase their words back to them.
- Read the emotional register (grief, fear, anxiety, gratitude, seeking, relief, joy) and reflect the ESSENCE — what it meant, not what they said.
- Sound like a trusted friend who just walked with them through something real.
- Warm, specific to the emotional tone, never generic.
- Never start with "You" as the first word more than occasionally. Vary the opening.
- Never use: "journey", "path forward", "healing", "this too shall pass", "God's plan", "blessed".
- Examples of good send-offs:
  "Carrying something that heavy here took real courage."
  "What you named today mattered — more than you may know right now."
  "That kind of honesty before God doesn't go unnoticed."
  "Grief and faith can live in the same breath. You showed that today."
  "Gratitude like that is its own kind of prayer."
  "Whatever tomorrow holds, you didn't face today alone."`,
          },
          {
            role: "user",
            content: situation.trim().slice(0, 800),
          },
        ],
      });
      const sendOff = completion.choices[0]?.message?.content?.trim();
      // Schedule morning follow-up if user has an Expo push token
      if (sessionId) {
        storage.getExpoPushTokenBySessionId(sessionId).then(tokenRow => {
          if (tokenRow?.token) {
            scheduleGuidanceFollowUp(
              sessionId,
              tokenRow.token,
              timezone ?? "America/New_York",
              situation.trim().slice(0, 60),
              verseReference,
            );
          }
        }).catch(() => { /* non-critical */ });
      }
      if (!sendOff) return res.json({ sendOff: "What you brought here today mattered." });
      res.json({ sendOff });
    } catch {
      res.json({ sendOff: "What you brought here today mattered." });
    }
  });

  // ── Guidance: closing prayer (Phase 5) ──────────────────────────────────────
  app.post("/api/guidance/closing-prayer", async (req, res) => {
    const { situation, userName, verseReference, phase1Response } = req.body as {
      situation?: string; userName?: string; verseReference?: string; phase1Response?: string;
    };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    const nameNote = userName?.trim() ? ` Their name is ${userName.trim()}.` : "";
    const verseNote = verseReference?.trim() ? ` The verse offered was ${verseReference.trim()}.` : "";
    const phase1Note = phase1Response?.trim() ? ` Philip's reflection to them: "${phase1Response.trim().slice(0, 300)}"` : "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 120,
        temperature: 0.75,
        messages: [
          {
            role: "system",
            content: `You are Philip — a Spirit-filled shepherd in Shepherd's Path.${nameNote} Write a brief closing prayer for someone who just brought something heavy to God in a Talk It Through session.${verseNote}${phase1Note}

Rules:
- Pray TO God, not about the person. Address God directly ("Lord", "Father", "God").
- Use the person's name if you have it, once.
- Under 65 words. 3-4 sentences maximum.
- Name what they carried — without quoting their words back exactly. Name the weight and the act of bringing it.
- Do NOT promise healing, outcomes, or resolution. Do NOT say "work in their life" or "healing journey."
- End with "Amen."
- Sound like a shepherd's prayer — plain, honest, specific. Not a polished pulpit prayer.
- Never use: "journey", "path forward", "healing", "blessed", "pour out", "move in mighty ways".`,
          },
          {
            role: "user",
            content: situation.trim().slice(0, 600),
          },
        ],
      });
      const prayer = completion.choices[0]?.message?.content?.trim();
      if (!prayer) return res.json({ prayer: "Lord, they brought something real to you today. Hold it. Hold them. Amen." });
      res.json({ prayer });
    } catch {
      res.json({ prayer: "Lord, they brought something real to you today. Hold it. Hold them. Amen." });
    }
  });

  // ── Guidance: session feedback (did this help?) ──────────────────────────────
  app.post("/api/guidance/feedback", async (req, res) => {
    const { sessionId, feedback, situation, path: completionPath } = req.body as {
      sessionId?: string; feedback?: string; situation?: string; path?: string;
    };
    if (!sessionId || !feedback) return res.status(400).json({ message: "missing fields" });
    try {
      const pathNote = completionPath ? `[${completionPath}] ` : "";
      await storage.createJournalEntry({
        sessionId,
        type: "guidance_feedback",
        content: `${pathNote}${feedback}`,
        title: situation?.slice(0, 120) ?? undefined,
      });
      res.json({ ok: true });
    } catch {
      res.json({ ok: true }); // never surface errors to user for feedback
    }
  });

  // ── Witness Letter — quiet continuity from last guidance memory ───────────────
  app.get("/api/guidance/witness-letter", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    if (isRateLimited(`witness:${sessionId}`, 8, 3_600_000)) {
      return res.status(429).json({ message: "Too many requests" });
    }
    try {
      const entries = await storage.getJournalEntries(sessionId);
      const latest = entries.find((e) => e.type === "guidance_memory");
      if (!latest?.content) return res.json({ id: null, letter: null });

      const created = new Date(latest.createdAt).getTime();
      const ageMs = Date.now() - created;
      if (ageMs > 60 * 24 * 60 * 60 * 1000) {
        return res.json({ id: null, letter: null });
      }
      if (ageMs < 2 * 60 * 60 * 1000) {
        return res.json({ id: null, letter: null });
      }
      if (ageMs < 4 * 60 * 60 * 1000) {
        return res.json({
          id: String(latest.id),
          letter: "You were here earlier today. Still carrying it?",
        });
      }

      const memory = parseGuidanceMemoryContent(latest.content);
      if (memory.carryForward && memory.carryForward.length >= 12 && ageMs <= 7 * 24 * 60 * 60 * 1000) {
        return res.json({
          id: String(latest.id),
          letter: sanitizeCarryForwardForSpeech(memory.carryForward),
        });
      }

      const sourceText = memory.summary.slice(0, 500);
      const patternMode = ageMs > 7 * 24 * 60 * 60 * 1000;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 90,
        messages: [
          {
            role: "system",
            content: patternMode
              ? `Write 1-2 sentences for a spoken welcome back — softer, pattern-level only. End with an open check-in, not a declaration. No "I remember". Under 35 words. Example: Something brought you back — that matters. What's with you today?`
              : `Write 1-2 sentences for a spoken welcome back — reflect emotional weight (below), not specific names or diagnoses. Open door, don't declare. No advice or Scripture. Under 45 words.`,
          },
          { role: "user", content: sourceText },
        ],
      });
      const letter = completion.choices[0]?.message?.content?.trim();
      if (!letter || letter.length < 12) {
        return res.json({ id: null, letter: null });
      }
      res.json({ id: String(latest.id), letter });
    } catch (err) {
      console.error("[witness-letter]", err);
      res.status(500).json({ message: "failed" });
    }
  });

  // ── User Memory: update emotional pattern ─────────────────────────────────────
  app.post("/api/memory/update", async (req, res) => {
    const { sessionId, emotionKey, daysWithApp = 0, journalCount = 0, wasGap = false } = req.body as {
      sessionId?: string; emotionKey?: string;
      daysWithApp?: number; journalCount?: number; wasGap?: boolean;
    };
    if (!sessionId || !emotionKey) {
      return res.status(400).json({ message: "sessionId and emotionKey required" });
    }
    try {
      await updateMemory(sessionId, { emotionKey, daysWithApp, journalCount, wasGap });
      res.json({ ok: true });
    } catch (err) {
      console.error("[memory/update]", err);
      res.status(500).json({ message: "failed" });
    }
  });

  // ── User Memory: retrieve context for AI personalisation ──────────────────────
  app.get("/api/memory/context", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const ctx = await getMemoryContext(sessionId);
      res.json(ctx);
    } catch (err) {
      console.error("[memory/context]", err);
      res.status(500).json({ message: "failed" });
    }
  });

  // ── Guidance: Verse + Personal Prayer ─────────────────────────────────────────
  app.post("/api/guidance/verse-and-prayer", async (req, res) => {
    const { situation, userName, sessionId: sid } = req.body as {
      situation?: string; userName?: string; sessionId?: string;
      phase1UserReply?: string;
    };
    const presenceMode: string = (req.body as any).presenceMode || "normal";
    const fields: string = (req.body as any).fields || "both";
    const isSighRoom = presenceMode === "sigh";
    const isNightShepherd = presenceMode === "night";
    const isSacredVp = isSighRoom || isNightShepherd;
    const vpDaysWithApp: number = Number((req.body as any).daysWithApp) || 1;
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    if (sid && isRateLimited(`vp:${sid}`, 12, 3_600_000)) {
      return res.status(429).json({ message: "Too many requests" });
    }
    const isProVp = parseProFlag((req.body as any).isPro);
    const aiGuardVp = checkAiDailyLimit(sid, vpDaysWithApp, isProVp);
    if (!aiGuardVp.ok) {
      return res.status(aiGuardVp.status).json({ message: aiGuardVp.message, limitReached: true });
    }
    if (sid) storage.logAiUsage({ sessionId: sid, feature: "verse_prayer", daysWithApp: vpDaysWithApp, platform: "web" }).catch(() => { });
    const phase1UserReplyEarly = (req.body as { phase1UserReply?: string }).phase1UserReply;
    const vpSafety = scanGuidanceTexts({ situation: situation.trim(), phase1UserReply: phase1UserReplyEarly });
    if (shouldBlockLlm(vpSafety)) {
      res.setHeader(SAFETY_HEADER, vpSafety.level);
      return res.json({ verse: "", prayer: vpSafety.response ?? CRISIS_RESPONSE });
    }
    try {
      const nameNote = userName ? ` The person's name is ${userName}.` : "";
      const nightVpSystem = `You are Night Shepherd — someone is awake between 10pm and 5am.${nameNote} Return JSON only.

Fields requested: "${fields}" (verse | prayer | both).

Always include "rationale": one soft sentence (under 22 words) for why this Scripture fits this night — not preachy.

If verse requested: "verse" with "reference" and "text" (ESV/NIV, 1–2 sentences max). Choose a verse for sleeplessness, fear, grief, loneliness, or holy quiet — avoid cliché. Verse text only — no intro inside text.

If prayer requested: "prayer" as a WHISPER-SHORT first-person prayer (3–5 sentences max). Unhurried. For the middle of the night. Naming + one request + rest. End with Amen. Start with God/Lord/Father. No upbeat worship tone.

Return only keys needed plus rationale.`;

      const sighVpSystem = `You are in the Sigh Room — sacred, unhurried.${nameNote} Return JSON only.

Fields requested: "${fields}" (verse | prayer | both).

Always include "rationale": one plain sentence (under 25 words) explaining why this Scripture fits what they named — e.g. "You mentioned fear that won't let go — this speaks to that."

If verse requested: "verse" with "reference" and "text" (ESV/NIV, 1–3 sentences). No cliché verses. Do NOT prepend intro sentences inside text — verse text only.

If prayer requested: "prayer" as liturgical first-person prayer (4–6 sentences):
1) Naming what God sees in them (specific to their share)
2) One honest request
3) Resting release — end with Amen.
Start with God/Lord/Father — not Dear Heavenly Father. Raw and intimate, never template spam.

Return only keys needed for requested fields plus rationale.`;

      const vpSystem = isNightShepherd
        ? nightVpSystem
        : isSighRoom
          ? sighVpSystem
          : buildTalkItThroughVersePrayerPrompt(nameNote);

      const phase1UserReply = (req.body as { phase1UserReply?: string }).phase1UserReply;
      const userContent = isSacredVp
        ? situation.trim().slice(0, 1500)
        : buildTalkItThroughVersePrayerUserContent(situation, phase1UserReply);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: isSacredVp ? 700 : 800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: vpSystem,
          },
          { role: "user", content: userContent },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      res.json({
        verse: fields === "prayer" && isSacredVp ? null : parsed.verse ?? null,
        prayer: fields === "verse" && isSacredVp ? null : parsed.prayer ?? null,
        rationale: parsed.rationale ?? null,
      });
    } catch (err) {
      console.error("verse-and-prayer error:", err);
      res.status(500).json({ message: "Failed" });
    }
  });

  // ── Walk This Today ───────────────────────────────────────────────────────────
  app.post("/api/guidance/walk-today", async (req, res) => {
    const { situation, responseText } = req.body as { situation?: string; responseText?: string };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 250,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: TALK_IT_THROUGH_WALK_TODAY_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `What they shared: ${situation.trim().slice(0, 600)}\n\nGuidance they received: ${(responseText ?? "").trim().slice(0, 800)}`
          }
        ]
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      res.json({ action: parsed.action ?? null, scripture: parsed.scripture ?? null });
    } catch (err) {
      console.error("walk-today error:", err);
      res.status(500).json({ message: "Failed" });
    }
  });

  // ── Scripture That Finds You ──────────────────────────────────────────────────
  // Proactive verse surfacing — fires only when user has no engagement today.
  // Reads burden (from onboarding), recent journal context, and time of day.
  // Cached per sessionId per calendar day.
  const scriptureForYouCache = new Map<string, { date: string; verse: string; reference: string; why: string }>();

  app.post("/api/guidance/scripture-for-you", async (req, res) => {
    const { sessionId, burden, timeOfDay } = req.body as {
      sessionId?: string;
      burden?: string;
      timeOfDay?: "morning" | "midday" | "evening";
    };
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });

    const today = new Date().toISOString().split("T")[0];
    const cached = scriptureForYouCache.get(sessionId);
    if (cached && cached.date === today) return res.json(cached);

    try {
      const { context: journalContext } = await getJournalContext(sessionId);
      const memCtx = await getMemoryContext(sessionId);
      const memNote = buildMemoryPromptNote(memCtx);

      const burdenMap: Record<string, string> = {
        lost: "finding their way back to faith",
        "hard-season": "going through a difficult season",
        "grow-deeper": "wanting to grow deeper in faith",
        peace: "seeking peace and stillness",
        "coming-back": "returning to faith after time away",
        grateful: "in a season of gratitude",
      };
      const burdenNote = burden && burdenMap[burden]
        ? `When they started the app, they said they were ${burdenMap[burden]}.`
        : "";

      const timeNote = timeOfDay === "morning"
        ? "It is morning — the day is just beginning."
        : timeOfDay === "evening"
        ? "It is evening — the day is winding down."
        : "It is midday.";

      const journalNote = journalContext
        ? `Recent journal/prayer context:\n${journalContext}`
        : "No journal entries yet — this may be a new user.";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 160,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You surface one Scripture verse that meets a person exactly where they are today — not where you think they should be.

Rules:
- ONE verse only. ESV or NIV. Quote it exactly.
- "why" is one sentence, 12 words max, written as if you're handing them a note — not explaining, just naming what it carries. No "This verse..." or "God is saying..." Just the quiet reason it landed.
- Match the emotional register precisely. If they're in pain, go there. If they're grateful, celebrate it. If it's morning, meet the open day.
- No cliché verses. No John 3:16. No Jeremiah 29:11. No Philippians 4:13. Find the one that fits THIS person TODAY.
- Return JSON: { "verse": "...", "reference": "Book Chapter:Verse", "why": "..." }`,
          },
          {
            role: "user",
            content: `${timeNote}\n${burdenNote}\n${memNote ? memNote + "\n" : ""}${journalNote}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      if (!parsed.verse || !parsed.reference) {
        return res.status(500).json({ message: "No verse returned" });
      }

      const entry = {
        date: today,
        verse: parsed.verse,
        reference: parsed.reference,
        why: parsed.why ?? "",
      };
      scriptureForYouCache.set(sessionId, entry);
      res.json(entry);
    } catch (err) {
      console.error("scripture-for-you error:", err);
      res.status(500).json({ message: "Failed" });
    }
  });

  // ── The Thread — Weekly Spiritual Synthesis ───────────────────────────────────
  // Weaves the last 7 days of journal entries, prayers, verses, and guidance
  // into a short personal narrative. Cached per sessionId per calendar day.
  const threadCache = new Map<string, { date: string; narrative: string; anchorVerse: string | null; anchorRef: string | null }>();

  app.post("/api/guidance/the-thread", async (req, res) => {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });

    const today = new Date().toISOString().split("T")[0];
    const cached = threadCache.get(sessionId);
    if (cached && cached.date === today) return res.json(cached);

    try {
      const allEntries = await storage.getJournalEntries(sessionId);
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekEntries = allEntries.filter(
        (e) => new Date(e.createdAt).getTime() > cutoff,
      );

      if (weekEntries.length === 0) {
        return res.json({
          narrative: null,
          anchorVerse: null,
          anchorRef: null,
          entryCount: 0,
        });
      }

      const memCtx = await getMemoryContext(sessionId);
      const memNote = buildMemoryPromptNote(memCtx);

      // Format entries for the prompt
      const entryLines = weekEntries
        .slice(0, 20)
        .map((e) => {
          const label =
            e.type === "guidance_memory"
              ? "Conversation with God"
              : e.type === "prayer"
              ? "Prayer"
              : e.type === "reflection"
              ? "Reflection"
              : e.type === "verse"
              ? `Scripture${e.reference ? ` (${e.reference})` : ""}`
              : "Note";
          const snippet = e.content.replace(/\n+/g, " ").slice(0, 300);
          const date = new Date(e.createdAt).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return `[${date} — ${label}${e.title ? `: ${e.title}` : ""}]\n${snippet}`;
        })
        .join("\n\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are writing a weekly spiritual reflection letter for someone — a quiet, honest weaving of what their last 7 days looked like with God.

Your voice: like a wise friend who has been watching over their shoulder all week and now sits down with them quietly. Warm, honest, not preachy. No "you did great" cheerleading.

Write 3 short paragraphs:
1. What they were carrying this week — the weight, the questions, the places God kept showing up
2. The thread running through it — one recurring theme, tension, or grace you notice across multiple entries
3. Where they seem to be standing now — not a resolution, just a true observation about this moment

Rules:
- Under 200 words total. Short paragraphs.
- Write in second person ("you", not "they")
- Do NOT list or summarize entries. Weave them. The reader shouldn't feel like they're getting a recap.
- No "This week you journaled about..." or "Your entries show..."
- One anchor verse: the single Scripture that most quietly holds the whole week together
- If entries are sparse (1-2 only), write something shorter and gentler — acknowledge you're only seeing a slice

${memNote ? memNote + "\n" : ""}Return JSON: { "narrative": "...", "anchorVerse": "quote", "anchorRef": "Book Chapter:Verse" }`,
          },
          {
            role: "user",
            content: `Here is what their week held:\n\n${entryLines}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);

      const result = {
        date: today,
        narrative: parsed.narrative ?? null,
        anchorVerse: parsed.anchorVerse ?? null,
        anchorRef: parsed.anchorRef ?? null,
        entryCount: weekEntries.length,
      };

      if (result.narrative) threadCache.set(sessionId, result);
      res.json(result);
    } catch (err) {
      console.error("the-thread error:", err);
      res.status(500).json({ message: "Failed" });
    }
  });

  // ── Pray for Them ─────────────────────────────────────────────────────────────
  // User provides a person's name + what they're going through.
  // Returns a short, personal, sendable prayer.
  app.post("/api/guidance/pray-for-them", async (req, res) => {
    const { name, situation } = req.body as { name?: string; situation?: string };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });

    const nameNote = name?.trim() ? ` for ${name.trim()}` : "";
    const displayName = name?.trim() || "them";

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You write prayers that people send to someone they love — not prayers FOR the person to read aloud, but prayers someone types out and texts to a friend who is hurting.

The prayer should feel like it was written by the person sending it, not by a pastor or app. Personal, warm, specific to what was shared.

Rules:
- Address God directly. Start with "Lord," "Father," or "God," — not "Dear Heavenly Father"
- Use the person's name${nameNote ? ` (${name?.trim()})` : " if provided"} naturally inside the prayer — not just at the start
- Under 90 words. Every word earns its place.
- Specific to what's shared — not generic comfort
- End with something that lands, not a fade
- No filler: never "I just ask," "I just pray," "be with them," "wrap your arms around"
- Tone: honest and close, like a friend praying out loud with you

Return only the prayer text. No intro, no label, no "Here is a prayer:" — just the prayer itself.`,
          },
          {
            role: "user",
            content: `Pray${nameNote}: ${situation.trim().slice(0, 600)}`,
          },
        ],
      });

      const prayer = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!prayer) return res.status(500).json({ message: "No prayer returned" });

      res.json({ prayer, displayName });
    } catch (err) {
      console.error("pray-for-them error:", err);
      res.status(500).json({ message: "Failed" });
    }
  });

  // ── Unsplash Contextual Photo ─────────────────────────────────────────────────
  const unsplashPhotoCache = new Map<string, { url: string; thumb: string; photographerName: string; photographerLink: string }>();

  function situationToUnsplashQuery(situation: string): string {
    const s = situation.toLowerCase();
    if (/grief|loss|died|death|passed|mourn|missing/.test(s)) return "still water reflections dawn";
    if (/anxiet|fear|worry|worri|scared|panic|overwhelm/.test(s)) return "misty mountain path morning";
    if (/marriage|spouse|husband|wife|partner|relationship/.test(s)) return "golden hour path together";
    if (/alone|lonely|isolat|no one|nobody/.test(s)) return "sunrise empty peaceful beach";
    if (/faith|doubt|believe|god|church|spiritual/.test(s)) return "cathedral light rays interior";
    if (/angry|anger|rage|resentment|bitterness/.test(s)) return "flowing river rocks calm";
    if (/sick|health|diagnos|illness|pain|medical/.test(s)) return "morning meadow soft light";
    if (/job|work|career|money|financial|debt|provision/.test(s)) return "open road horizon landscape";
    if (/child|kid|parent|family|son|daughter/.test(s)) return "warm golden field sunlight";
    if (/depress|hopeless|meaningless|purpose|lost/.test(s)) return "path through forest light";
    if (/prayer|pray|seeking|guidance/.test(s)) return "peaceful dawn landscape nature";
    return "peaceful nature golden light landscape";
  }

  app.post("/api/unsplash/photo", async (req, res) => {
    const { situation, sessionId } = req.body as { situation?: string; sessionId?: string };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    const unsplashKey = sessionId ? `unsplash:${sessionId}` : `unsplash:ip:${req.ip ?? "anon"}`;
    if (isRateLimited(unsplashKey, 20, 86_400_000)) {
      return res.status(429).json({ message: "Photo lookup limit reached. Try again later." });
    }

    const query = situationToUnsplashQuery(situation);
    const cached = unsplashPhotoCache.get(query);
    if (cached) return res.json(cached);

    try {
      const response = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
        { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
      );
      if (!response.ok) return res.status(502).json({ message: "Unsplash unavailable" });
      const data = await response.json() as any;
      const result = {
        url: data.urls?.regular ?? data.urls?.full,
        thumb: data.urls?.small ?? data.urls?.regular,
        photographerName: data.user?.name ?? "Unsplash",
        photographerLink: data.user?.links?.html ?? "https://unsplash.com",
      };
      unsplashPhotoCache.set(query, result);
      res.json(result);
    } catch (err) {
      console.error("Unsplash photo error:", err);
      res.status(500).json({ message: "Failed" });
    }
  });

  // ── Personal Prayer Portrait (Pro) ────────────────────────────────────────────
  app.post("/api/guidance/prayer-portrait", async (req, res) => {
    const { imageBase64, mimeType, situation, answers, sessionId, isPro } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      situation?: string;
      answers?: { belief?: string; burden?: string; cover?: string };
      sessionId?: string;
      isPro?: boolean;
    };
    if (!imageBase64?.trim()) return res.status(400).json({ message: "Image required" });
    const proPortrait = parseProFlag(isPro);
    if (!proPortrait) {
      return res.status(403).json({ message: "Prayer Portrait is included with Pro.", code: "pro_required" });
    }
    const portraitGuard = checkFeatureBudget(sessionId, "prayer-portrait", true);
    if (!portraitGuard.ok) {
      return res.status(portraitGuard.status).json({ message: portraitGuard.message, code: portraitGuard.code });
    }

    try {
      const parts: string[] = [];
      if (situation?.trim()) parts.push(`What they shared: ${situation.trim().slice(0, 800)}`);
      if (answers?.belief?.trim()) parts.push(`What they're believing God for: ${answers.belief.trim()}`);
      if (answers?.burden?.trim()) parts.push(`What's felt heavy lately: ${answers.burden.trim()}`);
      if (answers?.cover?.trim()) parts.push(`Who they want this prayer to cover: ${answers.cover.trim()}`);
      const context = parts.length ? parts.join("\n\n") : "This person has come seeking a prayer over their life.";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content: `You are a compassionate Christian pastor praying personally over someone's life. You have their photo and what they've shared. Write a prayer of 6–10 sentences spoken TO God on their behalf — not a template, not generic. Address God directly (start with "Lord," "Father," or "God,") and pray specifically about what this person is carrying, believing for, and who they want covered. Let the prayer feel like you looked them in the eyes and prayed this over them in the room. Natural, spoken language — raw and real, not formal or scripted. If something in the photo speaks to the moment (light, setting, expression), you may weave it in gently. End with "Amen."`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}`,
                  detail: "low",
                },
              },
              { type: "text", text: context },
            ] as any,
          },
        ],
      });

      const prayer = completion.choices[0]?.message?.content?.trim() ?? "";
      res.json({ prayer });
    } catch (err) {
      console.error("prayer-portrait error:", err);
      res.status(500).json({ message: "Failed to generate prayer portrait" });
    }
  });

  // ── Daily Art Image ───────────────────────────────────────────────────────────

  const DAILY_ART_DIR = resolveDailyArtDir();
  if (!fs.existsSync(DAILY_ART_DIR)) fs.mkdirSync(DAILY_ART_DIR, { recursive: true });

  app.use("/daily-art", express.static(DAILY_ART_DIR, { maxAge: "1d" }));

  // 50 curated verse + Unsplash/Pexels search query pairs.
  // Rotates by day-of-year — no repeat for ~7 weeks.
  const VERSE_POOL = [
    { scripture: "The Lord is my light and my salvation — whom shall I fear?", reference: "Psalm 27:1", reflection: "Light breaks through every darkness. Morning always comes.", query: "golden light rays breaking mountain peak dawn" },
    { scripture: "Be still, and know that I am God.", reference: "Psalm 46:10", reflection: "The forest knows how to be still. We are still learning.", query: "misty ancient forest light rays ethereal stillness" },
    { scripture: "He stilled the storm to a whisper; the waves of the sea were hushed.", reference: "Psalm 107:29", reflection: "The One who calms the sea can quiet what rages in you.", query: "dramatic storm ocean calm golden break light" },
    { scripture: "He determines the number of the stars and calls them each by name.", reference: "Psalm 147:4", reflection: "By name. Every one. You are not unknown.", query: "milky way galaxy reflection alpine lake night" },
    { scripture: "Your word is a lamp for my feet, a light on my path.", reference: "Psalm 119:105", reflection: "The path lights only one step at a time. That is enough.", query: "golden autumn forest winding path soft light bokeh" },
    { scripture: "As the deer pants for streams of water, so my soul pants for you, my God.", reference: "Psalm 42:1", reflection: "The soul knows its Source. Follow the thirst.", query: "ethereal waterfall cascade mist emerald forest" },
    { scripture: "He leads me beside quiet waters, he refreshes my soul.", reference: "Psalm 23:2-3", reflection: "Stillness is not emptiness. It is where restoration begins.", query: "serene alpine lake mirror reflection mountain blue hour" },
    { scripture: "The heavens declare the glory of God; the skies proclaim the work of his hands.", reference: "Psalm 19:1", reflection: "The northern lights need no words. Neither does glory.", query: "aurora borealis reflection lake vivid green night" },
    { scripture: "The Lord is my rock, my fortress and my deliverer.", reference: "Psalm 18:2", reflection: "A lighthouse does not move. Neither does His faithfulness.", query: "dramatic lighthouse cliffs stormy sea waves cinematic" },
    { scripture: "Even in darkness light dawns for the upright.", reference: "Psalm 112:4", reflection: "The desert holds beauty the rushing world never sees.", query: "Antelope Canyon light beams golden sandstone dramatic" },
    { scripture: "See, I am doing a new thing! Now it springs up; do you not perceive it?", reference: "Isaiah 43:19", reflection: "Bloom is always coming. Waiting is not wasted.", query: "cherry blossom petals soft sunlight bokeh spring renewal" },
    { scripture: "Consider how the wild flowers grow. They do not labor or spin.", reference: "Luke 12:27", reflection: "Beauty without striving. A sermon in every petal.", query: "wildflower meadow golden hour warm light dreamy pastoral" },
    { scripture: "The steadfast love of the Lord never ceases; his mercies never come to an end.", reference: "Lamentations 3:22-23", reflection: "Mercy comes like morning — quiet, faithful, impossible to stop.", query: "soft morning mist valley fog golden sunrise light" },
    { scripture: "He is the Maker of heaven and earth, the sea, and everything in them.", reference: "Psalm 146:6", reflection: "Power that formed the cosmos holds you gently.", query: "dramatic lightning storm vast landscape power awe" },
    { scripture: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7", reflection: "The tide takes what you release. Let go.", query: "serene ocean shore long exposure waves peaceful sunset" },
    { scripture: "Though your sins are like scarlet, they shall be as white as snow.", reference: "Isaiah 1:18", reflection: "White. Clean. Completely new.", query: "pristine snow forest winter blue light peaceful clean" },
    { scripture: "I am the resurrection and the life. Whoever believes in me will live.", reference: "John 11:25", reflection: "Life breaks through rock. Always.", query: "spring wildflowers bloom through snow mountain light" },
    { scripture: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1", reflection: "Abundance is less about having and more about trusting.", query: "golden wheat field sunset harvest light pastoral warm" },
    { scripture: "Trust in the Lord with all your heart and lean not on your own understanding.", reference: "Proverbs 3:5", reflection: "Roots run deep where storms have come before.", query: "ancient olive tree twisted roots golden Tuscany hills" },
    { scripture: "My grace is sufficient for you, for my power is made perfect in weakness.", reference: "2 Corinthians 12:9", reflection: "The stone was shaped by every wave that broke against it.", query: "dramatic rugged coastline golden hour waves crashing" },
    { scripture: "Those who hope in the Lord will renew their strength. They will soar on wings like eagles.", reference: "Isaiah 40:31", reflection: "Waiting is not the pause before life. It is how the wings grow strong.", query: "eagle soaring majestic mountain thermal sky freedom" },
    { scripture: "In the morning, Lord, you hear my voice; in the morning I lay my requests before you.", reference: "Psalm 5:3", reflection: "Morning is a threshold. Cross it with intention.", query: "glassy lake sunrise mist golden reflection morning stillness" },
    { scripture: "For now we see only a reflection as in a mirror; but then face to face.", reference: "1 Corinthians 13:12", reflection: "The fog does not mean nothing is there. Faith knows what sight cannot see.", query: "ethereal mountain fog valley morning mystery light" },
    { scripture: "He tends his flock like a shepherd: He gathers the lambs in his arms.", reference: "Isaiah 40:11", reflection: "You are the lamb he gathered. Not the one that got away.", query: "rolling green hills pastoral soft light countryside misty" },
    { scripture: "Where can I go from your Spirit? Where can I flee from your presence?", reference: "Psalm 139:7", reflection: "The infinite sky makes one thing clear — you are never alone.", query: "vast starry sky milky way desert landscape infinite" },
    { scripture: "He who began a good work in you will carry it on to completion.", reference: "Philippians 1:6", reflection: "Growth is quieter than we expect. And steadier.", query: "lush tropical waterfall rainforest sunlight green growth" },
    { scripture: "I lift up my eyes to the mountains — where does my help come from? My help comes from the Lord.", reference: "Psalm 121:1-2", reflection: "The mountains have always pointed upward. So does the soul, when it is still.", query: "Dolomites peaks dramatic above clouds majestic golden" },
    { scripture: "Delight yourself in the Lord, and he will give you the desires of your heart.", reference: "Psalm 37:4", reflection: "What the soul most wants is what it was made for.", query: "autumn foliage lake reflection golden hour dreamy" },
    { scripture: "This is the day the Lord has made; let us rejoice and be glad in it.", reference: "Psalm 118:24", reflection: "Not the day you planned. The day you were given. Rejoice anyway.", query: "joyful golden morning light chapel window sunbeam" },
    { scripture: "For I know the plans I have for you, declares the Lord, plans to prosper you.", reference: "Jeremiah 29:11", reflection: "The horizon is not the end. It is where the next chapter begins.", query: "dramatic coastal cliffs vast ocean horizon golden sunset" },
    { scripture: "The Lord will fight for you; you need only to be still.", reference: "Exodus 14:14", reflection: "The sea opened when they stopped running. So does every impossible thing.", query: "parting fog sea dramatic dawn golden light breaking" },
    { scripture: "I can do all this through him who gives me strength.", reference: "Philippians 4:13", reflection: "Not in your strength. In His. That changes everything.", query: "mountain summit above clouds sunrise triumph peak" },
    { scripture: "Come to me, all you who are weary and burdened, and I will give you rest.", reference: "Matthew 11:28", reflection: "The invitation is always open. Always.", query: "peaceful sunlit meadow creek gentle morning warm invitation" },
    { scripture: "Do not be anxious about anything, but in every situation, present your requests to God.", reference: "Philippians 4:6", reflection: "Prayer is not a last resort. It is the first door.", query: "soft morning dew garden sunrise peaceful quiet bloom" },
    { scripture: "In him we live and move and have our being.", reference: "Acts 17:28", reflection: "Every breath is borrowed grace.", query: "towering forest canopy sunlight rays green breathtaking awe" },
    { scripture: "The Lord bless you and keep you; the Lord make his face shine on you.", reference: "Numbers 6:24-25", reflection: "A blessing spoken over you since before you knew you needed it.", query: "warm golden hour countryside rolling hills blessing light" },
    { scripture: "You hem me in behind and before, and you lay your hand upon me.", reference: "Psalm 139:5", reflection: "Surrounded. Held. Before you even asked.", query: "ancient cathedral forest path morning light rays sacred" },
    { scripture: "God is our refuge and strength, an ever-present help in trouble.", reference: "Psalm 46:1", reflection: "The fortress was built before the storm arrived.", query: "dramatic rainbow after storm mountain hope light breaking" },
    { scripture: "He makes me lie down in green pastures.", reference: "Psalm 23:2", reflection: "The rest was never wasted time. It was always part of the plan.", query: "lush green Irish valley pastoral hills peaceful soft" },
    { scripture: "I am the light of the world. Whoever follows me will never walk in darkness.", reference: "John 8:12", reflection: "One light is all it takes. You are not lost.", query: "single candle flame darkness warm golden sacred light" },
    { scripture: "If God is for us, who can be against us?", reference: "Romans 8:31", reflection: "Not bravado. Just truth. God's side is always the majority.", query: "powerful sunrise breaking through storm clouds dramatic rays" },
    { scripture: "He fills my life with good things, so that I stay young and strong like an eagle.", reference: "Psalm 103:5", reflection: "Renewal is not reserved for the young. It is the eagle's inheritance — and yours.", query: "eagle in flight dawn golden light wild majestic sky" },
    { scripture: "The name of the Lord is a fortified tower; the righteous run to it and are safe.", reference: "Proverbs 18:10", reflection: "Ancient towers were built to outlast every siege. So is this name.", query: "ancient stone tower hilltop dramatic golden hour safe" },
    { scripture: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.", reference: "Joshua 1:9", reflection: "Not a feeling. A fact. He is with you.", query: "lone figure vast golden landscape horizon courage light" },
    { scripture: "He reached down from on high and took hold of me; he drew me out of deep waters.", reference: "Psalm 18:16", reflection: "Rescue is never late when the Rescuer stands outside of time.", query: "powerful ocean waves sunlight breaking through storm rescue" },
    { scripture: "The Lord your God is in your midst, a mighty one who will save; he will rejoice over you.", reference: "Zephaniah 3:17", reflection: "He is not watching from a distance. He is here, and He rejoices.", query: "sunrise still water reflection golden joyful dawn peaceful" },
    { scripture: "Your faithfulness reaches to the skies.", reference: "Psalm 36:5", reflection: "Higher than the clouds. Further than sight can follow.", query: "aerial above clouds dramatic sky golden light infinite" },
    { scripture: "He gives strength to the weary and increases the power of the weak.", reference: "Isaiah 40:29", reflection: "Not more willpower. Borrowed strength. Ask for it.", query: "powerful mountain river rushing cascade rocks strength" },
    { scripture: "Fear not, for I have redeemed you; I have summoned you by name; you are mine.", reference: "Isaiah 43:1", reflection: "By name. Redeemed. Yours. Three truths that change everything.", query: "misty fjord mountain dawn golden light breaking named" },
    { scripture: "The eternal God is your refuge, and underneath are the everlasting arms.", reference: "Deuteronomy 33:27", reflection: "You cannot fall further than His arms reach.", query: "vast Grand Canyon sunrise ancient rock golden shadows" },
  ];

  // ── Serve daily-art image through /api path (works in all deployment routing) ──
  app.get("/api/daily-art/image", (req, res) => {
    const today = getEasternDateString();
    const imgFile = path.join(DAILY_ART_DIR, `${today}.jpg`);
    if (!fs.existsSync(imgFile)) return res.status(404).json({ message: "not ready — open /api/daily-art first" });
    res.set("Cache-Control", "public, max-age=300");
    res.set("Content-Type", "image/jpeg");
    fs.createReadStream(imgFile).pipe(res);
  });

  // ── Serve a past image by date ─────────────────────────────────────────────
  app.get("/api/daily-art/image/:date", (req, res) => {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "Invalid date format" });
    const imgFile = path.join(DAILY_ART_DIR, `${date}.jpg`);
    if (!fs.existsSync(imgFile)) return res.status(404).json({ message: "Not found" });
    const maxAge = date === getEasternDateString() ? 300 : 2_592_000;
    res.set("Cache-Control", `public, max-age=${maxAge}`);
    res.set("Content-Type", "image/jpeg");
    fs.createReadStream(imgFile).pipe(res);
  });

  // ── Growing art library — all saved images, newest first ─────────────────
  app.get("/api/daily-art/library", (req, res) => {
    try {
      const files = fs.readdirSync(DAILY_ART_DIR);
      const entries: { date: string; imageUrl: string; scripture: string; reference: string; reflection?: string }[] = [];

      for (const file of files) {
        if (!file.endsWith(".jpg")) continue;
        const date = file.replace(".jpg", "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const metaFile = path.join(DAILY_ART_DIR, `${date}.json`);
        if (!fs.existsSync(metaFile)) continue;
        try {
          const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
          entries.push({ date, imageUrl: `/api/daily-art/image/${date}`, ...meta });
        } catch { /* skip malformed entries */ }
      }

      entries.sort((a, b) => b.date.localeCompare(a.date)); // newest first
      res.json(entries);
    } catch (err) {
      console.error("[daily-art/library] error:", err);
      res.status(500).json({ message: "Could not load library" });
    }
  });

  app.get("/api/daily-art", async (req, res) => {
    try {
      const today = getEasternDateString();
      const imgFile = path.join(DAILY_ART_DIR, `${today}.jpg`);
      const metaFile = path.join(DAILY_ART_DIR, `${today}.json`);

      const [y, mo, da] = today.split("-").map(Number);
      const dayOfYear = Math.floor((Date.UTC(y, mo - 1, da) - Date.UTC(y, 0, 0)) / 86_400_000);
      const poolEntry = VERSE_POOL[dayOfYear % VERSE_POOL.length];
      const { query: poolQuery, ...poolScripture } = poolEntry;

      let dailyVerse = await storage.getVerseByDate(today);
      if (!dailyVerse) {
        await syncTodayVerseFromSheet();
        dailyVerse = await storage.getVerseByDate(today);
      }
      const { sanitizeStoredVerse, verseTextHasRestoreSoulTypo } = await import(
        "../verseTextSanitize"
      );
      const hadTypoInDb = !!(dailyVerse && verseTextHasRestoreSoulTypo(dailyVerse.text));
      if (dailyVerse) {
        dailyVerse = sanitizeStoredVerse(dailyVerse);
      }

      const scriptureData = dailyVerse
        ? {
            scripture: dailyVerse.text,
            reference: dailyVerse.reference,
            reflection: dailyVerse.encouragement || poolScripture.reflection,
          }
        : poolScripture;

      const stockQuery = stockQueryForVerse(
        scriptureData.scripture,
        scriptureData.reference,
        dayOfYear,
        VERSE_POOL,
      );

      const hasStockKeys = !!(
        process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.PEXELS_API_KEY?.trim()
      );

      const forceRefresh = req.query.refresh === "1" || hadTypoInDb;

      if (forceRefresh && fs.existsSync(imgFile)) {
        try {
          fs.unlinkSync(imgFile);
        } catch {
          /* continue */
        }
      }
      if (forceRefresh && fs.existsSync(metaFile)) {
        try {
          fs.unlinkSync(metaFile);
        } catch {
          /* continue */
        }
      }

      let artSource: string | undefined;
      const refreshed = await refreshDailyArtImage(
        imgFile,
        metaFile,
        DAILY_ART_DIR,
        stockQuery,
        scriptureData.scripture,
        scriptureData.reference,
      );
      if (refreshed) {
        artSource = refreshed;
        console.log(`[daily-art] Built/refreshed today's image (source=${refreshed})`);
      }

      let meta: Record<string, unknown> = fs.existsSync(metaFile)
        ? JSON.parse(fs.readFileSync(metaFile, "utf-8"))
        : { ...scriptureData };

      meta = {
        ...meta,
        ...scriptureData,
        ...(artSource ? { artSource } : {}),
      };
      if (!meta.artSource && fs.existsSync(imgFile)) {
        meta.artSource = imageMatchesStaticFallback(imgFile, DAILY_ART_DIR) ? "fallback" : "cached";
      }

      fs.mkdirSync(DAILY_ART_DIR, { recursive: true });
      fs.writeFileSync(metaFile, JSON.stringify(meta));

      const imageUrl = fs.existsSync(imgFile) ? `/api/daily-art/image/${today}` : null;
      const isPlaceholder = meta.artSource === "fallback";
      return res.json({ imageUrl, isPlaceholder, ...meta });
    } catch (err) {
      console.error("daily art error:", err);
      res.json({
        imageUrl: null,
        isPlaceholder: true,
        scripture: "The heavens declare the glory of God.",
        reference: "Psalm 19:1",
        reflection: "Creation speaks what words cannot.",
      });
    }
  });

  // ── Life Season Journey ──────────────────────────────────────────────────────

  app.post("/api/journey/life-season", async (req, res) => {
    const { situation } = req.body as { situation?: string };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    if (situation.trim().length > 2000) return res.status(400).json({ message: "Input too long" });
    const sessionIdJourney = (req.body as any).sessionId as string | undefined;
    const journeyDaysWithApp: number = Number((req.body as any).daysWithApp) || 1;
    if (sessionIdJourney && isRateLimited(`journey:${sessionIdJourney}`, 10, 3_600_000)) {
      return res.status(429).json({ message: "Too many requests — please wait before generating another journey." });
    }
    const isProJourney = parseProFlag((req.body as any).isPro);
    if (!isProJourney) {
      return res.status(403).json({
        message:
          "A journey shaped from your exact words is included with Pro. Explore 7-day Guided Pathways for grief, anxiety, loneliness, and more on Bible Journeys.",
        code: "pro_pathway_required",
      });
    }
    const aiGuardJourney = checkAiDailyLimit(sessionIdJourney, journeyDaysWithApp, isProJourney);
    if (!aiGuardJourney.ok) {
      return res.status(aiGuardJourney.status).json({ message: aiGuardJourney.message, limitReached: true });
    }
    if (sessionIdJourney) storage.logAiUsage({ sessionId: sessionIdJourney, feature: "life_season", daysWithApp: journeyDaysWithApp, platform: "web" }).catch(() => { });
    const journeySafety = scanUserText(situation.trim());
    if (shouldBlockLlm(journeySafety)) {
      return res.json(buildCrisisJourney(journeySafety.response ?? CRISIS_RESPONSE));
    }

    try {
      const journey = await generateLifeSeasonJourney(situation.trim());
      res.json(journey);
    } catch (err) {
      console.error("life-season error:", err);
      res.status(500).json({ message: "Failed to generate journey" });
    }
  });


  // ── Devotional for Two ───────────────────────────────────────────────────────

  app.post("/api/devotional/for-two", async (req, res) => {
    const { verseReference, verseText, reflection, lang, sessionId, daysWithApp, isPro } = req.body as {
      verseReference?: string; verseText?: string; reflection?: string; lang?: string;
      sessionId?: string; daysWithApp?: number; isPro?: boolean;
    };
    if (!verseReference || !verseText) return res.status(400).json({ message: "verseReference and verseText required" });
    const forTwoGuard = checkAiDailyLimit(sessionId, Number(daysWithApp) || 1, parseProFlag(isPro));
    if (!forTwoGuard.ok) {
      return res.status(forTwoGuard.status).json({ message: forTwoGuard.message, code: forTwoGuard.code, limitReached: true });
    }
    try {
      const reflectionContext = reflection
        ? `The devotional reflection for today is: "${reflection.substring(0, 600)}"`
        : "";

      const forTwoSystem = `You are a pastoral guide helping two people go deeper in faith together — a married couple, close friends, or accountability partners. You understand that real spiritual conversation between two people is rare and valuable. Your job is to open a door to it, not hand them a worksheet.

What makes a great shared reflection:
— Questions that require genuine vulnerability, not just knowledge of the verse
— Questions that invite someone to share where they actually are, not where they think they should be
— A closing that draws the two people toward each other and toward God — not just individual application
— Warmth that feels like a wise friend sitting with them, not a curriculum

What you never do:
— Ask surface questions ("What does this verse mean to you?")
— Use spiritual clichés or filler language
— Give so much structure it feels like homework
— Open with hollow phrases ("Great verse for today!")`;

      const forTwoPrompt = `Today's verse: ${verseReference} — "${verseText}"
${reflectionContext}

Write a brief "reflect together" companion piece for two people to share. Structure:
1. One sentence — not explaining the verse, but naming why this particular scripture matters when two people sit with it together
2. Two or three discussion questions that require honesty and vulnerability — specific to this verse, not generic. At least one should invite someone to share something personal they might not say otherwise.
3. A closing thought or short prayer they can pray together — specific to this verse and this moment.

Under 200 words. Warm, unhurried, real. Write in ${lang === "es" ? "Spanish" : lang === "fr" ? "French" : lang === "pt" ? "Portuguese" : "English"}.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: forTwoSystem },
          { role: "user", content: forTwoPrompt },
        ],
        temperature: 0.8,
      });

      const content = completion.choices[0]?.message?.content ?? "";
      res.json({ content });
    } catch (err) {
      console.error("for-two error:", err);
      res.status(500).json({ message: "Failed to generate companion reflection" });
    }
  });

  // ── Verse Art (AI-generated image, cached per day) ───────────────────────────

  // Verse art local cache directory — serves self-hosted images (OpenAI URLs expire in ~1hr)
  const VERSE_ART_DIR = path.resolve(process.cwd(), "server/verse-art-cache");
  if (!fs.existsSync(VERSE_ART_DIR)) fs.mkdirSync(VERSE_ART_DIR, { recursive: true });

  app.get("/api/verse-art/image/:date", (req, res) => {
    const filePath = path.join(VERSE_ART_DIR, `${req.params.date}.png`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Not found" });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(filePath);
  });

  app.get("/api/verse-art/:date", async (req, res) => {
    try {
      const { date } = req.params;
      // First check local disk cache
      const localPath = path.join(VERSE_ART_DIR, `${date}.png`);
      if (fs.existsSync(localPath)) {
        return res.json({ imageUrl: `/api/verse-art/image/${date}`, cached: true });
      }
      // Fall back to DB — but skip any expired OpenAI blob URLs (they expire in ~1hr)
      const art = await storage.getVerseArt(date);
      if (art && !art.imageUrl.includes("oaidalleapiprodscus")) {
        return res.json({ imageUrl: art.imageUrl, cached: true });
      }
      return res.json({ imageUrl: null, cached: false });
    } catch (e) {
      console.error("verse-art GET error:", e);
      res.status(500).json({ message: "Failed to fetch verse art" });
    }
  });

  app.post("/api/verse-art/generate", async (req, res) => {
    try {
      const { verseDate, verseText, verseReference, sessionId, isPro } = req.body as {
        verseDate: string; verseText: string; verseReference: string;
        sessionId?: string; isPro?: boolean;
      };
      if (!verseDate || !verseText || !verseReference) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Return self-hosted cached file if it already exists for this date
      const localPath = path.join(VERSE_ART_DIR, `${verseDate}.png`);
      if (fs.existsSync(localPath)) {
        return res.json({ imageUrl: `/api/verse-art/image/${verseDate}`, cached: true });
      }

      const artGuard = checkFeatureBudget(sessionId, "verse-art", parseProFlag(isPro));
      if (!artGuard.ok) {
        return res.status(artGuard.status).json({ message: artGuard.message, code: artGuard.code });
      }

      const prompt = `A breathtaking, cinematic spiritual landscape that captures the soul of this Bible verse: "${verseText.slice(0, 200)}" (${verseReference}). Style: ultra-high quality photorealistic landscape photography combined with painterly, luminous quality — National Geographic meets Rembrandt. Choose a scene that powerfully echoes the verse's meaning: radiant golden light bursting through ancient cathedral forest, majestic snow-capped mountains at sunrise, vast ocean at twilight with God-rays piercing the clouds, aurora borealis over a still wilderness valley, rolling fields of wildflowers at golden hour, or a serene river winding through ancient woodland. Rich warm light, extraordinary atmospheric depth, deeply spiritual and awe-inspiring mood. IMPORTANT: no people, no human figures, no faces, no text, no words, no letters anywhere. Pure nature only. This must be the most powerful, moving image possible.`;

      let imgBuffer: Buffer | null = null;

      try {
        const response = await openaiTTS.images.generate({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: "1536x1024",
          quality: "standard",
        } as any);
        const imageUrl = response.data?.[0]?.url;
        if (imageUrl) {
          const imgFetch = await fetch(imageUrl);
          if (imgFetch.ok) imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
        }
      } catch (aiErr) {
        console.warn("[verse-art] AI generation failed, trying stock photo:", aiErr);
      }

      if (!imgBuffer) {
        const [y, mo, da] = verseDate.split("-").map(Number);
        const dayOfYear = Math.floor((Date.UTC(y, mo - 1, da) - Date.UTC(y, 0, 0)) / 86_400_000);
        const stockQuery = stockQueryForVerse(verseText, verseReference, dayOfYear, VERSE_POOL);
        imgBuffer = await fetchStockImageBuffer(`${stockQuery} devotion worship landscape`);
      }

      if (!imgBuffer) return res.status(500).json({ message: "No image returned" });

      fs.writeFileSync(localPath, imgBuffer);

      // Save stable local URL to DB
      const stableUrl = `/api/verse-art/image/${verseDate}`;
      await storage.saveVerseArt(verseDate, verseReference, stableUrl);

      res.json({ imageUrl: stableUrl, cached: false });
    } catch (e: any) {
      console.error("verse-art generate error:", e);
      res.status(500).json({ message: e?.message ?? "Image generation failed" });
    }
  });

  // ── Stripe Routes ────────────────────────────────────────────────────────────

  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    const { plan } = req.body as { plan: "monthly" | "annual" };
    if (!plan || !["monthly", "annual"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    try {
      const origin = req.headers.origin || `https://${req.headers.host}`;

      // Dynamically find price IDs by looking up the product
      const products = await stripe.products.search({ query: 'name:"Shepherd\'s Path Pro"', limit: 1 });
      if (!products.data.length) {
        return res.status(500).json({ message: "Stripe product not found" });
      }
      const productId = products.data[0].id;

      const prices = await stripe.prices.list({ product: productId, active: true, limit: 10 });
      const target = prices.data.find((p) =>
        plan === "annual"
          ? p.recurring?.interval === "year"
          : p.recurring?.interval === "month"
      );

      if (!target) {
        return res.status(500).json({ message: "Price not found for plan" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: target.id, quantity: 1 }],
        success_url: `${origin}/pro-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?upgrade=cancelled`,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        metadata: { plan },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      res.status(500).json({ message: err.message || "Checkout failed" });
    }
  });

  // One-time tip / support-the-mission checkout
  app.post("/api/stripe/create-tip-session", async (req, res) => {
    const { amount } = req.body as { amount: number };
    if (!amount || amount < 100 || amount > 10000) {
      return res.status(400).json({ message: "Invalid tip amount" });
    }
    try {
      const origin = req.headers.origin || `https://${req.headers.host}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: "Support the Mission — Shepherd's Path",
              description: "A one-time gift to help keep the app free for everyone.",
            },
          },
        }],
        success_url: `${origin}/about?gift=thank-you`,
        cancel_url: `${origin}/about`,
      });
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Tip checkout error:", err);
      res.status(500).json({ message: err.message || "Tip checkout failed" });
    }
  });

  app.get("/api/stripe/session-email", async (req, res) => {
    const sessionId = req.query.session_id as string;
    if (!sessionId) return res.status(400).json({ message: "session_id required" });
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      res.json({ email: session.customer_email ?? null });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to retrieve session" });
    }
  });

  app.post("/api/stripe/create-portal-session", async (req, res) => {
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ message: "Email required" });
    try {
      const origin = req.headers.origin || `https://${req.headers.host}`;
      const customers = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 1 });
      if (!customers.data.length) {
        return res.status(404).json({ message: "No Stripe customer found for this email" });
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: customers.data[0].id,
        return_url: `${origin}/`,
      });
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Portal session error:", err);
      res.status(500).json({ message: err.message || "Failed to create portal session" });
    }
  });

  app.post("/api/stripe/check-pro", async (req, res) => {
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ message: "Email required" });

    try {
      const pro = await storage.getProSubscriberByEmail(email.toLowerCase());
      const isPro = pro?.status === "active";
      res.json({ isPro, plan: pro?.plan ?? null });
    } catch (err) {
      res.status(500).json({ message: "Lookup failed" });
    }
  });

  app.post("/api/pro/link-session", async (req, res) => {
    const { email, sessionId } = req.body as { email?: string; sessionId?: string };
    if (!email || !sessionId) {
      return res.status(400).json({ message: "email and sessionId required" });
    }
    try {
      const pro = await storage.getProSubscriberByEmail(email.toLowerCase());
      if (pro?.status !== "active") {
        return res.status(403).json({ message: "Active Pro subscription required" });
      }
      await storage.linkProEmailToSession(email, sessionId);
      res.json({ linked: true });
    } catch (err) {
      console.error("[pro/link-session]", err);
      res.status(500).json({ message: "Could not link session" });
    }
  });

  app.post("/api/stripe/restore", async (req, res) => {
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ message: "Email required" });

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const pro = await storage.getProSubscriberByEmail(normalizedEmail);
      if (pro?.status === "active") {
        res.json({ restored: true, plan: pro.plan });
        return;
      }
      if (stripe) {
        const customers = await stripe.customers.list({ email: normalizedEmail, limit: 5 });
        for (const customer of customers.data) {
          const subs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 3 });
          if (subs.data.length > 0) {
            const sub = subs.data[0];
            const priceId = sub.items.data[0]?.price?.id ?? "";
            const plan = priceId.includes("year") || priceId.includes("annual") ? "annual" : "monthly";
            await storage.upsertProSubscriber({
              email: normalizedEmail,
              status: "active",
              plan,
              stripeCustomerId: customer.id,
              stripeSubscriptionId: sub.id,
            });
            res.json({ restored: true, plan });
            return;
          }
        }
      }
      res.json({ restored: false });
    } catch (err: any) {
      console.error("[restore] Error:", err?.message);
      res.status(500).json({ message: "Restore failed" });
    }
  });

  app.get("/api/referral/my-code", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const { REFERRAL_DAYS_PER_FRIEND, REFERRAL_WELCOME_DAYS } = await import("../referralRewards");
      const referral = await storage.getOrCreateReferralCode(sessionId);
      const appUrl = (process.env.APP_URL || "https://shepherdspathai.com").replace(/\/$/, "");
      const shareUrl = `${appUrl}?ref=${referral.code}`;
      res.json({
        code: referral.code,
        shareUrl,
        referralCount: referral.referralCount,
        proExpiresAt: referral.proExpiresAt,
        referrerBonusDays: REFERRAL_DAYS_PER_FRIEND,
        welcomeDays: REFERRAL_WELCOME_DAYS,
      });
    } catch (err) {
      res.status(500).json({ message: "Could not get referral code" });
    }
  });

  app.post("/api/referral/record", async (req, res) => {
    const { code, referredSessionId } = req.body as { code: string; referredSessionId: string };
    if (!code || !referredSessionId) return res.status(400).json({ message: "code and referredSessionId required" });
    try {
      const result = await storage.recordReferral(code.toUpperCase(), referredSessionId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Could not record referral" });
    }
  });

  app.get("/api/referral/check-pro", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const stats = await storage.getReferralStats(sessionId);
      const now = new Date();
      const hasReferralPro = !!stats?.proExpiresAt && stats.proExpiresAt > now;
      res.json({ hasReferralPro, expiresAt: stats?.proExpiresAt ?? null });
    } catch (err) {
      res.status(500).json({ message: "Could not check referral pro" });
    }
  });

  app.post("/api/stripe/request-refund", async (req, res) => {
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ message: "Email required" });

    try {
      const pro = await storage.getProSubscriberByEmail(email.toLowerCase());

      if (!pro || !pro.stripeSubscriptionId) {
        return res.status(404).json({
          eligible: false,
          reason: "no_subscription",
          message: "No active subscription found for this email address.",
        });
      }

      if (pro.status === "cancelled") {
        return res.status(400).json({
          eligible: false,
          reason: "already_cancelled",
          message: "This subscription has already been cancelled.",
        });
      }

      // Check 30-day window using activatedAt
      const activatedAt = pro.activatedAt ? new Date(pro.activatedAt) : null;
      const daysSince = activatedAt
        ? (Date.now() - activatedAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;

      if (daysSince > 30) {
        return res.status(400).json({
          eligible: false,
          reason: "outside_window",
          message: `Your subscription is ${Math.floor(daysSince)} days old. The money-back guarantee applies within the first 30 days.`,
        });
      }

      // Get the latest invoice for refund
      const invoices = await stripe.invoices.list({
        subscription: pro.stripeSubscriptionId,
        limit: 1,
      });

      const invoice = invoices.data[0];
      const chargeId = invoice && ((invoice as any).charge || (invoice as any).payment_intent);
      if (!invoice || !chargeId) {
        return res.status(400).json({
          eligible: false,
          reason: "no_charge",
          message: "We couldn't find a charge to refund. Please contact support.",
        });
      }

      // Issue the refund
      const refund = await stripe.refunds.create({
        charge: chargeId as string,
        reason: "requested_by_customer",
      });

      // Cancel the subscription immediately
      await stripe.subscriptions.cancel(pro.stripeSubscriptionId);

      // Update our DB
      await storage.updateProSubscriberStatus(pro.stripeSubscriptionId, "cancelled");

      console.log(`Refund issued for ${email}: refund ${refund.id}, amount ${refund.amount}`);

      res.json({
        eligible: true,
        success: true,
        amount: (refund.amount / 100).toFixed(2),
        currency: refund.currency.toUpperCase(),
        message: "Refund issued successfully. Funds will appear in 5–10 business days.",
      });
    } catch (err: any) {
      console.error("Refund error:", err);
      res.status(500).json({
        eligible: false,
        reason: "stripe_error",
        message: err.message || "Refund could not be processed. Please contact support.",
      });
    }
  });

  // Support contact form
  app.post("/api/support/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body as {
        name?: string; email?: string; subject?: string; message?: string;
      };
      if (!name?.trim() || !email?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "Name, email, and message are required." });
      }
      if (!email.includes("@")) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
      if (message.trim().length < 10) {
        return res.status(400).json({ message: "Message is too short." });
      }

      const subjectLine = subject?.trim() || "Support Request";
      const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

      try {
        const { client, fromEmail } = await getUncachableResendClient();

        // Auto-reply to the user
        await client.emails.send({
          from: `Shepherd's Path Support <${fromEmail}>`,
          to: email.trim(),
          replyTo: "support@shepherdspathai.com",
          subject: `We received your message — Shepherd's Path Support`,
          html: `
<div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:40px 32px;background:#fdf9f6;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#8b6f47,#c49a6c);border-radius:16px;padding:14px 18px;margin-bottom:16px;">
      <span style="font-size:24px;">✝</span>
    </div>
    <h2 style="color:#3d3530;font-size:22px;margin:0 0 8px;">We received your message</h2>
    <p style="color:#7a6a5a;font-size:15px;margin:0;">Thank you for reaching out, ${name.trim()}.</p>
  </div>

  <p style="color:#5c5248;line-height:1.75;font-size:15px;">We'll review your message and get back to you within <strong>1 business day</strong>. In the meantime, here are answers to the most common questions:</p>

  <div style="background:#fff;border:1px solid #e8dfd6;border-radius:14px;padding:24px;margin:24px 0;">
    <h3 style="color:#3d3530;font-size:14px;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 18px;border-bottom:1px solid #f0e8e0;padding-bottom:10px;">Frequently Asked Questions</h3>

    <div style="margin-bottom:16px;">
      <p style="color:#3d3530;font-size:14px;font-weight:bold;margin:0 0 4px;font-family:sans-serif;">I was charged but don't have PRO access.</p>
      <p style="color:#7a6a5a;font-size:13px;margin:0;line-height:1.6;font-family:sans-serif;">Reply to this email with your receipt and we'll activate your account manually right away.</p>
    </div>

    <div style="margin-bottom:16px;">
      <p style="color:#3d3530;font-size:14px;font-weight:bold;margin:0 0 4px;font-family:sans-serif;">How do I enter my discount code?</p>
      <p style="color:#7a6a5a;font-size:13px;margin:0;line-height:1.6;font-family:sans-serif;">On the checkout screen, tap "Add promotion code" and enter PATHGIFT for 20% off an annual membership.</p>
    </div>

    <div style="margin-bottom:16px;">
      <p style="color:#3d3530;font-size:14px;font-weight:bold;margin:0 0 4px;font-family:sans-serif;">How do I cancel my subscription?</p>
      <p style="color:#7a6a5a;font-size:13px;margin:0;line-height:1.6;font-family:sans-serif;">iOS: Settings → Apple ID → Subscriptions. Android: Play Store → Subscriptions. Or reply here and we'll help.</p>
    </div>

    <div style="margin-bottom:16px;">
      <p style="color:#3d3530;font-size:14px;font-weight:bold;margin:0 0 4px;font-family:sans-serif;">Can I use the app in Spanish?</p>
      <p style="color:#7a6a5a;font-size:13px;margin:0;line-height:1.6;font-family:sans-serif;">Yes — tap the globe icon in the top navigation bar to switch to Español, Français, or Português.</p>
    </div>

    <div>
      <p style="color:#3d3530;font-size:14px;font-weight:bold;margin:0 0 4px;font-family:sans-serif;">Is my journal and prayer data private?</p>
      <p style="color:#7a6a5a;font-size:13px;margin:0;line-height:1.6;font-family:sans-serif;">Yes. Your entries are stored securely and never shared or sold. See our Privacy Policy for full details.</p>
    </div>
  </div>

  <p style="color:#5c5248;line-height:1.75;font-size:14px;">If none of these answer your question, simply reply to this email and we'll take care of you personally.</p>

  <div style="text-align:center;margin-top:32px;">
    <a href="${appUrl}" style="background:linear-gradient(135deg,#8b6f47,#c49a6c);color:#fff;padding:13px 30px;border-radius:40px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:bold;">Return to Shepherd's Path</a>
  </div>

  <p style="color:#a89880;font-size:12px;text-align:center;margin-top:32px;font-family:sans-serif;">"The Lord is near to all who call on Him." — Psalm 145:18</p>
</div>`,
          text: `Hi ${name.trim()},\n\nWe received your message and will get back to you within 1 business day.\n\nIn the meantime, here are answers to common questions:\n\n- I was charged but don't have PRO: Reply with your receipt and we'll activate your account right away.\n- Discount code: Enter PATHGIFT at checkout for 20% off annual.\n- Cancel subscription: iOS: Settings → Apple ID → Subscriptions. Android: Play Store → Subscriptions.\n- Language options: Tap the globe icon in the top nav to switch languages.\n- Privacy: Your data is private and never shared.\n\nIf you have more questions, just reply to this email.\n\n— Shepherd's Path Support\nsupport@shepherdspathai.com\n\n${appUrl}`,
        });

        // Notification to admin
        await client.emails.send({
          from: fromEmail,
          to: "briancartee@gmail.com",
          replyTo: email.trim(),
          subject: `[Support] ${subjectLine} — from ${name.trim()}`,
          html: `
<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#f8f8f8;">
  <h2 style="color:#333;margin-bottom:4px;">New Support Request</h2>
  <p style="color:#888;font-size:13px;margin-top:0;">Shepherd's Path</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
    <tr><td style="padding:8px 0;color:#888;font-size:13px;width:80px;">Name</td><td style="padding:8px 0;color:#333;font-size:14px;">${name.trim()}</td></tr>
    <tr><td style="padding:8px 0;color:#888;font-size:13px;">Email</td><td style="padding:8px 0;color:#333;font-size:14px;"><a href="mailto:${email.trim()}">${email.trim()}</a></td></tr>
    <tr><td style="padding:8px 0;color:#888;font-size:13px;">Subject</td><td style="padding:8px 0;color:#333;font-size:14px;">${subjectLine}</td></tr>
  </table>
  <div style="margin-top:16px;background:#fff;border-left:3px solid #8b6f47;padding:16px;border-radius:0 8px 8px 0;">
    <p style="color:#333;font-size:14px;line-height:1.7;margin:0;">${message.trim().replace(/\n/g, "<br>")}</p>
  </div>
  <p style="color:#aaa;font-size:12px;margin-top:24px;">Reply to this email to respond directly to ${name.trim()}.</p>
</div>`,
          text: `New support request from ${name.trim()} (${email.trim()})\n\nSubject: ${subjectLine}\n\n${message.trim()}`,
        });
      } catch (emailErr) {
        console.error("[support] Email send failed:", emailErr);
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("[support] Error:", err);
      res.status(500).json({ message: "Could not send message. Please try again." });
    }
  });

  // Stripe webhook — must use raw body
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
      } else {
        event = req.body as Stripe.Event;
      }
    } catch (err: any) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === "subscription" && session.customer_email) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const plan = (session.metadata?.plan as string) ?? "monthly";
            await storage.upsertProSubscriber({
              email: session.customer_email,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscription.id,
              plan,
              status: "active",
            });
          }
          break;
        }
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          await storage.updateProSubscriberStatus(sub.id, sub.status === "active" ? "active" : sub.status);
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          await storage.updateProSubscriberStatus(sub.id, "cancelled");
          break;
        }
      }
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      res.status(500).json({ message: "Webhook handler failed" });
    }
  });

  // ── Voice Webhook (Twilio inbound calls) ─────────────────────────────────
  // Serves the greeting MP3 generated via OpenAI TTS (cached after first call)
  let greetingAudioCache: Buffer | null = null;

  app.get("/api/sms/greeting.mp3", async (req, res) => {
    try {
      if (!greetingAudioCache) {
        const greetingText = "You've reached Shepherd's Path — your daily walk with Jesus. " +
          "To receive scripture, prayer, and spiritual encouragement right now, just text this number anything on your heart. " +
          "You can also visit Shepherd Path AI dot com for daily devotionals, guided Bible journeys, and more. " +
          "May God bless you today.";

        const mp3 = await openai.audio.speech.create({
          model: "tts-1",
          voice: "onyx",
          input: greetingText,
        });
        greetingAudioCache = Buffer.from(await mp3.arrayBuffer());
      }
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(greetingAudioCache);
    } catch (err) {
      console.error("[Voice greeting error]", err);
      res.status(500).send("Error generating greeting");
    }
  });

  app.post("/api/sms/voice", (req, res) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const twilioSig = req.headers["x-twilio-signature"] as string | undefined;
      const fullUrl = `${req.protocol}://${req.hostname}${req.originalUrl}`;
      const valid = twilio.validateRequest(authToken, twilioSig ?? "", fullUrl, req.body);
      if (!valid) {
        res.status(403).send("Forbidden");
        return;
      }
    }

    const host = req.headers["x-forwarded-host"] ?? req.hostname;
    const protocol = req.headers["x-forwarded-proto"] ?? req.protocol;
    const greetingUrl = `${protocol}://${host}/api/sms/greeting.mp3`;

    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${greetingUrl}</Play>
  <Pause length="1"/>
  <Hangup/>
</Response>`);
  });

  // ── SMS Webhook (Twilio inbound) ──────────────────────────────────────────
  const SMS_CRISIS_RESPONSE = "You matter, and what you're sharing is serious. Please reach out right now — call or text 988 (Suicide & Crisis Lifeline, 24/7), or call 911 if you're in immediate danger. You are not alone.";

  function buildSmsSystemPrompt(exchangeCount: number): string {
    const historyNote = exchangeCount === 0
      ? "This is their very first message to you. Make them feel immediately heard and cared for."
      : exchangeCount === 1
        ? "This person has texted you once before. They've engaged — deepen the warmth and remember what they shared."
        : `This person has texted you ${exchangeCount} times. You have a growing connection. Be more personal and less introductory.`;

    return `You are Shepherd's Path — a warm, trusted Christian companion responding by text. Someone has just reached out. Your one job: make them feel genuinely heard and cared for.

Write one natural, flowing reply — no headers, no labels, no bullet points. This is a real conversation, not a template.

In your reply: let scripture speak to their moment — cite a real verse accurately (NKJV, ESV, or Amplified preferred). Give it two sentences of honest, personal reflection that sounds like a friend, not a preacher. Offer a brief prayer — 1 to 2 sentences — that's specific to what they've just shared. Close with one open, gentle question that shows you're genuinely interested in their life.

What you never do:
— Invent or misquote scripture. If uncertain of exact wording, paraphrase and say so.
— Use hollow affirmations, clichés, or preacher-speak ("lean into," "God is good all the time," "walk in His truth").
— Label the parts of your message ("Verse:", "Prayer:", etc.).
— Exceed 450 characters — this is SMS, and every word must earn its place.
— Capitalize "you" or "your" when addressing the person. In prayers: capitalize You, Your when addressing God directly. Capitalize He, Him, His only when referring to God or Jesus.

${historyNote}`;
  }

  function smsXml(text: string): string {
    const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
  }

  const SMS_FREE_DAILY_LIMIT = 5;

  app.get("/api/sms/ping", (_req, res) => {
    res.json({ ok: true, message: "SMS webhook endpoint is reachable", ts: new Date().toISOString() });
  });

  app.post("/api/sms/webhook", (req, res, next) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const host = (req.headers["x-forwarded-host"] ?? req.hostname) as string;
    const protocol = (req.headers["x-forwarded-proto"] ?? req.protocol) as string;
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;
    console.log(`[sms] Incoming webhook from=${req.body?.From ?? "unknown"} body="${req.body?.Body ?? ""}" url=${fullUrl}`);
    if (authToken) {
      const twilioSig = req.headers["x-twilio-signature"] as string | undefined;
      const valid = twilio.validateRequest(authToken, twilioSig ?? "", fullUrl, req.body);
      if (!valid) {
        console.warn(`[sms] Signature INVALID — reconstructed URL: ${fullUrl} | sig header: ${twilioSig ?? "none"}`);
        res.status(403).send("Forbidden");
        return;
      }
    }
    next();
  }, async (req, res) => {
    try {
      const from = (req.body.From as string | undefined)?.trim();
      const rawBody = (req.body.Body as string | undefined)?.trim() ?? "";
      const cmd = rawBody.toUpperCase().trim();

      if (!from) { res.type("text/xml").send(smsXml("")); return; }

      // Crisis always takes priority
      const smsSafety = scanUserText(rawBody);
      if (shouldBlockLlm(smsSafety)) {
        res.type("text/xml").send(smsXml(SMS_CRISIS_RESPONSE));
        return;
      }

      const convo = await storage.getSmsConversation(from);
      const today = new Date().toISOString().split("T")[0];

      // ── STOP command ─────────────────────────────────────────────────────────
      if (cmd === "STOP" || cmd === "UNSUBSCRIBE" || cmd === "QUIT") {
        await storage.upsertSmsConversation(from, convo?.messages ?? [], convo?.exchangeCount ?? 0, convo?.ctaSent ?? false, { optedOut: true, enrolledForDaily: false });
        res.type("text/xml").send(smsXml("You've been unsubscribed from Shepherd's Path daily messages. Text START any time to return. God bless you."));
        return;
      }

      // ── Check opted out ───────────────────────────────────────────────────────
      if (convo?.optedOut && cmd !== "START") {
        res.type("text/xml").send(smsXml("You're currently unsubscribed. Text START to receive messages again."));
        return;
      }

      // ── START command ─────────────────────────────────────────────────────────
      if (cmd === "START" || cmd === "UNSTOP") {
        await storage.upsertSmsConversation(from, convo?.messages ?? [], convo?.exchangeCount ?? 0, convo?.ctaSent ?? false, { optedOut: false, enrolledForDaily: true });
        res.type("text/xml").send(smsXml("Welcome back to Shepherd's Path. Text anything on your heart, VERSE for today's scripture, or DEVOTIONAL for your daily reflection. We're glad you're here."));
        return;
      }

      // ── JOIN PRAYER command ───────────────────────────────────────────────────
      if (cmd === "JOIN PRAYER") {
        await storage.upsertSmsConversation(from, convo?.messages ?? [], convo?.exchangeCount ?? 0, convo?.ctaSent ?? false, { joinedPrayerNetwork: true });
        res.type("text/xml").send(smsXml(
          "You've joined the Shepherd's Path Prayer Chain. When someone shares a prayer need, you'll receive it and can reply AMEN-[number] to stand with them.\n\nTo request prayer yourself, text: PRAY FOR [your need]\n\nText LEAVE PRAYER to stop."
        ));
        return;
      }

      // ── LEAVE PRAYER command ──────────────────────────────────────────────────
      if (cmd === "LEAVE PRAYER") {
        await storage.upsertSmsConversation(from, convo?.messages ?? [], convo?.exchangeCount ?? 0, convo?.ctaSent ?? false, { joinedPrayerNetwork: false });
        res.type("text/xml").send(smsXml("You've left the prayer chain. Text JOIN PRAYER any time to rejoin. You'll still receive your daily morning devotional."));
        return;
      }

      // ── AMEN command ──────────────────────────────────────────────────────────
      const amenMatch = cmd.match(/^AMEN[- ](\d+)$/);
      if (amenMatch) {
        const requestId = parseInt(amenMatch[1], 10);
        const prayerReq = await storage.getPrayerRequest(requestId);
        if (!prayerReq) {
          res.type("text/xml").send(smsXml("That prayer request wasn't found. Text HELP to see available commands."));
          return;
        }
        const newCount = await storage.addAmen(requestId, from);
        res.type("text/xml").send(smsXml(`Amen. Your prayer has been counted. ${newCount} ${newCount === 1 ? "person is" : "people are"} praying with them.`));
        // Notify the requester (fire and forget)
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const auth = process.env.TWILIO_AUTH_TOKEN;
        const fromNum = process.env.TWILIO_PHONE_NUMBER;
        if (sid && auth && fromNum && prayerReq.requesterPhone !== from) {
          twilio(sid, auth).messages.create({
            body: `${newCount} ${newCount === 1 ? "person is" : "people are"} praying with you right now. You are not alone. \uD83D\uDE4F`,
            from: fromNum,
            to: prayerReq.requesterPhone,
          }).catch(() => { });
        }
        return;
      }

      // ── Daily limit check (for AI responses only) ────────────────────────────
      const isAiCommand = cmd !== "HELP" && cmd !== "VERSE";
      const prevDate = convo?.dailyCountDate ?? "";
      const prevCount = (prevDate === today) ? (convo?.dailyCount ?? 0) : 0;

      if (isAiCommand && prevCount >= SMS_FREE_DAILY_LIMIT) {
        res.type("text/xml").send(smsXml(`You've reached today's limit of ${SMS_FREE_DAILY_LIMIT} free messages. Text again tomorrow, or visit ShepherdPathAI.com for unlimited conversations with Pro.`));
        return;
      }

      // ── HELP command ──────────────────────────────────────────────────────────
      if (cmd === "HELP") {
        const remaining = SMS_FREE_DAILY_LIMIT - prevCount;
        res.type("text/xml").send(smsXml(
          `Shepherd's Path — what you can text:\n\nAnything → scripture + prayer\nVERSE → today's verse\nDEVOTIONAL → morning reflection\nPRAY FOR [need] → share to prayer chain\nJOIN PRAYER → join the prayer chain\nAMEN-[#] → pray with someone\nSTOP / START → daily messages\n\n${remaining} free messages left today.\nShepherdPathAI.com for unlimited.`
        ));
        return;
      }

      // ── VERSE command ─────────────────────────────────────────────────────────
      if (cmd === "VERSE") {
        try {
          const verse = await storage.getVerseByDate(today);
          if (verse) {
            res.type("text/xml").send(smsXml(
              `Today's verse — ${verse.reference}\n\n"${verse.text}"\n\nText DEVOTIONAL for a full reflection, or share anything on your heart.`
            ));
          } else {
            res.type("text/xml").send(smsXml(`"Your word is a lamp to my feet and a light to my path." — Psalm 119:105\n\nText DEVOTIONAL for a full reflection, or share anything on your heart.`));
          }
        } catch {
          res.type("text/xml").send(smsXml("Text anything on your heart and I'll share scripture and prayer with you."));
        }
        return;
      }

      // ── PRAY FOR command ──────────────────────────────────────────────────────
      if (cmd.startsWith("PRAY FOR ")) {
        const prayerText = rawBody.slice(9).trim();
        if (!prayerText) {
          res.type("text/xml").send(smsXml("Please include your prayer need after PRAY FOR. Example: PRAY FOR my mother's healing."));
          return;
        }
        try {
          // AI formats the request with pastoral warmth and anonymity
          const formatCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You format prayer requests for a Christian prayer chain. Take the raw request and write a single sentence that is warm, specific, and anonymous — no names, no identifying details. It should move people to genuinely pray. Under 120 characters. Start with 'Please pray for' or 'Please lift up'. No quotes." },
              { role: "user", content: prayerText },
            ],
            max_tokens: 60,
            temperature: 0.7,
          });
          const formattedRequest = formatCompletion.choices[0].message.content?.trim() ?? `Please pray for someone who needs God's comfort and strength right now.`;

          // Save to DB and broadcast to prayer network
          const prayerRecord = await storage.createPrayerRequest(from, prayerText, formattedRequest);
          await storage.markPrayerBroadcast(prayerRecord.id);

          const network = await storage.getPrayerNetworkNumbers();
          const networkWithoutRequester = network.filter(n => n.phone !== from);

          const sid = process.env.TWILIO_ACCOUNT_SID;
          const auth = process.env.TWILIO_AUTH_TOKEN;
          const fromNum = process.env.TWILIO_PHONE_NUMBER;

          if (sid && auth && fromNum && networkWithoutRequester.length > 0) {
            const broadcastMsg = `Shepherd's Path Prayer Chain\n\n${formattedRequest}\n\nReply AMEN-${prayerRecord.id} to pray with them.`;
            const twilioClient = twilio(sid, auth);
            for (const member of networkWithoutRequester) {
              twilioClient.messages.create({ body: broadcastMsg, from: fromNum, to: member.phone }).catch(() => { });
            }
          }

          const partnerCount = networkWithoutRequester.length;
          const confirmMsg = partnerCount > 0
            ? `Your prayer has been shared with ${partnerCount} prayer ${partnerCount === 1 ? "partner" : "partners"}. You'll hear back as they pray with you. God hears every word. \uD83D\uDE4F`
            : `Your prayer has been received. Text JOIN PRAYER to connect with others who will pray with you.`;

          // Update daily count
          const newCount = prevCount + 1;
          await storage.upsertSmsConversation(from, convo?.messages ?? [], convo?.exchangeCount ?? 0, convo?.ctaSent ?? false, { dailyCount: newCount, dailyCountDate: today });

          res.type("text/xml").send(smsXml(confirmMsg));
        } catch (err) {
          console.error("[sms] PRAY FOR error:", err);
          res.type("text/xml").send(smsXml("Your prayer request was received. God hears you."));
        }
        return;
      }

      // ── DEVOTIONAL command or AI conversation ─────────────────────────────────
      try {
        const priorMessages = (convo?.messages ?? []).slice(-8).map((m: SmsMessage) => ({ role: m.role, content: m.content }));
        const exchangeCount = convo?.exchangeCount ?? 0;
        const ctaSent = convo?.ctaSent ?? false;

        let systemPrompt: string;
        if (cmd === "DEVOTIONAL") {
          const verse = await storage.getVerseByDate(today);
          const verseText = verse ? `Today's verse: ${verse.reference} — "${verse.text}"` : "";
          systemPrompt = `You are Shepherd's Path, sending a morning devotional by text message. ${verseText}\n\nWrite a devotional message in one flowing paragraph (no headers or labels). Include the verse reference and text, 2 warm sentences of reflection, and a short 1-sentence prayer. Keep total under 400 characters. No follow-up question — this is a gift, not a conversation starter. Warm, pastoral, no clichés.\n\nPronoun rule: capitalize He, Him, His only when referring to God or Jesus directly. In the prayer sentence, capitalize You, Your when addressing God. Never capitalize "you" or "your" when addressing the reader.`;
        } else {
          systemPrompt = buildSmsSystemPrompt(exchangeCount);
        }

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...priorMessages,
            { role: "user", content: rawBody },
          ],
          max_tokens: 200,
          temperature: 0.88,
        });

        let aiText = completion.choices[0].message.content?.trim()
          ?? "Isaiah 41:10 says, 'Do not fear, for I am with you.' You are not walking this alone. What's on your heart?";

        // CTA on 2nd+ exchange (conversation only, not DEVOTIONAL command)
        let newCtaSent = ctaSent;
        if (!ctaSent && exchangeCount >= 1 && cmd !== "DEVOTIONAL") {
          aiText += "\n\nDaily devotionals & more await you free at ShepherdPathAI.com";
          newCtaSent = true;
        }

        const ts = new Date().toISOString();
        const newMessages = [
          ...(convo?.messages ?? []),
          { role: "user" as const, content: rawBody, ts },
          { role: "assistant" as const, content: aiText, ts },
        ];

        await storage.upsertSmsConversation(from, newMessages, exchangeCount + 1, newCtaSent, {
          dailyCount: prevCount + 1,
          dailyCountDate: today,
          enrolledForDaily: true,
        });

        res.type("text/xml").send(smsXml(aiText));
      } catch (err) {
        console.error("[SMS webhook error]", err);
        if (!res.headersSent) res.type("text/xml").send(smsXml("Something went wrong on our end. Please try again in a moment."));
      }
    } catch (err) {
      console.error("[SMS webhook unhandled error]", err);
      if (!res.headersSent) res.type("text/xml").send(smsXml("Something went wrong on our end. Please try again in a moment."));
    }
  });

  // Digital Asset Links — required for Android TWA
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    const sha256 = process.env.ANDROID_SHA256_CERT || "REPLACE_WITH_SHA256_AFTER_BUBBLEWRAP_SETUP";
    const packageName = process.env.ANDROID_PACKAGE_NAME || "com.shepherdspath.app";
    const entries = [
      {
        relation: [
          "delegate_permission/common.handle_all_urls",
          "delegate_permission/common.get_login_creds",
        ],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: [sha256],
        },
      },
    ];
    res.json(entries);
  });

  // Google Play Billing verification
  app.post("/api/payments/play-billing/verify", async (req, res) => {
    const { purchaseToken, productId } = req.body;
    if (!purchaseToken || !productId) {
      return res.status(400).json({ success: false, error: "Missing purchaseToken or productId" });
    }

    // TODO: Verify with Google Play Developer API using service account credentials
    // Steps:
    // 1. Set GOOGLE_SERVICE_ACCOUNT_JSON environment variable with your service account key
    // 2. npm install googleapis
    // 3. Use google.auth.GoogleAuth + androidpublisher API to verify the purchase token
    // 4. Check acknowledgement status and grant Pro
    //
    // For now, log the token and return success for testing:
    console.log("[Play Billing] Purchase token received:", purchaseToken, "for product:", productId);

    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.warn("[Play Billing] GOOGLE_SERVICE_ACCOUNT_JSON not set — skipping server verification");
      return res.json({ success: true, note: "Server verification pending — grant Pro manually" });
    }

    try {
      const { google } = await import("googleapis");
      const credentials = JSON.parse(serviceAccountJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      });
      const androidPublisher = google.androidpublisher({ version: "v3", auth });
      const bundleId = process.env.ANDROID_PACKAGE_NAME || "com.shepherdspath.app";

      const purchase = await androidPublisher.purchases.subscriptions.get({
        packageName: bundleId,
        subscriptionId: productId,
        token: purchaseToken,
      });

      const data = purchase.data;

      // Check subscription hasn't expired
      const expiryMs = data.expiryTimeMillis ? parseInt(data.expiryTimeMillis, 10) : 0;
      const isExpired = expiryMs > 0 && expiryMs < Date.now();
      if (isExpired) {
        console.warn("[Play Billing] Subscription expired:", productId, "at", new Date(expiryMs).toISOString());
        return res.status(402).json({ success: false, error: "Subscription expired", expired: true });
      }

      // paymentState: 0=pending, 1=received, 2=free trial
      const isValid = data.paymentState === 1 || data.paymentState === 2;
      if (!isValid) {
        console.warn("[Play Billing] Invalid payment state:", data.paymentState);
        return res.status(402).json({ success: false, error: "Purchase not valid", paymentState: data.paymentState });
      }

      // Acknowledge the purchase — required within 3 days or Google auto-refunds
      // acknowledgementState: 0=not acknowledged, 1=acknowledged
      if (data.acknowledgementState === 0) {
        try {
          await androidPublisher.purchases.subscriptions.acknowledge({
            packageName: bundleId,
            subscriptionId: productId,
            token: purchaseToken,
            requestBody: {},
          });
          console.log("[Play Billing] Purchase acknowledged:", productId);
        } catch (ackErr) {
          // Log but don't fail — Google may have already acknowledged or it was acknowledged client-side
          console.warn("[Play Billing] Acknowledge warning (non-fatal):", ackErr);
        }
      }

      const cancelReason = data.cancelReason;
      const isCancelled = cancelReason !== undefined && cancelReason !== null;

      return res.json({
        success: true,
        expiryTimeMillis: data.expiryTimeMillis,
        autoRenewing: data.autoRenewing,
        isCancelled,
        cancelReason,
      });
    } catch (err) {
      console.error("[Play Billing] Verification error:", err);
      return res.status(500).json({ success: false, error: "Verification failed" });
    }
  });

  // ── Bible Trivia ────────────────────────────────────────────────────────────

  const TRIVIA_CATEGORIES: Record<string, string> = {
    "old-testament": "Old Testament",
    "new-testament": "New Testament",
    "life-of-jesus": "Life of Jesus",
    "bible-characters": "Bible Characters",
    "psalms-wisdom": "Psalms & Wisdom",
    "books-authors": "Books & Authors",
  };

  const TRIVIA_PROMPTS: Record<string, string> = {
    "old-testament": "Old Testament stories, events, people, and places (Genesis through Malachi)",
    "new-testament": "New Testament events, letters, churches, and teachings (Acts through Revelation)",
    "life-of-jesus": "The life, ministry, miracles, parables, crucifixion and resurrection of Jesus as recorded in the four Gospels",
    "bible-characters": "Notable people of the Bible — their lives, roles, and key moments",
    "psalms-wisdom": "Psalms, Proverbs, Ecclesiastes, and Job — their authors, themes, and key verses",
    "books-authors": "The books of the Bible — who wrote them, when, and in what context",
  };

  const pickTriviaQuestions = (pool: TriviaQuestion[], count = 10) => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const refreshTriviaQuestionsInBackground = async (
    storageKey: string,
    category: string,
    isHard: boolean,
  ) => {
    const prompt = TRIVIA_PROMPTS[category];
    const systemPrompt = isHard
      ? `You are a challenging Bible trivia question writer for a Christian faith app. Generate exactly 30 HARD multiple choice trivia questions about ${prompt}. Rules: questions must require deep knowledge — specific chapter and verse numbers, exact counts (e.g. "how many"), lesser-known names, precise sequences of events, detailed theological distinctions; 4 plausible answer options each; one clearly correct answer; include a brief teaching explanation (1-2 sentences) with a verse reference. Do NOT include easy or recall-level questions. Return ONLY a valid JSON array of 30 objects, no markdown, no commentary. Each object: {"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","verseRef":"..."}`
      : `You are a Bible trivia question writer for a Christian faith app. Generate exactly 30 multiple choice trivia questions about ${prompt}. Rules: questions must be factual/narrative (who, what, where, when), 4 distinct answer options each, one clearly correct answer, include a brief friendly explanation (1-2 sentences) that teaches something, add a verse reference when applicable, mix easy and medium difficulty. Return ONLY a valid JSON array of 30 objects, no markdown, no commentary. Each object: {"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","verseRef":"..."}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 4000,
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "[]";
    const parsed = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "")) as TriviaQuestion[];
    if (Array.isArray(parsed) && parsed.length >= 10) {
      await storage.saveTriviaQuestions(storageKey, parsed);
    }
  };

  app.get("/api/trivia/questions/:category", async (req, res) => {
    const { category } = req.params;
    if (!TRIVIA_CATEGORIES[category]) {
      return res.status(400).json({ error: "Unknown category" });
    }
    const isHard = req.query.difficulty === "challenging";
    const storageKey = isHard ? `${category}_challenging` : category;
    try {
      const cached = await storage.getTriviaQuestions(storageKey);
      if (cached && cached.length >= 10) {
        return res.json({
          questions: pickTriviaQuestions(cached),
          categoryLabel: TRIVIA_CATEGORIES[category],
        });
      }

      const seed = getTriviaSeed(storageKey, category);
      if (seed.length < 5) {
        return res.status(500).json({ error: "Could not load questions" });
      }

      res.json({
        questions: pickTriviaQuestions(seed),
        categoryLabel: TRIVIA_CATEGORIES[category],
      });

      if (!cached || cached.length < 10) {
        void refreshTriviaQuestionsInBackground(storageKey, category, isHard).catch((err) =>
          console.error("[Trivia] Background refresh error:", err),
        );
      }
    } catch (err) {
      console.error("[Trivia] Question load error:", err);
      const seed = getTriviaSeed(storageKey, category);
      if (seed.length >= 5) {
        return res.json({
          questions: pickTriviaQuestions(seed),
          categoryLabel: TRIVIA_CATEGORIES[category],
        });
      }
      res.status(500).json({ error: "Could not load questions" });
    }
  });

  app.post("/api/trivia/challenge", async (req, res) => {
    const { challengerName, category, categoryLabel, score, total, questions } = req.body;
    if (!category || score == null || !questions?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    try {
      const id = crypto.randomUUID();
      const challenge = await storage.saveTriviaChallenge(id, {
        challengerName: (challengerName || "A Friend").slice(0, 40),
        category,
        categoryLabel: categoryLabel || TRIVIA_CATEGORIES[category] || category,
        score,
        total: total || 10,
        questions,
      });
      res.json({ challenge });
    } catch (err) {
      console.error("[Trivia] Save challenge error:", err);
      res.status(500).json({ error: "Could not save challenge" });
    }
  });

  app.get("/api/trivia/challenge/:id", async (req, res) => {
    try {
      const challenge = await storage.getTriviaChallenge(req.params.id);
      if (!challenge) return res.status(404).json({ error: "Challenge not found" });
      res.json({ challenge });
    } catch (err) {
      res.status(500).json({ error: "Could not load challenge" });
    }
  });

  // ── Trivia play counter (in-memory, daily) ────────────────────────────────
  const triviaPlayCounts = new Map<string, number>();
  function todayKey() { return new Date().toISOString().split("T")[0]; }

  app.post("/api/trivia/play", (_req, res) => {
    const k = todayKey();
    const n = (triviaPlayCounts.get(k) ?? 0) + 1;
    triviaPlayCounts.set(k, n);
    res.json({ count: n });
  });

  app.get("/api/trivia/stats", (_req, res) => {
    res.json({ count: triviaPlayCounts.get(todayKey()) ?? 0 });
  });

  // ── Beta Feedback (public) ────────────────────────────────────────────────
  app.post("/api/feedback", async (req, res) => {
    const parsed = insertBetaFeedbackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid feedback data", errors: parsed.error.issues });
    try {
      const result = await storage.submitBetaFeedback(parsed.data);
      res.json({ ok: true, id: result.id });
    } catch (err) {
      console.error("[feedback] error:", err);
      res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  // ── Admin endpoints ────────────────────────────────────────────────────────
  function adminAuth(req: any, res: any): boolean {
    const password = process.env.ADMIN_PASSWORD;
    const bypass = process.env.ADMIN_BYPASS;
    if (!password && !bypass) { res.status(503).json({ message: "Admin not configured." }); return false; }
    const token = req.headers["x-admin-token"] as string | undefined;
    if (token !== password && token !== bypass) { res.status(401).json({ message: "Unauthorized." }); return false; }
    return true;
  }

  app.post("/api/admin/auth", (req, res) => {
    const password = process.env.ADMIN_PASSWORD;
    const bypass = process.env.ADMIN_BYPASS;
    if (!password && !bypass) return res.status(503).json({ message: "Admin not configured." });
    const { token } = req.body as { token?: string };
    if (token !== password && token !== bypass) return res.status(401).json({ message: "Wrong password." });
    res.json({ ok: true });
  });

  app.get("/api/admin/overview", async (req, res) => {
    if (!adminAuth(req, res)) return;
    try {
      const emailSubscribers = await storage.getAllActiveSubscribers();
      const smsSubscribers = await storage.getSmsOptedInNumbers();
      const pushSubscriptions = await storage.getAllPushSubscriptions();
      const activePros = await storage.getAllActiveProSubscribers();
      const proByEmail = new Map(activePros.map((p) => [p.email.toLowerCase(), p]));

      const emailList = emailSubscribers.map((s: any) => ({
        id: s.id,
        name: s.name || null,
        email: s.email,
        active: s.active,
        createdAt: s.createdAt,
        includeDailyArt: s.includeDailyArt,
        socialHandle: s.socialHandle || null,
        source: s.source || null,
        sessionLinked: !!s.sessionId,
        isPro: proByEmail.has(s.email.toLowerCase()),
        proPlan: proByEmail.get(s.email.toLowerCase())?.plan ?? null,
      }));

      const smsList = smsSubscribers.map((s: any) => ({
        phone: s.phone.replace(/(\+1)(\d{3})(\d{3})(\d{4})/, "$1 ($2) $3-$4"),
        lastMessageAt: s.lastMessageAt,
        exchangeCount: s.exchangeCount,
        joinedPrayerNetwork: s.joinedPrayerNetwork,
        createdAt: s.createdAt,
      }));

      res.json({
        counts: {
          emailSubscribers: emailList.length,
          smsSubscribers: smsList.length,
          pushSubscriptions: pushSubscriptions.length,
        },
        emailList,
        smsList,
      });
    } catch (err) {
      console.error("[admin] overview error:", err);
      res.status(500).json({ message: "Failed to load data." });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    if (!adminAuth(req, res)) return;
    try {

      const [sessionsRes, activeRes, journalDailyRes, prayerDailyRes, proRes, streakDistRes, journalTotalRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total, AVG(current_streak)::numeric(4,1) as avg_streak, MAX(current_streak) as max_streak, MAX(longest_streak) as longest_ever FROM streaks`),
        pool.query(`SELECT COUNT(*) as active_today FROM streaks WHERE last_visit_date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')`),
        pool.query(`SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as day, COUNT(*)::int as count FROM journal_entries WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY day`),
        pool.query(`SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as day, COUNT(*)::int as count FROM prayer_wall WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY day`),
        pool.query(`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active FROM pro_subscribers`),
        pool.query(`SELECT current_streak, COUNT(*)::int as sessions FROM streaks WHERE current_streak > 0 GROUP BY current_streak ORDER BY current_streak`),
        pool.query(`SELECT COUNT(*)::int as total FROM journal_entries WHERE created_at > NOW() - INTERVAL '30 days'`),
      ]);

      res.json({
        sessions: {
          total: parseInt(sessionsRes.rows[0].total),
          activeToday: parseInt(activeRes.rows[0].active_today),
          avgStreak: parseFloat(sessionsRes.rows[0].avg_streak || "0"),
          maxStreak: parseInt(sessionsRes.rows[0].max_streak || "0"),
          longestEver: parseInt(sessionsRes.rows[0].longest_ever || "0"),
        },
        journalDaily: journalDailyRes.rows as { day: string; count: number }[],
        prayerDaily: prayerDailyRes.rows as { day: string; count: number }[],
        journalTotal30d: journalTotalRes.rows[0].total,
        pro: proRes.rows[0] as { total: number; active: number },
        streakDist: streakDistRes.rows as { current_streak: number; sessions: number }[],
      });
    } catch (err) {
      console.error("[admin] analytics error:", err);
      res.status(500).json({ message: "Failed to load analytics." });
    }
  });

  app.get("/api/admin/feedback", async (req, res) => {
    if (!adminAuth(req, res)) return;
    try {
      const feedback = await storage.getAllBetaFeedback();
      res.json({ feedback });
    } catch (err) {
      console.error("[admin] feedback error:", err);
      res.status(500).json({ message: "Failed to load feedback." });
    }
  });

  app.get("/api/admin/ai-usage", async (req, res) => {
    if (!adminAuth(req, res)) return;
    try {
      const [logs, summary] = await Promise.all([
        storage.getAiUsageLogs(1000),
        storage.getAiUsageSummary(),
      ]);
      res.json({ logs, summary });
    } catch (err) {
      console.error("[admin] ai-usage error:", err);
      res.status(500).json({ message: "Failed to load AI usage." });
    }
  });

  // Daily message — one curated short clip per day, anchored to verse + reflection context
  app.post("/api/sermon/daily", async (req, res) => {
    try {
      const { verseId, date, reflectionContext, sessionId, isPro } = req.body as {
        verseId: number;
        date?: string;
        reflectionContext?: string;
        sessionId?: string;
        isPro?: boolean;
      };

      const dateKey = date || new Date().toISOString().slice(0, 10);
      const cacheKey = `${dateKey}:${verseId}`;

      if (dailySermonCache.has(cacheKey)) {
        return res.json(dailySermonCache.get(cacheKey));
      }

      const sermonGuard = checkFeatureBudget(sessionId, "sermon-daily", parseProFlag(isPro));
      if (!sermonGuard.ok) {
        return res.status(sermonGuard.status).json({ found: false, code: sermonGuard.code, message: sermonGuard.message });
      }

      const verse = await storage.getVerseById(verseId);
      if (!verse) return res.json({ found: false });

      // Step 1: Generate theme, framing text, and search query via OpenAI
      const analysisRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: `You are curating a single short video message (5–10 minutes) for someone who just completed their daily devotional. Return JSON:
{
  "theme": "2–4 words describing the message theme (e.g. 'persistent prayer', 'lament before God', 'endurance in trials')",
  "preacher": "exactly ONE approved preacher whose gift fits this verse — do not default to Tony Evans",
  "emotionTags": ["2–5 lowercase tags from: grief, loss, anxiety, fear, hopelessness, depression, anger, loneliness, doubt, confusion, shame, guilt, identity, purpose, direction, hope, gratitude, forgiveness, marriage, prodigal, addiction, suffering, healing, trust, surrender, waiting, courage, failure, rejection, betrayal, comparison, envy, pride, control, worth, relationship"],
  "searchQuery": "[preacher name] + theme words from the verse + 'sermon clip' or 'short teaching' (5–10 min)",
  "framing": "2 warm, unhurried sentences that begin with 'After sitting with' — explain why this short message was found for this person today. Reference the verse's emotional or spiritual theme, not the reference number. Write as a pastoral friend who found this specifically for them, not a curator. Never mention AI, algorithm, or technology."
}

${PASTOR_TIER_AI_GUIDE}`,
          },
          {
            role: "user",
            content: `Verse: ${verse.reference} — "${verse.text}"${reflectionContext ? `\n\nThe reflection that landed for them today:\n"${reflectionContext.slice(0, 500)}"` : ""}\n\nFind a short clip or excerpt (5–10 min) that will deepen what they just received without asking a lot of their time.`,
          },
        ],
      });

      const analysis = JSON.parse(analysisRes.choices[0]?.message?.content || "{}");
      const emotionTags: string[] = Array.isArray(analysis.emotionTags) ? analysis.emotionTags : [];

      // Step 2: Library-first — indexed transcript segments (most accurate when populated)
      const { findBestDailySegment, formatClipDuration } = await import("../sermonIngestion");
      const librarySeg =
        emotionTags.length > 0
          ? await findBestDailySegment({
              emotionTags,
              pastorHint: analysis.preacher,
              rotationSeed: cacheKey,
            })
          : null;

      if (librarySeg) {
        const clipSecs = librarySeg.endSeconds - librarySeg.startSeconds;
        const result = {
          found: true,
          source: "library" as const,
          sermon: {
            videoId: librarySeg.youtubeId,
            title: librarySeg.momentTitle || librarySeg.summary,
            channel: librarySeg.preacher,
            thumbnail: `https://img.youtube.com/vi/${librarySeg.youtubeId}/hqdefault.jpg`,
            duration: formatClipDuration(clipSecs),
            theme: analysis.theme || "",
            framing: analysis.framing || "",
            startSeconds: librarySeg.startSeconds,
            quote: librarySeg.quote || null,
          },
        };
        dailySermonCache.set(cacheKey, result);
        if (dailySermonCache.size > 20) {
          dailySermonCache.delete(dailySermonCache.keys().next().value!);
        }
        return res.json(result);
      }

      if (!analysis.searchQuery) return res.json({ found: false });

      // Step 3: YouTube search fallback — medium-length videos (4–20 min), trusted channels ranked first
      const ytKey = process.env.YOUTUBE_API_KEY;
      if (!ytKey) return res.json({ found: false });

      const searchUrl = buildYouTubeSearchUrl(analysis.searchQuery, ytKey, {
        maxResults: 10,
        videoDuration: "medium",
      });
      const initialItems = await fetchYouTubeSearchItems(searchUrl);

      const video = await resolvePastorYouTubeVideo(
        initialItems,
        ytKey,
        {
          verseReference: verse.reference,
          verseText: verse.text,
          themeHint: analysis.theme || analysis.searchQuery,
          pastorHint: analysis.preacher,
          rotationSeed: cacheKey,
        },
        { videoDuration: "medium", allowNonListedFallback: true },
      );
      if (!video?.id?.videoId) return res.json({ found: false });

      const videoId = video.id.videoId;
      const snippet = video.snippet!;

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${ytKey}`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = (await detailsRes.json()) as any;
      let duration = "";
      if (detailsData.items?.[0]) {
        const iso = detailsData.items[0].contentDetails.duration;
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const h = match[1] ? `${match[1]}:` : "";
          const m = match[2] ? match[2].padStart(h ? 2 : 1, "0") : "0";
          const s = match[3] ? match[3].padStart(2, "0") : "00";
          duration = `${h}${m}:${s}`;
        }
      }

      const result = {
        found: true,
        source: "youtube" as const,
        sermon: {
          videoId,
          title: snippet.title,
          channel: snippet.channelTitle,
          thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
          duration,
          theme: analysis.theme || "",
          framing: analysis.framing || "",
        },
      };

      dailySermonCache.set(cacheKey, result);
      if (dailySermonCache.size > 20) {
        dailySermonCache.delete(dailySermonCache.keys().next().value!);
      }

      return res.json(result);
    } catch (err) {
      console.error("[sermon/daily] error:", err);
      return res.json({ found: false });
    }
  });

  // ── Additional sermon clips — 2 more voices after the primary one ───────────
  const additionalSermonCache = new Map<string, any>();

  app.post("/api/sermon/additional", async (req, res) => {
    try {
      const { verseId, date, reflectionContext, primaryPastor, customTopic, sessionId, isPro } = req.body as {
        verseId: number; date?: string; reflectionContext?: string; primaryPastor?: string; customTopic?: string;
        sessionId?: string; isPro?: boolean;
      };

      const dateKey = date || new Date().toISOString().slice(0, 10);
      // Custom topic searches are not cached by day — they're user-directed, unique per query
      const cacheKey = customTopic
        ? `topic:${customTopic.slice(0, 40).toLowerCase().replace(/\s+/g, "-")}`
        : `${dateKey}:${verseId}:additional`;
      if (!customTopic && additionalSermonCache.has(cacheKey)) return res.json(additionalSermonCache.get(cacheKey));

      const addGuard = checkFeatureBudget(sessionId, "sermon-additional", parseProFlag(isPro));
      if (!addGuard.ok) {
        return res.status(addGuard.status).json({ found: false, sermons: [], code: addGuard.code, message: addGuard.message });
      }

      // For standalone custom-topic searches (GoDeepCard), verseId is not provided —
      // skip the verse lookup entirely; the AI only needs the topic.
      const verse = verseId ? await storage.getVerseById(verseId) : null;
      if (!verse && !customTopic) return res.json({ found: false, sermons: [] });

      const ytKey = process.env.YOUTUBE_API_KEY;
      if (!ytKey) return res.json({ found: false, sermons: [] });

      // Build AI prompt — custom topic search gets a different prompt focused on the user's term
      const systemPrompt = customTopic
        ? `You are curating 2 sermon or podcast clips for a Christian devotional app. Return JSON:
{
  "clips": [
    { "searchQuery": "...", "pastor": "..." },
    { "searchQuery": "...", "pastor": "..." }
  ]
}
The user typed: "${customTopic}"

IMPORTANT: Users often type raw emotional phrases ("I'm struggling with heartbreak", "my marriage is falling apart", "I feel worthless"). Your job is to EXTRACT the core spiritual/emotional theme and convert it into a clean, effective YouTube search query that will actually return results.

Examples of good extraction:
- "pain from a breakup and heartbreak is killing me" → theme: heartbreak healing → preacher: Dharius Daniels → searchQuery: "Dharius Daniels heartbreak healing sermon clip"
- "I can't stop being anxious" → theme: anxiety, peace → preacher: Matt Chandler → searchQuery: "Matt Chandler anxiety peace sermon clip"
- "my marriage is falling apart" → theme: marriage restoration → preacher: T.D. Jakes → searchQuery: "T.D. Jakes marriage restoration sermon clip"
- "I feel completely worthless" → theme: identity, self-worth → preacher: Phillip Mitchell → searchQuery: "Phillip Mitchell identity worth in God sermon"
- "addiction is ruining my life" → theme: addiction, freedom → preacher: Michael Todd → searchQuery: "Michael Todd addiction freedom teaching clip"

Choose 2 preachers from different tiers who speak WELL on this specific theme.
${PASTOR_TIER_AI_GUIDE}

For each searchQuery: use pastor name + the CLEAN EXTRACTED THEME + "sermon" or "teaching". Do NOT put the user's raw emotional phrase in the search query. Target 5–15 min content.`
        : `You are curating 2 additional short sermon clips for someone who just completed a devotional. Return JSON:
{
  "clips": [
    { "searchQuery": "...", "pastor": "..." },
    { "searchQuery": "...", "pastor": "..." }
  ]
}
Choose 2 preachers from different tiers to give range of voice and perspective.
${PASTOR_TIER_AI_GUIDE}
Each clip should approach the verse theme from a different angle than the other.
Avoid repeating: ${primaryPastor || "none"}.
Include "clip" or "short" in each searchQuery. Target 5–10 minute content.`;

      const userPrompt = customTopic
        ? `Find 2 clips on this topic: "${customTopic}".${verse ? ` Verse context: ${verse.reference} — "${verse.text}"` : ""}`
        : `Verse: ${verse!.reference} — "${verse!.text}"${reflectionContext ? `\nReflection context: "${reflectionContext.slice(0, 300)}"` : ""}`;

      const aiRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 350,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const analysis = JSON.parse(aiRes.choices[0]?.message?.content || "{}");
      if (!analysis.clips?.length) return res.json({ found: false, sermons: [] });

      // Run both searches in parallel
      const sermonPromises = analysis.clips.slice(0, 2).map(async (clip: any) => {
        const searchUrl = buildYouTubeSearchUrl(clip.searchQuery, ytKey, {
          maxResults: 10,
          videoDuration: "medium",
        });
        const initialItems = await fetchYouTubeSearchItems(searchUrl);

        const video = await resolvePastorYouTubeVideo(
          initialItems,
          ytKey,
          {
            verseReference: verse?.reference,
            verseText: verse?.text,
            themeHint: clip.searchQuery,
            pastorHint: clip.pastor,
            rotationSeed: `${cacheKey}:${clip.pastor || "clip"}`,
            excludeChannelTitles: primaryPastor ? [primaryPastor] : undefined,
          },
          { videoDuration: "medium", allowNonListedFallback: true },
        );
        if (!video?.id?.videoId) return null;

        const videoId = video.id.videoId;
        const snippet = video.snippet!;

        // Get duration
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${ytKey}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = (await detailsRes.json()) as any;
        let duration = "";
        if (detailsData.items?.[0]) {
          const iso = detailsData.items[0].contentDetails.duration;
          const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (match) {
            const h = match[1] ? `${match[1]}:` : "";
            const m = match[2] ? match[2].padStart(h ? 2 : 1, "0") : "0";
            const s = match[3] ? match[3].padStart(2, "0") : "00";
            duration = `${h}${m}:${s}`;
          }
        }

        return {
          videoId,
          title: snippet.title,
          channel: snippet.channelTitle,
          thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
          duration,
          pastor: clip.pastor || snippet.channelTitle,
        };
      });

      const sermons = (await Promise.all(sermonPromises)).filter(Boolean);
      const result = { found: sermons.length > 0, sermons };
      additionalSermonCache.set(cacheKey, result);
      if (additionalSermonCache.size > 20) additionalSermonCache.delete(additionalSermonCache.keys().next().value!);
      return res.json(result);
    } catch (err) {
      console.error("[sermon/additional] error:", err);
      return res.json({ found: false, sermons: [] });
    }
  });

  // Deep study prompts + related scriptures — for further exploration after videos
  app.post("/api/study/deep-prompts", async (req, res) => {
    try {
      const { verseReference, reflectionContent } = req.body as { verseReference?: string; reflectionContent?: string };
      if (!verseReference) return res.status(400).json({ error: "Missing verseReference" });

      const snippet = (reflectionContent || "").slice(0, 300);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a Bible teacher helping someone go deeper after watching sermon videos. Given a verse and reflection, return a JSON object with two keys:
"prompts": exactly 4 short, powerful study prompts (questions or explore topics). Each 5-12 words, spiritually rich and actionable.
"scriptures": exactly 3 related Bible verses that deepen or expand this theme. Each entry has "reference" (e.g. "Romans 8:1") and "text" (the verse text, max 25 words, no ellipsis).
Output ONLY valid JSON, no markdown, no explanation.
Example: {"prompts":["What does adoption mean in Romans 8?","How does the Spirit confirm our identity?","Living free from condemnation — what changes?","Praying Scripture back to God on identity"],"scriptures":[{"reference":"John 1:12","text":"Yet to all who did receive him, to those who believed in his name, he gave the right to become children of God"},{"reference":"Galatians 4:6","text":"Because you are his sons, God sent the Spirit of his Son into our hearts, the Spirit who calls out, Abba, Father"},{"reference":"1 John 3:1","text":"See what great love the Father has lavished on us, that we should be called children of God! And that is what we are"}]}`
          },
          {
            role: "user",
            content: `Verse: ${verseReference}\nReflection snippet: ${snippet}`
          }
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
      let prompts: string[] = [];
      let scriptures: { reference: string; text: string }[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.prompts)) {
          prompts = parsed.prompts.slice(0, 4).filter((p: unknown) => typeof p === "string" && (p as string).trim());
        }
        if (Array.isArray(parsed.scriptures)) {
          scriptures = parsed.scriptures.slice(0, 3).filter(
            (s: unknown) => s && typeof (s as { reference: string }).reference === "string" && typeof (s as { text: string }).text === "string"
          );
        }
      } catch { /* fallback below */ }

      if (!prompts.length) {
        prompts = [
          `What did the original audience understand about ${verseReference}?`,
          "How does this truth change how I see myself today?",
          "Related passages that connect to this theme",
          "How can I pray this verse back to God?",
        ];
      }

      res.json({ prompts, scriptures });
    } catch (err) {
      console.error("[deep-prompts] error:", err);
      res.status(500).json({ error: "Failed to generate prompts" });
    }
  });

  // Scripture context — 3 plain-language sections + bridge back to the devotional moment
  app.get("/api/context", async (req, res) => {
    try {
      const { reference, text, sessionId, isPro } = req.query as {
        reference?: string; text?: string; sessionId?: string; isPro?: string;
      };
      if (!reference || !text) return res.status(400).json({ error: "Missing params" });

      const cacheKey = reference.toLowerCase().replace(/[\s:,]/g, "_");
      if (scriptureContextCache.has(cacheKey)) return res.json(scriptureContextCache.get(cacheKey));

      const ctxGuard = checkFeatureBudget(sessionId, "context-fetch", parseProFlag(isPro));
      if (!ctxGuard.ok) {
        return res.status(ctxGuard.status).json({ error: ctxGuard.message, code: ctxGuard.code });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are helping someone understand where a Bible verse comes from. Write like a knowledgeable friend — warm, plain, unhurried. No jargon. No lecture tone. No "this passage teaches us." Prioritize what the reader can feel over what they should know. Return ONLY valid JSON — no markdown, no code fences.`,
          },
          {
            role: "user",
            content: `Give background on this Bible passage: "${reference}" — "${text}"

Return a JSON object with exactly these four fields:

"whoAndWhen": 2–3 sentences. Who wrote this, and what do we know about them as a person? Just enough to place the reader — not a biography. Sound human, not like a textbook entry.

"whatWasHappening": 2–3 sentences. What was the world actually like for the people this was written to? What were they going through? Help the reader feel the situation, not just understand it.

"whyItMatters": 2–3 sentences. Why does this passage land the way it does? Focus on what it would have meant to the people who first heard it, and why that still resonates. Don't tell the reader what to do with it — let it speak.

"bridge": One honest sentence that connects this background to reading the verse right now. Make it specific to this passage — not a formula that could work for any verse.`,
          },
        ],
        temperature: 0.4,
        max_tokens: 700,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      scriptureContextCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      console.error("[context] error:", err);
      res.status(500).json({ error: "Failed to generate context" });
    }
  });

  // Context Q&A — brief, grounded follow-up answers anchored to the passage
  app.post("/api/context/ask", async (req, res) => {
    try {
      const { reference, text, question, sessionId, isPro, daysWithApp } = req.body as {
        reference?: string;
        text?: string;
        question?: string;
        sessionId?: string;
        isPro?: boolean;
        daysWithApp?: number;
      };
      if (!reference || !text || !question) {
        return res.status(400).json({ error: "Missing params" });
      }

      const verseChatSafety = scanUserText(question);
      if (shouldBlockLlm(verseChatSafety)) {
        return res.status(200).json({ content: verseChatSafety.response ?? CRISIS_RESPONSE });
      }

      const isProCtx = parseProFlag(isPro);
      const askGuard = checkFeatureBudget(sessionId, "context-ask", isProCtx);
      if (!askGuard.ok) {
        return res.status(askGuard.status).json({ error: askGuard.message, code: askGuard.code });
      }
      const aiGuardCtxAsk = checkAiDailyLimit(sessionId, Number(daysWithApp) || 1, isProCtx);
      if (!aiGuardCtxAsk.ok) {
        return res.status(aiGuardCtxAsk.status).json({ error: aiGuardCtxAsk.message, limitReached: true });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are helping someone understand a specific thing about a Bible passage they just read background on. They have already seen brief historical context — who wrote this, what was happening, why it resonates. Now they have one question. Your job is to answer it directly.

Rules:
— Respond in 3–5 sentences. Not paragraphs, not bullet points. Sentences.
— Go one layer deeper than the surface of the question. Don't just say what — say why it would have felt that way.
— Stay anchored to this specific passage. Don't drift into general Bible teaching.
— No follow-up questions. No "would you like to know more?" The person leads.
— No sermon tone. No "this reminds us to..." or "we should..." 
— No hollow affirmations. Get straight to the answer.
— Sound like a knowledgeable friend, not a commentary.

The verse is: "${reference}" — "${text}"`,
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.5,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content || "Could not generate a response.";
      res.status(200).json({ content });
    } catch (err) {
      console.error("[context/ask] error:", err);
      res.status(500).json({ error: "Failed to answer question" });
    }
  });

  // Curated resource suggestion — analyzes conversation depth and finds a specific video teaching
  app.post("/api/resources/suggest", async (req, res) => {
    try {
      const { messages, topic } = req.body as {
        messages: { role: string; content: string }[];
        topic?: string;
      };

      if (!messages || messages.length < 4) {
        return res.json({ shouldSuggest: false });
      }

      const userMessages = messages.filter((m) => m.role === "user");
      const assistantMessages = messages.filter((m) => m.role === "assistant");
      if (userMessages.length < 2 || assistantMessages.length < 2) {
        return res.json({ shouldSuggest: false });
      }

      const conversationSummary = messages
        .map((m) => `${m.role === "user" ? "Person" : "Guide"}: ${m.content}`)
        .join("\n\n");

      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are helping surface a single, deeply relevant sermon clip for someone in a real spiritual conversation. Respond with JSON only.

Return:
{
  "shouldSuggest": boolean,
  "emotionTags": string[],
  "searchQuery": string,
  "preacher": string,
  "momentTitle": string,
  "leadIn": string
}

Only return shouldSuggest: true when ALL of these are true:
- The conversation shows genuine, sustained engagement with a specific struggle, grief, theological difficulty, or life crisis
- A specific sermon moment would meaningfully extend what this person is experiencing — not just repeat it
- The topic is concrete enough to find something highly relevant (not "faith" — something like "forgiving someone who hurt you deeply" or "losing hope after a tragedy")

If shouldSuggest is true:
- emotionTags: array of 2–5 lowercase single-word emotion states from this list: grief, loss, anxiety, fear, hopelessness, depression, anger, loneliness, doubt, confusion, shame, guilt, identity, purpose, direction, hope, gratitude, forgiveness, marriage, prodigal, addiction, suffering, healing, trust, surrender, waiting, courage, failure, rejection, betrayal, comparison, envy, pride, control, worth, relationship
- searchQuery: a precise YouTube search targeting SHORT sermon clips (2–6 minutes). Include "clip" or "short" in the query. ${PASTOR_TIER_AI_GUIDE} Default to Tier 1 for grief, doubt, shame, surrender — use Tier 3 for motivation, identity, or cultural resonance.
- preacher: the specific teacher you are targeting (e.g. "Michael Todd")
- momentTitle: a specific, compelling 4–8 word title for what this moment addresses (e.g. "On carrying grief no one can see")
- leadIn: 2 warm, personal sentences framing WHY this moment is relevant to their exact situation. Begin with "There's a moment from [preacher]..." — make it feel like someone who just listened to this conversation and found something specifically for them. Never say "video" — say "moment" or "message."

When in doubt, return shouldSuggest: false. One wrong recommendation breaks trust permanently.`,
          },
          {
            role: "user",
            content: `Conversation:\n\n${conversationSummary}\n\n${topic ? `Topic: ${topic}` : ""}\n\nShould we surface a curated sermon moment?`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const analysis = JSON.parse(
        analysisResponse.choices[0].message.content || "{}"
      );

      if (!analysis.shouldSuggest) {
        return res.json({ shouldSuggest: false });
      }

      // ── STEP 1: Try to match from pre-processed sermon library ────────────
      const { findMatchingSegments } = await import("../sermonIngestion");
      const emotionTags: string[] = analysis.emotionTags || [];
      const dbSegments = emotionTags.length > 0 ? await findMatchingSegments(emotionTags, 3) : [];

      if (dbSegments.length > 0) {
        const seg = dbSegments[0];
        const segmentDurationSecs = seg.endSeconds - seg.startSeconds;
        const m = Math.floor(segmentDurationSecs / 60);
        const s = segmentDurationSecs % 60;
        const duration = `${m}:${s.toString().padStart(2, "0")}`;
        const startM = Math.floor(seg.startSeconds / 60);
        const startS = seg.startSeconds % 60;
        const startLabel = `${startM}:${startS.toString().padStart(2, "0")}`;

        // Generate a personal leadIn for this specific segment
        const leadInRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 120,
          messages: [
            {
              role: "system",
              content: `Write 2 warm, personal sentences introducing a specific sermon moment to someone in the conversation below. The moment: "${seg.summary}". It helps someone who is: "${seg.helpsWith}". Begin with "There's a moment from ${seg.preacher}..." — feel like a pastoral friend who just found this specifically for them. Never say "video." Say "moment" or "message."`,
            },
            { role: "user", content: `Conversation:\n\n${conversationSummary}` },
          ],
        });
        const personalLeadIn = leadInRes.choices[0]?.message?.content?.trim() || analysis.leadIn || "";

        const thumbnailUrl = `https://img.youtube.com/vi/${seg.youtubeId}/hqdefault.jpg`;

        return res.json({
          shouldSuggest: true,
          source: "library",
          video: {
            id: seg.youtubeId,
            title: seg.momentTitle || seg.summary,
            channel: seg.preacher,
            thumbnail: thumbnailUrl,
            duration,
            startSeconds: seg.startSeconds,
            startLabel,
            leadIn: personalLeadIn,
            momentTitle: seg.momentTitle || analysis.momentTitle || "",
            preacher: seg.preacher,
            quote: seg.quote || null,
          },
        });
      }

      // ── STEP 2: Fall back to YouTube search ───────────────────────────────
      if (!analysis.searchQuery) {
        return res.json({ shouldSuggest: false });
      }

      const ytKey = process.env.YOUTUBE_API_KEY;
      const searchUrl = buildYouTubeSearchUrl(analysis.searchQuery, ytKey, {
        maxResults: 8,
        videoDuration: "short",
      });
      const initialItems = await fetchYouTubeSearchItems(searchUrl);

      if (!initialItems.length) {
        return res.json({ shouldSuggest: false });
      }

      const video = await resolvePastorYouTubeVideo(
        initialItems,
        ytKey,
        {
          themeHint: analysis.searchQuery,
          pastorHint: analysis.preacher,
        },
        { videoDuration: "short", allowNonListedFallback: true },
      );
      if (!video?.id?.videoId) {
        return res.json({ shouldSuggest: false });
      }

      const videoId = video.id.videoId;
      const snippet = video.snippet!;

      // Get video duration
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${ytKey}`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = (await detailsRes.json()) as any;

      let duration = "";
      if (detailsData.items?.[0]) {
        const iso = detailsData.items[0].contentDetails.duration;
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const h = match[1] ? `${match[1]}:` : "";
          const m = match[2] ? match[2].padStart(h ? 2 : 1, "0") : "0";
          const s = match[3] ? match[3].padStart(2, "0") : "00";
          duration = `${h}${m}:${s}`;
        }
      }

      return res.json({
        shouldSuggest: true,
        source: "youtube",
        video: {
          id: videoId,
          title: snippet.title,
          channel: snippet.channelTitle,
          thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
          duration,
          leadIn: analysis.leadIn || "",
          momentTitle: analysis.momentTitle || "",
          preacher: analysis.preacher || snippet.channelTitle,
        },
      });
    } catch (err) {
      console.error("[resources/suggest] error:", err);
      return res.json({ shouldSuggest: false });
    }
  });

  // ── Admin: Sermon ingestion ──────────────────────────────────────────────
  app.post("/api/admin/sermons/ingest", async (req, res) => {
    const adminPw = req.headers["x-admin-password"] || req.body.adminPassword;
    if (adminPw !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { youtubeId, title, preacher, thumbnailUrl } = req.body;
      if (!youtubeId || !title || !preacher) {
        return res.status(400).json({ error: "youtubeId, title, and preacher are required" });
      }
      const { ingestSermon } = await import("../sermonIngestion");
      const result = await ingestSermon(youtubeId, title, preacher, thumbnailUrl);
      return res.json(result);
    } catch (err) {
      console.error("[admin/sermons/ingest] error:", err);
      return res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/admin/sermons/curated", async (req, res) => {
    const adminPw = req.headers["x-admin-password"] || req.query.adminPassword;
    if (adminPw !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { CURATED_SERMON_SEED } = await import("../curatedSermonSeed");
    const { getSermonLibraryStats } = await import("../sermonIngestion");
    const stats = await getSermonLibraryStats();
    return res.json({ curated: CURATED_SERMON_SEED, stats });
  });

  app.post("/api/admin/sermons/seed-curated", async (req, res) => {
    const adminPw = req.headers["x-admin-password"] || req.body.adminPassword;
    if (adminPw !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { CURATED_SERMON_SEED } = await import("../curatedSermonSeed");
      const { ingestSermon, getSermonLibraryStats } = await import("../sermonIngestion");
      const delayMs = Math.min(5000, Math.max(800, Number(req.body?.delayMs) || 1500));
      const results: Array<{ youtubeId: string; success: boolean; segmentsCreated?: number; error?: string }> = [];

      for (const sermon of CURATED_SERMON_SEED) {
        const result = await ingestSermon(sermon.youtubeId, sermon.title, sermon.preacher);
        results.push({ youtubeId: sermon.youtubeId, ...result });
        await new Promise((r) => setTimeout(r, delayMs));
      }

      const stats = await getSermonLibraryStats();
      return res.json({ ok: true, results, stats });
    } catch (err) {
      console.error("[admin/sermons/seed-curated] error:", err);
      return res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/admin/sermons", async (req, res) => {
    const adminPw = req.headers["x-admin-password"] || req.query.adminPassword;
    if (adminPw !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { db } = await import("../db");
      const { sermonVideos, sermonSegments } = await import("@workspace/db");
      const videos = await db.select().from(sermonVideos);
      const segments = await db.select().from(sermonSegments);
      return res.json({ videos, segments });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  });

  // Search YouTube for sermons by a specific preacher (admin only)
  app.get("/api/admin/sermons/search", async (req, res) => {
    const adminPw = req.headers["x-admin-password"] || req.query.adminPassword;
    if (adminPw !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const preacher = (req.query.preacher as string || "").trim();
    if (!preacher) return res.status(400).json({ error: "preacher query param required" });

    try {
      const ytKey = process.env.YOUTUBE_API_KEY;
      const query = encodeURIComponent(`${preacher} sermon full`);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=12&relevanceLanguage=en&safeSearch=strict&key=${ytKey}&order=viewCount&videoDuration=long`;
      const ytRes = await fetch(url);
      const ytData = (await ytRes.json()) as any;

      if (!ytData.items) return res.json({ results: [] });

      // Get durations
      const ids = ytData.items.map((i: any) => i.id.videoId).join(",");
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}&key=${ytKey}`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = (await detailsRes.json()) as any;
      const detailsMap: Record<string, any> = {};
      for (const item of (detailsData.items || [])) {
        detailsMap[item.id] = item;
      }

      const results = ytData.items.map((item: any) => {
        const videoId = item.id.videoId;
        const details = detailsMap[videoId];
        let duration = "";
        if (details?.contentDetails?.duration) {
          const iso = details.contentDetails.duration;
          const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (match) {
            const h = match[1] ? `${match[1]}:` : "";
            const m = match[2] ? match[2].padStart(h ? 2 : 1, "0") : "0";
            const s = match[3] ? match[3].padStart(2, "0") : "00";
            duration = `${h}${m}:${s}`;
          }
        }
        const views = details?.statistics?.viewCount
          ? parseInt(details.statistics.viewCount).toLocaleString()
          : "";
        return {
          youtubeId: videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
          duration,
          views,
        };
      });

      return res.json({ results });
    } catch (err) {
      console.error("[admin/sermons/search] error:", err);
      return res.status(500).json({ error: String(err) });
    }
  });

  // ── Generate custom scripture for a user-provided topic (Calling page) ──
  app.post("/api/calling/generate", async (req, res) => {
    try {
      const { topic } = req.body as { topic?: string };
      if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
        return res.status(400).json({ error: "Please describe what's on your heart." });
      }
      const trimmed = topic.trim().slice(0, 300);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You help people find the perfect Bible verse to share for a given topic or life moment. 
Respond with JSON only:
{
  "message": string,
  "verseText": string,
  "scripture": string,
  "meaning": string,
  "shareText": string
}

Rules:
- message: a short, warm 8–14 word phrase that captures the spirit of what they want to share (no quotes, no scripture yet)
- verseText: the exact NIV Bible verse text — precise, beautiful, directly relevant
- scripture: the book, chapter:verse reference (e.g. "Psalm 46:10")
- meaning: 1–2 sentences in a warm pastoral voice explaining why this verse meets this moment — not preachy, just honest
- shareText: the complete text someone would copy-paste to share — includes the message line, the verse in quotes, the reference, and "Shepherd's Path · shepherdspath.app"

Choose a verse that feels discovered, not generic. Avoid John 3:16, Romans 8:28, Jeremiah 29:11 unless they are genuinely the single best fit. Prefer a verse that will make someone stop and feel seen.`,
          },
          {
            role: "user",
            content: `Topic: ${trimmed}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      if (!result.verseText || !result.scripture) {
        return res.status(500).json({ error: "Could not generate a verse. Please try again." });
      }

      return res.json({
        message: result.message || "",
        verseText: result.verseText,
        scripture: result.scripture,
        meaning: result.meaning || "",
        shareText: result.shareText || `"${result.verseText}"\n— ${result.scripture}\n\nShepherd's Path · shepherdspath.app`,
      });
    } catch (err) {
      console.error("[calling/generate] error:", err);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // ── PROMO CODE VALIDATION ──────────────────────────────────────────────
  app.post("/api/promo/validate", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ valid: false, error: "No code provided." });
      }
      const normalized = code.trim().toUpperCase();
      const envCodes = (process.env.PROMO_CODES || "")
        .split(",")
        .map((c: string) => c.trim().toUpperCase())
        .filter(Boolean);

      if (!envCodes.includes(normalized)) {
        return res.json({ valid: false, error: "That code isn't valid. Check the spelling and try again." });
      }

      // Grant 1 year of Pro via the existing referral-pro system
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      return res.json({ valid: true, expiresAt: expiresAt.toISOString() });
    } catch (err) {
      console.error("[promo/validate] error:", err);
      return res.status(500).json({ valid: false, error: "Something went wrong. Please try again." });
    }
  });

  return httpServer;
}

// Helper for re-activating a deactivated subscriber
async function db_reactivate(email: string) {
  const { db } = await import("../db");
  const { subscribers } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  await db
    .update(subscribers)
    .set({
      active: true,
      subscribedAt: new Date(),
      onboardingEmailsSent: [],
    })
    .where(eq(subscribers.email, email));
}
