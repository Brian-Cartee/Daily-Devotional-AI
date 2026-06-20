import { Mic } from "lucide-react";
import { Link } from "wouter";

export function TalkItThroughCard() {
  return (
    <Link href="/guidance" className="block" data-testid="home-talk-it-through-card">
      <div
        style={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          padding: "20px 20px 20px 20px",
          background: "linear-gradient(135deg, rgba(109,40,217,0.22) 0%, rgba(76,29,149,0.14) 50%, rgba(30,10,60,0.20) 100%)",
          border: "1px solid rgba(139,92,246,0.28)",
          boxShadow: "0 0 32px rgba(109,40,217,0.12)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Mic orb */}
        <div
          style={{
            position: "relative",
            flexShrink: 0,
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.38) 0%, rgba(109,40,217,0.18) 100%)",
            border: "1.5px solid rgba(167,139,250,0.45)",
            boxShadow: "0 0 24px rgba(139,92,246,0.35), inset 0 0 12px rgba(167,139,250,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer glow ring */}
          <div
            style={{
              position: "absolute",
              inset: "-6px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <Mic
            style={{ width: "28px", height: "28px", color: "rgba(216,180,254,0.95)", position: "relative", zIndex: 1 }}
            strokeWidth={2}
          />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(167,139,250,0.70)",
              marginBottom: "4px",
            }}
          >
            Talk it through
          </p>
          <p
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.25,
              marginBottom: "4px",
            }}
          >
            Something on your heart?
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.4,
            }}
          >
            Scripture and prayer, shaped for right now.
          </p>
        </div>

        {/* Arrow */}
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ flexShrink: 0, color: "rgba(139,92,246,0.55)" }}
        >
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}
