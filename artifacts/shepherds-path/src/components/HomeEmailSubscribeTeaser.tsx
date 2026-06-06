import { Mail, ArrowDown } from "lucide-react";
import { scrollToHomeEmailSubscribe } from "@/lib/homeEmailSubscribe";
import { useEmailSubscriptionStatus } from "@/hooks/use-email-subscription";
import { getRelationshipAge } from "@/lib/relationship";
import { getStoredSubscriberEmail } from "@/lib/subscriberState";

export function HomeEmailSubscribeTeaser() {
  const { subscribed, hydrated } = useEmailSubscriptionStatus();
  const established = getRelationshipAge() >= 7;
  const storedEmail = getStoredSubscriberEmail();

  if (subscribed || !hydrated) return null;
  if (established && !storedEmail) return null;

  return (
    <button
      type="button"
      data-testid="home-email-subscribe-teaser"
      onClick={() => scrollToHomeEmailSubscribe("smooth")}
      className="group w-full text-left rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3.5 sm:px-5 sm:py-4 active:scale-[0.99] transition-transform touch-manipulation"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] sm:text-[15px] font-semibold text-foreground leading-snug">
            Get tomorrow&apos;s verse by email
          </p>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
            Already subscribed or new — one email at the bottom of Home.
          </p>
        </div>
        <ArrowDown className="w-4 h-4 text-primary/70 shrink-0 group-hover:translate-y-0.5 transition-transform" />
      </div>
    </button>
  );
}
