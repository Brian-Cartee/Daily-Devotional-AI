/**
 * Pastor's Weekly Care Briefing
 *
 * Runs every Sunday at 10 PM via a setInterval poll.
 * Queries each church for: overdue visitors, unanswered prayers,
 * absent members, and upcoming milestones.
 * Generates a pastoral summary via Claude Haiku and emails it
 * to all admin/owner/leader accounts for that church.
 */
import Anthropic from "@anthropic-ai/sdk";
import { pool } from "../db";
import { getUncachableResendClient } from "../resend";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Data collection ───────────────────────────────────────────────────────────

async function getOverdueVisitors(churchId: string) {
  const result = await pool.query(
    `SELECT id, first_name, last_name, visit_date,
            follow_up_status, created_at
     FROM church_visitors
     WHERE church_id = $1
       AND follow_up_status = 'pending'
       AND visit_date < CURRENT_DATE - INTERVAL '5 days'
     ORDER BY visit_date ASC
     LIMIT 10`,
    [churchId],
  );
  return result.rows;
}

async function getUnansweredPrayers(churchId: string) {
  const result = await pool.query(
    `SELECT id, display_name, is_anonymous, request, category,
            urgency_flagged, urgency_reason, created_at
     FROM prayer_wall
     WHERE church_id = $1
       AND status = 'active'
       AND created_at < NOW() - INTERVAL '3 days'
     ORDER BY urgency_flagged DESC, created_at ASC
     LIMIT 10`,
    [churchId],
  );
  return result.rows;
}

async function getAbsentMembers(churchId: string) {
  const result = await pool.query(
    `SELECT session_id, email,
            EXTRACT(DAY FROM NOW() - updated_at)::int AS days_absent
     FROM church_memberships
     WHERE church_id = $1
       AND status = 'active'
       AND updated_at < NOW() - INTERVAL '30 days'
     ORDER BY updated_at ASC
     LIMIT 10`,
    [churchId],
  );
  return result.rows;
}

async function getUpcomingMilestones(_churchId: string) {
  // Placeholder — milestones table added in future sprint
  // Returns empty array so briefing still generates
  return [] as Array<{ name: string; milestone: string; date: string }>;
}

async function getChurchAdminEmails(churchId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT email FROM church_memberships
     WHERE church_id = $1
       AND status = 'active'
       AND role IN ('admin', 'owner', 'leader')
       AND email IS NOT NULL
       AND email != ''`,
    [churchId],
  );
  return result.rows.map((r: { email: string }) => r.email);
}

// ── AI generation ─────────────────────────────────────────────────────────────

async function generateBriefingText(
  churchName: string,
  visitors: Awaited<ReturnType<typeof getOverdueVisitors>>,
  prayers: Awaited<ReturnType<typeof getUnansweredPrayers>>,
  absent: Awaited<ReturnType<typeof getAbsentMembers>>,
  milestones: Awaited<ReturnType<typeof getUpcomingMilestones>>,
): Promise<string> {
  const visitorLines = visitors.map((v) => {
    const name = [v.first_name, v.last_name].filter(Boolean).join(" ");
    const days = Math.floor(
      (Date.now() - new Date(v.visit_date).getTime()) / 86400000,
    );
    return `- ${name} visited ${days} days ago, no follow-up logged`;
  });

  const prayerLines = prayers.map((p) => {
    const name = p.is_anonymous ? "Anonymous" : (p.display_name || "Member");
    const days = Math.floor(
      (Date.now() - new Date(p.created_at).getTime()) / 86400000,
    );
    const urgent = p.urgency_flagged ? " [URGENT]" : "";
    return `- ${name}${urgent}: "${String(p.request).slice(0, 120)}" (${days} days unanswered)`;
  });

  const absentLines = absent.map((m) => {
    const label = m.email || "Member";
    return `- ${label}: absent ${m.days_absent} days`;
  });

  const milestoneLines = milestones.map(
    (m) => `- ${m.name}: ${m.milestone} on ${m.date}`,
  );

  const hasUrgent = prayers.some((p) => p.urgency_flagged);

  const prompt = `You are helping a pastor prepare their Monday morning care priorities.

Church: ${churchName}
${hasUrgent ? "\n⚠️  There are URGENT prayer requests requiring immediate attention.\n" : ""}
VISITORS NEEDING FOLLOW-UP (${visitors.length}):
${visitorLines.length ? visitorLines.join("\n") : "- None"}

UNANSWERED PRAYER REQUESTS (${prayers.length}):
${prayerLines.length ? prayerLines.join("\n") : "- None"}

MEMBERS NOT SEEN IN 30+ DAYS (${absent.length}):
${absentLines.length ? absentLines.join("\n") : "- None"}

MILESTONES THIS WEEK:
${milestoneLines.length ? milestoneLines.join("\n") : "- None"}

Write a brief, warm Monday morning pastoral briefing. Format:
- Start with a one-sentence encouragement
- List the top 3 most urgent care needs with a clear action for each
- End with a summary line about the church's overall care picture this week
- Tone: pastoral, not clinical. Like a trusted assistant, not a report.
- Length: under 250 words
- Do not invent information beyond what is provided`;

  const result = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  return result.content[0].type === "text" ? result.content[0].text : "";
}

// ── Email delivery ────────────────────────────────────────────────────────────

function buildEmailHtml(
  churchName: string,
  briefingText: string,
  overdueCount: number,
  urgentCount: number,
  absentCount: number,
  portalUrl: string,
): string {
  const paragraphs = briefingText
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => `<p style="margin:0 0 12px;line-height:1.6;color:#374151;">${l.replace(/^- /, "• ")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#1b4332;padding:24px 32px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.5);margin-bottom:4px;">Shepherd's Path</div>
      <div style="font-size:20px;font-weight:600;color:#fff;">${churchName}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:4px;">Weekly Care Briefing</div>
    </div>

    <div style="padding:32px;">
      ${overdueCount > 0 || urgentCount > 0 || absentCount > 0 ? `
      <div style="display:flex;gap:12px;margin-bottom:28px;">
        ${overdueCount > 0 ? `<div style="flex:1;background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#854d0e;">${overdueCount}</div><div style="font-size:11px;color:#92400e;margin-top:2px;">visitors need follow-up</div></div>` : ""}
        ${urgentCount > 0 ? `<div style="flex:1;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#991b1b;">${urgentCount}</div><div style="font-size:11px;color:#7f1d1d;margin-top:2px;">urgent prayer requests</div></div>` : ""}
        ${absentCount > 0 ? `<div style="flex:1;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;padding:12px 16px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#374151;">${absentCount}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">members not seen in 30+ days</div></div>` : ""}
      </div>` : ""}

      ${paragraphs}

      <div style="margin-top:28px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;">
        <a href="${portalUrl}/prayer-inbox" style="display:inline-block;background:#1b4332;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none;margin-right:8px;">Open Prayer Inbox</a>
        <a href="${portalUrl}/visitors" style="display:inline-block;background:#e8f5ee;color:#2d6a4f;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none;">View Visitors</a>
      </div>
    </div>

    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Shepherd's Path Care OS · <a href="${portalUrl}" style="color:#6b7280;">Open portal</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Job runner ────────────────────────────────────────────────────────────────

async function generateAndSendBriefing(churchId: string, churchName: string): Promise<void> {
  const portalUrl = process.env.CHURCH_PORTAL_URL || "https://admin.shepherdspathai.com";

  const [visitors, prayers, absent, milestones, adminEmails] = await Promise.all([
    getOverdueVisitors(churchId),
    getUnansweredPrayers(churchId),
    getAbsentMembers(churchId),
    getUpcomingMilestones(churchId),
    getChurchAdminEmails(churchId),
  ]);

  if (adminEmails.length === 0) {
    console.log(`[briefing] ${churchName}: no admin emails, skipping`);
    return;
  }

  const briefingText = await generateBriefingText(
    churchName, visitors, prayers, absent, milestones,
  );

  const urgentCount = prayers.filter((p) => p.urgency_flagged).length;

  await pool.query(
    `INSERT INTO church_briefings
       (church_id, briefing_text, visitors_flagged, prayers_flagged, members_flagged)
     VALUES ($1, $2, $3, $4, $5)`,
    [churchId, briefingText, visitors.length, prayers.length, absent.length],
  );

  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const html = buildEmailHtml(
      churchName, briefingText,
      visitors.length, urgentCount, absent.length, portalUrl,
    );

    for (const email of adminEmails) {
      await client.emails.send({
        from: fromEmail,
        to: email,
        subject: `Your Care Briefing — ${churchName}`,
        html,
      });
    }

    await pool.query(
      `UPDATE church_briefings SET delivered_at = now()
       WHERE church_id = $1
         AND generated_at = (SELECT MAX(generated_at) FROM church_briefings WHERE church_id = $1)`,
      [churchId],
    );

    console.log(`[briefing] ${churchName}: sent to ${adminEmails.length} admin(s)`);
  } catch (err) {
    console.error(`[briefing] ${churchName}: email failed`, err);
  }
}

async function runWeeklyBriefings(): Promise<void> {
  console.log("[briefing] running weekly briefings...");
  try {
    const churches = await pool.query(
      `SELECT id, name FROM churches WHERE status = 'active'`,
    );

    for (const church of churches.rows) {
      try {
        await generateAndSendBriefing(church.id, church.name);
      } catch (err) {
        console.error(`[briefing] failed for ${church.name}:`, err);
      }
    }
    console.log(`[briefing] done — processed ${churches.rows.length} church(es)`);
  } catch (err) {
    console.error("[briefing] job failed:", err);
  }
}

// ── Scheduler — runs every Sunday at 10 PM ───────────────────────────────────

function isSundayNight(): boolean {
  const now = new Date();
  return now.getDay() === 0 && now.getHours() === 22;
}

let lastBriefingDate = "";

export function startBriefingScheduler(): void {
  console.log("[briefing] scheduler started");

  setInterval(async () => {
    if (!isSundayNight()) return;
    const today = new Date().toISOString().slice(0, 10);
    if (lastBriefingDate === today) return; // already ran today
    lastBriefingDate = today;
    await runWeeklyBriefings();
  }, 60_000); // checks every minute, lightweight
}

// ── Manual trigger route (admin only) ────────────────────────────────────────

import type { Express } from "express";
import { adminAuth } from "../adminAuth";

export function registerBriefingRoutes(app: Express): void {
  // Latest briefing for portal dashboard
  app.get("/api/church-admin/briefing/latest", async (req, res) => {
    const session = (req as any).churchAdminSession;
    if (!session?.churchId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const result = await pool.query(
        `SELECT briefing_text, visitors_flagged, prayers_flagged,
                members_flagged, generated_at
         FROM church_briefings
         WHERE church_id = $1
         ORDER BY generated_at DESC
         LIMIT 1`,
        [session.churchId],
      );
      return res.json({ briefing: result.rows[0] ?? null });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load briefing" });
    }
  });

  // Admin-only manual trigger for testing
  app.post("/api/admin/briefings/run", async (req, res) => {
    if (!adminAuth(req, res)) return;
    res.json({ ok: true, message: "Briefing job started in background" });
    runWeeklyBriefings().catch(console.error);
  });
}
