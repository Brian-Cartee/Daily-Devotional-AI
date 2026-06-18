/** Ordered pool — first N not in `exclude` become the home preview grid (4 tiles). */
export const HOME_EXPLORE_PREVIEW_POOL: readonly string[] = [
  "/salvation",
  "/understand",
  "/read",
  "/reading-plans",
  "/journal",
  "/lament",
  "/calling",
  "/study",
  "/prayer-closet",
];

export const HOME_EXPLORE_PREVIEW_COUNT = 4;
export const HOME_EXPLORE_PINNED_KEY = "sp_home_pinned_paths";

export function getPinnedPaths(): string[] {
  try {
    const raw = localStorage.getItem(HOME_EXPLORE_PINNED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function setPinnedPaths(paths: string[]): void {
  try {
    localStorage.setItem(HOME_EXPLORE_PINNED_KEY, JSON.stringify(paths));
  } catch {}
}

export function togglePinnedPath(href: string): string[] {
  const current = getPinnedPaths();
  const next = current.includes(href)
    ? current.filter((h) => h !== href)
    : [...current, href].slice(0, HOME_EXPLORE_PREVIEW_COUNT);
  setPinnedPaths(next);
  return next;
}

export function buildHomeExplorePreviewHrefs(
  exclude: ReadonlySet<string>,
  count = HOME_EXPLORE_PREVIEW_COUNT,
): string[] {
  const pinned = getPinnedPaths().filter((h) => !exclude.has(h));
  const picked = [...pinned];
  for (const href of HOME_EXPLORE_PREVIEW_POOL) {
    if (picked.length >= count) break;
    if (exclude.has(href) || picked.includes(href)) continue;
    picked.push(href);
  }
  return picked.slice(0, count);
}
