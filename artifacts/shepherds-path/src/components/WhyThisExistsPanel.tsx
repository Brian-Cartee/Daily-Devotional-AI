import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

const PARAGRAPHS = [
  { text: "This wasn't built for when life feels put together.", weight: "strong" },
  { text: "It was built for the quiet moments—when something feels heavy and you don't know what to do with it.", weight: "normal" },
  { text: "You don't need the right words here.", weight: "normal" },
  { text: "Just honesty.", weight: "strong" },
  { text: "When you share what's on your mind, Scripture meets you in it—not randomly, but with care.", weight: "normal" },
  { text: "Not just a verse to read… but something to sit with.", weight: "normal" },
  { text: "Something that helps you understand where you are—and what to do next.", weight: "normal" },
  { text: "This isn't about reading more.", weight: "normal" },
  { text: "It's about not walking through things alone.", weight: "strong" },
  { text: "The path is here.", weight: "normal" },
  { text: "Walking it is up to you.", weight: "strong" },
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

  const open = () => {
    setMounted(true);
  };

  useEffect(() => {
    if (!mounted) return;
    controls.start({
      y: "0%",
      transition: { type: "spring", damping: 34, stiffness: 300, restDelta: 0.5 },
    });
    const t = setTimeout(() => setPanelVisible(true), 60);
    return () => clearTimeout(t);
  }, [mounted]);

  const close = async () => {
    setPanelVisible(false);
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
      {/* ── Handle — fixed at very top of viewport ─────────────────────── */}
      <button
        onClick={open}
        data-testid="button-why-handle"
        aria-label="Why this exists"
        className="fixed top-0 left-0 right-0 flex flex-col items-center z-[15] cursor-pointer gap-1"
        style={{ height: 38, paddingTop: 8, background: "transparent", border: "none" }}
      >
        <motion.svg
          animate={{ opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          width="34" height="11" viewBox="0 0 34 11" fill="none"
        >
          <path
            d="M1 10 L8 1 L26 1 L33 10"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
        <motion.p
          animate={{ opacity: [0.22, 0.42, 0.22] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          style={{
            fontSize: 9,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.9)",
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          Why This Exists
        </motion.p>
      </button>

      {/* ── Backdrop ───────────────────────────────────────────────────── */}
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

      {/* ── Panel ──────────────────────────────────────────────────────── */}
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
            maxHeight: "92vh",
          }}
        >
          {/* Safe area spacer */}
          <div style={{ height: "max(env(safe-area-inset-top, 0px), 12px)", flexShrink: 0 }} />

          {/* Drag affordance — top of panel (fixed, not scrolling) */}
          <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none" style={{ flexShrink: 0 }}>
            <div
              className="rounded-full"
              style={{ width: 36, height: 4, background: "rgba(255,255,255,0.20)" }}
            />
          </div>

          {/* App label */}
          <p
            className="text-center mt-4 mb-5"
            style={{
              flexShrink: 0,
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.26)",
              fontWeight: 600,
            }}
          >
            Shepherd&rsquo;s Path
          </p>

          {/* ── Scrollable paragraphs ─────────────────────────────────── */}
          <div
            ref={scrollRef}
            className="overflow-y-auto flex-1 px-8"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            <div className="flex flex-col pb-4">
              {PARAGRAPHS.map((p, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: panelVisible ? 1 : 0, y: panelVisible ? 0 : 6 }}
                  transition={{ duration: 0.45, delay: 0.08 + i * 0.055 }}
                  style={{
                    fontFamily: "'Georgia', serif",
                    fontSize: p.weight === "strong" ? "1.075rem" : "0.975rem",
                    lineHeight: 1.75,
                    color:
                      p.weight === "strong"
                        ? "rgba(255,255,255,0.95)"
                        : "rgba(255,255,255,0.72)",
                    marginBottom: i < PARAGRAPHS.length - 1 ? "0.95rem" : 0,
                    letterSpacing: p.weight === "strong" ? "-0.005em" : "0",
                  }}
                >
                  {p.text}
                </motion.p>
              ))}
            </div>
          </div>

          {/* Bottom drag handle + dismiss hint (fixed, not scrolling) */}
          <div
            className="flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing select-none"
            style={{
              flexShrink: 0,
              paddingTop: 16,
              paddingBottom: "max(28px, calc(16px + env(safe-area-inset-bottom, 0px)))",
            }}
          >
            <p
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
              }}
            >
              swipe up to close
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
