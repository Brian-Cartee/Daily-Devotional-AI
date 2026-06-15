/**
 * ScriptureForYou — proactive verse card shown on the home screen
 * when the user has not yet engaged with a devotional or guidance session today.
 *
 * Reads: sp_start_burden (onboarding), sp_last_devotional_visit, sp_last_guidance
 * Fires: /api/guidance/scripture-for-you (cached server-side per day)
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { getSessionId } from "@/lib/session";

// ── Engagement guard ──────────────────────────────────────────────────────────

function hasEngagedToday(): boolean {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Devotional visit (stored as timestamp)
    const devTs = localStorage.getItem("sp_last_devotional_visit");
    if (devTs) {
      const devDate = new Date(Number(devTs)).toISOString().split("T")[0];
      if (devDate === today) return true;
    }

    // Guidance session (stored as date string)
    const guidDate = localStorage.getItem("sp_last_guidance");
    if (guidDate === today) return true;

    return false;
  } catch {
    return false;
  }
}

function getTimeOfDay(): "morning" | "midday" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "midday";
  return "evening";
}

function getBurden(): string | undefined {
  try {
    return localStorage.getItem("sp_start_burden") ?? undefined;
  } catch {
    return undefined;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScriptureData {
  verse: string;
  reference: string;
  why: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScriptureForYou() {
  const [data, setData] = useState<ScriptureData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if they've already engaged today
    if (hasEngagedToday()) return;

    const sessionId = getSessionId();
    const burden = getBurden();
    const timeOfDay = getTimeOfDay();

    fetch("/api/guidance/scripture-for-you", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, burden, timeOfDay }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.verse && d?.reference) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data || dismissed) return null;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          key="scripture-for-you"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(135deg, rgba(19,40,50,0.85) 0%, rgba(10,28,38,0.90) 100%)",
            padding: "20px",
            overflow: "hidden",
          }}
          data-testid="card-scripture-for-you"
        >
          {/* Subtle top accent */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0 0 auto 0",
              height: "2px",
              background: "linear-gradient(to right, transparent, rgba(134,193,172,0.45), transparent)",
            }}
          />

          {/* Label */}
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "rgba(134,193,172,0.75)",
              marginBottom: "14px",
            }}
          >
            This came to mind for you
          </p>

          {/* Verse */}
          <p
            style={{
              fontSize: "17px",
              lineHeight: 1.65,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.92)",
              marginBottom: "10px",
            }}
          >
            "{data.verse}"
          </p>

          {/* Reference */}
          <p
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.50)",
              marginBottom: data.why ? "12px" : "0",
            }}
          >
            — {data.reference}
          </p>

          {/* Why line */}
          {data.why && (
            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.40)",
                fontStyle: "italic",
                marginBottom: "16px",
              }}
            >
              {data.why}
            </p>
          )}

          {/* CTAs */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link
              href="/devotional"
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "rgba(134,193,172,0.90)",
                textDecoration: "none",
                padding: "7px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(134,193,172,0.25)",
                background: "rgba(134,193,172,0.08)",
                transition: "background 0.2s",
              }}
            >
              Open today's word →
            </Link>
            <button
              onClick={() => setDismissed(true)}
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.25)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "7px 4px",
              }}
              aria-label="Dismiss"
            >
              not now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
