import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import {
  hasWhyPanelDismissed,
  markWhyPanelAutoShown,
  markWhyPanelDismissed,
  shouldAutoOpenWhyPanel,
} from "@/lib/homeHeroState";

/** Six beats — enough soul, not a wall of text */
const PARAGRAPHS: { text: string; strong?: boolean }[] = [
  {
    text: "This wasn't built for when life feels put together.",
    strong: true,
  },
  {
    text: "It was built for the quiet moments — when something feels heavy and you don't know what to do with it.",
  },
  {
    text: "You don't need the right words. Just honesty.",
    strong: true,
  },
  {
    text: "Talk It Through meets you with Scripture and prayer shaped for your situation — not random verses, not generic advice.",
  },
  {
    text: "This isn't about reading more. It's about not walking through things alone.",
    strong: true,
  },
  {
    text: "The path is here. Walking it is up to you.",
    strong: true,
  },
];

const PANEL_BG = [
  "radial-gradient(ellipse 72% 60% at 60% 48%, rgba(148,12,188,0.44) 0%, transparent 60%)",
  "radial-gradient(ellipse 50% 45% at 22% 30%, rgba(80,32,162,0.30) 0%, transparent 62%)",
  "radial-gradient(ellipse at 50% -6%, rgba(255,255,255,0.10) 0%, transparent 46%)",
  "linear-gradient(158deg, #5c1e98 0%, #390f70 42%, #130635 100%)",
].join(", ");

export function WhyThisExistsPanel() {
  const [mounted, setMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const controls = useAnimation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dismissed = hasWhyPanelDismissed();

  const open = useCallback(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onOpen = () => open();
    window.addEventListener("sp-open-why", onOpen);
    return () => window.removeEventListener("sp-open-why", onOpen);
  }, [open]);

  useEffect(() => {
    if (!shouldAutoOpenWhyPanel()) return;
    markWhyPanelAutoShown();
    const t = setTimeout(open, 600);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    controls.start({
      y: "0%",
      transition: { type: "spring", damping: 34, stiffness: 300, restDelta: 0.5 },
    });
    const t = setTimeout(() => setPanelVisible(true), 60);
    return () => clearTimeout(t);
  }, [mounted, controls]);

  const close = async () => {
    setPanelVisible(false);
    markWhyPanelDismissed();
    await controls.start({
      y: "-102%",
      transition: { type: "spring", damping: 32, stiffness: 310 },
    });
    setMounted(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const snapBack = () => {
    controls.start({
      y: "0%",
      transition: { type: "spring", damping: 28, stiffness: 280 },
    });
  };

  return (
    <>
      {!dismissed && (
        <button
          onClick={open}
          data-testid="button-why-handle"
          aria-label="Why this exists"
          className="fixed top-0 left-0 right-0 flex flex-col items-center z-[15] cursor-pointer gap-1"
          style={{ height: 42, paddingTop: 10, background: "transparent", border: "none" }}
        >
          <motion.svg
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            width="36"
            height="12"
            viewBox="0 0 34 11"
            fill="none"
          >
            <path
              d="M1 1 L8 10 L26 10 L33 1"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
          <motion.p
            animate={{ opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90 leading-none"
          >
            Why this exists
          </motion.p>
        </button>
      )}

      <AnimatePresence>
        {mounted && (
          <motion.div
            key="why-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: panelVisible ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
            onClick={close}
            className="fixed inset-0 z-[78]"
            style={{ background: "rgba(4,2,14,0.62)", backdropFilter: "blur(5px)" }}
          />
        )}
      </AnimatePresence>

      {mounted && (
        <motion.div
          initial={{ y: "-102%" }}
          animate={controls}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.6, bottom: 0.04 }}
          onDragEnd={(_, info) => {
            if (info.velocity.y < -320 || info.offset.y < -65) {
              close();
            } else {
              snapBack();
            }
          }}
          className="fixed top-0 left-0 right-0 z-[79] flex flex-col"
          style={{
            background: PANEL_BG,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.06)",
            maxHeight: "min(82vh, 720px)",
          }}
        >
          <div style={{ height: "max(env(safe-area-inset-top, 0px), 12px)", flexShrink: 0 }} />

          <div
            className="flex items-center justify-between px-5 pt-2 pb-1 shrink-0"
            style={{ flexShrink: 0 }}
          >
            <div className="w-9" />
            <div
              className="rounded-full cursor-grab active:cursor-grabbing"
              style={{ width: 36, height: 4, background: "rgba(255,255,255,0.22)" }}
            />
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              data-testid="button-why-close"
              className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="overflow-y-auto flex-1 px-6 sm:px-8"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            <div className="max-w-md mx-auto flex flex-col py-2 pb-6">
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-6">
                Shepherd&apos;s Path
              </p>

              {PARAGRAPHS.map((p, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: panelVisible ? 1 : 0, y: panelVisible ? 0 : 8 }}
                  transition={{ duration: 0.4, delay: 0.06 + i * 0.07 }}
                  className={`text-center leading-[1.65] mb-5 last:mb-0 ${
                    p.strong
                      ? "manifesto-line text-[19px] sm:text-[21px] text-white font-semibold tracking-tight"
                      : "text-[17px] sm:text-[18px] text-white/80"
                  }`}
                >
                  {p.text}
                </motion.p>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: panelVisible ? 1 : 0, y: panelVisible ? 0 : 10 }}
                transition={{ duration: 0.45, delay: 0.5 }}
                className="mt-8 flex flex-col gap-3"
              >
                <Link href="/guidance" onClick={close}>
                  <span
                    data-testid="btn-why-talk-through"
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-[16px] font-semibold text-white bg-white/15 border border-white/20 hover:bg-white/20 transition-colors"
                  >
                    Try Talk It Through
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="text-[14px] font-medium text-white/45 hover:text-white/70 transition-colors py-1"
                >
                  Return to home
                </button>
              </motion.div>
            </div>
          </div>

          <div
            className="flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing select-none shrink-0"
            style={{
              paddingTop: 12,
              paddingBottom: "max(20px, calc(12px + env(safe-area-inset-bottom, 0px)))",
            }}
          >
            <p className="text-[10px] tracking-[0.16em] uppercase text-white/30 font-medium">
              Swipe up to close
            </p>
            <div
              className="rounded-full"
              style={{ width: 32, height: 3, background: "rgba(255,255,255,0.18)" }}
            />
          </div>
        </motion.div>
      )}
    </>
  );
}
