/**
 * TheThreadPage — weekly spiritual synthesis at /thread
 * Weaves the last 7 days of journal, prayer, verses, and guidance
 * into a short personal narrative with one anchor verse.
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getSessionId } from "@/lib/session";
import { motion } from "framer-motion";

interface ThreadData {
  narrative: string | null;
  anchorVerse: string | null;
  anchorRef: string | null;
  entryCount: number;
}

const THREAD_BG = "#09131c";

export default function TheThreadPage() {
  const sessionId = getSessionId();

  useEffect(() => {
    document.title = "The Thread — Shepherd's Path";
  }, []);

  const { data, isLoading, isError } = useQuery<ThreadData>({
    queryKey: ["/api/guidance/the-thread", sessionId],
    queryFn: async () => {
      const r = await fetch("/api/guidance/the-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour — cached server-side per day anyway
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THREAD_BG,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "18px 20px 0",
          gap: "10px",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.35)",
            textDecoration: "none",
          }}
        >
          ← Home
        </Link>
      </div>

      {/* Header */}
      <div
        style={{
          padding: "32px 24px 0",
          maxWidth: "540px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.20em",
            color: "rgba(134,193,172,0.60)",
            marginBottom: "10px",
          }}
        >
          The Thread
        </p>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1.25,
            margin: "0 0 6px",
            fontFamily: "Georgia, serif",
          }}
        >
          Your week with God
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.35)",
            marginBottom: "0",
          }}
        >
          The last 7 days, woven together.
        </p>
      </div>

      {/* Divider */}
      <div
        style={{
          margin: "24px auto 0",
          maxWidth: "540px",
          width: "100%",
          padding: "0 24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, transparent, rgba(134,193,172,0.25), transparent)",
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          maxWidth: "540px",
          margin: "0 auto",
          width: "100%",
          padding: "28px 24px 60px",
          boxSizing: "border-box",
        }}
      >
        {isLoading && (
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              textAlign: "center",
              paddingTop: "60px",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                color: "rgba(134,193,172,0.60)",
                letterSpacing: "0.04em",
              }}
            >
              Weaving your week together…
            </p>
          </motion.div>
        )}

        {isError && (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "15px" }}>
              Something went wrong. Try again in a moment.
            </p>
          </div>
        )}

        {data && data.narrative === null && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ paddingTop: "40px" }}
          >
            <p
              style={{
                fontSize: "17px",
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.60)",
                fontStyle: "italic",
                fontFamily: "Georgia, serif",
                marginBottom: "24px",
              }}
            >
              There isn't enough here yet to weave a thread.
            </p>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,0.35)",
                lineHeight: 1.6,
              }}
            >
              Come back after a few days of devotionals, prayer, or journaling —
              then this space will have something real to hold.
            </p>
            <div style={{ marginTop: "28px" }}>
              <Link
                href="/devotional"
                style={{
                  display: "inline-block",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "rgba(134,193,172,0.85)",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  border: "1px solid rgba(134,193,172,0.20)",
                  background: "rgba(134,193,172,0.07)",
                  textDecoration: "none",
                }}
              >
                Open today's devotional →
              </Link>
            </div>
          </motion.div>
        )}

        {data && data.narrative && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Entry count */}
            {data.entryCount > 0 && (
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.25)",
                  marginBottom: "28px",
                  letterSpacing: "0.05em",
                }}
              >
                {data.entryCount} moment{data.entryCount !== 1 ? "s" : ""} from this week
              </p>
            )}

            {/* Narrative */}
            <div style={{ marginBottom: "36px" }}>
              {data.narrative.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: "17px",
                    lineHeight: 1.75,
                    color: i === 0 ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.72)",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    marginBottom: "20px",
                  }}
                >
                  {para}
                </p>
              ))}
            </div>

            {/* Anchor verse */}
            {data.anchorVerse && data.anchorRef && (
              <div
                style={{
                  borderLeft: "2px solid rgba(134,193,172,0.35)",
                  paddingLeft: "18px",
                  marginBottom: "36px",
                }}
              >
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.65,
                    color: "rgba(255,255,255,0.75)",
                    fontStyle: "italic",
                    fontFamily: "Georgia, serif",
                    marginBottom: "8px",
                  }}
                >
                  "{data.anchorVerse}"
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "rgba(134,193,172,0.65)",
                  }}
                >
                  — {data.anchorRef}
                </p>
              </div>
            )}

            {/* Closing divider */}
            <div
              style={{
                height: "1px",
                background:
                  "linear-gradient(to right, rgba(255,255,255,0.08), transparent)",
                marginBottom: "28px",
              }}
            />

            {/* CTA */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link
                href="/devotional"
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "rgba(134,193,172,0.90)",
                  padding: "9px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(134,193,172,0.22)",
                  background: "rgba(134,193,172,0.07)",
                  textDecoration: "none",
                }}
              >
                Open today's word →
              </Link>
              <Link
                href="/journal"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.35)",
                  padding: "9px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  textDecoration: "none",
                }}
              >
                Your journal
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
