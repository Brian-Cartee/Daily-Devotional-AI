/**
 * PrayForThem — user types a name + situation, gets a personal prayer,
 * then sends it directly via the native Web Share API (iMessage, WhatsApp, SMS, etc.)
 *
 * Two exports:
 *   <PrayForThemModal open onClose />  — the full modal
 *   <PrayForThemCard />               — home screen entry card
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
}

type Stage = "form" | "loading" | "prayer";

export function PrayForThemModal({ open, onClose }: ModalProps) {
  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState("");
  const [situation, setSituation] = useState("");
  const [prayer, setPrayer] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("form");
    setName("");
    setSituation("");
    setPrayer("");
    setDisplayName("");
    setCopied(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGenerate = async () => {
    if (!situation.trim()) return;
    setStage("loading");
    setError(null);
    try {
      const r = await fetch("/api/guidance/pray-for-them", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), situation: situation.trim() }),
      });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      setPrayer(data.prayer);
      setDisplayName(data.displayName);
      setStage("prayer");
    } catch {
      setError("Something went wrong. Try again.");
      setStage("form");
    }
  };

  const handleSend = async () => {
    const text = `${prayer}\n\n— sent via Shepherd's Path`;
    if (canNativeShare()) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyOnly = async () => {
    const ok = await copyToClipboard(prayer);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.72)",
              zIndex: 200,
            }}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              background: "linear-gradient(160deg, #0f1f28 0%, #091520 100%)",
              borderRadius: "20px 20px 0 0",
              padding: "28px 24px calc(40px + env(safe-area-inset-bottom, 16px) + 64px)",
              maxWidth: "540px",
              maxHeight: "90dvh",
              overflowY: "auto",
              margin: "0 auto",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderBottom: "none",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Pray for someone"
          >
            {/* Handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.18)",
                margin: "0 auto 24px",
              }}
            />

            {/* ── Form stage ── */}
            {stage === "form" && (
              <>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: "rgba(134,193,172,0.75)",
                    marginBottom: "6px",
                  }}
                >
                  Pray for someone
                </p>
                <p
                  style={{
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.65)",
                    marginBottom: "22px",
                    lineHeight: 1.5,
                  }}
                >
                  Who's on your heart? We'll write a prayer you can send them.
                </p>

                {/* Name */}
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.45)",
                    marginBottom: "6px",
                    letterSpacing: "0.05em",
                  }}
                >
                  Their name (optional)
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah"
                  maxLength={60}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    padding: "11px 14px",
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.90)",
                    outline: "none",
                    marginBottom: "16px",
                    boxSizing: "border-box",
                  }}
                />

                {/* Situation */}
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.45)",
                    marginBottom: "6px",
                    letterSpacing: "0.05em",
                  }}
                >
                  What are they going through?
                </label>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="Share what you know — even a few words is enough."
                  maxLength={500}
                  rows={4}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    padding: "11px 14px",
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.90)",
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.5,
                    marginBottom: "20px",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />

                {error && (
                  <p style={{ fontSize: "13px", color: "rgba(255,100,100,0.85)", marginBottom: "12px" }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={!situation.trim()}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    background: situation.trim()
                      ? "linear-gradient(135deg, rgba(134,193,172,0.25) 0%, rgba(80,160,130,0.20) 100%)"
                      : "rgba(255,255,255,0.06)",
                    border: `1px solid ${situation.trim() ? "rgba(134,193,172,0.35)" : "rgba(255,255,255,0.08)"}`,
                    color: situation.trim() ? "rgba(134,193,172,0.95)" : "rgba(255,255,255,0.25)",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: situation.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.2s",
                  }}
                >
                  Write a prayer →
                </button>
              </>
            )}

            {/* ── Loading stage ── */}
            {stage === "loading" && (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    fontSize: "13px",
                    color: "rgba(134,193,172,0.75)",
                    letterSpacing: "0.05em",
                  }}
                >
                  Writing a prayer{name.trim() ? ` for ${name.trim()}` : ""}…
                </motion.div>
              </div>
            )}

            {/* ── Prayer stage ── */}
            {stage === "prayer" && (
              <>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: "rgba(134,193,172,0.75)",
                    marginBottom: "18px",
                  }}
                >
                  A prayer for {displayName}
                </p>

                {/* Prayer text */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "14px",
                    padding: "18px 20px",
                    marginBottom: "22px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "16px",
                      lineHeight: 1.7,
                      color: "rgba(255,255,255,0.88)",
                      fontStyle: "italic",
                      margin: 0,
                    }}
                  >
                    {prayer}
                  </p>
                </div>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, rgba(134,193,172,0.25) 0%, rgba(80,160,130,0.20) 100%)",
                    border: "1px solid rgba(134,193,172,0.35)",
                    color: "rgba(134,193,172,0.95)",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                    marginBottom: "10px",
                    transition: "all 0.2s",
                  }}
                >
                  {canNativeShare()
                    ? `Send to ${displayName} →`
                    : copied
                    ? "Copied to clipboard ✓"
                    : "Copy to send →"}
                </button>

                {/* Secondary actions */}
                <div style={{ display: "flex", gap: "10px" }}>
                  {canNativeShare() && (
                    <button
                      onClick={handleCopyOnly}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        color: copied ? "rgba(134,193,172,0.85)" : "rgba(255,255,255,0.45)",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {copied ? "Copied ✓" : "Copy instead"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setStage("form");
                      setSituation("");
                      setPrayer("");
                      setCopied(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.40)",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Pray for someone else
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Home card ─────────────────────────────────────────────────────────────────

export function PrayForThemCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="card-pray-for-them"
        style={{
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: 0,
        }}
      >
        <div
          style={{
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(135deg, rgba(12,32,44,0.85) 0%, rgba(8,22,34,0.90) 100%)",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            transition: "border-color 0.2s",
          }}
        >
          {/* Icon */}
          <div
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              borderRadius: "12px",
              background: "rgba(134,193,172,0.10)",
              border: "1px solid rgba(134,193,172,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "20px",
            }}
          >
            🕊️
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.88)",
                margin: "0 0 3px",
              }}
            >
              Pray for someone
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.40)",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Write a prayer and send it directly to them
            </p>
          </div>

          <span
            aria-hidden="true"
            style={{ fontSize: "16px", color: "rgba(255,255,255,0.20)", flexShrink: 0 }}
          >
            →
          </span>
        </div>
      </button>

      <PrayForThemModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
