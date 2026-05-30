import type { ReactNode } from "react";

const HERO_GRADIENT =
  "linear-gradient(to bottom, rgba(8,4,18,0.72) 0%, rgba(8,4,18,0.28) 14%, rgba(8,4,18,0) 38%, rgba(9,3,30,0.55) 78%, hsl(var(--background)) 100%)";

export type CinematicPageHeroProps = {
  imageSrc: string;
  imageAlt?: string;
  objectPosition?: string;
  testId?: string;
  onImageLoad?: () => void;
  /** When false, shows placeholder until onImageLoad fires */
  imageReady?: boolean;
  children: ReactNode;
  /** Shorter hero (journey detail with back row) */
  compact?: boolean;
};

/** Full-width cinematic header — matches For You / Guidance (image behind native top icons). */
export function CinematicPageHero({
  imageSrc,
  imageAlt = "",
  objectPosition = "center 32%",
  testId = "cinematic-page-hero",
  onImageLoad,
  imageReady = true,
  children,
  compact = false,
}: CinematicPageHeroProps) {
  return (
    <div
      data-testid={testId}
      className={`relative w-full overflow-hidden bg-[#09031e] ${
        compact
          ? "h-[42vh] min-h-[260px] sm:h-[44vh] sm:min-h-[280px] max-h-[400px]"
          : "h-[48vh] min-h-[300px] sm:h-[50vh] sm:min-h-[320px] max-h-[480px]"
      }`}
    >
      {!imageReady && (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
          }}
          aria-hidden
        />
      )}
      <img
        src={imageSrc}
        alt={imageAlt}
        aria-hidden={!imageAlt}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          imageReady ? "opacity-100" : "opacity-0"
        }`}
        style={{ objectPosition }}
        decoding="async"
        // @ts-ignore — fetchpriority is valid HTML
        fetchpriority="high"
        onLoad={onImageLoad}
      />
      <div className="absolute inset-0 pointer-events-none" style={{ background: HERO_GRADIENT }} />
      <div className="absolute inset-0 z-10 flex flex-col px-5 pb-6 sm:pb-8 pt-[calc(env(safe-area-inset-top,0px)+3.5rem)]">
        {children}
      </div>
    </div>
  );
}
