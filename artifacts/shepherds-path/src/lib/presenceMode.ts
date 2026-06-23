export type PresenceMode = "normal" | "threshold" | "sigh" | "night" | "stillness";

export function isSacredPresenceRoute(pathname: string): boolean {
  return (
    pathname === "/threshold" ||
    pathname === "/sigh" ||
    pathname === "/night" ||
    pathname === "/lament" ||
    pathname === "/surrender" ||
    pathname === "/prayer-closet" ||
    pathname === "/guidance" ||
    pathname === "/start" ||
    pathname === "/welcome" ||
    pathname.startsWith("/v/")
  );
}

export function isPresenceMode(mode: PresenceMode): boolean {
  return mode !== "normal";
}
