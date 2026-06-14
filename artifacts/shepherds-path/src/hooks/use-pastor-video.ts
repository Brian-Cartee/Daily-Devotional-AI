import { useEffect, useState } from "react";
import { fetchPastorVideo, type PastorVideoResponse } from "@/lib/pastorVideoTone";

export function usePastorVideo(tone: string | null, enabled = true) {
  const [video, setVideo] = useState<PastorVideoResponse | null>(null);

  useEffect(() => {
    if (!enabled || !tone) {
      setVideo(null);
      return;
    }
    let cancelled = false;
    void fetchPastorVideo(tone).then((result) => {
      if (!cancelled) setVideo(result);
    });
    return () => {
      cancelled = true;
    };
  }, [tone, enabled]);

  return video;
}
