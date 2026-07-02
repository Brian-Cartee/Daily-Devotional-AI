/**
 * Church-scoped prayer request inbox.
 * Lists prayer requests belonging to a church, lets admins update status,
 * and drafts a pastoral response using a single bounded Claude call.
 * Does NOT use the Philip pipeline — keeps costs predictable.
 */
import type { Express } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { pool } from "../db";
import { requireChurchAdmin } from "./auth";
import type { ChurchAdminSession } from "./auth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DRAFT_MONTHLY_CAP = 200;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getChurchAiUsage(
  churchId: string,
  windowKey: string,
): Promise<number> {
  const result = await pool.query(
    `SELECT call_count FROM church_ai_usage
     WHERE church_id = $1 AND window_key = $2`,
    [churchId, windowKey],
  );
  return result.rows[0]?.call_count ?? 0;
}

async function incrementChurchAiUsage(
  churchId: string,
  windowKey: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO church_ai_usage (church_id, window_key, call_count, window_start)
     VALUES ($1, $2, 1, date_trunc('month', now()))
     ON CONFLICT (church_id, window_key)
     DO UPDATE SET call_count = church_ai_usage.call_count + 1`,
    [churchId, windowKey],
  );
}

function monthKey(): string {
  const d = new Date();
  return `prayer-draft:${d.getFullYear()}-${d.getMonth() + 1}`;
}

// ── Urgency detection ─────────────────────────────────────────────────────────

const CRISIS_KEYWORDS = [
  "hopeless", "suicid", "can't go on", "cant go on", "end it", "end my life",
  "don't want to live", "dont want to live", "no reason to live", "give up on life",
  "hospital", "emergency", "crisis", "dying", "terminal", "divorce", "abuse",
  "homeless", "addiction", "overdose", "alone", "nobody cares",
];

async function detectUrgency(
  prayerText: string,
): Promise<{ urgent: boolean; reason: string | null }> {
  const lower = prayerText.toLowerCase();
  const keywordMatch = CRISIS_KEYWORDS.find((kw) => lower.includes(kw));
  if (!keywordMatch) return { urgent: false, reason: null };

  try {
    const result = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [
        {
          role: "user",
          content: `Does this prayer request indicate a genuine crisis or urgent pastoral need requiring immediate attention? Reply with JSON only: {"urgent":true/false,"reason":"one sentence or null"}\n\nPrayer: "${prayerText.slice(0, 400)}"`,
        },
      ],
    });
    const text = result.content[0].type === "text" ? result.content[0].text.trim() : "";
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
    return { urgent: Boolean(parsed.urgent), reason: parsed.reason ?? null };
  } catch {
    // Fallback to keyword match if AI call fails
    return { urgent: true, reason: `Contains: "${keywordMatch}"` };
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

const updateStatusSchema = z.object({
  status: z.enum(["active", "answered", "archived"]),
  answeredText: z.string().max(2000).optional(),
});

export function registerPrayerInboxRoutes(app: Express): void {

  // List church prayer requests
  app.get(
    "/api/church-admin/prayer-inbox",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked to this account." });
      }

      const status = (req.query.status as string) || "active";
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Number(req.query.offset) || 0;

      const result = await pool.query(
        `SELECT id, session_id, display_name, is_anonymous, request,
                category, status, answered_text, pray_count,
                urgency_flagged, urgency_reason, created_at
         FROM prayer_wall
         WHERE church_id = $1 AND status = $2
         ORDER BY urgency_flagged DESC, created_at DESC
         LIMIT $3 OFFSET $4`,
        [session.churchId, status, limit, offset],
      );

      return res.json({ requests: result.rows });
    },
  );

  // Update a prayer request status
  app.patch(
    "/api/church-admin/prayer-inbox/:id",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked to this account." });
      }

      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request." });
      }

      const { status, answeredText } = parsed.data;
      const id = Number(req.params.id);

      await pool.query(
        `UPDATE prayer_wall
         SET status = $1,
             answered_text = COALESCE($2, answered_text),
             answered_at = CASE WHEN $1 = 'answered' THEN now() ELSE answered_at END,
             updated_at = now()
         WHERE id = $3 AND church_id = $4`,
        [status, answeredText ?? null, id, session.churchId],
      );

      return res.json({ ok: true });
    },
  );

  // Flag an existing prayer request for urgency (called after submission if church_id present)
  app.post(
    "/api/church-admin/prayer-inbox/:id/check-urgency",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) return res.status(400).json({ message: "No church linked." });

      const id = Number(req.params.id);
      const row = await pool.query(
        `SELECT request FROM prayer_wall WHERE id = $1 AND church_id = $2`,
        [id, session.churchId],
      );
      if (row.rows.length === 0) return res.status(404).json({ message: "Not found." });

      const { urgent, reason } = await detectUrgency(row.rows[0].request);
      if (urgent) {
        await pool.query(
          `UPDATE prayer_wall SET urgency_flagged = true, urgency_reason = $1 WHERE id = $2`,
          [reason, id],
        );
      }
      return res.json({ urgent, reason });
    },
  );

  // Draft a pastoral reply — single Claude call, capped per church per month
  app.post(
    "/api/church-admin/prayer-inbox/:id/draft",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked to this account." });
      }

      // Church-level AI budget check
      const key = monthKey();
      const usage = await getChurchAiUsage(session.churchId, key);
      if (usage >= DRAFT_MONTHLY_CAP) {
        return res.status(429).json({
          code: "church_ai_limit",
          message: "Monthly AI draft limit reached. Resets next month.",
        });
      }

      const id = Number(req.params.id);
      const result = await pool.query(
        `SELECT request, display_name, is_anonymous, category
         FROM prayer_wall
         WHERE id = $1 AND church_id = $2`,
        [id, session.churchId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Prayer request not found." });
      }

      const { request, display_name, is_anonymous, category } = result.rows[0];
      const name = is_anonymous ? "this person" : (display_name || "this person");

      const completion = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are helping a pastor write a brief, warm pastoral response to a prayer request.

Prayer request category: ${category}
From: ${name}
Request: "${request}"

Write a short, compassionate response (3-5 sentences) the pastor can review and send.
Scriptural in tone but conversational. Do not quote specific verses unless natural.
Do not start with "Dear" or a formal greeting — the pastor will add that.`,
          },
        ],
      });

      await incrementChurchAiUsage(session.churchId, key);

      const draft =
        completion.content[0].type === "text" ? completion.content[0].text : "";

      return res.json({ draft });
    },
  );
}
