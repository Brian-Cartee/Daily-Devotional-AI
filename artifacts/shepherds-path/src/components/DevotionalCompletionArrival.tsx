import { motion } from "framer-motion";
import { HERO_LANDING_IMAGE, HERO_LANDING_OVERLAY } from "@/lib/brand";

type Props = {
  dayNumber: number;
};

export function DevotionalCompletionArrival({ dayNumber }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.15, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl"
      data-testid="devotional-completion-arrival"
    >
      <div className="relative min-h-[240px] flex flex-col items-center justify-center text-center px-6 py-12 sm:py-14">
        <img
          src={HERO_LANDING_IMAGE}
          alt=""
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-[center_32%]"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: HERO_LANDING_OVERLAY }}
        />
        <div className="relative z-10 max-w-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50 mb-5">
            Day {dayNumber} complete
          </p>
          <h2
            className="text-[clamp(1.65rem,7vw,2.15rem)] font-semibold text-white leading-[1.15] tracking-tight mb-2"
            style={{ textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}
          >
            You showed up today.
          </h2>
          <p
            className="text-[clamp(1.1rem,4.5vw,1.35rem)] font-medium text-white/88 leading-snug"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.45)" }}
          >
            That matters.
          </p>
          {dayNumber >= 7 && (
            <p
              className="mt-5 text-[14px] text-white/62 leading-relaxed italic"
              style={{ fontFamily: "'Georgia', serif", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
            >
              You&apos;ve walked this path faithfully. The Word has been working in you longer than you know.
            </p>
          )}
          {dayNumber >= 3 && dayNumber < 7 && (
            <p
              className="mt-5 text-[14px] text-white/62 leading-relaxed italic"
              style={{ fontFamily: "'Georgia', serif", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
            >
              You came back again. Keep going.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
