/**
 * Church announcements — pastor posts, members read in /c/:slug.
 * Replaces GroupMe / mass email for church communication.
 */
import type { Express } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireChurchAdmin } from "./auth";
import type { ChurchAdminSession } from "./auth";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  pinned: z.boolean().optional().default(false),
  publishedAt: z.string().datetime().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  pinned: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
});

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
      `SELECT id, title, body, pinned, published_at, created_at
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
        `SELECT id, title, body, pinned, published_at, created_at, updated_at
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

      const { title, body, pinned, publishedAt } = parsed.data;

      const result = await pool.query(
        `INSERT INTO church_announcements
           (church_id, author_session_id, title, body, pinned, published_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, body, pinned, published_at, created_at`,
        [
          session.churchId,
          session.email,
          title,
          body,
          pinned,
          publishedAt ? new Date(publishedAt) : new Date(),
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

      const { title, body, pinned, publishedAt } = parsed.data;
      const id = Number(req.params.id);

      await pool.query(
        `UPDATE church_announcements
         SET title = COALESCE($1, title),
             body = COALESCE($2, body),
             pinned = COALESCE($3, pinned),
             published_at = CASE WHEN $4::text IS NOT NULL THEN $4::timestamp ELSE published_at END,
             updated_at = now()
         WHERE id = $5 AND church_id = $6`,
        [title ?? null, body ?? null, pinned ?? null, publishedAt ?? null, id, session.churchId],
      );

      return res.json({ ok: true });
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
