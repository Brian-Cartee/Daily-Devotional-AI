import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { apiSessionExtras } from "@/lib/requestExtras";

export type GuidanceRecap = {
  recap: string;
  detailed?: string | null;
};

export async function fetchGuidanceRecap(input: {
  situation: string;
  reflection: string;
  verseReference?: string | null;
  prayer?: string | null;
}): Promise<GuidanceRecap | null> {
  const situation = input.situation.trim();
  const reflection = input.reflection.trim();
  if (!situation || !reflection) return null;

  const res = await fetch("/api/guidance/recap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation,
      reflection,
      verseReference: input.verseReference ?? undefined,
      prayer: input.prayer ?? undefined,
      isPro: isProVerifiedLocally(),
      sessionId: getSessionId(),
      ...apiSessionExtras(),
    }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<GuidanceRecap>;
}
