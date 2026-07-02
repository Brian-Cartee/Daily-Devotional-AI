/**
 * Church announcements — pastor posts, members read in /c/:slug.
 * Replaces GroupMe / mass email for church communication.
 */
import type { Express } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireChurchAdmin } from "./auth";
import type { ChurchAdminSession } from "./auth";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  pinned: z.boolean().optional().default(false),
  publishedAt: z.string().datetime().optional(),
  event_date: dateString.nullable().optional(),
  location: z.string().max(200).nullable().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  pinned: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  event_date: dateString.nullable().optional(),
  location: z.string().max(200).nullable().optional(),
});

const announcementColumns =
  "id, title, body, pinned, published_at, event_date, location, created_at, updated_at";

export function registerAnnouncementRoutes(app: Express): void {

  // Public: members read announcements for their church
  app.get("/api/churches/:slug/announcements", async (req, res) => {
    const slug = String(req.params.slug ?? "").toLowerCase().trim();
    if (!slug) return res.status(400).json({ message: "slug required" });

    const churchResult = await pool.query(
      `SELECT id FROM churches WHERE slug = $1 AND status = 'active'`,
      [slug],
    );
    if (churchResult.rows.length === 0) {
      return res.status(404).json({ message: "Church not found." });
    }

    const churchId = churchResult.rows[0].id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const result = await pool.query(
      `SELECT id, title, body, pinned, published_at, event_date, location, created_at
       FROM church_announcements
       WHERE church_id = $1
         AND (published_at IS NULL OR published_at <= now())
       ORDER BY pinned DESC, published_at DESC NULLS FIRST, created_at DESC
       LIMIT $2`,
      [churchId, limit],
    );

    return res.json({ announcements: result.rows });
  });

  // Admin: list all announcements including unpublished
  app.get(
    "/api/church-admin/announcements",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked." });
      }

      const result = await pool.query(
        `SELECT ${announcementColumns}
         FROM church_announcements
         WHERE church_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [session.churchId],
      );

      return res.json({ announcements: result.rows });
    },
  );

  // Admin: create announcement
  app.post(
    "/api/church-admin/announcements",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked." });
      }

      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request.", errors: parsed.error.flatten() });
      }

      const { title, body, pinned, publishedAt, event_date, location } = parsed.data;

      const result = await pool.query(
        `INSERT INTO church_announcements
           (church_id, author_session_id, title, body, pinned, published_at, event_date, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, title, body, pinned, published_at, event_date, location, created_at`,
        [
          session.churchId,
          session.email,
          title,
          body,
          pinned,
          publishedAt ? new Date(publishedAt) : new Date(),
          event_date ?? null,
          location?.trim() ? location.trim() : null,
        ],
      );

      return res.status(201).json({ announcement: result.rows[0] });
    },
  );

  // Admin: update announcement
  app.patch(
    "/api/church-admin/announcements/:id",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked." });
      }

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request." });
      }

      const { title, body, pinned, publishedAt, event_date, location } = parsed.data;
      const id = Number(req.params.id);

      const sets: string[] = ["updated_at = now()"];
      const params: unknown[] = [];
      let idx = 1;

      if (title !== undefined) {
        sets.push(`title = $${idx++}`);
        params.push(title);
      }
      if (body !== undefined) {
        sets.push(`body = $${idx++}`);
        params.push(body);
      }
      if (pinned !== undefined) {
        sets.push(`pinned = $${idx++}`);
        params.push(pinned);
      }
      if (publishedAt !== undefined) {
        sets.push(`published_at = $${idx++}`);
        params.push(publishedAt ? new Date(publishedAt) : null);
      }
      if (event_date !== undefined) {
        sets.push(`event_date = $${idx++}`);
        params.push(event_date);
      }
      if (location !== undefined) {
        sets.push(`location = $${idx++}`);
        params.push(location?.trim() ? location.trim() : null);
      }

      params.push(id, session.churchId);

      const result = await pool.query(
        `UPDATE church_announcements
         SET ${sets.join(", ")}
         WHERE id = $${idx++} AND church_id = $${idx}
         RETURNING id, title, body, pinned, published_at, event_date, location, created_at, updated_at`,
        params,
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Announcement not found." });
      }

      return res.json({ announcement: result.rows[0] });
    },
  );

  // Admin: delete announcement
  app.delete(
    "/api/church-admin/announcements/:id",
    requireChurchAdmin,
    async (req, res) => {
      const session = (req as any).churchAdminSession as ChurchAdminSession;
      if (!session.churchId) {
        return res.status(400).json({ message: "No church linked." });
      }

      await pool.query(
        `DELETE FROM church_announcements WHERE id = $1 AND church_id = $2`,
        [Number(req.params.id), session.churchId],
      );

      return res.json({ ok: true });
    },
  );
}
