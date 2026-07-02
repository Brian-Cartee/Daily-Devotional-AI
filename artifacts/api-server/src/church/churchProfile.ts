/**
 * Church profile and invite link for admin portal.
 */
import type { Express } from "express";
import { z } from "zod";
import { requireChurchAdmin } from "./auth";
import { churchStorage } from "./storage";
import { getAdminSession, churchIdOr400, requireMinRole, appBaseUrl } from "./adminHelpers";

const churchPatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  primaryColor: z.string().max(32).nullable().optional(),
  settings: z
    .object({
      serviceTimes: z.string().max(2000).optional(),
      website: z.string().max(500).optional(),
      welcomeMessage: z.string().max(2000).optional(),
    })
    .optional(),
});

function toProfileResponse(church: NonNullable<Awaited<ReturnType<typeof churchStorage.getChurchById>>>) {
  const settings = church.settings ?? {};
  return {
    id: church.id,
    name: church.name,
    slug: church.slug,
    plan: church.plan,
    logoUrl: church.logoUrl,
    primaryColor: church.primaryColor,
    settings: {
      serviceTimes: (settings.serviceTimes as string | undefined) ?? "",
      website: (settings.website as string | undefined) ?? "",
      welcomeMessage: (settings.welcomeMessage as string | undefined) ?? "",
    },
  };
}

export function registerChurchProfileRoutes(app: Express): void {
  app.get("/api/church-admin/church", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "leader")) return;

    const church = await churchStorage.getChurchById(churchId);
    if (!church) return res.status(404).json({ message: "Church not found." });
    return res.json({ church: toProfileResponse(church) });
  });

  app.patch("/api/church-admin/church", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const parsed = churchPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    const { name, logoUrl, primaryColor, settings } = parsed.data;
    const church = await churchStorage.updateChurch(churchId, {
      ...(name !== undefined ? { name } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(primaryColor !== undefined ? { primaryColor } : {}),
      ...(settings !== undefined ? { settings } : {}),
    });

    if (!church) return res.status(404).json({ message: "Church not found." });
    return res.json({ church: toProfileResponse(church) });
  });

  app.get("/api/church-admin/invite", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const church = await churchStorage.getChurchById(churchId);
    if (!church) return res.status(404).json({ message: "Church not found." });

    const base = appBaseUrl();
    return res.json({
      inviteCode: church.inviteCode,
      joinUrl: `${base}/c/${church.slug}`,
      slug: church.slug,
    });
  });
}
