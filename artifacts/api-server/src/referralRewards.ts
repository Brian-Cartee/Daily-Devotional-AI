/** Referral Pro trial rewards — single source of truth for API */
export const REFERRAL_DAYS_PER_FRIEND = 14;
export const REFERRAL_WELCOME_DAYS = 7;
export const REFERRAL_MAX_BONUS_DAYS = 365;

export function addProDays(currentExpiry: Date | null | undefined, days: number): Date {
  const now = new Date();
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const next = new Date(base.getTime() + days * 86_400_000);
  const cap = new Date(now.getTime() + REFERRAL_MAX_BONUS_DAYS * 86_400_000);
  return next > cap ? cap : next;
}
