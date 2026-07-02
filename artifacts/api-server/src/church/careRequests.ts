import type { Express } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireChurchAdmin } from "./auth";
import type { ChurchAdminSession } from "./auth";

const VALID_TYPES = ["hospital", "meal", "counseling", "grief", "financial", "other"] as const;
const VALID_STATUSES = ["open", "in_progress", "completed", "cancelled"] as const;

const createSchema = z.object({
  personName: z.string().min(1).max(120),
  requestType: z.enum(VALID_TYPES).default("other"),
  description: z.string().min(1).max(2000),
  assignedTo: z.string().max(120).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const patchSchema = z.object({
  status: z.enum(VALID_STATUSES),
});

export function registerCareRequestRoutes(app: Express): void {
  app.get("/api/church-admin/care-requests", requireChurchAdmin, async (req, res) => {
    const session = (req as any).churchAdminSession as ChurchAdminSession;
    if (!session.churchId) return res.status(400).json({ message: "No church linked." });

    try {
      const result = await pool.query(
        `SELECT id, church_id, person_name, request_type, description,
                assigned_to, due_date, status, private_notes,
                completed_at, created_at, updated_at
         FROM church_care_requests
         WHERE church_id = $1 AND status != 'cancelled'
         ORDER BY
           CASE WHEN status IN ('open','in_progress') THEN 0 ELSE 1 END,
           due_date ASC NULLS LAST,
           created_at ASC
         LIMIT 100`,
        [session.churchId],
      );
      return res.json({ careRequests: result.rows });
    } catch (err) {
      console.error("[care-requests] list error:", err);
      return res.status(500).json({ message: "Failed to load care requests." });
    }
  });

  app.post("/api/church-admin/care-requests", requireChurchAdmin, async (req, res) => {
    const session = (req as any).churchAdminSession as ChurchAdminSession;
    if (!session.churchId) return res.status(400).json({ message: "No church linked." });

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request." });
    }

    const { personName, requestType, description, assignedTo, dueDate } = parsed.data;

    try {
      const result = await pool.query(
        `INSERT INTO church_care_requests
           (church_id, person_name, request_type, description, assigned_to, due_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6::date, $7)
         RETURNING id, church_id, person_name, request_type, description,
                   assigned_to, due_date, status, completed_at, created_at, updated_at`,
        [
          session.churchId,
          personName.trim(),
          requestType,
          description.trim(),
          assignedTo?.trim() || null,
          dueDate ?? null,
          session.email,
        ],
      );

      await pool.query(
        `INSERT INTO church_timeline_events
           (church_id, event_type, description, source, logged_by)
         VALUES ($1, 'care_request', $2, 'manual', $3)`,
        [session.churchId, `Care request created for ${personName}: ${requestType}`, session.email],
      );

      return res.status(201).json({ careRequest: result.rows[0] });
    } catch (err) {
      console.error("[care-requests] create error:", err);
      return res.status(500).json({ message: "Failed to create care request." });
    }
  });

  app.patch("/api/church-admin/care-requests/:id", requireChurchAdmin, async (req, res) => {
    const session = (req as any).churchAdminSession as ChurchAdminSession;
    if (!session.churchId) return res.status(400).json({ message: "No church linked." });

    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid status." });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id." });

    try {
      const result = await pool.query(
        `UPDATE church_care_requests
         SET status = $1,
             completed_at = CASE WHEN $1 = 'completed' THEN now() ELSE completed_at END,
             updated_at = now()
         WHERE id = $2 AND church_id = $3
         RETURNING id, church_id, person_name, request_type, description,
                   assigned_to, due_date, status, completed_at, created_at, updated_at`,
        [parsed.data.status, id, session.churchId],
      );

      if (result.rows.length === 0) return res.status(404).json({ message: "Care request not found." });
      return res.json({ careRequest: result.rows[0] });
    } catch (err) {
      console.error("[care-requests] patch error:", err);
      return res.status(500).json({ message: "Failed to update care request." });
    }
  });
}
