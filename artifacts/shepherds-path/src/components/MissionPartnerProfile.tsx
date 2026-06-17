import { useEffect, useState } from "react";
import { Cross, Heart } from "lucide-react";
import { getSessionId } from "@/lib/session";
import { isMissionPartnerVerifiedLocally } from "@/lib/proStatus";

type Impact = {
  peopleHelpedThisMonth: number;
};

export function MissionPartnerProfile() {
  const [impact, setImpact] = useState<Impact | null>(null);

  useEffect(() => {
    if (!isMissionPartnerVerifiedLocally()) return;
    const sessionId = getSessionId();
    fetch(`/api/mission-partner/impact?sessionId=${encodeURIComponent(sessionId)}&subscriptionTier=mission_partner`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setImpact({ peopleHelpedThisMonth: data.peopleHelpedThisMonth ?? 0 });
      })
      .catch(() => {});
  }, []);

  if (!isMissionPartnerVerifiedLocally()) return null;

  return (
    <div
      className="mx-3 mb-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
      data-testid="mission-partner-profile"
    >
      <div className="flex items-center gap-2 mb-2">
        <Cross className="w-4 h-4 text-primary" />
        <p className="text-[13px] font-bold text-foreground">Mission Partner</p>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed flex items-start gap-2">
        <Heart className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Your support has helped{" "}
          <span className="font-semibold text-foreground">{impact?.peopleHelpedThisMonth ?? "…"}</span>{" "}
          people access Shepherd&apos;s Path this month.
        </span>
      </p>
    </div>
  );
}
