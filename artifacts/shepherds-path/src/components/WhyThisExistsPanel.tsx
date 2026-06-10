import { useState, useEffect, useRef, useCallback, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { motion, useAnimation } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import {
  markWhyPanelAutoShown,
  markWhyPanelDismissed,
} from "@/lib/homeHeroState";
import { WHY_PANEL_OPEN_EVENT } from "@/lib/openWhyPanel";
import { isNativeWebViewShell } from "@/lib/platform";

/** Manifesto beats — not a feature pitch */
const PARAGRAPHS: { text: string; strong?: boolean }[] = [
  {
    text: "This wasn't built for when life feels put together.",
    strong: true,
  },
  {
    text: "It was built for the quiet moments — when something feels heavy and you don't know what to do with it.",
  },
  {
    text: "It's also for daily Scripture, worship, and going deeper — not only the hard days.",
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

const PANEL_Z = 10050;

function NativeWhyPanel({
  onClose,
  scrollRef,
}: {
  onClose: () => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div
        data-testid="why-panel-backdrop"
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: PANEL_Z,
          background: "rgba(4,2,14,0.72)",
          WebkitBackdropFilter: "blur(5px)",
          backdropFilter: "blur(5px)",
        }}
      />
      <div
        data-testid="why-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="why-panel-title"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: PANEL_Z + 1,
          display: "flex",
          flexDirection: "column",
          background: PANEL_BG,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.06)",
          maxHeight: "min(82vh, 720px)",
          transform: "translateY(0)",
          opacity: 1,
        }}
      >
        <div style={{ height: "max(env(safe-area-inset-top, 0px), 12px)", flexShrink: 0 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 20px 4px",
            flexShrink: 0,
          }}
        >
          <div style={{ width: 36 }} />
          <div
            style={{ width: 36, height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.22)" }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="button-why-close"
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9999,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.60)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div
          ref={scrollRef}
          style={{
            overflowY: "auto",
            flex: 1,
            paddingLeft: 24,
            paddingRight: 24,
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              marginLeft: "auto",
              marginRight: "auto",
              display: "flex",
              flexDirection: "column",
              paddingTop: 8,
              paddingBottom: 24,
            }}
          >
            <p
              id="why-panel-title"
              style={{
                textAlign: "center",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.40)",
                marginBottom: 24,
                marginTop: 0,
              }}
            >
              Why we built this
            </p>

            {PARAGRAPHS.map((p, i) => (
              <p
                key={i}
                className={p.strong ? "manifesto-line" : undefined}
                style={{
                  textAlign: "center",
                  lineHeight: 1.65,
                  marginBottom: i === PARAGRAPHS.length - 1 ? 0 : 20,
                  marginTop: 0,
                  fontSize: p.strong ? "19px" : "17px",
                  color: p.strong ? "#ffffff" : "rgba(255,255,255,0.80)",
                  fontWeight: p.strong ? 600 : 400,
                }}
              >
                {p.text}
              </p>
            ))}

            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="button"
                onClick={onClose}
                data-testid="btn-why-begin"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#1a1208",
                  border: "1px solid rgba(251, 191, 36, 0.30)",
                  background: "linear-gradient(to right, rgba(254,243,199,0.95), rgba(253,230,138,0.90), rgba(254,243,199,0.95))",
                  cursor: "pointer",
                }}
              >
                Begin when you&apos;re ready
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.40)",
                  lineHeight: 1.5,
                  paddingTop: 12,
                  margin: 0,
                }}
              >
                Scripture, quiet, or conversation — choose your door on the path below.
              </p>
              <p style={{ textAlign: "center", paddingTop: 8, margin: 0 }}>
                <Link
                  href="/devotional"
                  onClick={onClose}
                  data-testid="link-why-todays-verse"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(253, 230, 138, 0.75)",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  Or open today&apos;s verse →
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            paddingTop: 12,
            paddingBottom: "max(20px, calc(12px + env(safe-area-inset-bottom, 0px)))",
          }}
        >
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.30)",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Tap outside or ✕ to close
          </p>
        </div>
      </div>
    </>
  );
}

export function WhyThisExistsPanel() {
  const inNative = isNativeWebViewShell();
  const [mounted, setMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const controls = useAnimation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const openingRef = useRef(false);
  const savedScrollYRef = useRef(0);
  const autoShownThisDisplayRef = useRef(false);

  const revealPanel = useCallback(async () => {
    if (inNative) {
      setPanelVisible(true);
      openingRef.current = false;
      if (!autoShownThisDisplayRef.current) {
        autoShownThisDisplayRef.current = true;
        markWhyPanelAutoShown();
      }
      return;
    }
    await controls.start({ y: "0%", transition: SLIDE_IN });
    setPanelVisible(true);
    openingRef.current = false;
    if (!autoShownThisDisplayRef.current) {
      autoShownThisDisplayRef.current = true;
      markWhyPanelAutoShown();
    }
  }, [controls, inNative]);

  const open = useCallback(() => {
    if (openingRef.current) return;
    openingRef.current = true;
    setPanelVisible(inNative);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setMounted(true);
  }, [inNative]);

  useEffect(() => {
    const onOpen = () => open();
    window.addEventListener(WHY_PANEL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WHY_PANEL_OPEN_EVENT, onOpen);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    void revealPanel();
  }, [mounted, revealPanel]);

  useEffect(() => {
    if (!mounted) return;
    savedScrollYRef.current = window.scrollY;
    if (inNative) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        window.scrollTo(0, savedScrollYRef.current);
      };
    }
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
  }, [mounted, inNative]);

  const close = async () => {
    markWhyPanelDismissed();
    if (inNative) {
      setPanelVisible(false);
      setMounted(false);
      openingRef.current = false;
      autoShownThisDisplayRef.current = false;
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      return;
    }
    setPanelVisible(false);
    await controls.start({ y: "-102%", transition: SLIDE_OUT });
    setMounted(false);
    openingRef.current = false;
    autoShownThisDisplayRef.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const snapBack = () => {
    controls.start({ y: "0%", transition: SLIDE_IN });
  };

  const overlay =
    typeof document !== "undefined" && mounted
      ? createPortal(
          inNative ? (
            <NativeWhyPanel onClose={() => void close()} scrollRef={scrollRef} />
          ) : (
            <>
              <motion.div
                key="why-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: panelVisible ? 1 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.38 }}
                onClick={() => void close()}
                className="fixed inset-0"
                style={{ zIndex: PANEL_Z, background: "rgba(4,2,14,0.62)", backdropFilter: "blur(5px)" }}
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
                className="fixed top-0 left-0 right-0 flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="why-panel-title"
                style={{
                  zIndex: PANEL_Z + 1,
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
                    onClick={() => void close()}
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
                        onClick={() => void close()}
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
                          onClick={() => void close()}
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
            </>
          ),
          document.body,
        )
      : null;

  return <>{overlay}</>;
}
