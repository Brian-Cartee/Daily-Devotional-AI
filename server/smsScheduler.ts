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
      // Day-3 invite to the prayer network (only for those who haven't joined yet)
      const createdAt = sub.createdAt ? new Date(sub.createdAt) : null;
      const daysSinceJoin = createdAt
        ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const shouldInviteToPrayer = daysSinceJoin >= 3 && !sub.joinedPrayerNetwork;

      const body = shouldInviteToPrayer
        ? `${devotionalText}\n\nP.S. Text JOIN PRAYER to join our prayer chain — share needs and pray for others. It's beautiful.`
        : devotionalText;

      await client.messages.create({ body, from: fromNumber, to: sub.phone });
      sent++;
    } catch (err: any) {
      console.error(`[sms] Failed to send to ${sub.phone}:`, err.message);
      failed++;
    }
  }

  console.log(`[sms] Daily devotional sent: ${sent} delivered, ${failed} failed`);
}

async function sendPrayerFollowUps() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return;

  const pending = await storage.getPrayerRequestsForFollowUp();
  if (pending.length === 0) return;

  const client = twilio(accountSid, authToken);

  for (const req of pending) {
    try {
      const count = req.amenCount;
      let msg: string;
      if (count === 0) {
        msg = `Your prayer from yesterday is still held before God. Sometimes the quiet moments are where He works most deeply. Keep trusting Him. 🙏`;
      } else {
        msg = `${count} ${count === 1 ? "person" : "people"} prayed for you yesterday — and God heard every word. May He answer in His perfect time. 🙏`;
      }
      await client.messages.create({ body: msg, from: fromNumber, to: req.requesterPhone });
      await storage.markFollowUpSent(req.id);
    } catch (err: any) {
      console.error(`[sms] Failed to send prayer follow-up for request ${req.id}:`, err.message);
    }
  }

  if (pending.length > 0) {
    console.log(`[sms] Sent ${pending.length} prayer follow-up(s)`);
  }
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
      await sendPrayerFollowUps();
      run();
    }, delay);
  };

  run();
}
