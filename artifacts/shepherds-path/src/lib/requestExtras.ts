import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { getRelationshipAge } from "@/lib/relationship";

/** Attach to API bodies/queries so server cost guards can apply per session. */
export function apiSessionExtras(): {
  sessionId: string;
  isPro: boolean;
  daysWithApp: number;
} {
  return {
    sessionId: getSessionId(),
    isPro: isProVerifiedLocally(),
    daysWithApp: getRelationshipAge(),
  };
}
