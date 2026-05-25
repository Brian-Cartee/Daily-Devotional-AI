import type { ShortcutIconVariant } from "@/components/ShortcutPathIcon";

/** Maps explore hrefs to home shortcut tile variants */
export const EXPLORE_PATH_VARIANT: Record<string, ShortcutIconVariant> = {
  "/salvation": "salvation",
  "/understand": "pathways",
  "/calling": "calling",
  "/journal": "journal",
  "/iron-circle": "community",
  "/prayer-wall": "prayer",
  "/reading-plans": "walk",
  "/study": "study",
  "/read": "deeper",
  "/stories": "media",
  "/prayer-portrait": "portrait",
  "/display": "display",
  "/prayer-closet": "closet",
};

export function explorePathVariant(href: string): ShortcutIconVariant {
  return EXPLORE_PATH_VARIANT[href] ?? "pathways";
}
