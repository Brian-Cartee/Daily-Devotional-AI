import { Link } from "react-router-dom";
import type { CSSProperties } from "react";

const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "20px 24px",
  color: "#1a1a1a",
};

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f7" }}>
      {/* Hero */}
      <section
        style={{
          background: "#1b4332",
          color: "#fff",
          padding: "56px 24px 64px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 16 }}>
            Shepherd's Path · Church Admin
          </div>
          <h1 style={{ margin: "0 0 20px", fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 700, lineHeight: 1.2 }}>
            Your church deserves a pastor who never misses a moment.
          </h1>
          <p style={{ margin: "0 0 32px", fontSize: "clamp(16px, 2.5vw, 18px)", lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
            Shepherd's Path helps small church teams follow up with visitors, respond to urgent prayer requests, and care for members — all in one place.
          </p>
          <div className="landing-hero-ctas" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/demo"
              style={{
                display: "inline-block",
                background: "#d97706",
                color: "#fff",
                padding: "14px 28px",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              See it live →
            </Link>
            <Link
              to="/login"
              style={{
                display: "inline-block",
                background: "transparent",
                color: "#fff",
                padding: "13px 28px",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 500,
                textDecoration: "none",
                border: "2px solid rgba(255,255,255,0.5)",
              }}
            >
              Set up my church
            </Link>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section style={{ padding: "56px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 32px", fontSize: 22, fontWeight: 600, textAlign: "center", color: "#1b4332" }}>
          What it does
        </h2>
        <div className="landing-two-col" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...cardStyle, borderLeft: "4px solid #dc2626" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#1b4332" }}>Sarah M.</span>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 20 }}>
                  URGENT
                </span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontStyle: "italic", color: "#991b1b" }}>
                Language suggests immediate safety concern — pastor follow-up recommended today.
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
                "I'm scared and don't know who to talk to. Please pray for my family tonight."
              </p>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "#6b7280", textAlign: "center" }}>
              Members share prayer requests through the app. Urgent ones surface instantly.
            </p>
          </div>

          <div style={{ flex: 1 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1b4332", marginBottom: 12 }}>Needs Attention</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1b4332", marginBottom: 4 }}>⚠️ Jordan Lee</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>visited 12 days ago · no follow-up</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1b4332", marginBottom: 4 }}>🔴 Anonymous</div>
                  <div style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic", marginBottom: 4 }}>
                    I'm scared and don't know who to talk to. Please pray for my family…
                  </div>
                  <div style={{ fontSize: 13, color: "#dc2626" }}>3 days, no response</div>
                </div>
              </div>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "#6b7280", textAlign: "center" }}>
              You see what needs immediate attention — every Sunday, without digging.
            </p>
          </div>
        </div>
      </section>

      {/* Feature strips */}
      <section style={{ padding: "0 24px 64px", maxWidth: 1000, margin: "0 auto" }}>
        <div className="landing-features" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
          {[
            {
              title: "Visitor follow-up",
              body: "Log first-time guests. Track every call, text, and visit. Never lose a visitor again.",
            },
            {
              title: "Prayer triage",
              body: "AI flags crisis-level prayer requests immediately. You respond to the ones that matter most.",
            },
            {
              title: "Care requests",
              body: "Hospital visits, meal trains, grief support — assigned, tracked, completed.",
            },
          ].map((f) => (
            <div key={f.title} style={{ ...cardStyle, flex: 1 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#1b4332" }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>{f.body}</p>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 15, color: "#374151", marginBottom: 20 }}>
          Built for churches of 50–500. No tech team required.
        </p>
        <div style={{ textAlign: "center" }}>
          <Link
            to="/demo"
            style={{
              display: "inline-block",
              background: "#d97706",
              color: "#fff",
              padding: "16px 32px",
              borderRadius: 8,
              fontSize: 17,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Explore the live demo →
          </Link>
          <p style={{ margin: "14px 0 0", fontSize: 13, color: "#9ca3af" }}>
            No login. No credit card. Resets periodically.
          </p>
        </div>
      </section>

      <style>{`
        @media (min-width: 768px) {
          .landing-two-col { flex-direction: row !important; }
          .landing-features { flex-direction: row !important; }
        }
      `}</style>
    </div>
  );
}
