import {
  FirstStepsCard,
  NotificationNudgeCard,
  ReturningUserCard,
  TheReturnCard,
  WalkMilestoneCard,
} from "@/components/EngagementCards";
import { HomeHeartLink } from "@/components/HomeHeartLink";
import { pickHomeEngagementSlot } from "@/lib/homeEngagementPriority";

type Props = {
  daysWithApp: number;
};

/** One engagement card at a time — avoids homework-stack on home */
export function HomeEngagementStack({ daysWithApp }: Props) {
  const slot = pickHomeEngagementSlot(daysWithApp);

  switch (slot) {
    case "returning":
      return <ReturningUserCard />;
    case "first-steps":
      return <FirstStepsCard daysWithApp={daysWithApp} />;
    case "milestone":
      return <WalkMilestoneCard daysWithApp={daysWithApp} />;
    case "notif":
      return <NotificationNudgeCard />;
    case "return-phase":
      return <TheReturnCard />;
    case "talk-link":
      return <HomeHeartLink />;
    default:
      return null;
  }
}
