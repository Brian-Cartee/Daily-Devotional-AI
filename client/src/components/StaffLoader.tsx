import { motion } from "framer-motion";

interface StaffLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function StaffLoader({ message, size = "md" }: StaffLoaderProps) {
  const dims = size === "sm" ? { w: 22, h: 54 } : size === "lg" ? { w: 40, h: 100 } : { w: 30, h: 76 };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={dims.w}
        height={dims.h}
        viewBox="0 0 30 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="staffGold" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#A07010" />
            <stop offset="45%" stopColor="#F0C040" />
            <stop offset="100%" stopColor="#FFF5CC" />
          </linearGradient>
          <filter id="staffGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shepherd's crook — draws itself, then fades and repeats */}
        <motion.path
          d="M 15 73 L 15 30 C 15 13 27 11 27 21 C 27 31 15 33 15 30"
          stroke="url(#staffGold)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#staffGlow)"
          initial={{ pathLength: 0, opacity: 0.3 }}
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0.3, 1, 0.9, 0.3] }}
          transition={{
            duration: 2.4,
            times: [0, 0.55, 0.75, 1],
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.2,
          }}
        />

        {/* Sparkle at top of crook */}
        <motion.circle
          cx="27"
          cy="21"
          r="1.5"
          fill="#FFF5CC"
          filter="url(#staffGlow)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: 2.4,
            times: [0.45, 0.6, 0.8],
            repeat: Infinity,
            repeatDelay: 0.2,
          }}
        />
      </svg>

      {message && (
        <motion.p
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-[13px] text-muted-foreground italic text-center"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
