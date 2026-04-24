// ── Night Mode Detection ───────────────────────────────────────────────────────
// "Reaching people in crisis at 3am" — the founding mission.
// When someone opens this app between 11 PM and 5 AM, we know something
// brought them here at this hour. We respond differently.

export function isLateNight(): boolean {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 5;
}

export function getNightTimeLabel(): string {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes().toString().padStart(2, "0");
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${displayHour}:${minute} ${ampm}`;
}

// A gentle, quiet opening for the late-night context —
// used in the home screen banner and check-in prompts.
export function getNightGreeting(name: string | null): string {
  const hour = new Date().getHours();
  if (name) {
    if (hour >= 0 && hour < 2) return `${name}, we're here.`;
    if (hour >= 2 && hour < 5) return `We see you, ${name}.`;
    return `${name}, we're still here.`;
  }
  if (hour >= 0 && hour < 2) return "We're here.";
  if (hour >= 2 && hour < 5) return "We see you.";
  return "Still here.";
}
