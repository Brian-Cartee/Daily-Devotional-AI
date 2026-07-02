/**
 * Church membership management for admin portal.
 */
import type { Express } from "express";
import { z } from "zod";
import { CHURCH_ROLES, CHURCH_MEMBERSHIP_STATUSES } from "@workspace/db";
import { requireChurchAdmin } from "./auth";
import { churchStorage } from "./storage";
import { getAdminSession, churchIdOr400, requireMinRole } from "./adminHelpers";

const memberUpsertSchema = z.object({
  sessionId: z.string().min(1).max(128),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(CHURCH_ROLES),
  status: z.enum(CHURCH_MEMBERSHIP_STATUSES).optional(),
});

const memberPatchSchema = z
  .object({
    role: z.enum(CHURCH_ROLES).optional(),
    status: z.enum(CHURCH_MEMBERSHIP_STATUSES).optional(),
  })
  .refine((data) => data.role !== undefined || data.status !== undefined, {
    message: "role or status required",
  });

function toMemberJson(m: Awaited<ReturnType<typeof churchStorage.listMemberships>>[number]) {
  return {
    id: m.id,
    churchId: m.churchId,
    sessionId: m.sessionId,
    email: m.email,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function registerMemberRoutes(app: Express): void {
  app.get("/api/church-admin/members", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "leader")) return;

    const memberships = await churchStorage.listMemberships(churchId);
    return res.json({ members: memberships.map(toMemberJson) });
  });

  app.post("/api/church-admin/members", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const parsed = memberUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    const { sessionId, email, role, status } = parsed.data;
    const membership = await churchStorage.upsertMembership({
      churchId,
      sessionId: sessionId.trim(),
      role,
      email: email?.trim() || null,
      status,
    });

    return res.status(201).json({ member: toMemberJson(membership) });
  });

  app.patch("/api/church-admin/members/:id", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const parsed = memberPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid member id." });
    }

    const membership = await churchStorage.updateMembershipById(id, churchId, parsed.data);
    if (!membership) return res.status(404).json({ message: "Member not found." });
    return res.json({ member: toMemberJson(membership) });
  });
}
