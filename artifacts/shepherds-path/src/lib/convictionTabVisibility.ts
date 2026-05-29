import { isSacredPresenceRoute } from "@/lib/presenceMode";

const HIDE_CONVICTION_PREFIXES = [
  "/shepherd-admin",
  "/present",
  "/demo",
  "/display",
  "/screenshot-gen",
  "/pro-success",
  "/threshold",
];

/** Left-edge conviction tab — calm pages only; hidden on sacred focus routes. */
export function shouldShowConvictionTab(path: string): boolean {
  if (isSacredPresenceRoute(path)) return false;
  return !HIDE_CONVICTION_PREFIXES.some((p) => path.startsWith(p));
}
