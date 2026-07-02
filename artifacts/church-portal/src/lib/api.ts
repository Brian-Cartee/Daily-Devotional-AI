const BASE = "/api";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

export const api = {
  auth: {
    me: () => req<{ session: { email: string; churchId: string; role: string; isDemo?: boolean } }>("/church-admin/auth/me"),
    enterDemo: () => req<{ ok: boolean; churchId: string }>("/church-admin/auth/demo"),
    requestLink: (email: string, churchSlug: string) =>
      req<{ ok: boolean; devMagicUrl?: string }>("/church-admin/auth/request-link", {
        method: "POST",
        body: JSON.stringify({ email, churchSlug }),
      }),
    verify: (token: string) =>
      req<{ ok: boolean; email: string; churchId: string }>(`/church-admin/auth/verify?token=${encodeURIComponent(token)}`),
    logout: () => req("/church-admin/auth/logout", { method: "POST" }),
  },
  dashboard: {
    get: () => req<DashboardResponse>("/church-admin/dashboard"),
  },
  church: {
    get: () => req<{ church: ChurchProfile }>("/church-admin/church"),
    update: (data: Partial<ChurchProfilePatch>) =>
      req<{ church: ChurchProfile }>("/church-admin/church", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  invite: {
    get: () => req<{ inviteCode: string; joinUrl: string; slug: string }>("/church-admin/invite"),
  },
  members: {
    list: () => req<{ members: Member[] }>("/church-admin/members"),
    create: (data: { sessionId: string; email?: string; role: string; status?: string }) =>
      req<{ member: Member }>("/church-admin/members", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { role?: string; status?: string }) =>
      req<{ member: Member }>(`/church-admin/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  resources: {
    get: () => req<{ resourceLinks: ResourceLink[] }>("/church-admin/resources"),
    update: (resourceLinks: ResourceLink[]) =>
      req<{ resourceLinks: ResourceLink[] }>("/church-admin/resources", {
        method: "PATCH",
        body: JSON.stringify({ resourceLinks }),
      }),
  },
  prayerSettings: {
    get: () => req<{ prayerWall: PrayerWallSettings }>("/church-admin/prayer-settings"),
    update: (prayerWall: PrayerWallSettings) =>
      req<{ prayerWall: PrayerWallSettings }>("/church-admin/prayer-settings", {
        method: "PATCH",
        body: JSON.stringify({ prayerWall }),
      }),
  },
  smallGroups: {
    list: () => req<{ smallGroups: SmallGroup[] }>("/church-admin/small-groups"),
    create: (data: Omit<SmallGroup, "id">) =>
      req<{ group: SmallGroup; smallGroups: SmallGroup[] }>("/church-admin/small-groups", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<SmallGroup, "id">>) =>
      req<{ group: SmallGroup; smallGroups: SmallGroup[] }>(`/church-admin/small-groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      req<{ smallGroups: SmallGroup[] }>(`/church-admin/small-groups/${id}`, { method: "DELETE" }),
  },
  sermonFollowup: {
    get: () => req<{ sermonFollowup: SermonFollowup }>("/church-admin/sermon-followup"),
    update: (sermonFollowup: SermonFollowup) =>
      req<{ sermonFollowup: SermonFollowup }>("/church-admin/sermon-followup", {
        method: "PATCH",
        body: JSON.stringify({ sermonFollowup }),
      }),
  },
  analytics: {
    get: () => req<AnalyticsResponse>("/church-admin/analytics"),
  },
  prayer: {
    list: (status = "active") => req<{ requests: PrayerRequest[] }>(`/church-admin/prayer-inbox?status=${status}`),
    updateStatus: (id: number, status: string, answeredText?: string) =>
      req(`/church-admin/prayer-inbox/${id}`, { method: "PATCH", body: JSON.stringify({ status, answeredText }) }),
    draft: (id: number) => req<{ draft: string }>(`/church-admin/prayer-inbox/${id}/draft`, { method: "POST" }),
  },
  announcements: {
    list: () => req<{ announcements: Announcement[] }>("/church-admin/announcements"),
    create: (data: { title: string; body: string; pinned?: boolean }) =>
      req("/church-admin/announcements", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ title: string; body: string; pinned: boolean }>) =>
      req(`/church-admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      req(`/church-admin/announcements/${id}`, { method: "DELETE" }),
  },
  visitors: {
    list: () => req<{ visitors: Visitor[] }>("/church-admin/visitors"),
    create: (data: {
      firstName: string;
      lastName?: string;
      email?: string;
      phone?: string;
      visitDate?: string;
      notes?: string;
      source?: string;
    }) => req<{ visitor: Visitor }>("/church-admin/visitors", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: {
      followUpStatus?: VisitorFollowUpStatus;
      assignedTo?: string | null;
      nextFollowupDate?: string | null;
    }) =>
      req<{ visitor: Visitor }>(`/church-admin/visitors/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: number, followUpStatus: VisitorFollowUpStatus) =>
      req<{ visitor: Visitor }>(`/church-admin/visitors/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ followUpStatus }),
      }),
    logContact: (id: number, data: { contactType: string; notes?: string }) =>
      req<{ ok: boolean }>(`/church-admin/visitors/${id}/contacts`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  careRequests: {
    list: () => req<{ careRequests: CareRequest[] }>("/church-admin/care-requests"),
    create: (data: {
      personName: string;
      requestType: string;
      description: string;
      assignedTo?: string;
      dueDate?: string;
    }) =>
      req<{ careRequest: CareRequest }>("/church-admin/care-requests", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: number, status: string) =>
      req<{ careRequest: CareRequest }>(`/church-admin/care-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },
};

export interface ChurchSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  primaryColor: string | null;
  logoUrl: string | null;
}

export interface DashboardStats {
  activePrayerCount: number;
  memberCount: number;
  publishedAnnouncementCount: number;
  visitorsThisMonth: number;
}

export interface OverdueVisitorAlert {
  id: number;
  first_name: string;
  last_name: string | null;
  visit_date: string;
  days_since: number;
}

export interface UrgentPrayerAlert {
  id: number;
  display_name: string | null;
  is_anonymous: boolean;
  request: string;
  urgency_reason: string | null;
  days_waiting: number;
}

export interface DashboardAlerts {
  overdueVisitors: OverdueVisitorAlert[];
  urgentPrayers: UrgentPrayerAlert[];
}

export interface DashboardResponse extends DashboardStats {
  church: ChurchSummary;
  alerts: DashboardAlerts;
}

export interface ChurchProfile {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logoUrl: string | null;
  primaryColor: string | null;
  settings: {
    serviceTimes: string;
    website: string;
    welcomeMessage: string;
  };
}

export interface ChurchProfilePatch {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  settings?: Partial<ChurchProfile["settings"]>;
}

export interface Member {
  id: number;
  churchId: string;
  sessionId: string;
  email: string | null;
  role: string;
  status: string;
  joinedAt: string;
  updatedAt: string;
}

export interface ResourceLink {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
}

export interface PrayerWallSettings {
  allowAnonymous: boolean;
  moderationEnabled: boolean;
  categories: string[];
}

export interface SmallGroup {
  id: string;
  name: string;
  leader: string;
  meetingTime: string;
  contact: string;
}

export interface SermonFollowup {
  title: string;
  verse: string;
  body: string;
  weekStart: string;
}

export interface AnalyticsResponse {
  periodDays: number;
  newMembers: number;
  prayerRequests: number;
  visitorsLogged: number;
  announcementsPublished: number;
}

export interface PrayerRequest {
  id: number;
  display_name: string | null;
  is_anonymous: boolean;
  request: string;
  category: string;
  status: string;
  answered_text: string | null;
  pray_count: number;
  created_at: string;
  urgency_flagged: boolean;
  urgency_reason: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  published_at: string | null;
  created_at: string;
}

export type VisitorFollowUpStatus = "pending" | "contacted" | "no-response" | "connected";

export interface Visitor {
  id: number;
  church_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  visit_date: string;
  source: string | null;
  notes: string | null;
  follow_up_status: VisitorFollowUpStatus;
  assigned_to: string | null;
  next_followup_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareRequest {
  id: number;
  person_name: string;
  request_type: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}
