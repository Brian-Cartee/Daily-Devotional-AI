import crypto from "crypto";
import { db } from "../db";
import {
  churches,
  churchMemberships,
  type ChurchPlan,
  type ChurchRole,
  type ChurchMembershipStatus,
  type ChurchPublicSettings,
} from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import type { ChurchMembershipView, ChurchView } from "./types";

function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "church";
}

function randomInviteCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

function toChurchView(row: typeof churches.$inferSelect): ChurchView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: row.logoUrl,
    primaryColor: row.primaryColor,
    plan: row.plan as ChurchPlan,
    status: row.status,
    inviteCode: row.inviteCode,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMembershipView(row: typeof churchMemberships.$inferSelect): ChurchMembershipView {
  return {
    id: row.id,
    churchId: row.churchId,
    sessionId: row.sessionId,
    email: row.email,
    role: row.role as ChurchRole,
    status: row.status as ChurchMembershipStatus,
    joinedAt: row.joinedAt,
    updatedAt: row.updatedAt,
  };
}

export const churchStorage = {
  async listChurches(): Promise<ChurchView[]> {
    const rows = await db.select().from(churches).orderBy(asc(churches.name));
    return rows.map(toChurchView);
  },

  async getChurchById(id: string): Promise<ChurchView | null> {
    const [row] = await db.select().from(churches).where(eq(churches.id, id)).limit(1);
    return row ? toChurchView(row) : null;
  },

  async getChurchBySlug(slug: string): Promise<ChurchView | null> {
    const [row] = await db.select().from(churches).where(eq(churches.slug, slug)).limit(1);
    return row ? toChurchView(row) : null;
  },

  async getChurchByInviteCode(code: string): Promise<ChurchView | null> {
    const [row] = await db.select().from(churches).where(eq(churches.inviteCode, code)).limit(1);
    return row ? toChurchView(row) : null;
  },

  async createChurch(input: {
    name: string;
    slug?: string;
    plan?: ChurchPlan;
    inviteCode?: string;
    settings?: ChurchPublicSettings;
  }): Promise<ChurchView> {
    const id = crypto.randomUUID();
    let slug = input.slug?.trim() || slugifyName(input.name);
    let inviteCode = input.inviteCode?.trim() || randomInviteCode();

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const [row] = await db
          .insert(churches)
          .values({
            id,
            name: input.name.trim(),
            slug,
            plan: input.plan ?? "none",
            inviteCode,
            settings: input.settings ?? {},
          })
          .returning();
        return toChurchView(row);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === "23505" && attempt < 4) {
          slug = `${slugifyName(input.name)}-${crypto.randomBytes(2).toString("hex")}`;
          inviteCode = randomInviteCode();
          continue;
        }
        throw err;
      }
    }
    throw new Error("Failed to create church");
  },

  async updateChurchPlan(churchId: string, plan: ChurchPlan): Promise<ChurchView | null> {
    const [row] = await db
      .update(churches)
      .set({ plan, updatedAt: new Date() })
      .where(eq(churches.id, churchId))
      .returning();
    return row ? toChurchView(row) : null;
  },

  async listMemberships(churchId: string): Promise<ChurchMembershipView[]> {
    const rows = await db
      .select()
      .from(churchMemberships)
      .where(eq(churchMemberships.churchId, churchId))
      .orderBy(desc(churchMemberships.joinedAt));
    return rows.map(toMembershipView);
  },

  async getMembership(churchId: string, sessionId: string): Promise<ChurchMembershipView | null> {
    const [row] = await db
      .select()
      .from(churchMemberships)
      .where(
        and(eq(churchMemberships.churchId, churchId), eq(churchMemberships.sessionId, sessionId)),
      )
      .limit(1);
    return row ? toMembershipView(row) : null;
  },

  async listMembershipsForSession(sessionId: string): Promise<ChurchMembershipView[]> {
    const rows = await db
      .select()
      .from(churchMemberships)
      .where(
        and(eq(churchMemberships.sessionId, sessionId), eq(churchMemberships.status, "active")),
      )
      .orderBy(desc(churchMemberships.joinedAt));
    return rows.map(toMembershipView);
  },

  async upsertMembership(input: {
    churchId: string;
    sessionId: string;
    role: ChurchRole;
    email?: string | null;
    status?: ChurchMembershipStatus;
  }): Promise<ChurchMembershipView> {
    const existing = await this.getMembership(input.churchId, input.sessionId);
    if (existing) {
      const [row] = await db
        .update(churchMemberships)
        .set({
          role: input.role,
          email: input.email ?? existing.email,
          status: input.status ?? existing.status,
          updatedAt: new Date(),
        })
        .where(eq(churchMemberships.id, existing.id))
        .returning();
      return toMembershipView(row);
    }

    const [row] = await db
      .insert(churchMemberships)
      .values({
        churchId: input.churchId,
        sessionId: input.sessionId,
        role: input.role,
        email: input.email ?? null,
        status: input.status ?? "active",
      })
      .returning();
    return toMembershipView(row);
  },
};
