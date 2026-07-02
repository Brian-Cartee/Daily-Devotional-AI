/**
 * Church visitor log — first-time guest tracking and follow-up status.
 */
import type { Express } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireChurchAdmin } from "./auth";
import type { ChurchAdminSession } from "./auth";

const FOLLOW_UP_STATUSES = ["pending", "contacted", "no-response", "connected"] as const;

const createVisitorSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  source: z.string().max(80).optional(),
  assignedTo: z.string().max(80).optional(),
  nextFollowupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateStatusSchema = z.object({
  followUpStatus: z.enum(FOLLOW_UP_STATUSES).optional(),
  assignedTo: z.string().max(80).optional().nullable(),
  nextFollowupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
}).refine(d => d.followUpStatus || d.assignedTo !== undefined || d.nextFollowupDate !== undefined, {
  message: "At least one field required",
});

const logContactSchema = z.object({
  contactType: z.enum(["call", "text", "email", "in_person"]),
  notes: z.string().max(2000).optional(),
});

export function registerVisitorRoutes(app: Express): void {
  app.post(
    "/api/church-admin/visitors",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked to this account." });
      }

      const parsed = createVisitorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message ?? "Invalid request.",
        });
      }

      const { firstName, lastName, email, phone, visitDate, notes, source, assignedTo, nextFollowupDate } = parsed.data;

      const result = await pool.query(
        `INSERT INTO church_visitors
           (church_id, first_name, last_name, email, phone, visit_date, source, notes, assigned_to, next_followup_date)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8, $9, $10::date)
         RETURNING id, church_id, first_name, last_name, email, phone,
                   visit_date, source, notes, follow_up_status,
                   assigned_to, next_followup_date, created_at, updated_at`,
        [
          session.churchId,
          firstName.trim(),
          lastName?.trim() || null,
          email?.trim() || null,
          phone?.trim() || null,
          visitDate ?? null,
          source?.trim() || "walk-in",
          notes?.trim() || null,
          assignedTo?.trim() || null,
          nextFollowupDate ?? null,
        ],
      );

      return res.status(201).json({ visitor: result.rows[0] });
    },
  );

  app.patch(
    "/api/church-admin/visitors/:id",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked to this account." });
      }

      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid update." });
      }

      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid visitor id." });
      }

      const result = await pool.query(
        `UPDATE church_visitors
         SET follow_up_status = COALESCE($1, follow_up_status),
             assigned_to = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE assigned_to END,
             next_followup_date = CASE WHEN $3::date IS NOT NULL THEN $3::date ELSE next_followup_date END,
             updated_at = now()
         WHERE id = $4 AND church_id = $5
         RETURNING id, church_id, first_name, last_name, email, phone,
                   visit_date, source, notes, follow_up_status,
                   assigned_to, next_followup_date, created_at, updated_at`,
        [
          parsed.data.followUpStatus ?? null,
          parsed.data.assignedTo !== undefined ? (parsed.data.assignedTo ?? null) : null,
          parsed.data.nextFollowupDate !== undefined ? (parsed.data.nextFollowupDate ?? null) : null,
          id,
          session.churchId,
        ],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Visitor not found." });
      }

      return res.json({ visitor: result.rows[0] });
    },
  );

  // Log a contact attempt for a visitor
  app.post(
    "/api/church-admin/visitors/:id/contacts",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked to this account." });
      }

      const parsed = logContactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid contact type." });
      }

      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid visitor id." });
      }

      // Verify visitor belongs to this church
      const check = await pool.query(
        `SELECT id FROM church_visitors WHERE id = $1 AND church_id = $2`,
        [id, session.churchId],
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ message: "Visitor not found." });
      }

      await pool.query(
        `INSERT INTO visitor_contacts (visitor_id, church_id, contact_type, notes, logged_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, session.churchId, parsed.data.contactType, parsed.data.notes ?? null, session.email],
      );

      // Auto-advance status to contacted if still pending
      await pool.query(
        `UPDATE church_visitors
         SET follow_up_status = 'contacted', updated_at = now()
         WHERE id = $1 AND church_id = $2 AND follow_up_status = 'pending'`,
        [id, session.churchId],
      );

      // Write timeline event
      await pool.query(
        `INSERT INTO church_timeline_events
           (church_id, visitor_id, event_type, description, source, logged_by)
         VALUES ($1, $2, $3, $4, 'manual', $5)`,
        [
          session.churchId,
          id,
          "contact",
          `${parsed.data.contactType} contact logged${parsed.data.notes ? `: ${parsed.data.notes.slice(0, 80)}` : ""}`,
          session.email,
        ],
      );

      return res.json({ ok: true });
    },
  );

  app.get(
    "/api/church-admin/visitors",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked to this account." });
      }

      const result = await pool.query(
        `SELECT id, church_id, first_name, last_name, email, phone,
                visit_date, source, notes, follow_up_status,
                assigned_to, next_followup_date, created_at, updated_at
         FROM church_visitors
         WHERE church_id = $1
         ORDER BY
           CASE WHEN follow_up_status = 'pending' THEN 0 ELSE 1 END,
           visit_date DESC, created_at DESC
         LIMIT 50`,
        [session.churchId],
      );

      return res.json({ visitors: result.rows });
    },
  );
}
