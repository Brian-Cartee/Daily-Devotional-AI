/**
 * Church admin dashboard stats and simple analytics.
 */
import type { Express } from "express";
import { pool } from "../db";
import { requireChurchAdmin } from "./auth";
import { churchStorage } from "./storage";
import { getAdminSession, churchIdOr400, requireMinRole } from "./adminHelpers";

function toPublicChurch(church: Awaited<ReturnType<typeof churchStorage.getChurchById>>) {
  if (!church) return null;
  return {
    id: church.id,
    name: church.name,
    slug: church.slug,
    plan: church.plan,
    primaryColor: church.primaryColor,
    logoUrl: church.logoUrl,
  };
}

export function registerDashboardRoutes(app: Express): void {
  app.get("/api/church-admin/dashboard", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "leader")) return;

    try {
      const church = await churchStorage.getChurchById(churchId);
      if (!church) return res.status(404).json({ message: "Church not found." });

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [prayerRes, memberRes, announcementRes, visitorRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS count FROM prayer_wall
           WHERE church_id = $1 AND status = 'active'`,
          [churchId],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM church_memberships
           WHERE church_id = $1 AND status = 'active'`,
          [churchId],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM church_announcements
           WHERE church_id = $1
             AND published_at IS NOT NULL
             AND published_at <= now()`,
          [churchId],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM church_visitors
           WHERE church_id = $1 AND visit_date >= $2::date`,
          [churchId, monthStart.toISOString().slice(0, 10)],
        ),
      ]);

      // "Needs Attention" alerts — the items requiring pastoral action today
      const [overdueVisitorsRes, urgentPrayersRes] = await Promise.all([
        pool.query(
          `SELECT id, first_name, last_name, visit_date,
                  EXTRACT(DAY FROM NOW() - visit_date::timestamp)::int AS days_since
           FROM church_visitors
           WHERE church_id = $1
             AND follow_up_status = 'pending'
             AND visit_date < CURRENT_DATE - INTERVAL '5 days'
           ORDER BY visit_date ASC
           LIMIT 5`,
          [churchId],
        ),
        pool.query(
          `SELECT id, display_name, is_anonymous, request,
                  urgency_reason,
                  EXTRACT(DAY FROM NOW() - created_at)::int AS days_waiting
           FROM prayer_wall
           WHERE church_id = $1
             AND status = 'active'
             AND urgency_flagged = true
             AND answered_text IS NULL
           ORDER BY created_at ASC
           LIMIT 5`,
          [churchId],
        ),
      ]);

      return res.json({
        activePrayerCount: prayerRes.rows[0]?.count ?? 0,
        memberCount: memberRes.rows[0]?.count ?? 0,
        publishedAnnouncementCount: announcementRes.rows[0]?.count ?? 0,
        visitorsThisMonth: visitorRes.rows[0]?.count ?? 0,
        church: toPublicChurch(church),
        alerts: {
          overdueVisitors: overdueVisitorsRes.rows,
          urgentPrayers: urgentPrayersRes.rows,
        },
      });
    } catch (err) {
      console.error("[church-admin] dashboard error:", err);
      return res.status(500).json({ message: "Failed to load dashboard." });
    }
  });

  app.get("/api/church-admin/analytics", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const [membersRes, prayerRes, visitorsRes, announcementsRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS count FROM church_memberships
           WHERE church_id = $1 AND joined_at >= $2`,
          [churchId, since],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM prayer_wall
           WHERE church_id = $1 AND created_at >= $2`,
          [churchId, since],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM church_visitors
           WHERE church_id = $1 AND created_at >= $2`,
          [churchId, since],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM church_announcements
           WHERE church_id = $1
             AND published_at IS NOT NULL
             AND published_at >= $2`,
          [churchId, since],
        ),
      ]);

      return res.json({
        periodDays: 30,
        newMembers: membersRes.rows[0]?.count ?? 0,
        prayerRequests: prayerRes.rows[0]?.count ?? 0,
        visitorsLogged: visitorsRes.rows[0]?.count ?? 0,
        announcementsPublished: announcementsRes.rows[0]?.count ?? 0,
      });
    } catch (err) {
      console.error("[church-admin] analytics error:", err);
      return res.status(500).json({ message: "Failed to load analytics." });
    }
  });
}
