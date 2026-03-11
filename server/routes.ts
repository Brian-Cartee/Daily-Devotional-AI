import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import { Readable } from "stream";
import { storage } from "./storage";
import { api, chatRequestSchema, type ChatMessage } from "@shared/routes";
import { insertSubscriberSchema, insertJournalEntrySchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
import Stripe from "stripe";
import webpush from "web-push";
import { getTodayVerseFromSheet, getRawSheetRows } from "./googleSheets";
import { getUncachableResendClient, buildDailyVerseEmailHtml, buildDailyVerseEmailText } from "./resend";
import { scheduleDailyEmails } from "./emailScheduler";
import { schedulePushNotifications } from "./pushScheduler";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Separate client for TTS — uses direct OpenAI key (integration proxy doesn't support audio)
const openaiTTS = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  // Get today's verse (reads from DB cache, which was synced from Google Sheet)
  app.get(api.verses.getDaily.path, async (req, res) => {
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
  // Streaming GET endpoint — browser starts playing as first bytes arrive
  app.get("/api/tts", async (req, res) => {
    const text = (req.query.text as string)?.trim();
    if (!text) return res.status(400).json({ message: "text required" });
    try {
      const mp3 = await openaiTTS.audio.speech.create({
        model: "tts-1",
        voice: "onyx",
        input: text.slice(0, 4000),
        speed: 0.92,
      });
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=86400");
      res.set("Transfer-Encoding", "chunked");
      Readable.fromWeb(mp3.body as import("stream/web").ReadableStream<Uint8Array>).pipe(res);
    } catch (err: any) {
      console.error("TTS error:", err);
      if (!res.headersSent) res.status(500).json({ message: "TTS failed" });
    }
  });

  app.post("/api/tts", async (req, res) => {
    const { text, voice } = req.body as { text: string; voice?: string };
    if (!text?.trim()) return res.status(400).json({ message: "text required" });
    const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = allowedVoices.includes(voice ?? "") ? (voice as any) : "onyx";
    try {
      const mp3 = await openaiTTS.audio.speech.create({
        model: "tts-1",
        voice: selectedVoice,
        input: text.trim().slice(0, 4096),
        speed: 0.92,
      });
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=86400");
      res.set("Transfer-Encoding", "chunked");
      Readable.fromWeb(mp3.body as import("stream/web").ReadableStream<Uint8Array>).pipe(res);
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
    const sub = await storage.getPushSubscription(req.params.sessionId);
    if (!sub) return res.status(404).json({ message: "not found" });
    res.json(sub);
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
    await storage.updatePushSettings(sessionId, settings);
    res.json({ ok: true });
  });

  // Unsubscribe
  app.delete("/api/push/subscribe/:sessionId", async (req, res) => {
    await storage.deletePushSubscription(req.params.sessionId);
    res.json({ ok: true });
  });

  // Start push scheduler (email scheduler started separately)
  schedulePushNotifications();

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
    options: { model?: string; maxTokens?: number; temperature?: number } = {}
  ) {
    const { model = "gpt-4o-mini", maxTokens, temperature } = options;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
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
    res.end();
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

Speak from inside the verse, not about it from a distance. Find what is alive in this specific passage for a person living a real life today. Be honest — including about the weight of it, the challenge of it, the comfort in it. Don't soften it or inflate it. Write the way a wise, close friend speaks: natural, unhurried, real.

What you never do:
— Give a bulleted list. Never.
— Use spiritual clichés: "lean into," "unpack," "walk in His truth," "let go and let God," "sit with this." Use real words.
— Tell the person what they "should" or "must" do. The Spirit does that. You reflect.
— Open with hollow affirmation ("What a beautiful verse!").
— Rush to application. Sometimes a verse needs to land before it is acted on.
— Repeat the verse text — they can already see it.${nameNote2}${relationshipNote2}${memoryNote2}${probeNote}${langNote2}`;
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
— Be preachy. Ever.${chatNameNote}${chatRelationshipNote}${chatMemoryNote}`;

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
      return res.json({ content: CRISIS_RESPONSE });
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

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
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
— Pad the response with things that don't serve the question.${passageNameNote}${passageRelationshipNote}${passageMemoryNote}${langNote}`,
          },
          ...messages.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        max_tokens: 600,
        temperature: 0.7,
      });
      const content = completion.choices[0]?.message?.content ?? "I couldn't generate a response.";
      res.json({ content });
    } catch (err) {
      console.error("Passage AI error:", err);
      res.status(500).json({ message: "AI generation failed" });
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
    await storage.deactivateSubscriber(decodeURIComponent(email));
    res.status(200).json({ message: "You've been unsubscribed successfully." });
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

  // ── SMS Webhook (Twilio inbound) ──────────────────────────────────────────
  const SMS_CRISIS_RESPONSE = "You matter, and what you're sharing is serious. Please reach out right now — call or text 988 (Suicide & Crisis Lifeline, 24/7), or call 911 if you're in immediate danger. You are not alone.";

  function buildSmsSystemPrompt(exchangeCount: number): string {
    const historyNote = exchangeCount === 0
      ? "This is their very first message to you. Make them feel immediately heard and cared for."
      : exchangeCount === 1
      ? "This person has texted you once before. They've engaged — deepen the warmth and remember what they shared."
      : `This person has texted you ${exchangeCount} times. You have a growing connection. Be more personal and less introductory.`;

    return `You are Shepherd's Path, a warm Christian companion responding by text message. Someone has just texted you — meet them exactly where they are.

In one flowing message (no headers, no labels, no bullet points), respond with:
- A real Bible verse cited accurately. Prefer NKJV, ESV, or Amplified. Example: "Psalm 46:1 says, 'God is our refuge and strength, an ever-present help in trouble.'"
- 2 sentences of warm, personal reflection tied directly to what they shared — spoken like a trusted friend, not a preacher.
- A short, intimate prayer of 1–2 sentences, specific to their moment.
- One gentle question inviting them to share more.

Rules:
- Write as one natural flowing message — no "Verse:", "Reflection:", "Prayer:", or "Follow-up:" labels
- Keep total response under 450 characters (this is SMS — every word must earn its place)
- Never invent or misquote Bible verses; if uncertain of exact wording, paraphrase carefully and note it
- Zero preachiness, zero hollow affirmations, zero clichés ("lean into", "walk in His truth", "God is good all the time")
- End with exactly one follow-up question — gentle, open, and personal

${historyNote}`;
  }

  app.post("/api/sms/webhook", async (req, res) => {
    const from = (req.body.From as string | undefined)?.trim();
    const body = (req.body.Body as string | undefined)?.trim() ?? "";

    if (!from) {
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
      return;
    }

    // Crisis detection
    if (detectCrisis(body)) {
      res.type("text/xml").send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${SMS_CRISIS_RESPONSE}</Message></Response>`
      );
      return;
    }

    try {
      const convo = await storage.getSmsConversation(from);
      const priorMessages: Array<{ role: string; content: string }> = (convo?.messages ?? [])
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }));
      const exchangeCount = convo?.exchangeCount ?? 0;
      const ctaSent = convo?.ctaSent ?? false;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: buildSmsSystemPrompt(exchangeCount) },
          ...priorMessages,
          { role: "user", content: body },
        ],
        max_tokens: 200,
        temperature: 0.88,
      });

      let aiText = completion.choices[0].message.content?.trim()
        ?? "God sees you right now. Isaiah 41:10 says, 'Do not fear, for I am with you.' You are not walking this alone.";

      // Append CTA on the 2nd exchange (first time they've replied back)
      let newCtaSent = ctaSent;
      if (!ctaSent && exchangeCount >= 1) {
        aiText += "\n\nIf you'd like daily devotionals, guided Bible journeys & more, they're waiting — free at ShepherdPathAI.com";
        newCtaSent = true;
      }

      // Save conversation
      const ts = new Date().toISOString();
      const newMessages = [
        ...(convo?.messages ?? []),
        { role: "user" as const, content: body, ts },
        { role: "assistant" as const, content: aiText, ts },
      ];
      await storage.upsertSmsConversation(from, newMessages, exchangeCount + 1, newCtaSent);

      // Escape XML special characters
      const safeText = aiText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      res.type("text/xml").send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safeText}</Message></Response>`
      );
    } catch (err) {
      console.error("[SMS webhook error]", err);
      res.type("text/xml").send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Something went wrong on our end. Please try again in a moment.</Message></Response>`
      );
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
