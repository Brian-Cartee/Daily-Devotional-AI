import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, chatRequestSchema, type ChatMessage } from "@shared/routes";
import { insertSubscriberSchema, insertJournalEntrySchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
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
  app.get("/api/debug/sheet-rows", async (req, res) => {
    try {
      const rows = await getRawSheetRows();
      res.json({ rows: rows.slice(0, 5) }); // First 5 rows only
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Text-to-speech using OpenAI — returns audio/mpeg
  app.post("/api/tts", async (req, res) => {
    const { text } = req.body as { text: string };
    if (!text?.trim()) return res.status(400).json({ message: "text required" });
    try {
      const mp3 = await openaiTTS.audio.speech.create({
        model: "tts-1",
        voice: "onyx",
        input: text.trim(),
        speed: 0.92,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (err: any) {
      console.error("TTS error:", err);
      res.status(500).json({ message: "TTS failed" });
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

  // Generate AI reflection or prayer based on today's verse
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
      const nameNote2 = userName2 ? ` You are speaking with ${userName2}. Address them by name naturally once in your response.` : "";

      if (input.type === "reflection") {
        systemPrompt =
          `You are a thoughtful and empathetic spiritual guide. Write a SHORT devotional reflection on the provided Bible verse — 2 concise paragraphs maximum. Be warm, personal, and easy to read on mobile. Do not repeat the verse text.${nameNote2}${langNote2}`;
        userPrompt = `Write a brief reflection on: ${verse.reference} - "${verse.text}"`;
        if (verse.reflectionPrompt) {
          userPrompt += `\n\nReflection prompt to guide you: ${verse.reflectionPrompt}`;
        }
      } else if (input.type === "prayer") {
        systemPrompt =
          `You are a thoughtful and empathetic spiritual guide. Write a short, meaningful prayer based on the provided Bible verse. Keep it concise, genuine, and encouraging. Begin with 'Lord,' or 'Heavenly Father,' and close with 'Amen.'${nameNote2}${langNote2}`;
        userPrompt = `Please write a prayer based on this verse: ${verse.reference} - "${verse.text}"`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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

  // Follow-up chat endpoint — maintains full conversation context anchored to the verse
  app.post(api.ai.chat.path, async (req, res) => {
    try {
      const input = chatRequestSchema.parse(req.body);
      const verse = await storage.getVerseById(input.verseId);

      if (!verse) {
        return res.status(404).json({ message: "Verse not found." });
      }

      const chatUserName: string = (req.body as any).userName || "";
      const chatNameNote = chatUserName ? ` The user's name is ${chatUserName}. Use their name naturally when appropriate.` : "";

      const systemPrompt = `You are a warm, knowledgeable Bible study guide. The user is reflecting on today's verse:

"${verse.text}" — ${verse.reference}

Answer all questions in the context of this scripture. Be concise but insightful — 2 to 4 short paragraphs at most. Use accessible, encouraging language suitable for daily spiritual growth. When writing prayers, begin with "Lord," or "Heavenly Father," and close with "Amen."${chatNameNote}`;

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
    const { passageRef, passageText, messages, lang, userName } = req.body;
    if (!passageRef || !passageText || !Array.isArray(messages)) {
      return res.status(400).json({ message: "passageRef, passageText, and messages are required" });
    }
    const langInstruction: Record<string, string> = {
      es: "Respond entirely in Spanish (Español).",
      fr: "Respond entirely in French (Français).",
      pt: "Respond entirely in Portuguese (Português).",
    };
    const langNote = langInstruction[lang] ? ` ${langInstruction[lang]}` : "";
    const passageNameNote = userName ? ` The person you are speaking with is named ${userName}. Use their name naturally once in your response.` : "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a knowledgeable, warm Bible teacher helping someone study ${passageRef}. The passage text is:\n\n${passageText}\n\nKeep your answers concise, warm, and accessible to someone unfamiliar with the Bible.${passageNameNote}${langNote}`,
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

  return httpServer;
}

// Helper for re-activating a deactivated subscriber
async function db_reactivate(email: string) {
  const { db } = await import("./db");
  const { subscribers } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(subscribers).set({ active: true }).where(eq(subscribers.email, email));
}
