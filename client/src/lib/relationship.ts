const KEY = "sp_first_use";

export function getRelationshipAge(): number {
  let firstUse = localStorage.getItem(KEY);
  if (!firstUse) {
    firstUse = new Date().toISOString().split("T")[0];
    localStorage.setItem(KEY, firstUse);
  }
  const start = new Date(firstUse);
  const now = new Date();
  const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}
