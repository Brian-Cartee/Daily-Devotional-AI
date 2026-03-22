import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { storage } from "./storage";
import { api, chatRequestSchema, type ChatMessage } from "@shared/routes";
import { insertSubscriberSchema, insertJournalEntrySchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
import Stripe from "stripe";
import webpush from "web-push";
import twilio from "twilio";
import { getTodayVerseFromSheet, getRawSheetRows } from "./googleSheets";
import { getUncachableResendClient, buildDailyVerseEmailHtml, buildDailyVerseEmailText } from "./resend";
import { scheduleDailyEmails } from "./emailScheduler";
import { schedulePushNotifications } from "./pushScheduler";
import { scheduleDailySms } from "./smsScheduler";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

// In-memory TTS cache — key: "voice::text_hash", value: Buffer of mp3 bytes
// Capped to prevent unbounded memory growth
const MAX_TTS_CACHE = 120;
const ttsCache = new Map<string, Buffer>();
function ttsCacheKey(text: string, voice: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) { hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0; }
  return `${voice}_${Math.abs(hash)}`;
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

async function getTTSAudio(text: string, voice: string): Promise<Buffer> {
  const cacheKey = ttsCacheKey(text, voice);
  // 1. Memory cache (instant)
  if (ttsCache.has(cacheKey)) return ttsCache.get(cacheKey)!;
  // 2. Disk cache (fast, survives restarts)
  const diskHit = readDiskCache(cacheKey);
  if (diskHit) { ttsCache.set(cacheKey, diskHit); return diskHit; }
  // 3. Generate via OpenAI (slow, then cache both places)
  const mp3 = await openaiTTS.audio.speech.create({
    model: "tts-1", voice: voice as any, input: text.slice(0, 4096), speed: 0.92,
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
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
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
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
// Prune the rate limit store every hour to prevent memory growth
setInterval(() => {
  const cutoff = Date.now() - 3_600_000;
  for (const [key, timestamps] of rateLimitStore) {
    const recent = timestamps.filter(t => t > cutoff);
    if (recent.length === 0) rateLimitStore.delete(key);
    else rateLimitStore.set(key, recent);
  }
}, 3_600_000);

async function syncTodayVerseFromSheet(): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const existing = await storage.getVerseByDate(today);
    if (existing) return; // Already have today's verse cached

    const sheetVerse = await getTodayVerseFromSheet();
    if (!sheetVerse) {
      console.warn("No matching row found in Google Sheet for today. Using fallback.");
      // Fallback hardcoded verse if sheet has no data for today
      await storage.createVerse({
        reference: "Philippians 4:6-7",
        text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
        encouragement: "When you feel overwhelmed, remember that you don't have to carry the burden alone. Bring your worries to God, and He will replace your anxiety with His perfect peace.",
        reflectionPrompt: "What worries can you surrender to God today?",
        date: today,
      });
      return;
    }

    await storage.createVerse({
      reference: sheetVerse.reference,
      text: sheetVerse.verseText,
      encouragement: sheetVerse.encouragement,
      reflectionPrompt: sheetVerse.reflectionPrompt,
      date: sheetVerse.date,
    });

    console.log(`Synced today's verse from Google Sheet: ${sheetVerse.reference}`);
  } catch (err) {
    console.error("Error syncing verse from Google Sheet:", err);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Sync today's verse from Google Sheets at startup
  syncTodayVerseFromSheet().catch(console.error);

  // Start the daily email scheduler
  scheduleDailyEmails().catch(console.error);

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/api/health", async (_req, res) => {
    try {
      await import("./db").then(({ pool }) => pool.query("SELECT 1"));
      res.json({ status: "ok", ts: new Date().toISOString() });
    } catch (err) {
      console.error("[health] DB check failed:", err);
      res.status(503).json({ status: "degraded", ts: new Date().toISOString() });
    }
  });

  // Get today's verse (reads from DB cache, which was synced from Google Sheet)
  app.get(api.verses.getDaily.path, async (req, res) => {
    try {
      const today = (req.query.date as string) || new Date().toISOString().split("T")[0];
      let verse = await storage.getVerseByDate(today);

      // If not cached yet, try syncing on-demand
      if (!verse) {
        await syncTodayVerseFromSheet();
        verse = await storage.getVerseByDate(today);
      }

      if (!verse) {
        return res.status(404).json({ message: "No verse found for today." });
      }

      res.json(verse);
    } catch (err) {
      console.error("getDaily verse error:", err);
      res.status(500).json({ message: "Could not load today's verse." });
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

  // Text-to-speech using OpenAI — returns audio/mpeg
  // GET endpoint (used by preload hook)
  app.get("/api/tts", async (req, res) => {
    const text = (req.query.text as string)?.trim();
    if (!text) return res.status(400).json({ message: "text required" });
    try {
      const buffer = await getTTSAudio(text, "onyx");
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=604800");
      res.send(buffer);
    } catch (err: any) {
      console.error("TTS error:", err);
      if (!res.headersSent) res.status(500).json({ message: "TTS failed" });
    }
  });

  // POST endpoint (used by devotional listen button — allows voice selection)
  app.post("/api/tts", async (req, res) => {
    const { text, voice } = req.body as { text: string; voice?: string };
    if (!text?.trim()) return res.status(400).json({ message: "text required" });
    const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = allowedVoices.includes(voice ?? "") ? voice! : "onyx";
    try {
      const buffer = await getTTSAudio(text.trim(), selectedVoice);
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=604800");
      res.send(buffer);
    } catch (err: any) {
      console.error("TTS error:", err);
      if (!res.headersSent) res.status(500).json({ message: "TTS failed" });
    }
  });

  // Sermon transcription — audio → Whisper transcript → AI summary
  const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
  app.post("/api/transcribe", audioUpload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No audio file provided" });
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
      try { summary = JSON.parse(summaryRes.choices[0].message.content ?? "{}"); } catch {}
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

  // Push notification VAPID public key
  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  // Subscribe or update push subscription
  app.post("/api/push/subscribe", async (req, res) => {
    const { sessionId, subscription } = req.body as {
      sessionId: string;
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    };
    if (!sessionId || !subscription?.endpoint) return res.status(400).json({ message: "invalid" });
    try {
      const row = await storage.upsertPushSubscription({
        sessionId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });

      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || "mailto:admin@shepherdspathAI.com",
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } },
          JSON.stringify({ title: "You're set! 🙏", body: "Shepherd's Path will now remind you daily. Walk the path.", tag: "welcome", url: "/devotional" })
        ).catch(() => {});
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

  // Start push scheduler (email scheduler started separately)
  schedulePushNotifications();

  // Start SMS daily devotional scheduler
  scheduleDailySms();

  // ── Spiritual memory + safety helpers ──────────────────────────────────────

  const CRISIS_PHRASES = [
    "suicidal", "want to die", "kill myself", "end my life",
    "don't want to live", "wish i was dead", "ending it all",
    "not worth living", "hurt myself", "self-harm", "cut myself",
    "harm myself", "no reason to live", "better off dead",
    "want to kill myself", "thinking about suicide",
  ];

  const CRISIS_RESPONSE = `I hear you, and what you're sharing matters deeply. You are not alone in this moment.

Please reach out right now to someone trained to help:

• 988 Suicide & Crisis Lifeline — call or text 988 (US, 24/7)
• Crisis Text Line — text HOME to 741741
• International resources — https://findahelpline.com

God loves you. Your life carries meaning and purpose that extends far beyond what you can see right now. Please connect with a crisis counselor — they are here for exactly this.

I'm here whenever you're ready to continue your walk.`;

  function detectCrisis(text: string): boolean {
    const lower = text.toLowerCase();
    return CRISIS_PHRASES.some(p => lower.includes(p));
  }

  async function getJournalContext(sessionId: string): Promise<{ context: string; count: number }> {
    if (!sessionId) return { context: "", count: 0 };
    try {
      const entries = await storage.getJournalEntries(sessionId);
      if (!entries || entries.length === 0) return { context: "", count: 0 };
      const recent = entries.slice(0, 6);
      const context = recent.map(e => {
        const label = e.type === "prayer" ? "Prayer" : e.type === "reflection" ? "Reflection" : e.type === "verse" ? "Scripture" : "Note";
        const snippet = e.content.replace(/\n+/g, " ").slice(0, 200);
        return `[${label}${e.title ? ` — ${e.title}` : ""}]: ${snippet}`;
      }).join("\n");
      return { context, count: entries.length };
    } catch { return { context: "", count: 0 }; }
  }

  async function streamCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    res: import("express").Response,
    options: { model?: string; maxTokens?: number; temperature?: number; req?: import("express").Request } = {}
  ) {
    const { model = "gpt-4o-mini", maxTokens, temperature, req: request } = options;
    const controller = new AbortController();
    if (request) {
      request.on("close", () => controller.abort());
    }
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
      }, { signal: controller.signal });
      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) res.write(content);
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) return;
      throw err;
    }
    if (!res.writableEnded) res.end();
  }

  function buildRelationshipNote(daysWithApp: number, entryCount: number): string {
    if (daysWithApp <= 3) {
      return `\n\nRelationship context: This person is new here — Day ${daysWithApp}. You are meeting them for the first time. Be genuinely welcoming, not performatively warm. Don't assume you know anything about them yet. Be the kind of presence that makes them feel safe enough to come back tomorrow.`;
    } else if (daysWithApp <= 14) {
      return `\n\nRelationship context: This person has been walking with the app for ${daysWithApp} days${entryCount > 0 ? ` and has written ${entryCount} journal entries` : ""}. You are still learning who they are. Be attentive. Pay attention to what matters to them. Let the relationship develop at their pace — don't rush to familiarity they haven't offered you yet.`;
    } else if (daysWithApp <= 30) {
      return `\n\nRelationship context: This person has walked faithfully for ${daysWithApp} days${entryCount > 0 ? `, writing ${entryCount} journal entries` : ""}. You have real rapport now. You know something of their spiritual life and what moves them. Speak with genuine warmth — not the warmth of a stranger trying to connect, but of a friend who has actually been paying attention.`;
    } else {
      return `\n\nRelationship context: This person has been walking alongside this app for ${daysWithApp} days${entryCount > 0 ? `, writing ${entryCount} journal entries` : ""}. You are a trusted companion who has been present across seasons of their life. Speak with the quiet confidence of someone who genuinely knows them — their patterns, their growth, what they reach for in hard moments. They are not a newcomer. Honor that.`;
    }
  }

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

      let systemPrompt = "";
      let userPrompt = "";

      const userName2: string = (req.body as any).userName || "";
      const sessionId2: string = (req.body as any).sessionId || "";
      const daysWithApp2: number = Number((req.body as any).daysWithApp) || 1;
      const nameNote2 = userName2 ? ` You are speaking with ${userName2}. Address them by name naturally once in your response.` : "";
      const { context: journalCtx2, count: journalCount2 } = await getJournalContext(sessionId2);
      const memoryNote2 = journalCtx2
        ? `\n\nRecent spiritual context for this person — use to make your response more personal and connected to their journey; do not quote these entries directly unless it flows naturally:\n${journalCtx2}`
        : "";
      const relationshipNote2 = buildRelationshipNote(daysWithApp2, journalCount2);
      const probeNote = `\n\nApproximately 1 in 4 responses — when it feels genuinely earned, not formulaic — close with a single question. Not a prompt, not a challenge. A real question a caring friend would ask because they are genuinely curious about this person's life. Make it specific to this verse and this moment.`;

      if (input.type === "reflection") {
        systemPrompt =
`You are a deeply thoughtful spiritual companion — the kind of trusted friend who has walked with God for years and reads the Bible not as a textbook but as a living letter written to real people in real struggle and real joy.

Write a brief devotional reflection on the provided verse. Two short paragraphs at most — this is read on a phone screen, so every sentence must earn its place.

Begin by holding space for where the person might actually be today — not where they should be. People open this app carrying things: exhaustion, loneliness, doubt, quiet grief, unspoken fear, or just the ordinary weight of a Tuesday. Let the verse meet them there, in that actual place, before it asks anything of them.

Speak from inside the verse, not about it from a distance. Find what is alive in this specific passage for a person living a real life today. Be honest — including about the weight of it, the challenge of it, the comfort in it. Don't soften it or inflate it. Write the way a wise, close friend speaks: natural, unhurried, real.

What you never do:
— Give a bulleted list. Never.
— Use spiritual clichés: "lean into," "unpack," "walk in His truth," "let go and let God," "sit with this." Use real words.
— Tell the person what they "should" or "must" do. The Spirit does that. You reflect.
— Open with hollow affirmation ("What a beautiful verse!").
— Rush to application. Sometimes a verse needs to land before it is acted on.
— Repeat the verse text — they can already see it.
— Capitalize pronouns (He, Him, His) only when they unmistakably refer to God, Jesus Christ, or the Holy Spirit. Never capitalize "you" or "your" when addressing the reader — those are always lowercase.${nameNote2}${relationshipNote2}${memoryNote2}${probeNote}${langNote2}`;
        userPrompt = `Write a brief reflection on: ${verse.reference} - "${verse.text}"`;
        if (verse.reflectionPrompt) {
          userPrompt += `\n\nReflection prompt to guide you: ${verse.reflectionPrompt}`;
        }
      } else if (input.type === "prayer") {
        systemPrompt =
`You are a deeply thoughtful spiritual companion writing a prayer on behalf of the person who will pray these words today.

A good prayer sounds like someone actually talking to God — not reciting. Write in first person so the person can pray it as their own. Be specific to this verse. Carry the emotional weight of what this scripture actually says. It might hold honesty, longing, gratitude, surrender, or confession — follow where the verse leads.

Keep it brief: 3 to 6 sentences of real prayer. This is not a sermon wrapped in "Amen."

If the person's journal reveals specific burdens or themes, weave them in naturally — but only if it flows; never force it.

What you never do:
— Use filler phrases: "We just ask," "Lord we just," "Father God," "Thank You for this beautiful day."
— Write something generic enough to work for any verse. This prayer belongs to this text, this moment, this person.
— Preach inside the prayer.

Pronoun capitalization: When addressing God directly in prayer, capitalize You, Your, Yours, He, Him, His. When referring to the person praying, use lowercase (their, they, them).

Begin with "Lord," or "Heavenly Father," and close with "Amen."${nameNote2}${relationshipNote2}${memoryNote2}${langNote2}`;
        userPrompt = `Please write a prayer based on this verse: ${verse.reference} - "${verse.text}"`;
      }

      await streamCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        res
      );
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
      const chatNameNote = chatUserName ? ` The user's name is ${chatUserName}. Use their name naturally when appropriate.` : "";

      if (detectCrisis(input.question)) {
        return res.status(200).json({ content: CRISIS_RESPONSE });
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
— Capitalize "you" or "your" when addressing the reader. Capitalize He, Him, His only when unmistakably referring to God, Jesus, or the Holy Spirit. In prayers you write, capitalize You, Your when addressing God directly.${chatNameNote}${chatRelationshipNote}${chatMemoryNote}`;

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

  // Bible chapter text proxy (uses bible-api.com)
  app.get("/api/bible", async (req, res) => {
    const ref = req.query.ref as string;
    const translation = (req.query.translation as string) || "kjv";
    if (!ref) return res.status(400).json({ message: "ref query param required" });
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

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    if (detectCrisis(lastUserMsg)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.write(CRISIS_RESPONSE);
      res.end();
      return;
    }

    const langInstruction: Record<string, string> = {
      es: "Respond entirely in Spanish (Español).",
      fr: "Respond entirely in French (Français).",
      pt: "Respond entirely in Portuguese (Português).",
    };
    const langNote = langInstruction[lang] ? ` ${langInstruction[lang]}` : "";
    const passageDaysWithApp: number = Number((req.body as any).daysWithApp) || 1;
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
— Capitalize "you" or "your" when addressing the reader. Capitalize He, Him, His only when unmistakably referring to God, Jesus, or the Holy Spirit. In any prayers you write, capitalize You, Your when addressing God directly.${passageNameNote}${passageRelationshipNote}${passageMemoryNote}${langNote}`;

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

  // Subscribe to daily email
  app.post("/api/subscribe", async (req, res) => {
    try {
      const input = insertSubscriberSchema.parse(req.body);

      const existing = await storage.getSubscriberByEmail(input.email);
      if (existing) {
        if (existing.active) {
          return res.status(409).json({ message: "This email is already subscribed." });
        }
        // Re-activate if previously unsubscribed
        await db_reactivate(input.email);
        return res.status(200).json({ message: "Welcome back! Your subscription has been reactivated." });
      }

      await storage.createSubscriber(input);

      // Send a welcome email
      try {
        const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
        const { client, fromEmail } = await getUncachableResendClient();
        await client.emails.send({
          from: fromEmail,
          to: input.email,
          subject: "Welcome to Shepherd's Path",
          html: `<div style="font-family:Georgia,serif;max-width:500px;margin:auto;padding:32px;">
            <h2 style="color:#3d3530;">Welcome${input.name ? `, ${input.name}` : ''}!</h2>
            <p style="color:#5c5248;line-height:1.7;">You're now subscribed to Shepherd's Path. Each morning you'll receive today's scripture, an encouragement message, and a link to explore it deeper with AI.</p>
            <p style="color:#5c5248;">May each verse be a blessing to your day.</p>
            <p style="margin-top:32px;"><a href="${appUrl}" style="background:#8b6f47;color:#fff;padding:12px 28px;border-radius:40px;text-decoration:none;font-family:sans-serif;font-size:14px;">Visit the App</a></p>
          </div>`,
          text: `Welcome${input.name ? `, ${input.name}` : ''}!\n\nYou're now subscribed to Shepherd's Path. Each morning you'll receive today's scripture and encouragement.\n\n${appUrl}`,
        });
      } catch (emailErr) {
        console.error("Welcome email failed (non-fatal):", emailErr);
      }

      res.status(201).json({ message: "You're subscribed! Check your inbox for a welcome email." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
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

  // Manually trigger daily email send (for testing)
  app.post("/api/admin/send-daily-email", async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const verse = await storage.getVerseByDate(today);
      if (!verse) return res.status(404).json({ message: "No verse for today." });

      const activeSubscribers = await storage.getAllActiveSubscribers();
      if (activeSubscribers.length === 0) {
        return res.status(200).json({ message: "No active subscribers.", sent: 0 });
      }

      const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
      const { client, fromEmail } = await getUncachableResendClient();

      let sent = 0;
      for (const subscriber of activeSubscribers) {
        try {
          const unsubUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
          const html = buildDailyVerseEmailHtml({ ...verse, appUrl }).replace("{{email}}", encodeURIComponent(subscriber.email));
          const text = buildDailyVerseEmailText({ ...verse, appUrl });

          await client.emails.send({
            from: fromEmail,
            to: subscriber.email,
            subject: `Daily Verse: ${verse.reference}`,
            html,
            text,
          });
          sent++;
        } catch (err) {
          console.error(`Failed to send to ${subscriber.email}:`, err);
        }
      }

      res.status(200).json({ message: `Sent to ${sent} subscribers.`, sent });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to send emails." });
    }
  });

  // ── Streak Routes ───────────────────────────────────────────────────────────

  app.get("/api/streak", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const result = await storage.getStreak(sessionId);
      res.json(result ?? { currentStreak: 0, longestStreak: 0, visitDates: [] });
    } catch (err) {
      res.status(500).json({ message: "Failed to get streak" });
    }
  });

  app.post("/api/streak", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const result = await storage.recordStreak(sessionId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to record streak" });
    }
  });

  // ── Journal Routes ──────────────────────────────────────────────────────────

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
    const { insertMemoryVerseSchema } = await import("@shared/schema");
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

  // ── Guidance: first pastoral response to a shared situation (streaming) ────

  app.post("/api/guidance/response", async (req, res) => {
    const { situation, messages, userName } = req.body as {
      situation?: string;
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
      userName?: string;
    };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    if (situation.trim().length > 2000) return res.status(400).json({ message: "Input too long" });
    const sessionId = (req.body as any).sessionId as string | undefined;
    if (sessionId && isRateLimited(`guidance:${sessionId}`, 20, 3_600_000)) {
      return res.status(429).json({ message: "Too many requests — please wait a moment before trying again." });
    }

    if (detectCrisis(situation)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.write(CRISIS_RESPONSE);
      return res.end();
    }

    const nameNote = userName
      ? `\n\nThe person's name is ${userName}. Use their name naturally — once, early, in the first paragraph. Not at the very start of the sentence. Something like "...${userName}, what you're carrying..." or "...and ${userName}, that matters." Don't force it — only use it where it genuinely warms the response.`
      : "";

    const isFollowUp = messages && messages.length > 1;

    const systemMsg = `You are a warm, deeply compassionate pastoral guide at Shepherd's Path. Someone has just opened up about what they are going through.

Your only job in this moment is to be genuinely present with them — not to fix, teach, or rush them to hope they haven't earned yet.
${isFollowUp ? "This is a follow-up message in an ongoing conversation. Respond naturally to what they just said — don't re-introduce yourself or repeat your opening. Stay present with them." : `Write 2–3 short paragraphs:
Paragraph 1: Acknowledge exactly what they shared. Name the pain. Don't soften it. Make them feel genuinely heard — say something real about what this must be like to carry.
Paragraph 2: Let them know this is a meaningful place to bring that. Tell them what Shepherd's Path will walk alongside them through — sitting honestly with God in the pain, being met where they actually are, finding truth that holds, moving toward courage and hope at a pace they can bear.
Paragraph 3 (1 sentence only): Close with a warm bridge — tell them their personal scripture journey is waiting just below, crafted for exactly what they shared. Invite them to keep talking here first or step into it whenever they're ready. Make it feel like an open door, not a push.`}

Rules:
— Never open with "I" as the first word
— No hollow openers: "I hear you," "That sounds really hard," "Thank you for sharing"
— No clichés: "lean into," "God's plan," "His timing is perfect," "you are not alone," "let go and let God"
— Speak plainly and warmly — like a wise friend who also happens to know scripture deeply
— Under 190 words total
— Do not end with a question${nameNote}`;

    const conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = messages?.length
      ? messages.map(m => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: situation.trim() }];

    try {
      await streamCompletion(
        [{ role: "system", content: systemMsg }, ...conversationHistory],
        res,
        { temperature: 0.82, maxTokens: 280, req }
      );
    } catch (err) {
      console.error("guidance response error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Failed" });
    }
  });

  // ── Daily Art Image ───────────────────────────────────────────────────────────

  const DAILY_ART_DIR = path.resolve(process.cwd(), "client/public/daily-art");
  if (!fs.existsSync(DAILY_ART_DIR)) fs.mkdirSync(DAILY_ART_DIR, { recursive: true });

  const ART_THEMES = [
    "A breathtaking mountain peak at golden sunrise, divine rays of light breaking through storm clouds above, misty valleys below, cinematic and awe-inspiring",
    "An ancient cathedral forest with towering trees, shafts of golden light streaming through the canopy, moss-covered ground, peaceful and sacred",
    "A vast ocean at dawn, massive waves with golden light on the water, dramatic clouds, powerful and serene",
    "A desert landscape at night under a breathtaking Milky Way, silhouetted dunes, shooting stars, profound stillness",
    "Rolling green hills in spring with wildflowers, a winding path disappearing into golden light on the horizon, hopeful and beautiful",
    "A lone ancient olive tree on a hillside at dusk, warm amber light, vast landscape behind it, timeless and still",
    "A frozen waterfall with ice formations catching morning light, mist rising, winter forest surroundings, majestic",
    "Autumn forest with fiery red and gold canopy, a shaft of light illuminating a mossy stone path, peaceful",
    "A storm clearing over a mountain lake, rainbow emerging, still water reflecting dramatic clouds, renewal",
    "High Alpine meadow at sunset, golden hour light on wildflowers, snow-capped peaks behind, vast and open",
    "A lighthouse on dramatic cliffs at stormy sea, golden light in the window, powerful waves below, steadfast",
    "Misty morning valley with a river winding through green fields, soft golden light, peaceful and still",
    "Ancient stone archway looking out to a vast sea at sunset, warm amber light, timeless and wonder-filled",
    "Northern lights over a snow-covered pine forest, vivid greens and purples in the sky, profound and mysterious",
    "A sun-drenched lavender field stretching to the horizon, a single cypress tree, dramatic clouds above, peaceful",
    "Rocky coastline at golden hour, tide pools reflecting sky, warm amber light on ancient boulders, still and beautiful",
    "A single candle flame in darkness with its warm light glowing on an open book, intimate and sacred",
    "A bird's eye view of a river winding through an autumn forest, aerial, stunning colors, golden light",
    "An old stone bridge over a rushing mountain stream, autumn colors, golden afternoon light, timeless",
    "Dramatic sea cliffs at sunrise with golden light on crashing waves, powerful and majestic",
    "A lone figure standing on a hilltop at sunset, silhouetted against an enormous golden sky, contemplative",
    "Cherry blossom trees in full bloom with petals falling in golden light, renewal and beauty",
    "Sunset over a calm lake with a wooden dock, perfect reflection in the water, peaceful and still",
    "Snow-covered mountains reflected in a perfectly still alpine lake, crisp winter morning, pristine beauty",
    "A vast wheat field at sunset with dramatic storm clouds breaking to golden light, harvest and hope",
    "Ancient ruins overgrown with vines at golden hour, nature reclaiming, peaceful and timeless",
    "A shepherd and flock silhouetted against a dramatic sunset sky on rolling hills, pastoral and sacred",
    "A waterfall cascading into a crystal pool in a tropical forest, light filtering through mist, Eden-like",
    "The Milky Way reflected in a still mountain lake, complete stillness, infinite beauty",
    "A lone tree on a cliff edge over the sea at golden hour, wind in its branches, steadfast and beautiful",
  ];

  app.get("/api/daily-art", async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const imgFile = path.join(DAILY_ART_DIR, `${today}.jpg`);
      const metaFile = path.join(DAILY_ART_DIR, `${today}.json`);

      // Return cached if already generated today
      if (fs.existsSync(imgFile) && fs.existsSync(metaFile)) {
        const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
        return res.json({ imageUrl: `/daily-art/${today}.jpg`, ...meta });
      }

      const openai = new OpenAI();

      // Pick theme for today based on date seed
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const theme = ART_THEMES[dayOfYear % ART_THEMES.length];

      // Generate companion scripture/message via AI
      const msgRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content: "You pair a Bible scripture with a beautiful nature scene. Return ONLY valid JSON: { \"scripture\": \"exact scripture text (short, 10-20 words)\", \"reference\": \"Book Chapter:Verse\", \"reflection\": \"One sentence — a brief, quiet reflection on how this scene echoes this truth. Poetic, not preachy. Under 18 words.\" }"
          },
          {
            role: "user",
            content: `The daily art image theme is: "${theme}". Choose the single most fitting Bible verse for this scene and write a brief reflection.`
          }
        ]
      });

      let scriptureData = { scripture: "The heavens declare the glory of God.", reference: "Psalm 19:1", reflection: "Creation speaks what words cannot." };
      try {
        const raw = msgRes.choices[0].message.content?.trim() ?? "{}";
        scriptureData = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch { /* use defaults */ }

      // Generate image with DALL-E 3
      const imageRes = await openai.images.generate({
        model: "dall-e-3",
        prompt: `${theme}. Ultra-high quality, photorealistic, 4K, cinematic lighting. No text, no watermarks, no people. Pure landscape photography style.`,
        n: 1,
        size: "1792x1024",
        quality: "standard",
        response_format: "url",
      });

      const imageUrl = imageRes.data[0].url;
      if (!imageUrl) return res.json({ imageUrl: null, ...scriptureData });

      // Download and save the image
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) return res.json({ imageUrl: null, ...scriptureData });
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(imgFile, imgBuffer);
      fs.writeFileSync(metaFile, JSON.stringify(scriptureData));

      res.json({ imageUrl: `/daily-art/${today}.jpg`, ...scriptureData });
    } catch (err) {
      console.error("daily art error:", err);
      res.json({ imageUrl: null, scripture: "The heavens declare the glory of God.", reference: "Psalm 19:1", reflection: "Creation speaks what words cannot." });
    }
  });

  // ── Guidance: YouTube sermon/video recommendations ───────────────────────────

  app.post("/api/guidance/videos", async (req, res) => {
    const { situation } = req.body as { situation?: string };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    if (situation.trim().length > 2000) return res.status(400).json({ message: "Input too long" });
    const sessionIdVid = (req.body as any).sessionId as string | undefined;
    if (sessionIdVid && isRateLimited(`videos:${sessionIdVid}`, 20, 3_600_000)) {
      return res.json({ videos: [] });
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) return res.json({ videos: [] });

    try {
      // Step 1: Generate 2 targeted YouTube search queries
      const queryGenResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 150,
        messages: [
          {
            role: "system",
            content: `You generate YouTube search queries to find relevant Christian sermons, talks, and devotionals. Return ONLY valid JSON: { "queries": ["query1", "query2"] }. Each query should be 4-8 words and target the spiritual/emotional core of the situation. Always include "sermon" or "Christian" in at least one query. Do not include any explanation.`
          },
          {
            role: "user",
            content: `Someone shared: "${situation.trim()}"\n\nGenerate 2 YouTube search queries to find the most relevant and helpful Christian sermons or talks for this exact situation.`
          }
        ]
      });

      let queries: string[] = [];
      try {
        const raw = queryGenResponse.choices[0].message.content?.trim() ?? "{}";
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        queries = parsed.queries ?? [];
      } catch {
        queries = [`Christian sermon ${situation.trim().split(" ").slice(0, 4).join(" ")}`];
      }

      // Step 2: Search YouTube for each query
      const allVideos: Array<{
        videoId: string;
        title: string;
        channelTitle: string;
        description: string;
        thumbnail: string;
        url: string;
      }> = [];

      for (const query of queries.slice(0, 2)) {
        try {
          const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&relevanceLanguage=en&key=${YOUTUBE_API_KEY}`;
          const ytRes = await fetch(ytUrl);
          if (!ytRes.ok) continue;
          const ytData = await ytRes.json() as {
            items?: Array<{
              id: { videoId: string };
              snippet: {
                title: string;
                channelTitle: string;
                description: string;
                thumbnails: { medium: { url: string } };
              };
            }>;
          };
          for (const item of ytData.items ?? []) {
            if (allVideos.some(v => v.videoId === item.id.videoId)) continue;
            allVideos.push({
              videoId: item.id.videoId,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails.medium.url,
              url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            });
          }
        } catch {
          // skip failed query
        }
      }

      if (allVideos.length === 0) return res.json({ videos: [] });

      // Step 3: Use AI to rank and pick the best 2-3
      const rankResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You curate Christian sermon and devotional videos. Given a list of YouTube videos and a person's situation, select the 2-3 most relevant, biblically sound, and helpful videos. Rank by: (1) direct relevance to the situation, (2) doctrinal soundness, (3) message quality — NOT by view count or channel size. A small-channel pastor with a precise, heartfelt message beats a famous preacher with a generic one. Return ONLY valid JSON: { "selected": [videoId1, videoId2, videoId3] }. Select 2-3 only. If a video appears to be music, news, or unrelated to Christian faith, exclude it.`
          },
          {
            role: "user",
            content: `Person's situation: "${situation.trim()}"\n\nAvailable videos:\n${allVideos.map((v, i) => `${i + 1}. ID: ${v.videoId} | Title: "${v.title}" | Channel: "${v.channelTitle}" | Description: "${v.description.slice(0, 150)}"`).join("\n")}\n\nSelect the 2-3 best videos.`
          }
        ]
      });

      let selectedIds: string[] = [];
      try {
        const raw = rankResponse.choices[0].message.content?.trim() ?? "{}";
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        selectedIds = parsed.selected ?? [];
      } catch {
        selectedIds = allVideos.slice(0, 2).map(v => v.videoId);
      }

      const selectedVideos = selectedIds
        .map(id => allVideos.find(v => v.videoId === id))
        .filter(Boolean)
        .slice(0, 3);

      res.json({ videos: selectedVideos });
    } catch (err) {
      console.error("guidance videos error:", err);
      res.json({ videos: [] });
    }
  });

  // ── Life Season Journey ──────────────────────────────────────────────────────

  app.post("/api/journey/life-season", async (req, res) => {
    const { situation } = req.body as { situation?: string };
    if (!situation?.trim()) return res.status(400).json({ message: "situation required" });
    if (situation.trim().length > 2000) return res.status(400).json({ message: "Input too long" });
    const sessionIdJourney = (req.body as any).sessionId as string | undefined;
    if (sessionIdJourney && isRateLimited(`journey:${sessionIdJourney}`, 10, 3_600_000)) {
      return res.status(429).json({ message: "Too many requests — please wait before generating another journey." });
    }
    try {
      const systemPrompt = `You are a pastoral guide who builds deeply personal Bible journeys for people in real pain. You understand that someone coming to scripture during grief, fear, confusion, or crisis doesn't need platitudes — they need to feel genuinely met where they actually are.

Your journeys are specific, honest, emotionally real, and scripturally grounded. You never rush past someone's pain to get to hope. You let the journey breathe — beginning in honest acknowledgment or lament before moving toward comfort, then courage, then hope.

What you never do:
— Use spiritual clichés: "trust the process," "His timing is perfect," "let go and let God," "finding peace in uncertainty," "God has a plan."
— Soften the title. If someone's marriage is ending, the title names that — it doesn't call it "navigating life's transitions."
— Give whyItMatters that could work for any situation. Every sentence must be specific to exactly what this person shared.
— Skip the hard parts. Start in the real emotional place they are in. Lament is biblical. Confusion is biblical. Anger at God is biblical.
— Choose generic comfort passages when raw, honest ones exist. Psalm 88 over Psalm 23 when someone is in the pit, not the valley.

The journey arc must feel like a real emotional progression: honest acknowledgment of pain → God meeting them there → truth that holds → strength for the next step → forward movement and hope. Not a shortcut to resolution.`;

      const userPrompt = `A person shared this about what they are going through: "${situation.trim()}"

Build a 7-chapter personal Bible journey for exactly this situation. Return ONLY valid JSON:
{
  "title": "A title that names their specific pain honestly (5 words max — do not soften it)",
  "subtitle": "A subtitle that speaks directly to what they are experiencing",
  "description": "2 sentences: what this journey will do for this person, speaking to their exact situation",
  "pastoralIntro": "A warm, personal opening message — 3 to 4 sentences spoken directly to this person. Sentence 1: Acknowledge what they shared and tell them they are in the right place (name their situation in your own words). Sentence 2: Tell them what this journey will walk them through — briefly name the emotional arc (not the chapter titles, but what they will experience: e.g. 'from lament and raw honesty, through God's presence in the pain, to truth that holds, courage, and hope'). Sentence 3: Something true and warm about Shepherd's Path's mission — that there is no healer like Jesus, and we are here to help them place their full trust in Him through this. Keep it to 3-4 sentences total. Speak like a warm pastor, not a wellness app. Do not use the phrase 'You are in the right place' literally — find your own words.",
  "spotlightIndex": 0,
  "spotlightReason": "One sentence explaining why THIS specific chapter is the best place for this person to begin — referencing their exact situation. Be specific, not generic.",
  "chapters": [
    {
      "theme": "One-word theme",
      "title": "Chapter title that speaks to where they are emotionally at this point in the journey",
      "reference": "Book Chapter:Verses",
      "apiRef": "book chapter (lowercase, e.g. 'psalm 46' or 'john 14')",
      "summary": "2-3 sentences: what this passage says AND how it speaks to someone in exactly their situation",
      "whyItMatters": "2 sentences written directly to this person, referencing their specific situation — not generic. Echo back what they shared."
    }
  ]
}

Rules:
- Choose passages that actually speak to their pain — including lament psalms, Job, Lamentations if appropriate
- Arc: honest lament or acknowledgment → God present in the pain → truth that holds → strength → forward movement → hope
- apiRef must be just book + chapter number, lowercase (e.g. "isaiah 40" not "isaiah 40:1-8")
- whyItMatters must reference their actual words and situation — if they said "divorce," use that word
- Return ONLY the JSON object, no markdown, no explanation`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.85,
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);

      const chapters = parsed.chapters ?? [];
      const spotlightIdx = Math.min(Math.max(parseInt(parsed.spotlightIndex ?? "0") || 0, 0), chapters.length - 1);

      const journey = {
        id: `life-season-${Date.now()}`,
        title: parsed.title ?? "Your Personal Journey",
        subtitle: parsed.subtitle ?? "A journey crafted for this season",
        description: parsed.description ?? "",
        pastoralIntro: parsed.pastoralIntro ?? "",
        spotlightIndex: spotlightIdx,
        spotlightReason: parsed.spotlightReason ?? "",
        length: chapters.length,
        category: "Life Season",
        colorFrom: "from-violet-500/10",
        colorTo: "to-indigo-500/10",
        borderColor: "border-violet-200/60",
        iconColor: "text-violet-600",
        pillBg: "bg-violet-100",
        pillText: "text-violet-700",
        entries: chapters.map((ch: Record<string, string>, i: number) => ({
          id: `life-season-ch-${i + 1}`,
          order: i + 1,
          theme: ch.theme ?? "Reflection",
          title: ch.title ?? `Day ${i + 1}`,
          reference: ch.reference ?? "",
          apiRef: ch.apiRef ?? ch.reference ?? "",
          summary: ch.summary ?? "",
          whyItMatters: ch.whyItMatters ?? "",
        })),
      };

      res.json(journey);
    } catch (err) {
      console.error("life-season error:", err);
      res.status(500).json({ message: "Failed to generate journey" });
    }
  });

  // ── Devotional for Two ───────────────────────────────────────────────────────

  app.post("/api/devotional/for-two", async (req, res) => {
    const { verseReference, verseText, reflection, lang } = req.body as {
      verseReference?: string; verseText?: string; reflection?: string; lang?: string;
    };
    if (!verseReference || !verseText) return res.status(400).json({ message: "verseReference and verseText required" });
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
      // Fall back to DB (for any legacy entries)
      const art = await storage.getVerseArt(date);
      if (art) return res.json({ imageUrl: art.imageUrl, cached: true });
      return res.json({ imageUrl: null, cached: false });
    } catch (e) {
      console.error("verse-art GET error:", e);
      res.status(500).json({ message: "Failed to fetch verse art" });
    }
  });

  app.post("/api/verse-art/generate", async (req, res) => {
    try {
      const { verseDate, verseText, verseReference } = req.body as {
        verseDate: string; verseText: string; verseReference: string;
      };
      if (!verseDate || !verseText || !verseReference) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Return self-hosted cached file if it already exists for this date
      const localPath = path.join(VERSE_ART_DIR, `${verseDate}.png`);
      if (fs.existsSync(localPath)) {
        return res.json({ imageUrl: `/api/verse-art/image/${verseDate}`, cached: true });
      }

      const prompt = `A breathtaking, painterly spiritual landscape that captures the essence of this Bible verse: "${verseText.slice(0, 200)}" (${verseReference}). Cinematic oil painting style. Scene: dramatic natural scenery such as golden sunrise over misty mountains, ancient cathedral forest with God-rays of light, calm ocean at sunset with dramatic clouds, rolling hills at golden hour, or Milky Way over a wilderness valley. Rich warm tones, atmospheric depth, spiritual mood. IMPORTANT: absolutely no people, no human figures, no faces, no text, no words, no letters anywhere in the image. Pure nature only.`;

      // Use direct OpenAI client — the AI integrations proxy doesn't support image generation
      const response = await openaiTTS.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      });

      const tempUrl = response.data[0]?.url;
      if (!tempUrl) return res.status(500).json({ message: "No image returned" });

      // Download and save permanently — OpenAI URLs expire in ~1hr
      const imgRes = await fetch(tempUrl);
      if (!imgRes.ok) throw new Error("Failed to download generated image");
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
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
        success_url: `${origin}/devotional?tip=thank-you`,
        cancel_url: `${origin}/devotional`,
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

  app.get("/api/referral/my-code", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const referral = await storage.getOrCreateReferralCode(sessionId);
      const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
      const shareUrl = `${appUrl}?ref=${referral.code}`;
      res.json({
        code: referral.code,
        shareUrl,
        referralCount: referral.referralCount,
        proExpiresAt: referral.proExpiresAt,
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
      if (!invoice || !invoice.charge) {
        return res.status(400).json({
          eligible: false,
          reason: "no_charge",
          message: "We couldn't find a charge to refund. Please contact support.",
        });
      }

      // Issue the refund
      const refund = await stripe.refunds.create({
        charge: invoice.charge as string,
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

  const SMS_FREE_DAILY_LIMIT = 10;

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
    if (detectCrisis(rawBody)) {
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
        }).catch(() => {});
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
            twilioClient.messages.create({ body: broadcastMsg, from: fromNum, to: member.phone }).catch(() => {});
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
      const priorMessages = (convo?.messages ?? []).slice(-8).map(m => ({ role: m.role, content: m.content }));
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
    const packageName = process.env.ANDROID_PACKAGE_NAME || "com.shepherdspath.app";
    const sha256 = process.env.ANDROID_SHA256_CERT || "REPLACE_WITH_YOUR_SHA256_CERT_FINGERPRINT";
    res.json([{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: [sha256],
      },
    }]);
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

      const isValid = purchase.data.paymentState === 1 || purchase.data.paymentState === 2;
      if (isValid) {
        return res.json({ success: true });
      } else {
        return res.status(402).json({ success: false, error: "Purchase not valid" });
      }
    } catch (err) {
      console.error("[Play Billing] Verification error:", err);
      return res.status(500).json({ success: false, error: "Verification failed" });
    }
  });

  return httpServer;
}

// Helper for re-activating a deactivated subscriber
async function db_reactivate(email: string) {
  const { db } = await import("./db");
  const { subscribers } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(subscribers).set({ active: true }).where(eq(subscribers.email, email));
}
