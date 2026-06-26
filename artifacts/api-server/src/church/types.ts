export type {
  Church,
  ChurchMembership,
  ChurchPlan,
  ChurchRole,
  ChurchMembershipStatus,
  ChurchStatus,
  ChurchPublicSettings,
  InsertChurch,
  InsertChurchMembership,
} from "@workspace/db";

export {
  CHURCH_PLANS,
  CHURCH_ROLES,
  CHURCH_MEMBERSHIP_STATUSES,
  CHURCH_STATUSES,
} from "@workspace/db";

import type { ChurchPlan, ChurchRole, ChurchMembershipStatus } from "@workspace/db";
import type { SubscriptionTier } from "../subscriptionTier";

/** Personal subscription tier — never used to gate church features. */
export type UserTier = SubscriptionTier;

export interface ChurchMembershipView {
  id: number;
  churchId: string;
  sessionId: string;
  email: string | null;
  role: ChurchRole;
  status: ChurchMembershipStatus;
  joinedAt: Date;
  updatedAt: Date;
}

export interface ChurchView {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  plan: ChurchPlan;
  status: string;
  inviteCode: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ChurchFeature =
  | "profile"
  | "invite_join"
  | "pastor_video"
  | "church_prayer_wall"
  | "resource_links"
  | "sermon_followup"
  | "small_group_links"
  | "church_devotional_paths"
  | "prayer_moderation"
  | "simple_analytics"
  | "embeds"
  | "api_access"
  | "multi_campus";

export type ChurchAction =
  | "view_church_home"
  | "post_church_prayer"
  | "edit_church_profile"
  | "manage_members"
  | "manage_invite"
  | "manage_resources"
  | "moderate_prayer"
  | "view_analytics"
  | "manage_billing"
  | "manage_api";

/** Resolved access for a session — church layer is orthogonal to userTier. */
export interface AccessContext {
  sessionId: string;
  userTier: UserTier;
  church?: {
    id: string;
    slug: string;
    plan: ChurchPlan;
    membership: ChurchMembershipView;
  };
}
