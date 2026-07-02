/**
 * Church settings stored in churches.settings jsonb:
 * resourceLinks, prayerWall, smallGroups, sermonFollowup
 */
import type { Express } from "express";
import { z } from "zod";
import crypto from "crypto";
import { requireChurchAdmin } from "./auth";
import { churchStorage } from "./storage";
import { getAdminSession, churchIdOr400, requireMinRole } from "./adminHelpers";

const resourceLinkSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  url: z.string().min(1).max(500),
  sortOrder: z.number().int().min(0).max(9999),
});

const resourcesPatchSchema = z.object({
  resourceLinks: z.array(resourceLinkSchema),
});

const prayerWallSchema = z.object({
  allowAnonymous: z.boolean(),
  moderationEnabled: z.boolean(),
  categories: z.array(z.string().min(1).max(64)).max(20),
});

const smallGroupSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  leader: z.string().max(120).optional().default(""),
  meetingTime: z.string().max(200).optional().default(""),
  contact: z.string().max(200).optional().default(""),
});

const smallGroupCreateSchema = smallGroupSchema.omit({ id: true }).extend({
  name: z.string().min(1).max(120),
});

const sermonFollowupSchema = z.object({
  title: z.string().max(200).optional().default(""),
  verse: z.string().max(200).optional().default(""),
  body: z.string().max(5000).optional().default(""),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(""),
});

async function loadSettings(churchId: string) {
  const church = await churchStorage.getChurchById(churchId);
  if (!church) return null;
  return { church, settings: church.settings ?? {} };
}

export function registerChurchSettingsRoutes(app: Express): void {
  // ── Resource links ────────────────────────────────────────────────────────

  app.get("/api/church-admin/resources", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "leader")) return;

    const loaded = await loadSettings(churchId);
    if (!loaded) return res.status(404).json({ message: "Church not found." });

    const links = (loaded.settings.resourceLinks as z.infer<typeof resourceLinkSchema>[]) ?? [];
    return res.json({ resourceLinks: links });
  });

  app.patch("/api/church-admin/resources", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const parsed = resourcesPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    const church = await churchStorage.updateChurch(churchId, {
      settings: { resourceLinks: parsed.data.resourceLinks },
    });
    if (!church) return res.status(404).json({ message: "Church not found." });
    return res.json({
      resourceLinks: (church.settings.resourceLinks as z.infer<typeof resourceLinkSchema>[]) ?? [],
    });
  });

  // ── Prayer wall settings ──────────────────────────────────────────────────

  app.get("/api/church-admin/prayer-settings", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "leader")) return;

    const loaded = await loadSettings(churchId);
    if (!loaded) return res.status(404).json({ message: "Church not found." });

    const wall = (loaded.settings.prayerWall as z.infer<typeof prayerWallSchema>) ?? {
      allowAnonymous: true,
      moderationEnabled: false,
      categories: ["general", "health", "family", "guidance"],
    };
    return res.json({ prayerWall: wall });
  });

  app.patch("/api/church-admin/prayer-settings", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const parsed = prayerWallSchema.safeParse(req.body.prayerWall ?? req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    const church = await churchStorage.updateChurch(churchId, {
      settings: { prayerWall: parsed.data },
    });
    if (!church) return res.status(404).json({ message: "Church not found." });
    return res.json({ prayerWall: church.settings.prayerWall });
  });

  // ── Small groups ──────────────────────────────────────────────────────────

  app.get("/api/church-admin/small-groups", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "leader")) return;

    const loaded = await loadSettings(churchId);
    if (!loaded) return res.status(404).json({ message: "Church not found." });

    const groups = (loaded.settings.smallGroups as z.infer<typeof smallGroupSchema>[]) ?? [];
    return res.json({ smallGroups: groups });
  });

  app.post("/api/church-admin/small-groups", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const parsed = smallGroupCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    const loaded = await loadSettings(churchId);
    if (!loaded) return res.status(404).json({ message: "Church not found." });

    const groups = (loaded.settings.smallGroups as z.infer<typeof smallGroupSchema>[]) ?? [];
    const newGroup = { id: crypto.randomUUID(), ...parsed.data };
    const church = await churchStorage.updateChurch(churchId, {
      settings: { smallGroups: [...groups, newGroup] },
    });
    if (!church) return res.status(404).json({ message: "Church not found." });
    return res.status(201).json({
      group: newGroup,
      smallGroups: (church.settings.smallGroups as z.infer<typeof smallGroupSchema>[]) ?? [],
    });
  });

  app.patch("/api/church-admin/small-groups/:id", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const groupId = String(req.params.id ?? "").trim();
    const patchParsed = smallGroupSchema.partial().omit({ id: true }).safeParse(req.body);
    if (!patchParsed.success) {
      return res.status(400).json({
        message: patchParsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    const loaded = await loadSettings(churchId);
    if (!loaded) return res.status(404).json({ message: "Church not found." });

    const groups = (loaded.settings.smallGroups as z.infer<typeof smallGroupSchema>[]) ?? [];
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) return res.status(404).json({ message: "Small group not found." });

    groups[idx] = { ...groups[idx], ...patchParsed.data };
    const church = await churchStorage.updateChurch(churchId, {
      settings: { smallGroups: groups },
    });
    if (!church) return res.status(404).json({ message: "Church not found." });
    return res.json({
      group: groups[idx],
      smallGroups: (church.settings.smallGroups as z.infer<typeof smallGroupSchema>[]) ?? [],
    });
  });

  app.delete("/api/church-admin/small-groups/:id", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const groupId = String(req.params.id ?? "").trim();
    const loaded = await loadSettings(churchId);
    if (!loaded) return res.status(404).json({ message: "Church not found." });

    const groups = (loaded.settings.smallGroups as z.infer<typeof smallGroupSchema>[]) ?? [];
    const next = groups.filter((g) => g.id !== groupId);
    if (next.length === groups.length) {
      return res.status(404).json({ message: "Small group not found." });
    }

    const church = await churchStorage.updateChurch(churchId, {
      settings: { smallGroups: next },
    });
    if (!church) return res.status(404).json({ message: "Church not found." });
    return res.json({
      smallGroups: (church.settings.smallGroups as z.infer<typeof smallGroupSchema>[]) ?? [],
    });
  });

  // ── Sermon follow-up ──────────────────────────────────────────────────────

  app.get("/api/church-admin/sermon-followup", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "leader")) return;

    const loaded = await loadSettings(churchId);
    if (!loaded) return res.status(404).json({ message: "Church not found." });

    const followup = (loaded.settings.sermonFollowup as z.infer<typeof sermonFollowupSchema>) ?? {
      title: "",
      verse: "",
      body: "",
      weekStart: "",
    };
    return res.json({ sermonFollowup: followup });
  });

  app.patch("/api/church-admin/sermon-followup", requireChurchAdmin, async (req, res) => {
    const session = getAdminSession(req);
    const churchId = churchIdOr400(session, res);
    if (!churchId) return;
    if (!requireMinRole(session, res, "admin")) return;

    const parsed = sermonFollowupSchema.safeParse(req.body.sermonFollowup ?? req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    const church = await churchStorage.updateChurch(churchId, {
      settings: { sermonFollowup: parsed.data },
    });
    if (!church) return res.status(404).json({ message: "Church not found." });
    return res.json({ sermonFollowup: church.settings.sermonFollowup });
  });
}
