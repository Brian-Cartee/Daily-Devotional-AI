/** Display pricing — keep in sync with Stripe / App Store products. */
export const PRICING = {
  pro: {
    monthly: 7.99,
    annual: 79.99,
    annualMonthlyEquivalent: 6.67,
    annualSavingsVsMonthly: 15.89,
  },
  missionPartner: {
    monthly: 14.99,
    annual: 149.99,
    annualMonthlyEquivalent: 12.5,
    annualSavingsVsMonthly: 29.89,
  },
} as const;

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2).replace(/\.00$/, "")}`;
}
