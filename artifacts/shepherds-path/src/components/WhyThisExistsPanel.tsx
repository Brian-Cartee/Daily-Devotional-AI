import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { motion, useAnimation } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import {
  markWhyPanelAutoShown,
  markWhyPanelDismissed,
  shouldAutoOpenWhyPanel,
} from "@/lib/homeHeroState";
import { WHY_PANEL_OPEN_EVENT } from "@/lib/openWhyPanel";

/** Five beats — manifesto, not a feature pitch */
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
    text: "Scripture and prayer can meet you where you are — not to fix you fast, but to sit with you.",
  },
  {
    text: "The path is here. You choose the next step.",
    strong: true,
  },
];

const PANEL_BG = [
  "radial-gradient(ellipse 72% 60% at 60% 48%, rgba(148,12,188,0.44) 0%, transparent 60%)",
  "radial-gradient(ellipse 50% 45% at 22% 30%, rgba(80,32,162,0.30) 0%, transparent 62%)",
  "radial-gradient(ellipse at 50% -6%, rgba(255,255,255,0.10) 0%, transparent 46%)",
  "linear-gradient(158deg, #5c1e98 0%, #390f70 42%, #130635 100%)",
].join(", ");

const SLIDE_IN = {
  type: "spring" as const,
  damping: 34,
  stiffness: 300,
  restDelta: 0.5,
};

const SLIDE_OUT = {
  type: "spring" as const,
  damping: 32,
  stiffness: 310,
};

export function WhyThisExistsPanel() {
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const controls = useAnimation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const openingRef = useRef(false);
  const savedScrollYRef = useRef(0);

  const revealPanel = useCallback(async () => {
    await controls.start({ y: "0%", transition: SLIDE_IN });
    setPanelVisible(true);
    openingRef.current = false;
  }, [controls]);

  const open = useCallback(() => {
    if (openingRef.current) return;
    openingRef.current = true;
    setPanelVisible(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setMounted(true);
  }, []);

  useEffect(() => {
    const onOpen = () => open();
    window.addEventListener(WHY_PANEL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WHY_PANEL_OPEN_EVENT, onOpen);
  }, [open]);

  useEffect(() => {
    if (location !== "/") return;
    if (!shouldAutoOpenWhyPanel()) return;
    markWhyPanelAutoShown();
    const t = window.setTimeout(open, 600);
    return () => window.clearTimeout(t);
  }, [location, open]);

  useEffect(() => {
    if (!mounted) return;
    void revealPanel();
  }, [mounted, revealPanel]);

  useEffect(() => {
    if (!mounted) return;
    savedScrollYRef.current = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollYRef.current}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, savedScrollYRef.current);
    };
  }, [mounted]);

  const close = async () => {
    setPanelVisible(false);
    markWhyPanelDismissed();
    await controls.start({ y: "-102%", transition: SLIDE_OUT });
    setMounted(false);
    openingRef.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const snapBack = () => {
    controls.start({ y: "0%", transition: SLIDE_IN });
  };

  const overlay =
    typeof document !== "undefined" && mounted
      ? createPortal(
          <>
            <motion.div
              key="why-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: panelVisible ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.38 }}
              onClick={close}
              className="fixed inset-0 z-[200]"
              style={{ background: "rgba(4,2,14,0.62)", backdropFilter: "blur(5px)" }}
              aria-hidden={!panelVisible}
            />
            <motion.div
              initial={{ y: "-102%" }}
              animate={controls}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.6, bottom: 0.04 }}
              onDragEnd={(_, info) => {
                if (info.velocity.y < -320 || info.offset.y < -65) {
                  void close();
                } else {
                  snapBack();
                }
              }}
              className="fixed top-0 left-0 right-0 z-[201] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="why-panel-title"
              style={{
                background: PANEL_BG,
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
                boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.06)",
                maxHeight: "min(82vh, 720px)",
              }}
            >
              <div style={{ height: "max(env(safe-area-inset-top, 0px), 12px)", flexShrink: 0 }} />

              <div className="flex items-center justify-between px-5 pt-2 pb-1 shrink-0">
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
                  <p
                    id="why-panel-title"
                    className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-6"
                  >
                    Why we built this
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
                    <button
                      type="button"
                      onClick={close}
                      data-testid="btn-why-begin"
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-[16px] font-semibold text-[#1a1208] bg-gradient-to-r from-amber-100/95 via-amber-200/90 to-amber-100/95 border border-amber-200/30 hover:opacity-95 transition-opacity"
                    >
                      Begin when you&apos;re ready
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-center text-[12px] text-white/40 leading-relaxed pt-3">
                      Scripture, quiet, or conversation — choose your door on the path below.
                    </p>
                    <p className="text-center pt-2">
                      <Link
                        href="/devotional"
                        onClick={close}
                        data-testid="link-why-todays-verse"
                        className="text-[13px] font-medium text-amber-200/75 hover:text-amber-100 underline underline-offset-2"
                      >
                        Or open today&apos;s verse →
                      </Link>
                    </p>
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
          </>,
          document.body,
        )
      : null;

  return <>{overlay}</>;
}
