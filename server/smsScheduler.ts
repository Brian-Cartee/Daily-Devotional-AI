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

  // Rotate SMS structure by day of week so the experience never feels predictable
  const dayOfWeek = new Date().getDay(); // 0 = Sunday
  const SMS_STRUCTURES = [
    // Sunday — reflective, inviting the week ahead
    `You are Shepherd's Path, sending a Sunday morning text. Today's verse: ${verse.reference} — "${verse.text}"\n\nWrite one warm paragraph (under 380 characters, no headers). Begin by naming that today is Sunday — a day to begin again. Weave in a brief quote from the verse, 1–2 sentences of gentle reflection on what this verse offers at the start of a week, and close with a 1-sentence prayer.\n\nPronoun rule: capitalize He, Him, His only for God/Jesus. Capitalize You, Your in the prayer when addressing God. Never capitalize "you" addressing the reader.`,
    // Monday — grounding, practical, meets the week head-on
    `You are Shepherd's Path, sending a Monday morning text. Today's verse: ${verse.reference} — "${verse.text}"\n\nWrite one grounding paragraph (under 380 characters, no headers). Acknowledge that Monday can feel like a lot. Anchor the week in a brief quote from this verse. Offer 1–2 sentences of real, honest reflection — not cheerful platitude. End with a short prayer they can carry into the day.\n\nPronoun rule: capitalize He, Him, His only for God/Jesus. Capitalize You, Your in prayer. Never capitalize "you" addressing the reader.`,
    // Tuesday — personal, close, conversational
    `You are Shepherd's Path, sending a Tuesday morning text. Today's verse: ${verse.reference} — "${verse.text}"\n\nWrite one paragraph (under 380 characters, no headers) as if writing a note to a close friend. Start mid-thought — natural, not ceremonial. Weave in a short quote from the verse. Offer one honest insight that might land differently on a Tuesday — when the week is underway but still feels long. Close with a breath of a prayer.\n\nPronoun rule: capitalize He, Him, His only for God/Jesus. Capitalize You, Your in prayer. Never capitalize "you" addressing the reader.`,
    // Wednesday — midweek steadiness, encouragement
    `You are Shepherd's Path, sending a Wednesday morning text. Today's verse: ${verse.reference} — "${verse.text}"\n\nWrite one paragraph (under 380 characters, no headers). Midweek — acknowledge the weight of being halfway through. Quote briefly from the verse. Offer 1–2 sentences of steady, encouragement that doesn't feel forced. Close with a 1-sentence prayer that asks for strength for the rest of the week.\n\nPronoun rule: capitalize He, Him, His only for God/Jesus. Capitalize You, Your in prayer. Never capitalize "you" addressing the reader.`,
    // Thursday — reflection-forward, personal question
    `You are Shepherd's Path, sending a Thursday morning text. Today's verse: ${verse.reference} — "${verse.text}"\n\nWrite one paragraph (under 380 characters, no headers). Begin with the verse reference and a brief quote. Then ask one honest question — not preachy, genuinely curious — about how this verse might touch something real in the person's life this week. Close with a quiet 1-sentence prayer.\n\nPronoun rule: capitalize He, Him, His only for God/Jesus. Capitalize You, Your in prayer. Never capitalize "you" addressing the reader.`,
    // Friday — gratitude-leaning, warm close to the week
    `You are Shepherd's Path, sending a Friday morning text. Today's verse: ${verse.reference} — "${verse.text}"\n\nWrite one warm paragraph (under 380 characters, no headers). Acknowledge that the week is almost done. Quote briefly from the verse. Offer 1–2 sentences about what to carry from this week — what God may have been saying through it. Close with a grateful, simple prayer.\n\nPronoun rule: capitalize He, Him, His only for God/Jesus. Capitalize You, Your in prayer. Never capitalize "you" addressing the reader.`,
    // Saturday — rest-themed, slow, unhurried
    `You are Shepherd's Path, sending a Saturday morning text. Today's verse: ${verse.reference} — "${verse.text}"\n\nWrite one unhurried paragraph (under 380 characters, no headers). Saturday has a different feel — slower, a little more space. Write with that pace. Quote briefly from the verse. Offer 1–2 sentences that give the reader permission to simply be still today. Close with a restful, releasing prayer.\n\nPronoun rule: capitalize He, Him, His only for God/Jesus. Capitalize You, Your in prayer. Never capitalize "you" addressing the reader.`,
  ];

  const systemPrompt = SMS_STRUCTURES[dayOfWeek];

  // Generate one devotional for everyone (efficient + consistent)
  let devotionalText: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
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
    // 8:00 AM EDT = 12:00 UTC (EDT = UTC-4)
    // ⚠️ When DST ends in November (EST = UTC-5), change back to 13 to maintain 8 AM ET delivery
    const delay = msUntilNextHour(12);
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
