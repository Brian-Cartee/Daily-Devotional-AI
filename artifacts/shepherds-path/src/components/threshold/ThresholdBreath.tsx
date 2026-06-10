import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { isNativeWebViewShell } from "@/lib/platform";

const BREATH_MS = 10_000;

export interface ThresholdBreathProps {
  onDone: () => void;
}

/** 10s stillness beat before entering home — no fake loading. */
export function ThresholdBreath({ onDone }: ThresholdBreathProps) {
  const [progress, setProgress] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const skipMotion = isNativeWebViewShell();

  useEffect(() => {
    const start = Date.now();
    const minWait = setTimeout(() => setCanContinue(true), 8000);
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / BREATH_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(tick);
        setCanContinue(true);
      }
    }, 80);
    return () => {
      clearTimeout(minWait);
      clearInterval(tick);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        paddingLeft: "24px",
        paddingRight: "24px",
      }}
    >
      <motion.p
        initial={skipMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: skipMotion ? 0.12 : 0.6 }}
        style={{
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.45)",
          marginBottom: "24px",
        }}
      >
        Stillness
      </motion.p>
      <motion.p
        initial={skipMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: skipMotion ? 0 : 0.15, duration: skipMotion ? 0.12 : 0.65 }}
        style={{
          maxWidth: "24rem",
          fontSize: "clamp(1.15rem, 4vw, 1.25rem)",
          lineHeight: 1.625,
          color: "rgba(255,255,255,0.88)",
          fontFamily: "var(--font-serif, Georgia, serif)",
        }}
      >
        Take one slow breath.
        <br />
        <span style={{ display: "block", color: "rgba(255,255,255,0.65)" }}>God already sees you.</span>
      </motion.p>

      <div
        style={{
          marginTop: "40px",
          width: "96px",
          height: "96px",
          borderRadius: "9999px",
          border: "1px solid rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden
      >
        <motion.div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "9999px",
            backgroundColor: "rgba(139,92,246,0.25)",
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <p
        style={{
          marginTop: "32px",
          fontSize: "13px",
          fontWeight: 500,
          color: "rgba(255,255,255,0.40)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Math.max(0, Math.ceil((1 - progress) * (BREATH_MS / 1000)))}s
      </p>

      <div
        style={{
          marginTop: "24px",
          width: "128px",
          height: "2px",
          borderRadius: "9999px",
          backgroundColor: "rgba(255,255,255,0.10)",
          overflow: "hidden",
        }}
      >
        <div
          className="transition-all duration-100"
          style={{
            height: "100%",
            backgroundColor: "rgba(167,139,250,0.70)",
            width: `${progress * 100}%`,
          }}
        />
      </div>

      {canContinue && (
        <motion.button
          initial={skipMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          type="button"
          onClick={onDone}
          data-testid="btn-threshold-breath-continue"
          className="transition-colors"
          style={{
            marginTop: "40px",
            fontSize: "15px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.80)",
            padding: "12px 32px",
            borderRadius: "9999px",
            border: "1px solid rgba(255,255,255,0.20)",
            background: "transparent",
          }}
        >
          Continue
        </motion.button>
      )}
    </div>
  );
}
