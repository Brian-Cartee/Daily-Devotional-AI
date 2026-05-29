import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { shouldShowConvictionTab } from "@/lib/convictionTabVisibility";
import { openConvictionPanel } from "@/lib/openConvictionPanel";
/**
 * Left-edge bookmark tab — opens conviction panel (Scripture, AI integrity, mission).
 * Mirrors Path AI on the right without competing for the same corner.
 */
export function ConvictionEdgeTab() {
  const [location] = useLocation();
  const show = shouldShowConvictionTab(location);

  if (!show) return null;

  return (
    <>
      <div
        className="fixed left-0 z-[44] flex items-center pointer-events-none"
        style={{
          top: "max(calc(50% - 52px), calc(5.5rem + env(safe-area-inset-top, 0px)))",
        }}
      >
        <motion.button
          type="button"
          data-testid="button-conviction-tab"
          onClick={openConvictionPanel}
          aria-label="Our conviction — Scripture, faith, and mission"
          initial={{ x: -6, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          whileTap={{ scale: 0.97 }}
          className="pointer-events-auto flex flex-col items-center justify-center gap-1 py-3 pl-1 pr-2.5 rounded-r-xl border border-l-0 shadow-lg backdrop-blur-md"
          style={{
            background: "linear-gradient(135deg, rgba(26,16,40,0.92) 0%, rgba(12,8,22,0.88) 100%)",
            borderColor: "rgba(212,165,116,0.28)",
            boxShadow: "4px 2px 20px rgba(0,0,0,0.35)",
            clipPath: "polygon(0 8%, 100% 0, 100% 100%, 0 92%)",
          }}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-200/80" aria-hidden />
          <span
            className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-100/75 leading-none"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Conviction
          </span>
        </motion.button>
      </div>
    </>
  );
}
