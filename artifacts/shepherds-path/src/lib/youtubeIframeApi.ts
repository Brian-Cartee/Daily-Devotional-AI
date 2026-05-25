/** Load YouTube IFrame Player API once per page */

let loadPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => reject(new Error("YouTube iframe API failed to load"));
    document.head.appendChild(tag);

    window.setTimeout(() => {
      if (window.YT?.Player) resolve();
    }, 8000);
  });

  return loadPromise;
}

export type YtPlayerInstance = {
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
  setVolume: (n: number) => void;
  mute: () => void;
  unMute: () => void;
};
