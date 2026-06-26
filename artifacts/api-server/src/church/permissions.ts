import type { ChurchPlan, ChurchRole } from "@workspace/db";
import type { ChurchAction, ChurchFeature } from "./types";

const ROLE_RANK: Record<ChurchRole, number> = {
  member: 1,
  leader: 2,
  admin: 3,
  owner: 4,
};

const ACTION_MIN_ROLE: Record<ChurchAction, ChurchRole> = {
  view_church_home: "member",
  post_church_prayer: "member",
  edit_church_profile: "admin",
  manage_members: "admin",
  manage_invite: "admin",
  manage_resources: "admin",
  moderate_prayer: "admin",
  view_analytics: "admin",
  manage_billing: "owner",
  manage_api: "owner",
};

const FEATURE_MIN_PLAN: Record<ChurchFeature, ChurchPlan> = {
  profile: "basic",
  invite_join: "basic",
  pastor_video: "basic",
  church_prayer_wall: "basic",
  resource_links: "basic",
  sermon_followup: "plus",
  small_group_links: "plus",
  church_devotional_paths: "plus",
  prayer_moderation: "plus",
  simple_analytics: "plus",
  embeds: "partner",
  api_access: "partner",
  multi_campus: "partner",
};

const PLAN_RANK: Record<ChurchPlan, number> = {
  none: 0,
  basic: 1,
  plus: 2,
  partner: 3,
};

export function roleAtLeast(role: ChurchRole, minimum: ChurchRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function planAtLeast(plan: ChurchPlan, minimum: ChurchPlan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minimum];
}

export function canPerformChurchAction(
  role: ChurchRole | null | undefined,
  action: ChurchAction,
  membershipStatus: string | null | undefined = "active",
): boolean {
  if (!role || membershipStatus !== "active") return false;
  return roleAtLeast(role, ACTION_MIN_ROLE[action]);
}

export function canAccessChurchFeature(
  plan: ChurchPlan | null | undefined,
  feature: ChurchFeature,
): boolean {
  if (!plan) return false;
  return planAtLeast(plan, FEATURE_MIN_PLAN[feature]);
}

export class ChurchAccessDeniedError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code = "church_access_denied", status = 403) {
    super(message);
    this.name = "ChurchAccessDeniedError";
    this.code = code;
    this.status = status;
  }
}

export function assertChurchAction(
  role: ChurchRole | null | undefined,
  action: ChurchAction,
  membershipStatus?: string | null,
): void {
  if (!canPerformChurchAction(role, action, membershipStatus)) {
    throw new ChurchAccessDeniedError(`Church role cannot perform: ${action}`);
  }
}

export function assertChurchFeature(plan: ChurchPlan | null | undefined, feature: ChurchFeature): void {
  if (!canAccessChurchFeature(plan, feature)) {
    throw new ChurchAccessDeniedError(`Church plan does not include: ${feature}`, "church_plan_required");
  }
}

/** Permission matrix for docs / tests. */
export const CHURCH_PERMISSION_MATRIX = {
  roles: ACTION_MIN_ROLE,
  features: FEATURE_MIN_PLAN,
  roleRank: ROLE_RANK,
  planRank: PLAN_RANK,
} as const;
