import { Link } from "wouter";
import { ArrowRight, Heart } from "lucide-react";
import { NATIVE_TEXT, NATIVE_TEXT_SOFT } from "@/lib/nativeColors";

export function SpeakLifeHomeCard() {
  return (
    <Link href="/speak-life" className="block" data-testid="home-speak-life-card">
      <div
        style={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          padding: "20px",
          background:
            "linear-gradient(135deg, rgba(196,78,224,0.18) 0%, rgba(139,92,246,0.12) 50%, rgba(30,10,60,0.16) 100%)",
          border: "1px solid rgba(196,78,224,0.28)",
          boxShadow: "0 0 28px rgba(196,78,224,0.10)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(196,78,224,0.14)",
            border: "1.5px solid rgba(196,78,224,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Heart
            style={{ width: "28px", height: "28px", color: "rgba(232,180,248,0.95)" }}
            strokeWidth={2}
            fill="rgba(196,78,224,0.25)"
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(196,78,224,0.75)",
              marginBottom: "4px",
            }}
          >
            Speak Life
          </p>
          <p
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: NATIVE_TEXT,
              lineHeight: 1.25,
              marginBottom: "4px",
            }}
          >
            Say the true thing God put on your heart.
          </p>
          <p style={{ fontSize: "13px", color: NATIVE_TEXT_SOFT, lineHeight: 1.4 }}>
            Encourage someone while they&apos;re here to hear it.
          </p>
        </div>

        <ArrowRight
          style={{ width: "20px", height: "20px", color: "rgba(196,78,224,0.65)", flexShrink: 0 }}
        />
      </div>
    </Link>
  );
}
