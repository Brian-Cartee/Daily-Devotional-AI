import { apiUrl } from "@/lib/api";

export interface ChurchPublicProfile {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  plan: string;
  settings: Record<string, unknown>;
}

export interface MyChurchEntry {
  membership: {
    id: number;
    role: string;
    status: string;
    joinedAt: string;
  };
  church: ChurchPublicProfile;
}

export interface ChurchAnnouncement {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  published_at: string | null;
  created_at: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const message =
      typeof data?.message === "string" ? data.message : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchMyChurches(sessionId: string): Promise<MyChurchEntry[]> {
  const res = await fetch(
    apiUrl(`/api/churches/mine?sessionId=${encodeURIComponent(sessionId)}`),
    { credentials: "include" },
  );
  const data = await parseJson<{ churches: MyChurchEntry[] }>(res);
  return data.churches ?? [];
}

export async function joinChurch(
  sessionId: string,
  opts: { inviteCode?: string; slug?: string },
): Promise<MyChurchEntry> {
  const res = await fetch(apiUrl("/api/churches/join"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      sessionId,
      ...(opts.inviteCode?.trim() ? { inviteCode: opts.inviteCode.trim() } : {}),
      ...(opts.slug?.trim() ? { slug: opts.slug.trim().toLowerCase() } : {}),
    }),
  });
  const data = await parseJson<{
    membership: MyChurchEntry["membership"];
    church: ChurchPublicProfile;
  }>(res);
  return { membership: data.membership, church: data.church };
}

export async function leaveChurch(sessionId: string, churchId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/churches/${encodeURIComponent(churchId)}/leave`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sessionId }),
  });
  await parseJson(res);
}

export async function fetchAnnouncements(slug: string): Promise<ChurchAnnouncement[]> {
  const res = await fetch(
    apiUrl(`/api/churches/${encodeURIComponent(slug)}/announcements`),
    { credentials: "include" },
  );
  const data = await parseJson<{ announcements: ChurchAnnouncement[] }>(res);
  return data.announcements ?? [];
}

export async function submitChurchPrayer(input: {
  sessionId: string;
  churchId: string;
  request: string;
  category?: string;
  displayName?: string;
  isAnonymous?: boolean;
}): Promise<void> {
  const res = await fetch(apiUrl("/api/prayer-wall"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      sessionId: input.sessionId,
      churchId: input.churchId,
      request: input.request,
      category: input.category,
      displayName: input.displayName,
      isAnonymous: input.isAnonymous,
    }),
  });
  await parseJson(res);
}
