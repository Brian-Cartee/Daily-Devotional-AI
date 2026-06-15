/**
 * TheThreadCard — home screen entry point for The Thread.
 * Shows after the user has been in the app 3+ days.
 * Tapping navigates to /thread.
 */

import { Link } from "wouter";

interface Props {
  daysWithApp: number;
}

export function TheThreadCard({ daysWithApp }: Props) {
  // Only surface once there's something to weave
  if (daysWithApp < 3) return null;

  return (
    <Link href="/thread" style={{ textDecoration: "none", display: "block" }}>
      <div
        data-testid="card-the-thread"
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(135deg, rgba(10,22,34,0.90) 0%, rgba(6,16,26,0.95) 100%)",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          cursor: "pointer",
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
            fontSize: "19px",
          }}
        >
          🧵
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
            The Thread
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.38)",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Your last 7 days with God, woven together
          </p>
        </div>

        <span
          aria-hidden="true"
          style={{ fontSize: "16px", color: "rgba(255,255,255,0.20)", flexShrink: 0 }}
        >
          →
        </span>
      </div>
    </Link>
  );
}
