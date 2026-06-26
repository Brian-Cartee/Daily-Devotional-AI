import type { ChurchPublicSettings, ChurchPlan } from "@workspace/db";
import type { ChurchView } from "./types";

/** Public church profile — never exposes invite codes or internal admin fields. */
export interface ChurchPublicProfile {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  plan: ChurchPlan;
  settings: ChurchPublicSettings;
}

export interface ChurchInvitePreview {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

export interface ChurchMembershipSummary {
  membership: {
    id: number;
    role: string;
    status: string;
    joinedAt: string;
  };
  church: ChurchPublicProfile;
}

export function toPublicChurchProfile(church: ChurchView): ChurchPublicProfile {
  return {
    id: church.id,
    slug: church.slug,
    name: church.name,
    logoUrl: church.logoUrl,
    primaryColor: church.primaryColor,
    plan: church.plan,
    settings: (church.settings ?? {}) as ChurchPublicSettings,
  };
}

export function toChurchInvitePreview(church: ChurchView): ChurchInvitePreview {
  return {
    id: church.id,
    slug: church.slug,
    name: church.name,
    logoUrl: church.logoUrl,
    primaryColor: church.primaryColor,
  };
}

export function isChurchJoinable(status: string): boolean {
  return status === "active";
}
