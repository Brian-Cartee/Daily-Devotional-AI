import { Link } from "react-router-dom";
import type { CSSProperties, ReactNode } from "react";

const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "20px 24px",
  color: "#1a1a1a",
};

const phoneFrame: CSSProperties = {
  background: "#1a1a2e",
  borderRadius: 28,
  padding: 16,
  minHeight: 200,
  color: "#fff",
  fontSize: 14,
  lineHeight: 1.55,
};

const portalCard: CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "18px 20px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
  fontSize: 14,
  lineHeight: 1.55,
  color: "#374151",
};

function StoryMoment({
  phone,
  portal,
  caption,
}: {
  phone: ReactNode;
  portal: ReactNode;
  caption: string;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        className="story-moment-row"
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 32,
        }}
      >
        <div className="story-moment-phone" style={{ flex: "0 0 auto", width: "100%" }}>
          {phone}
        </div>
        <div className="story-moment-connector" style={{ color: "#d97706", fontSize: 12, fontWeight: 600 }}>
          triggers →
        </div>
        <div className="story-moment-portal" style={{ flex: 1, minWidth: 0 }}>
          {portal}
        </div>
      </div>
      <p style={{ margin: "14px 0 0", fontSize: 14, color: "#6b7280", textAlign: "center", fontStyle: "italic" }}>
        {caption}
      </p>
    </div>
  );
}

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

      {/* Scroll story — member → pastor */}
      <section style={{ padding: "56px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 32px", fontSize: 22, fontWeight: 600, textAlign: "center", color: "#1b4332" }}>
          From member to pastor — in one flow
        </h2>

        <StoryMoment
          caption="Members share what's on their heart. Urgent ones surface instantly — no digging required."
          phone={
            <div style={phoneFrame}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>🙏 Prayer Wall</div>
              <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.9)", whiteSpace: "pre-line" }}>
                {"\"I lost my job and I feel\ncompletely alone. Please\npray for me.\""}
              </p>
              <div
                style={{
                  display: "inline-block",
                  background: "#2d6a4f",
                  color: "#fff",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Submit prayer →
              </div>
            </div>
          }
          portal={
            <div style={{ ...portalCard, borderLeft: "4px solid #dc2626" }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 20 }}>
                  🔴 URGENT
                </span>
                <span style={{ marginLeft: 8, fontWeight: 600, color: "#1b4332" }}>Marcus Chen</span>
              </div>
              <p style={{ margin: "0 0 8px", color: "#374151", whiteSpace: "pre-line" }}>
                {"\"I lost my job and I feel\ncompletely alone...\""}
              </p>
              <p style={{ margin: 0, fontSize: 13, fontStyle: "italic", color: "#991b1b" }}>
                Language suggests crisis — pastor follow-up recommended today.
              </p>
            </div>
          }
        />

        <StoryMoment
          caption="Every first-time guest is tracked. Your team gets assigned. No one slips through."
          phone={
            <div style={phoneFrame}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>👋 Welcome to Grace Community!</div>
              <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.85)" }}>
                Your first visit has been noted. Your pastor will be in touch.
              </p>
              <div
                style={{
                  display: "inline-block",
                  background: "#2d6a4f",
                  color: "#fff",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Join the church app →
              </div>
            </div>
          }
          portal={
            <div style={portalCard}>
              <div style={{ fontWeight: 600, color: "#1b4332", marginBottom: 8 }}>⚠️ Jordan Smith</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Visited 2 days ago · Pending</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Assigned to: Pastor James</div>
              <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>Follow up by: Jul 6</div>
              <div
                style={{
                  display: "inline-block",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #e5e7eb",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                Log contact
              </div>
            </div>
          }
        />

        <StoryMoment
          caption="When someone needs more than a verse, your care team is already in motion."
          phone={
            <div style={phoneFrame}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>📖 Today's Verse</div>
              <p style={{ margin: "0 0 8px", fontStyle: "italic", color: "rgba(255,255,255,0.9)" }}>
                "Cast all your anxiety on him because he cares for you."
              </p>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>— 1 Peter 5:7</p>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>☁️ Prayer request sent:</div>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.9)", whiteSpace: "pre-line" }}>
                  {"\"Dad is in the hospital.\nNot sure who to talk to.\""}
                </p>
              </div>
            </div>
          }
          portal={
            <div style={portalCard}>
              <div style={{ fontWeight: 600, color: "#1b4332", marginBottom: 8 }}>🏥 Care Request · Robert Martinez</div>
              <p style={{ margin: "0 0 10px" }}>
                Hospital visit needed this week. Wife overwhelmed, kids are 6 &amp; 9.
              </p>
              <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 4 }}>Due: Tomorrow</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Assigned: Pastor James</div>
              <div
                style={{
                  display: "inline-block",
                  background: "#2d6a4f",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                Mark complete
              </div>
            </div>
          }
        />
      </section>

      {/* Feature strips */}
      <section style={{ padding: "0 24px 40px", maxWidth: 1000, margin: "0 auto" }}>
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

        <p style={{ textAlign: "center", fontSize: 15, color: "#374151", marginBottom: 40 }}>
          Built for churches of 50–500. No tech team required.
        </p>

        {/* Two ways in */}
        <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 600, textAlign: "center", color: "#1b4332" }}>
          Two ways to experience Shepherd's Path
        </h2>
        <div className="landing-two-ways" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          <div style={{ ...cardStyle, flex: 1, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
            <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 600, color: "#1b4332" }}>Download the app</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280", lineHeight: 1.55 }}>
              Get Today's Word every morning, guided faith Journeys, and a private journal. No church required.
            </p>
            <button
              type="button"
              disabled
              style={{
                background: "transparent",
                color: "#1b4332",
                border: "2px solid #1b4332",
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                opacity: 0.7,
                cursor: "not-allowed",
              }}
            >
              Coming to App Store
            </button>
          </div>
          <div style={{ ...cardStyle, flex: 1, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⛪</div>
            <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 600, color: "#1b4332" }}>Connect through your church</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280", lineHeight: 1.55 }}>
              When your church uses Shepherd's Path, your prayer requests reach your pastor, your needs get met, and your community stays connected.
            </p>
            <Link
              to="/demo"
              style={{
                display: "inline-block",
                background: "#d97706",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              See the pastor's view →
            </Link>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", fontStyle: "italic", marginBottom: 40 }}>
          Church members get everything individual users get — plus a direct line to their pastor and church family.
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
        .story-moment-row {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
        }
        .story-moment-connector {
          text-align: center;
          padding: 4px 0;
        }
        @media (min-width: 768px) {
          .story-moment-row {
            flex-direction: row;
            align-items: center;
            gap: 20px;
          }
          .story-moment-phone {
            width: 40% !important;
          }
          .story-moment-portal {
            width: 60%;
          }
          .story-moment-connector {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            padding: 0 4px;
            flex-shrink: 0;
          }
          .landing-features { flex-direction: row !important; }
          .landing-two-ways { flex-direction: row !important; }
        }
      `}</style>
    </div>
  );
}
