import type { Express, Request, Response } from "express";
import { z } from "zod";
import { CHURCH_PLANS, CHURCH_ROLES } from "@workspace/db";
import { adminAuth } from "../adminAuth";
import { churchStorage } from "./storage";
import { resolveAccessContext } from "./resolveAccessContext";

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

function requireAdmin(req: Request, res: Response): boolean {
  return adminAuth(req, res);
}

export function registerChurchRoutes(app: Express): void {
  // ── Shepherd-admin: church bootstrap (no public/member UI in PR1) ─────────

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
}
