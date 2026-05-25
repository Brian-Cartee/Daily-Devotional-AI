import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { REFERRAL_WELCOME_DAYS } from "@/lib/referralConfig";

const WELCOME_FLAG = "sp_referral_welcome_pending";

export function setReferralWelcomePending(): void {
  sessionStorage.setItem(WELCOME_FLAG, "1");
}

export function ReferralWelcomeToast() {
  const { toast } = useToast();

  useEffect(() => {
    if (sessionStorage.getItem(WELCOME_FLAG) !== "1") return;
    sessionStorage.removeItem(WELCOME_FLAG);
    toast({
      title: `Welcome — ${REFERRAL_WELCOME_DAYS} days of Pro`,
      description:
        "A friend invited you. Explore unlimited listen, deeper archive, and guided pathways while your gift is active.",
      duration: 9000,
    });
  }, [toast]);

  return null;
}
