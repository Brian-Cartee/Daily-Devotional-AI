// ── Night Mode Detection ───────────────────────────────────────────────────────
// "Reaching people in crisis at 3am" — the founding mission.
// When someone opens this app between 10 PM and 5 AM *local time*, we know
// something brought them here at this hour. We respond differently.
// Uses the user's device time — not Eastern — so a 10pm Pacific user
// gets the same late-night care as a 10pm Eastern user.

import { getEasternTimeLabel } from "@/lib/timeOfDay";

/** Returns the user's local hour (0–23) */
function getLocalHour(): number {
  return new Date().getHours();
}

/** 10pm–5am local device time — crisis-hour UX */
export function isLateNight(): boolean {
  const hour = getLocalHour();
  return hour >= 22 || hour < 5;
}

export function getNightTimeLabel(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// A gentle, quiet opening for the late-night context —
// used in the home screen banner and check-in prompts.
export function getNightGreeting(name: string | null): string {
  const hour = getLocalHour();
  if (name) {
    if (hour >= 0 && hour < 2) return `${name}, we're here.`;
    if (hour >= 2 && hour < 5) return `We see you, ${name}.`;
    return `${name}, we're still here.`;
  }
  if (hour >= 0 && hour < 2) return "We're here.";
  if (hour >= 2 && hour < 5) return "We see you.";
  return "Still here.";
}
