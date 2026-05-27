/** Stable nocookie embed for worship — no IFrame API / destroy cycles. */
export function youtubeWorshipEmbedUrl(videoId: string, autoplay: boolean): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    playsinline: "1",
    controls: "1",
  });
  if (typeof window !== "undefined") {
    params.set("origin", window.location.origin);
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
