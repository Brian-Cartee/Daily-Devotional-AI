import type { PresenceDoorId } from "@/components/HomePresenceDoors";

/** Active hero door + arrival ritual — drives what home hides below the fold. */
export type HomePresenceContext = {
  door: PresenceDoorId;
  arrivalOpen: boolean;
};
