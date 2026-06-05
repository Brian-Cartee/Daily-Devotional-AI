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

export function buildHomeExplorePreviewHrefs(
  exclude: ReadonlySet<string>,
  count = HOME_EXPLORE_PREVIEW_COUNT,
): string[] {
  const picked: string[] = [];
  for (const href of HOME_EXPLORE_PREVIEW_POOL) {
    if (exclude.has(href)) continue;
    picked.push(href);
    if (picked.length >= count) break;
  }
  return picked;
}
