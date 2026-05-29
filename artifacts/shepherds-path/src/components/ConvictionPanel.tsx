import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { motion, useAnimation } from "framer-motion";
import { BookOpen, ShieldCheck, HeartHandshake, X } from "lucide-react";
import {
  CONVICTION_FAITH_AI,
  CONVICTION_MISSION,
  CONVICTION_PANEL_EYEBROW,
  CONVICTION_PANEL_SUBTITLE,
  CONVICTION_PANEL_TITLE,
  CONVICTION_SCRIPTURE,
  THRESHOLD_MANIFESTO_LINE,
} from "@/content/convictionManifesto";
import {
  CONVICTION_PANEL_OPEN_EVENT,
  scrollToScriptureCommitment,
} from "@/lib/openConvictionPanel";

const PANEL_BG = [
  "radial-gradient(ellipse 70% 55% at 18% 42%, rgba(212,165,116,0.22) 0%, transparent 58%)",
  "radial-gradient(ellipse 55% 50% at 85% 20%, rgba(120,60,200,0.18) 0%, transparent 62%)",
  "linear-gradient(165deg, #1a1028 0%, #120a1e 45%, #08040f 100%)",
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

export function ConvictionPanel() {
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const controls = useAnimation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const openingRef = useRef(false);

  const revealPanel = useCallback(async () => {
    await controls.start({ x: "0%", transition: SLIDE_IN });
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
    window.addEventListener(CONVICTION_PANEL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CONVICTION_PANEL_OPEN_EVENT, onOpen);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    void revealPanel();
  }, [mounted, revealPanel]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  const close = async () => {
    setPanelVisible(false);
    await controls.start({ x: "-102%", transition: SLIDE_OUT });
    setMounted(false);
    openingRef.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const onReadFullCommitment = () => {
    void close();
    if (location === "/" || location === "") {
      scrollToScriptureCommitment();
      return;
    }
    window.location.href = "/#scripture-commitment";
  };

  const overlay =
    typeof document !== "undefined" && mounted
      ? createPortal(
          <>
            <motion.div
              key="conviction-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: panelVisible ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32 }}
              onClick={() => void close()}
              className="fixed inset-0 z-[200]"
              style={{ background: "rgba(4,2,14,0.58)", backdropFilter: "blur(4px)" }}
              aria-hidden={!panelVisible}
            />
            <motion.div
              initial={{ x: "-102%" }}
              animate={controls}
              className="fixed top-0 bottom-0 left-0 z-[201] flex flex-col w-[min(100vw-2.5rem,380px)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="conviction-panel-title"
              style={{
                background: PANEL_BG,
                borderRight: "1px solid rgba(212,165,116,0.18)",
                boxShadow: "12px 0 48px rgba(0,0,0,0.45)",
                paddingTop: "max(env(safe-area-inset-top, 0px), 8px)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
            >
              <div className="flex items-center justify-between px-4 pt-2 pb-2 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/50">
                  {CONVICTION_PANEL_EYEBROW}
                </p>
                <button
                  type="button"
                  onClick={() => void close()}
                  aria-label="Close"
                  data-testid="button-conviction-close"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/55 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div
                ref={scrollRef}
                className="overflow-y-auto flex-1 px-5 pb-6"
                style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
              >
                <p
                  id="conviction-panel-title"
                  className="text-[22px] font-bold text-white tracking-tight leading-snug"
                >
                  {CONVICTION_PANEL_TITLE}
                </p>
                <p className="text-[14px] text-white/55 mt-1 mb-4">{CONVICTION_PANEL_SUBTITLE}</p>

                <p
                  className="text-[15px] leading-relaxed text-amber-100/90 mb-6 px-3 py-3 rounded-xl border border-amber-200/15"
                  style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
                >
                  {THRESHOLD_MANIFESTO_LINE}
                </p>

                <Section
                  icon={BookOpen}
                  title={CONVICTION_SCRIPTURE.title}
                  visible={panelVisible}
                  delay={0.05}
                >
                  <p
                    className="text-[14px] leading-relaxed text-white/78 mb-3"
                    style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
                  >
                    {CONVICTION_SCRIPTURE.lead}
                  </p>
                  <ul className="space-y-2">
                    {CONVICTION_SCRIPTURE.bullets.map((line) => (
                      <li key={line} className="flex items-start gap-2.5 text-[13px] text-white/72 leading-snug">
                        <span
                          className="w-1 h-1 rounded-full mt-2 shrink-0"
                          style={{ background: "rgba(212,165,116,0.8)" }}
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={ShieldCheck}
                  title={CONVICTION_FAITH_AI.title}
                  visible={panelVisible}
                  delay={0.12}
                >
                  <p className="text-[14px] leading-relaxed text-white/78">{CONVICTION_FAITH_AI.body}</p>
                  <p className="text-[12px] leading-relaxed text-white/48 mt-3 italic">
                    {CONVICTION_FAITH_AI.note}
                  </p>
                </Section>

                <Section
                  icon={HeartHandshake}
                  title={CONVICTION_MISSION.title}
                  visible={panelVisible}
                  delay={0.18}
                >
                  <p className="text-[14px] leading-relaxed text-white/78">{CONVICTION_MISSION.body}</p>
                  <p className="text-[13px] leading-relaxed text-white/62 mt-3">{CONVICTION_MISSION.closing}</p>
                </Section>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: panelVisible ? 1 : 0, y: panelVisible ? 0 : 8 }}
                  transition={{ duration: 0.35, delay: 0.28 }}
                  className="mt-6 flex flex-col gap-2.5"
                >
                  <button
                    type="button"
                    onClick={onReadFullCommitment}
                    data-testid="btn-conviction-scripture-depth"
                    className="w-full py-3 rounded-xl text-[14px] font-semibold text-[#1a1208] bg-gradient-to-r from-amber-100/95 via-amber-200/90 to-amber-100/95 border border-amber-200/25 hover:opacity-95 transition-opacity"
                  >
                    Read full commitment to Scripture
                  </button>
                  <Link
                    href="/pricing"
                    onClick={() => void close()}
                    data-testid="link-conviction-support"
                    className="w-full py-3 rounded-xl text-center text-[14px] font-medium text-amber-200/85 border border-amber-200/20 hover:bg-white/5 transition-colors"
                  >
                    Support the mission
                  </Link>
                  <Link
                    href="/support"
                    onClick={() => void close()}
                    className="text-center text-[12px] text-white/40 hover:text-white/60 transition-colors pt-1"
                  >
                    How ministry support works →
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </>,
          document.body,
        )
      : null;

  return <>{overlay}</>;
}

function Section({
  icon: Icon,
  title,
  children,
  visible,
  delay,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
  visible: boolean;
  delay: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 10 }}
      transition={{ duration: 0.38, delay }}
      className="mb-6 pb-6 border-b border-white/8 last:border-0 last:pb-0"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-amber-200/70" aria-hidden />
        <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-amber-200/65">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}
