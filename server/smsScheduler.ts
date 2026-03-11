import twilio from "twilio";
import { storage } from "./storage";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function sendDailyDevotionalSms() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log("[sms] Twilio credentials not configured, skipping daily SMS");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const verse = await storage.getVerseByDate(today);
  if (!verse) {
    console.log("[sms] No verse found for today, skipping daily SMS");
    return;
  }

  const subscribers = await storage.getSmsOptedInNumbers();
  if (subscribers.length === 0) {
    console.log("[sms] No opted-in subscribers, skipping daily SMS");
    return;
  }

  // Generate one devotional for everyone (efficient + consistent)
  let devotionalText: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Shepherd's Path, sending a morning devotional by text message. Today's verse: ${verse.reference} — "${verse.text}"\n\nWrite a devotional in one flowing paragraph — no headers, no labels. Include the verse reference and a brief quote, 2 sentences of warm personal reflection, and a 1-sentence prayer. Keep total under 380 characters. Warm, pastoral, no clichés. No follow-up question needed — this is a morning gift.`,
        },
        { role: "user", content: "Send me today's devotional." },
      ],
      max_tokens: 180,
      temperature: 0.85,
    });
    devotionalText = completion.choices[0].message.content?.trim()
      ?? `${verse.reference}: "${verse.text}" — Begin today resting in this truth. Lord, let Your Word be the first thing that shapes this day. Amen.`;
  } catch (err) {
    console.error("[sms] Failed to generate devotional text:", err);
    return;
  }

  const client = twilio(accountSid, authToken);
  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    try {
      await client.messages.create({
        body: devotionalText,
        from: fromNumber,
        to: sub.phone,
      });
      sent++;
    } catch (err: any) {
      console.error(`[sms] Failed to send to ${sub.phone}:`, err.message);
      failed++;
    }
  }

  console.log(`[sms] Daily devotional sent: ${sent} delivered, ${failed} failed`);
}

function msUntilNextHour(targetHour: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(targetHour, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

export function scheduleDailySms() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log("[sms] Twilio credentials not configured, skipping SMS scheduler");
    return;
  }

  const run = () => {
    // 8:00 AM ET = 13:00 UTC (EST, UTC-5)
    const delay = msUntilNextHour(13);
    const nextRun = new Date(Date.now() + delay);
    console.log(`[sms] Next daily devotional SMS scheduled for: ${nextRun.toISOString()}`);
    setTimeout(async () => {
      await sendDailyDevotionalSms();
      run();
    }, delay);
  };

  run();
}
