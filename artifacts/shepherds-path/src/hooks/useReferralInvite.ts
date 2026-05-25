import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import {
  REFERRAL_DAYS_PER_FRIEND,
  REFERRAL_WELCOME_DAYS,
} from "@/lib/referralConfig";

export interface ReferralInviteData {
  code: string;
  shareUrl: string;
  referralCount: number;
  proExpiresAt: string | null;
  referrerBonusDays?: number;
  welcomeDays?: number;
}

export function useReferralInvite() {
  const sessionId = getSessionId();
  const query = useQuery<ReferralInviteData>({
    queryKey: ["/api/referral/my-code", sessionId],
    queryFn: () =>
      fetch(`/api/referral/my-code?sessionId=${encodeURIComponent(sessionId)}`).then((r) =>
        r.json(),
      ),
    staleTime: 5 * 60 * 1000,
  });

  const bonusDays = query.data?.referrerBonusDays ?? REFERRAL_DAYS_PER_FRIEND;
  const welcomeDays = query.data?.welcomeDays ?? REFERRAL_WELCOME_DAYS;

  const daysRemaining = (() => {
    if (!query.data?.proExpiresAt) return 0;
    const diff = new Date(query.data.proExpiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return { ...query, bonusDays, welcomeDays, daysRemaining, sessionId };
}
