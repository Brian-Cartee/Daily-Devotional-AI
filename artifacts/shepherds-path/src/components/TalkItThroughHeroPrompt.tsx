import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { waitMs } from "@/lib/pauseEngine";
import { CRISIS_LIFELINE_DISPLAY, CRISIS_LIFELINE_TEL } from "@/lib/crisisResources";
import type { ThresholdNeed } from "@/lib/thresholdState";
import { SituationPills } from "@/components/SituationPills";

const PLACEHOLDERS = [
  "I can't quiet my mind tonight…",
  "Something from today is still heavy…",
  "I need Scripture for what I'm facing…",
  "Help me pray honestly about this…",
];

const NEED_PLACEHOLDERS: Partial<Record<ThresholdNeed, string>> = {
  peace: "I can't quiet my mind tonight…",
  grief: "I'm carrying something heavy today…",
  battle: "I need strength for what's in front of me…",
  stillness: "I just need to be quiet before God…",
  comfort: "I'm tired and need gentleness…",
  honesty: "I haven't said this out loud yet…",
  hope: "I'm afraid hope is running out…",
};

interface TalkItThroughHeroPromptProps {
  phase?: string;
  thresholdNeed?: ThresholdNeed | null;
}

const linkStyle = {
  textDecoration: "underline" as const,
  textUnderlineOffset: "2px",
  color: "rgba(255,255,255,0.45)",
};

export function TalkItThroughHeroPrompt({ phase, thresholdNeed }: TalkItThroughHeroPromptProps) {
  const [, navigate] = useLocation();
  const [value, setValue] = useState("");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [beginning, setBeginning] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const placeholders = thresholdNeed && NEED_PLACEHOLDERS[thresholdNeed]
    ? [NEED_PLACEHOLDERS[thresholdNeed]!, ...PLACEHOLDERS]
    : PLACEHOLDERS;

  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, 5500);
    return () => clearInterval(t);
  }, [placeholders.length]);

  const goToGuidance = (text: string) => {
    if (text) {
      navigate(`/guidance?situation=${encodeURIComponent(text)}`);
    } else {
      navigate("/guidance");
    }
  };

  const begin = async () => {
    if (beginning) return;
    setBeginning(true);
    try {
      if ("vibrate" in navigator) navigator.vibrate(12);
    } catch {
      /* noop */
    }
    const text = value.trim();
    if (!text) {
      await waitMs(280);
      goToGuidance("");
      return;
    }
    goToGuidance(text);
  };

  return (
    <div
      data-testid="card-talk-it-through-hero"
      style={{
        width: "100%",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.12)",
        backgroundColor: "rgba(18,16,26,0.95)",
        padding: "16px",
        boxSizing: "border-box",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.55)",
            marginBottom: "4px",
          }}
        >
          Talk it through
        </p>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.82)", lineHeight: 1.375 }}>
          Scripture and prayer shaped for{" "}
          {phase === "evening" || phase === "late-evening" ? "tonight" : "right now"} — not generic
          advice.
        </p>
      </div>

      <SituationPills
        variant="dark"
        selectedId={topicId}
        className="mb-3"
        onSelect={(situationText, id) => {
          setTopicId(id);
          setValue(situationText);
          try {
            if ("vibrate" in navigator) navigator.vibrate(8);
          } catch {
            /* noop */
          }
          goToGuidance(situationText);
        }}
      />

      <label
        htmlFor="hero-talk-input"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        What&apos;s on your heart
      </label>
      <div style={{ position: "relative" }}>
        <textarea
          id="hero-talk-input"
          ref={inputRef}
          data-testid="input-hero-talk-through"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void begin();
            }
          }}
          rows={2}
          style={{
            width: "100%",
            resize: "none",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.10)",
            backgroundColor: "rgba(255,255,255,0.05)",
            padding: "14px 16px",
            fontSize: "17px",
            lineHeight: 1.625,
            color: "#ffffff",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
        {!value.trim() && (
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              padding: "14px 16px",
              fontSize: "17px",
              lineHeight: 1.625,
              overflow: "hidden",
            }}
            aria-hidden
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={placeholders[placeholderIdx]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: "block", color: "rgba(255,255,255,0.38)" }}
              >
                {placeholders[placeholderIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
      </div>

      <button
        type="button"
        data-testid="btn-hero-talk-through"
        onClick={() => void begin()}
        disabled={beginning}
        style={{
          marginTop: "12px",
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          borderRadius: "12px",
          padding: "14px",
          fontSize: "16px",
          fontWeight: 600,
          color: "#1a1208",
          border: "none",
          cursor: beginning ? "wait" : "pointer",
          opacity: beginning ? 0.7 : 1,
          background: "linear-gradient(to right, rgba(254,243,199,0.95), rgba(253,230,138,0.90), rgba(254,243,199,0.95))",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.20)",
          boxSizing: "border-box",
        }}
      >
        {beginning ? "One breath…" : "Talk it through"}
        {!beginning && <ArrowRight style={{ width: "16px", height: "16px" }} />}
      </button>

      <p
        style={{
          marginTop: "10px",
          textAlign: "center",
          fontSize: "11px",
          color: "rgba(255,255,255,0.40)",
          lineHeight: 1.625,
        }}
      >
        Private · grounded in the Bible · conversational guidance when you&apos;re ready
      </p>

      <p
        style={{
          marginTop: "8px",
          textAlign: "center",
          fontSize: "10px",
          color: "rgba(255,255,255,0.32)",
          lineHeight: 1.625,
          paddingLeft: "4px",
          paddingRight: "4px",
        }}
      >
        Not a substitute for church, counseling, or emergency care.{" "}
        <a href={CRISIS_LIFELINE_TEL} style={linkStyle}>
          {CRISIS_LIFELINE_DISPLAY}
        </a>
        {" · "}
        <Link href="/support" style={linkStyle}>
          Support
        </Link>
      </p>

      <p
        style={{
          marginTop: "8px",
          textAlign: "center",
          fontSize: "12px",
          color: "rgba(255,255,255,0.38)",
          lineHeight: 1.625,
        }}
      >
        <Link
          href="/sigh"
          data-testid="link-hero-sigh-room"
          style={{
            color: "rgba(255,255,255,0.50)",
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          Need a quieter room?
        </Link>
      </p>
    </div>
  );
}

/** Scroll/focus hero input — used by “Talk it through” door */
export function focusHeroTalkInput(): void {
  const el = document.getElementById("hero-talk-input") as HTMLTextAreaElement | null;
  el?.focus();
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}
