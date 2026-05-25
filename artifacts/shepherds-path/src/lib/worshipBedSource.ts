import type { WorshipTrackId } from "@/lib/worshipTracks";
import type { WorshipYoutubeMixId } from "@/lib/worshipYouTubeMixes";

export type WorshipBedSource = "local" | "youtube";

export function isYoutubeWorshipSource(source: WorshipBedSource | undefined): boolean {
  return source === "youtube";
}

export type WorshipBedSelection = {
  source: WorshipBedSource;
  localTrackId: WorshipTrackId;
  youtubeMixId: WorshipYoutubeMixId;
};
