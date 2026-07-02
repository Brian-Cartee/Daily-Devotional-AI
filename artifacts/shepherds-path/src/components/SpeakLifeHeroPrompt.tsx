import { Link } from "wouter";
import { ArrowRight, Heart } from "lucide-react";

const cardShell = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(196,78,224,0.28)",
  background:
    "linear-gradient(135deg, rgba(196,78,224,0.14) 0%, rgba(139,92,246,0.08) 50%, rgba(18,16,26,0.92) 100%)",
  padding: "16px",
  boxSizing: "border-box" as const,
  boxShadow: "0 10px 24px -8px rgba(196,78,224,0.18)",
};

export function SpeakLifeHeroPrompt() {
  return (
    <div style={cardShell} data-testid="card-speak-life-hero">
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(196,78,224,0.14)",
            border: "1px solid rgba(196,78,224,0.32)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Heart style={{ width: "18px", height: "18px", color: "rgba(232,180,248,0.95)" }} strokeWidth={2} />
        </div>
        <div>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(232,180,248,0.72)",
              marginBottom: "4px",
            }}
          >
            Speak Life
          </p>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.88)", lineHeight: 1.4 }}>
            Say the true thing God put on your heart — for someone who needs to hear it.
          </p>
        </div>
      </div>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: "12px" }}>
        A few honest sentences become encouragement they can carry. Nothing is posted publicly unless you send it.
      </p>
      <Link href="/speak-life" className="sp-native-card-link">
        <span
          data-testid="btn-hero-speak-life"
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "16px",
            fontWeight: 600,
            color: "#ffffff",
            background: "linear-gradient(to right, rgba(196,78,224,0.95), rgba(139,92,246,0.92))",
            boxShadow: "0 4px 14px rgba(196,78,224,0.28)",
            boxSizing: "border-box",
          }}
        >
          Begin Speak Life
          <ArrowRight style={{ width: "16px", height: "16px" }} />
        </span>
      </Link>
    </div>
  );
}
