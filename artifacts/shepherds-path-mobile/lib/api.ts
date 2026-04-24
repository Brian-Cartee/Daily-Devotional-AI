const API_BASE = process.env.EXPO_PUBLIC_API_URL || "";

export async function fetchBible(): Promise<{ reference: string; text: string; verses?: any[] }> {
  const res = await fetch(`${API_BASE}/api/bible`);
  if (!res.ok) throw new Error("Failed to fetch bible verse");
  return res.json();
}

export async function fetchDailyArt(): Promise<{ imageUrl: string; reference: string; verse: string }> {
  const res = await fetch(`${API_BASE}/api/daily-art`);
  if (!res.ok) throw new Error("Failed to fetch daily art");
  return res.json();
}

export async function fetchStreak(sessionId: string): Promise<{ currentStreak: number; longestStreak: number }> {
  const res = await fetch(`${API_BASE}/api/streak?sessionId=${sessionId}`);
  if (!res.ok) return { currentStreak: 0, longestStreak: 0 };
  return res.json();
}

export async function recordStreak(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/streak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export async function fetchPrayerWall(sessionId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/prayer-wall?sessionId=${sessionId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function submitPrayer(request: string, sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/prayer-wall`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request, sessionId }),
  });
  if (!res.ok) throw new Error("Failed to submit prayer");
  return res.json();
}

export async function prayForEntry(id: number, sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/prayer-wall/${id}/pray`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error("Failed to pray for entry");
  return res.json();
}
