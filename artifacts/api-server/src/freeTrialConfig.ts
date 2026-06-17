export type FreeTrialFeature = "talk_it_through" | "listen" | "journeys";

const ROTATION: { feature: FreeTrialFeature; weeks: number; label: string }[] = [
  { feature: "talk_it_through", weeks: 2, label: "Unlimited Talk It Through" },
  { feature: "listen", weeks: 2, label: "Unlimited audio & listen" },
  { feature: "journeys", weeks: 2, label: "Full guided journeys" },
  { feature: "talk_it_through", weeks: 2, label: "Standard free limits" },
];

const ANCHOR = new Date("2026-01-06T00:00:00.000Z").getTime();
const WEEK_MS = 7 * 86_400_000;

function parseEnvFeature(raw: string | undefined): FreeTrialFeature | null {
  if (raw === "talk_it_through" || raw === "listen" || raw === "journeys") return raw;
  return null;
}

function rotationState(now = Date.now()) {
  const elapsedWeeks = Math.floor((now - ANCHOR) / WEEK_MS);
  let cursor = 0;
  for (const block of ROTATION) {
    const endWeek = cursor + block.weeks;
    if (elapsedWeeks < endWeek) {
      const blockStart = ANCHOR + cursor * WEEK_MS;
      const blockEnd = ANCHOR + endWeek * WEEK_MS;
      return { ...block, startsAt: new Date(blockStart), endsAt: new Date(blockEnd) };
    }
    cursor = endWeek;
  }
  const cycleWeeks = ROTATION.reduce((sum, b) => sum + b.weeks, 0);
  const cycleMs = cycleWeeks * WEEK_MS;
  const cycleOffset = ((now - ANCHOR) % cycleMs + cycleMs) % cycleMs;
  const elapsedInCycleWeeks = Math.floor(cycleOffset / WEEK_MS);
  let c = 0;
  for (const block of ROTATION) {
    if (elapsedInCycleWeeks < c + block.weeks) {
      const blockStart = now - (elapsedInCycleWeeks - c) * WEEK_MS;
      const blockEnd = blockStart + block.weeks * WEEK_MS;
      return { ...block, startsAt: new Date(blockStart), endsAt: new Date(blockEnd) };
    }
    c += block.weeks;
  }
  return { feature: "talk_it_through" as const, weeks: 2, label: "Unlimited Talk It Through", startsAt: new Date(now), endsAt: new Date(now + 2 * WEEK_MS) };
}

export function getFreeTrialConfig() {
  const envFeature = parseEnvFeature(process.env.FREE_TRIAL_FEATURE);
  const envEndsAt = process.env.FREE_TRIAL_ENDS_AT?.trim();

  if (envFeature && envEndsAt) {
    const endsAt = new Date(envEndsAt);
    const labels: Record<FreeTrialFeature, string> = {
      talk_it_through: "Unlimited Talk It Through",
      listen: "Unlimited audio & listen",
      journeys: "Full guided journeys",
    };
    return {
      feature: envFeature,
      label: labels[envFeature],
      endsAt,
      active: endsAt.getTime() > Date.now(),
      source: "env" as const,
    };
  }

  const rotated = rotationState();
  const isStandard = rotated.label === "Standard free limits";
  return {
    feature: isStandard ? null : rotated.feature,
    label: isStandard ? null : rotated.label,
    endsAt: rotated.endsAt,
    active: !isStandard && rotated.endsAt.getTime() > Date.now(),
    source: "rotation" as const,
  };
}

export function freeTrialGrants(feature: FreeTrialFeature): boolean {
  const cfg = getFreeTrialConfig();
  return cfg.active && cfg.feature === feature;
}
