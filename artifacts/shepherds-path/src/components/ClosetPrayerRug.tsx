import { useId } from "react";

type Props = { onFloor?: boolean };

/** Ornate prayer rug — kneeling spot (SVG scales cleanly on mobile) */
export function ClosetPrayerRug({ onFloor = false }: Props) {
  const uid = useId().replace(/:/g, "");
  const base = `rug-base-${uid}`;
  const gold = `rug-gold-${uid}`;
  const violet = `rug-violet-${uid}`;
  const diamond = `rug-diamond-${uid}`;

  return (
    <div
      className="relative pointer-events-none select-none w-full"
      data-testid="closet-prayer-rug"
      aria-hidden
      style={{ aspectRatio: "148 / 200", maxHeight: onFloor ? 140 : 200 }}
    >
      <svg
        viewBox="0 0 148 200"
        className="w-full h-full"
        role="img"
        aria-label=""
      >
        <defs>
          <linearGradient id={base} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5c1a2e" />
            <stop offset="45%" stopColor="#7f1d3d" />
            <stop offset="100%" stopColor="#451a2a" />
          </linearGradient>
          <linearGradient id={gold} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id={violet} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.15" />
          </linearGradient>
          <pattern id={diamond} width="12" height="12" patternUnits="userSpaceOnUse">
            <path
              d="M6 0 L12 6 L6 12 L0 6 Z"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="0.45"
              opacity="0.35"
            />
          </pattern>
        </defs>

        {/* Soft glow on floor */}
        <ellipse cx="74" cy="192" rx="62" ry="10" fill="rgba(251,191,36,0.12)" />

        {/* Fringe — bottom */}
        {[...Array(18)].map((_, i) => {
          const x = 18 + i * 6.2;
          return (
            <line
              key={`fb-${i}`}
              x1={x}
              y1={188}
              x2={x + (i % 2 === 0 ? 0.5 : -0.5)}
              y2={198}
              stroke="#d97706"
              strokeWidth="1.2"
              opacity="0.7"
            />
          );
        })}

        {/* Main body */}
        <path
          d="M12 24 Q74 4 136 24 L136 184 Q74 196 12 184 Z"
          fill={`url(#${base})`}
          stroke={`url(#${gold})`}
          strokeWidth="1.5"
        />

        {/* Mihrab arch — prayer direction */}
        <path
          d="M44 32 Q74 14 104 32 L98 78 Q74 88 50 78 Z"
          fill={`url(#${violet})`}
          stroke="#fbbf24"
          strokeWidth="1"
          opacity="0.95"
        />
        <path
          d="M52 38 Q74 26 96 38 L92 72 Q74 80 56 72 Z"
          fill="none"
          stroke="#fcd34d"
          strokeWidth="0.75"
          opacity="0.55"
        />

        {/* Border bands */}
        <rect x="18" y="22" width="112" height="158" rx="2" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.5" />
        <rect x="26" y="30" width="96" height="142" rx="1" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.35" />

        {/* Diamond field */}
        <rect x="28" y="82" width="92" height="88" fill={`url(#${diamond})`} opacity="0.9" />

        {/* Center medallion */}
        <circle cx="74" cy="118" r="22" fill="none" stroke={`url(#${gold})`} strokeWidth="1.2" opacity="0.85" />
        <circle cx="74" cy="118" r="14" fill="none" stroke="#fcd34d" strokeWidth="0.6" opacity="0.5" />
        <circle cx="74" cy="118" r="6" fill="#fbbf24" opacity="0.45" />
        <path
          d="M74 102 L80 118 L74 134 L68 118 Z"
          fill="none"
          stroke="#fde68a"
          strokeWidth="0.7"
          opacity="0.6"
        />

        {/* Corner flourishes */}
        {[
          [32, 90],
          [116, 90],
          [32, 150],
          [116, 150],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="5" fill="none" stroke="#fbbf24" strokeWidth="0.6" opacity="0.4" />
        ))}

        {/* Top fringe */}
        {[...Array(14)].map((_, i) => {
          const x = 26 + i * 7;
          return (
            <line
              key={`ft-${i}`}
              x1={x}
              y1={20}
              x2={x}
              y2={12}
              stroke="#d97706"
              strokeWidth="1"
              opacity="0.55"
            />
          );
        })}
      </svg>

      {!onFloor && (
        <p
          className="absolute left-1/2 -translate-x-1/2 text-[8px] tracking-[0.14em] uppercase text-amber-200/50 font-semibold whitespace-nowrap"
          style={{ bottom: -14 }}
        >
          {"Kneel & pray"}
        </p>
      )}
    </div>
  );
}
