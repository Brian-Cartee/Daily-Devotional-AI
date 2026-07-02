import type { Express, Request, Response } from "express";
import { z } from "zod";
import { CHURCH_PLANS, CHURCH_ROLES } from "@workspace/db";
import { adminAuth } from "../adminAuth";
import { storage } from "../storage";
import { pool } from "../db";
import { churchStorage } from "./storage";
import { resolveAccessContext } from "./resolveAccessContext";
import { canAccessChurchFeature } from "./permissions";
import {
  isChurchJoinable,
  toChurchInvitePreview,
  toPublicChurchProfile,
} from "./publicProfile";
import {
  createMagicLink,
  verifyMagicToken,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  parseAdminSession,
  sendMagicLinkEmail,
  requireChurchAdmin,
  cleanExpiredTokens,
} from "./auth";
import { registerPrayerInboxRoutes } from "./prayerInbox";
import { registerAnnouncementRoutes } from "./announcements";
import { registerVisitorRoutes } from "./visitors";
import { registerDashboardRoutes } from "./dashboard";
import { registerChurchProfileRoutes } from "./churchProfile";
import { registerMemberRoutes } from "./members";
import { registerChurchSettingsRoutes } from "./churchSettings";
import { registerBriefingRoutes, startBriefingScheduler } from "./briefing";
import { registerCareRequestRoutes } from "./careRequests";

const createChurchBodySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  plan: z.enum(CHURCH_PLANS).optional().default("none"),
  inviteCode: z.string().min(6).max(32).optional(),
  ownerSessionId: z.string().min(1).max(128).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const updatePlanBodySchema = z.object({
  plan: z.enum(CHURCH_PLANS),
});

const membershipBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  role: z.enum(CHURCH_ROLES),
  email: z.string().email().optional().or(z.literal("")),
  status: z.enum(["active", "invited", "left", "removed"] as const).optional(),
});

const resolveContextQuerySchema = z.object({
  sessionId: z.string().min(1).max(128),
  churchId: z.string().min(1).max(128).optional(),
  churchSlug: z.string().min(1).max(64).optional(),
});

const joinChurchBodySchema = z
  .object({
    sessionId: z.string().min(1).max(128),
    slug: z.string().min(2).max(64).optional(),
    inviteCode: z.string().min(6).max(32).optional(),
    /** Single field from the app — tries invite code, then slug */
    token: z.string().min(2).max(64).optional(),
  })
  .refine(
    (data) => Boolean(data.slug?.trim() || data.inviteCode?.trim() || data.token?.trim()),
    { message: "slug, inviteCode, or token required" },
  );

const leaveChurchBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
});

const sessionIdQuerySchema = z.object({
  sessionId: z.string().min(1).max(128),
});

function requireAdmin(req: Request, res: Response): boolean {
  return adminAuth(req, res);
}

export function registerChurchRoutes(app: Express): void {
  // ── Public church lookup (no auth, no Pro required) ───────────────────────

  app.get("/api/churches/by-slug/:slug", async (req, res) => {
    const slug = String(req.params.slug ?? "").trim().toLowerCase();
    if (!slug) return res.status(400).json({ message: "slug required" });
    try {
      const church = await churchStorage.getChurchBySlug(slug);
      if (!church || !isChurchJoinable(church.status)) {
        return res.status(404).json({ message: "Church not found" });
      }
      if (!canAccessChurchFeature(church.plan, "profile")) {
        return res.status(404).json({ message: "Church not found" });
      }
      res.json({ church: toPublicChurchProfile(church) });
    } catch (err) {
      console.error("[church] public profile error:", err);
      res.status(500).json({ message: "Failed to load church" });
    }
  });

  app.get("/api/churches/invite/:code", async (req, res) => {
    const code = String(req.params.code ?? "").trim();
    if (!code) return res.status(400).json({ message: "invite code required" });
    try {
      const church = await churchStorage.getChurchByInviteCode(code);
      if (!church || !isChurchJoinable(church.status)) {
        return res.status(404).json({ message: "Invite not found" });
      }
      if (!canAccessChurchFeature(church.plan, "invite_join")) {
        return res.status(404).json({ message: "Invite not found" });
      }
      res.json({ church: toChurchInvitePreview(church) });
    } catch (err) {
      console.error("[church] invite lookup error:", err);
      res.status(500).json({ message: "Failed to resolve invite" });
    }
  });

  // ── Member routes (sessionId only — never checks Pro) ─────────────────────

  app.get("/api/churches/mine", async (req, res) => {
    const parsed = sessionIdQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "sessionId required" });
    }
    try {
      const rows = await churchStorage.listActiveMembershipsWithChurches(parsed.data.sessionId);
      res.json({
        churches: rows.map(({ membership, church }) => ({
          membership: {
            id: membership.id,
            role: membership.role,
            status: membership.status,
            joinedAt: membership.joinedAt.toISOString(),
          },
          church: toPublicChurchProfile(church),
        })),
      });
    } catch (err) {
      console.error("[church] mine error:", err);
      res.status(500).json({ message: "Failed to load your churches" });
    }
  });

  app.post("/api/churches/join", async (req, res) => {
    const parsed = joinChurchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid join request",
      });
    }
    const { sessionId, slug, inviteCode, token } = parsed.data;
    try {
      let church = null;
      const trimmedToken = token?.trim();
      if (trimmedToken) {
        church =
          (await churchStorage.getChurchByInviteCode(trimmedToken)) ??
          (await churchStorage.getChurchBySlug(trimmedToken.toLowerCase()));
      } else if (slug?.trim()) {
        church = await churchStorage.getChurchBySlug(slug.trim().toLowerCase());
      } else {
        church = await churchStorage.getChurchByInviteCode(inviteCode!.trim());
      }

      if (!church || !isChurchJoinable(church.status)) {
        return res.status(404).json({
          message:
            "Church not found. Check your invite code — it may look like grace-demo-2026, not the church name.",
        });
      }
      if (!canAccessChurchFeature(church.plan, "invite_join")) {
        return res.status(403).json({ message: "This church is not accepting members yet" });
      }

      const subscriber = await storage.getActiveSubscriberBySession(sessionId);
      const membership = await churchStorage.joinAsMember(
        church.id,
        sessionId,
        subscriber?.email ?? null,
      );

      res.status(201).json({
        membership: {
          id: membership.id,
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt.toISOString(),
        },
        church: toPublicChurchProfile(church),
      });
    } catch (err) {
      console.error("[church] join error:", err);
      res.status(500).json({ message: "Failed to join church" });
    }
  });

  app.post("/api/churches/:churchId/leave", async (req, res) => {
    const churchId = String(req.params.churchId ?? "").trim();
    const parsed = leaveChurchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "sessionId required" });
    }
    try {
      const church = await churchStorage.getChurchById(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });

      const membership = await churchStorage.leaveMembership(churchId, parsed.data.sessionId);
      if (!membership) {
        return res.status(404).json({ message: "Active membership not found" });
      }

      res.json({
        membership: {
          id: membership.id,
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt.toISOString(),
        },
      });
    } catch (err) {
      console.error("[church] leave error:", err);
      res.status(500).json({ message: "Failed to leave church" });
    }
  });

  // ── Shepherd-admin: church bootstrap ──────────────────────────────────────

  app.get("/api/admin/churches", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const churches = await churchStorage.listChurches();
      res.json({ churches });
    } catch (err) {
      console.error("[church] list error:", err);
      res.status(500).json({ message: "Failed to list churches" });
    }
  });

  app.post("/api/admin/churches", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const parsed = createChurchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid body" });
    }
    const { name, slug, plan, inviteCode, ownerSessionId, settings } = parsed.data;
    try {
      const church = await churchStorage.createChurch({
        name,
        slug,
        plan,
        inviteCode,
        settings: settings as Record<string, unknown> | undefined,
      });

      let ownerMembership = null;
      if (ownerSessionId?.trim()) {
        ownerMembership = await churchStorage.upsertMembership({
          churchId: church.id,
          sessionId: ownerSessionId.trim(),
          role: "owner",
        });
      }

      res.status(201).json({ church, ownerMembership });
    } catch (err) {
      console.error("[church] create error:", err);
      res.status(500).json({ message: "Failed to create church" });
    }
  });

  app.get("/api/admin/churches/:churchId", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const churchId = String(req.params.churchId ?? "");
    try {
      const church =
        (await churchStorage.getChurchById(churchId)) ??
        (await churchStorage.getChurchBySlug(churchId));
      if (!church) return res.status(404).json({ message: "Church not found" });
      const memberships = await churchStorage.listMemberships(church.id);
      res.json({ church, memberships });
    } catch (err) {
      console.error("[church] get error:", err);
      res.status(500).json({ message: "Failed to load church" });
    }
  });

  app.patch("/api/admin/churches/:churchId/plan", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const churchId = String(req.params.churchId ?? "");
    const parsed = updatePlanBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "plan must be one of: none, basic, plus, partner" });
    }
    try {
      const existing = await churchStorage.getChurchById(churchId);
      if (!existing) return res.status(404).json({ message: "Church not found" });
      const church = await churchStorage.updateChurchPlan(churchId, parsed.data.plan);
      res.json({ church });
    } catch (err) {
      console.error("[church] plan update error:", err);
      res.status(500).json({ message: "Failed to update church plan" });
    }
  });

  app.get("/api/admin/churches/:churchId/memberships", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const churchId = String(req.params.churchId ?? "");
    try {
      const church = await churchStorage.getChurchById(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const memberships = await churchStorage.listMemberships(churchId);
      res.json({ memberships });
    } catch (err) {
      console.error("[church] memberships list error:", err);
      res.status(500).json({ message: "Failed to list memberships" });
    }
  });

  app.post("/api/admin/churches/:churchId/memberships", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const churchId = String(req.params.churchId ?? "");
    const parsed = membershipBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid body" });
    }
    try {
      const church = await churchStorage.getChurchById(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const membership = await churchStorage.upsertMembership({
        churchId,
        sessionId: parsed.data.sessionId,
        role: parsed.data.role,
        email: parsed.data.email || null,
        status: parsed.data.status,
      });
      res.status(201).json({ membership });
    } catch (err) {
      console.error("[church] membership upsert error:", err);
      res.status(500).json({ message: "Failed to upsert membership" });
    }
  });

  /** Debug helper for PR1 — resolves church access without exposing public UI. */
  app.get("/api/admin/churches/access/resolve", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const parsed = resolveContextQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "sessionId required" });
    }
    try {
      const churchKey = parsed.data.churchId ?? parsed.data.churchSlug;
      const ctx = await resolveAccessContext(parsed.data.sessionId, churchKey);
      res.json({ access: ctx });
    } catch (err) {
      console.error("[church] resolve access error:", err);
      res.status(500).json({ message: "Failed to resolve access context" });
    }
  });

  // ── Pastor magic-link auth ────────────────────────────────────────────────

  const requestLinkSchema = z.object({
    email: z.string().email(),
    churchSlug: z.string().min(2).max(64),
  });

  app.post("/api/church-admin/auth/request-link", async (req, res) => {
    const parsed = requestLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Valid email and church slug required." });
    }

    const { email, churchSlug } = parsed.data;

    const churchResult = await pool.query(
      `SELECT id, name FROM churches WHERE slug = $1 AND status = 'active'`,
      [churchSlug],
    );

    if (churchResult.rows.length === 0) {
      // Return 200 regardless to avoid church enumeration
      return res.json({ ok: true });
    }

    const church = churchResult.rows[0];

    const memberResult = await pool.query(
      `SELECT role FROM church_memberships
       WHERE church_id = $1 AND email = $2 AND status = 'active'
         AND role IN ('admin', 'owner', 'leader')`,
      [church.id, email.toLowerCase().trim()],
    );

    if (memberResult.rows.length === 0) {
      return res.json({ ok: true });
    }

    const baseUrl = process.env.CHURCH_PORTAL_URL || `https://admin.shepherdspathai.com`;
    const magicUrl = await createMagicLink(email, church.id, baseUrl);
    let devMagicUrl: string | undefined;

    if (process.env.RESEND_API_KEY) {
      try {
        await sendMagicLinkEmail(email, magicUrl, church.name);
      } catch (err) {
        console.error("[church-auth] failed to send magic link:", err);
        if (process.env.NODE_ENV !== "production") devMagicUrl = magicUrl;
      }
    } else if (process.env.NODE_ENV !== "production") {
      console.log(`[church-auth] RESEND not configured — dev sign-in link for ${email}: ${magicUrl}`);
      devMagicUrl = magicUrl;
    } else {
      console.error("[church-auth] RESEND_API_KEY not set — magic link not emailed");
    }

    return res.json({ ok: true, ...(devMagicUrl ? { devMagicUrl } : {}) });
  });

  app.get("/api/church-admin/auth/verify", async (req, res) => {
    const token = String(req.query.token ?? "").trim();
    if (!token) return res.status(400).json({ message: "Token required." });

    const verified = await verifyMagicToken(token);
    if (!verified) {
      return res.status(401).json({ message: "Link expired or already used. Please request a new one." });
    }

    const memberResult = await pool.query(
      `SELECT role FROM church_memberships
       WHERE church_id = $1 AND email = $2 AND status = 'active'`,
      [verified.churchId, verified.email],
    );

    const role = memberResult.rows[0]?.role ?? "admin";

    setAdminSessionCookie(res, {
      email: verified.email,
      churchId: verified.churchId,
      role,
    });

    return res.json({ ok: true, email: verified.email, churchId: verified.churchId });
  });

  app.post("/api/church-admin/auth/logout", (req, res) => {
    clearAdminSessionCookie(res);
    return res.json({ ok: true });
  });

  app.get("/api/church-admin/auth/me", requireChurchAdmin, (req, res) => {
    return res.json({ session: (req as any).churchAdminSession });
  });

  // ── Demo auth — no magic link required ───────────────────────────────────
  // Issues a read-only session scoped to Grace Community demo church.
  // The session carries isDemo=true so the portal can show a banner
  // and block write operations.
  app.get("/api/church-admin/auth/demo", async (req, res) => {
    try {
      const church = await pool.query(
        `SELECT id FROM churches WHERE slug = 'grace-community-demo' AND status = 'active'`,
      );
      if (church.rows.length === 0) {
        return res.status(503).json({ message: "Demo church not configured." });
      }
      const churchId = church.rows[0].id;
      const payload = Buffer.from(
        JSON.stringify({
          email: "demo@shepherdspathai.com",
          churchId,
          role: "admin",
          isDemo: true,
        }),
      ).toString("base64");
      res.cookie("sp_church_admin", payload, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
      });
      return res.json({ ok: true, churchId });
    } catch (err) {
      console.error("[church-auth] demo session error:", err);
      return res.status(500).json({ message: "Failed to create demo session." });
    }
  });

  // ── Sub-module routes ─────────────────────────────────────────────────────

  registerPrayerInboxRoutes(app);
  registerAnnouncementRoutes(app);
  registerVisitorRoutes(app);
  registerDashboardRoutes(app);
  registerChurchProfileRoutes(app);
  registerMemberRoutes(app);
  registerChurchSettingsRoutes(app);
  registerBriefingRoutes(app);
  registerCareRequestRoutes(app);

  // Clean expired magic link tokens on startup
  cleanExpiredTokens().catch((err) =>
    console.error("[church-auth] token cleanup error:", err),
  );

  // Start Sunday night briefing scheduler
  startBriefingScheduler();
}
