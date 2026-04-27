export interface SavedMoment {
  date: string;
  verse: string;
  reference: string;
  imageUrl: string | null;
  note?: string;
  savedAt: number;
}

const KEY = "sp_moments";

export function getMoments(): SavedMoment[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch { return []; }
}

export function saveMoment(moment: Omit<SavedMoment, "savedAt">): void {
  const moments = getMoments();
  const existing = moments.findIndex(m => m.date === moment.date);
  const entry = { ...moment, savedAt: Date.now() };
  if (existing >= 0) { moments[existing] = entry; } else { moments.unshift(entry); }
  localStorage.setItem(KEY, JSON.stringify(moments));
  window.dispatchEvent(new Event("sp-moments-change"));
}

export function removeMoment(date: string): void {
  localStorage.setItem(KEY, JSON.stringify(getMoments().filter(m => m.date !== date)));
  window.dispatchEvent(new Event("sp-moments-change"));
}

export function isMomentSaved(date: string): boolean {
  return getMoments().some(m => m.date === date);
}

export function updateMomentNote(date: string, note: string): void {
  const moments = getMoments();
  const idx = moments.findIndex(m => m.date === date);
  if (idx >= 0) { moments[idx].note = note; localStorage.setItem(KEY, JSON.stringify(moments)); }
}
