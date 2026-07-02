import { Link } from "react-router-dom";
import type { CSSProperties, ReactNode } from "react";

const PAGE_BG = "#0d0612";
const CARD_BG = "#1a1520";
const TEXT = "#ede8e0";
const TEXT_SOFT = "rgba(237, 232, 224, 0.80)";
const TEXT_MUTED = "rgba(180, 175, 195, 0.75)";
const AMBER = "#d97706";
const BORDER = "rgba(255,255,255,0.08)";
const URGENT_RED = "#dc2626";

const phoneFrame: CSSProperties = {
  background: PAGE_BG,
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 28,
  padding: 16,
  minHeight: 200,
  color: TEXT,
  fontSize: 14,
  lineHeight: 1.55,
};

const pastorCard: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "18px 20px",
  fontSize: 14,
  lineHeight: 1.55,
  color: TEXT_SOFT,
};

const urgentBadge: CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background: "rgba(220,38,38,0.15)",
  color: URGENT_RED,
  border: "1px solid rgba(220,38,38,0.3)",
  padding: "3px 10px",
  borderRadius: 20,
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
    <div style={{ marginBottom: 32 }}>
      <div
        className="story-moment-row"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          padding: 28,
        }}
      >
        <div className="story-moment-phone" style={{ flex: "0 0 auto", width: "100%" }}>
          {phone}
        </div>
        <div
          className="story-moment-connector"
          style={{ color: AMBER, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}
        >
          triggers →
        </div>
        <div className="story-moment-portal" style={{ flex: 1, minWidth: 0 }}>
          {portal}
        </div>
      </div>
      <p
        style={{
          margin: "16px 0 0",
          fontSize: 14,
          color: TEXT_MUTED,
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        {caption}
      </p>
    </div>
  );
}

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "rgba(217,119,6,0.12)",
        border: "1px solid rgba(217,119,6,0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: AMBER,
        marginBottom: 16,
        fontSize: 22,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, color: TEXT, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Hero */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px 64px",
          textAlign: "center",
          backgroundImage: "url(/splash-pew.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(13,6,18,0.45) 0%, rgba(13,6,18,0.80) 55%, #0d0612 100%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", zIndex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
              marginBottom: 20,
            }}
          >
            Shepherd&apos;s Path · For Churches
          </div>
          <h1
            style={{
              margin: "0 auto 24px",
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 800,
              lineHeight: 1.12,
              color: TEXT,
              maxWidth: 720,
            }}
          >
            Your church deserves a pastor who never misses a moment.
          </h1>
          <p
            style={{
              margin: "0 auto 40px",
              fontSize: "clamp(16px, 2.5vw, 19px)",
              lineHeight: 1.65,
              color: TEXT_SOFT,
              maxWidth: 560,
            }}
          >
            From the first visit to a life transformed — Shepherd&apos;s Path keeps every member connected to your care.
          </p>
          <div
            className="landing-hero-ctas"
            style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link
              to="/demo"
              style={{
                display: "inline-block",
                background: AMBER,
                color: "#fff",
                padding: "15px 30px",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              See it live →
            </Link>
            <a
              href="#story"
              style={{
                display: "inline-block",
                background: "transparent",
                color: TEXT,
                padding: "14px 30px",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 500,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              Learn more ↓
            </a>
          </div>
        </div>
      </section>

      {/* From member to pastor */}
      <section
        id="story"
        style={{
          position: "relative",
          padding: "72px 24px",
          background: PAGE_BG,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/splash-shepherd.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            opacity: 0.08,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 1000, margin: "0 auto" }}>
          <h2
            style={{
              margin: "0 0 40px",
              fontSize: 28,
              fontWeight: 700,
              textAlign: "center",
              color: TEXT,
            }}
          >
            From member to pastor
          </h2>

          <StoryMoment
            caption="Member posts urgent prayer → Pastor sees flagged alert"
            phone={
              <div style={phoneFrame}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: TEXT }}>🙏 Prayer Wall</div>
                <p style={{ margin: "0 0 16px", color: TEXT_SOFT, whiteSpace: "pre-line" }}>
                  {'"I lost my job and I feel\ncompletely alone. Please\npray for me."'}
                </p>
                <div
                  style={{
                    display: "inline-block",
                    background: "rgba(217,119,6,0.18)",
                    color: AMBER,
                    border: "1px solid rgba(217,119,6,0.35)",
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
              <div style={{ ...pastorCard, borderLeft: `3px solid ${URGENT_RED}` }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={urgentBadge}>Urgent</span>
                  <span style={{ marginLeft: 10, fontWeight: 600, color: TEXT }}>Marcus Chen</span>
                </div>
                <p style={{ margin: "0 0 8px", color: TEXT_SOFT, whiteSpace: "pre-line" }}>
                  {'"I lost my job and I feel\ncompletely alone..."'}
                </p>
                <p style={{ margin: 0, fontSize: 13, fontStyle: "italic", color: URGENT_RED }}>
                  Language suggests crisis — pastor follow-up recommended today.
                </p>
              </div>
            }
          />

          <StoryMoment
            caption="Visitor walks in Sunday → Pastor sees overdue follow-up reminder"
            phone={
              <div style={phoneFrame}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: TEXT }}>👋 Welcome to Grace Community!</div>
                <p style={{ margin: "0 0 16px", color: TEXT_SOFT }}>
                  Your first visit has been noted. Your pastor will be in touch.
                </p>
                <div
                  style={{
                    display: "inline-block",
                    background: "rgba(217,119,6,0.18)",
                    color: AMBER,
                    border: "1px solid rgba(217,119,6,0.35)",
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
              <div style={pastorCard}>
                <div style={{ fontWeight: 600, color: TEXT, marginBottom: 8 }}>⚠️ Jordan Smith</div>
                <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 6 }}>Visited 2 days ago · Pending</div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 4 }}>Assigned to: Pastor James</div>
                <div style={{ fontSize: 12, color: URGENT_RED, marginBottom: 12 }}>Follow up by: Jul 6</div>
                <div
                  style={{
                    display: "inline-block",
                    background: "rgba(255,255,255,0.06)",
                    color: TEXT_SOFT,
                    border: `1px solid ${BORDER}`,
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
            caption="Member requests care → Pastor sees assigned care task"
            phone={
              <div style={phoneFrame}>
                <div style={{ fontWeight: 600, marginBottom: 10, color: TEXT }}>📖 Today&apos;s Verse</div>
                <p style={{ margin: "0 0 8px", fontStyle: "italic", color: TEXT_SOFT }}>
                  &quot;Cast all your anxiety on him because he cares for you.&quot;
                </p>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_MUTED }}>— 1 Peter 5:7</p>
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>☁️ Prayer request sent:</div>
                  <p style={{ margin: 0, color: TEXT_SOFT, whiteSpace: "pre-line" }}>
                    {'"Dad is in the hospital.\nNot sure who to talk to."'}
                  </p>
                </div>
              </div>
            }
            portal={
              <div style={pastorCard}>
                <div style={{ fontWeight: 600, color: TEXT, marginBottom: 8 }}>🏥 Care Request · Robert Martinez</div>
                <p style={{ margin: "0 0 10px", color: TEXT_SOFT }}>
                  Hospital visit needed this week. Wife overwhelmed, kids are 6 &amp; 9.
                </p>
                <div style={{ fontSize: 12, color: URGENT_RED, marginBottom: 4 }}>Due: Tomorrow</div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 12 }}>Assigned: Pastor James</div>
                <div
                  style={{
                    display: "inline-block",
                    background: "rgba(217,119,6,0.18)",
                    color: AMBER,
                    border: "1px solid rgba(217,119,6,0.35)",
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
        </div>
      </section>

      {/* Feature strip */}
      <section
        style={{
          position: "relative",
          padding: "64px 24px",
          background: PAGE_BG,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/splash-road-sunset-REV.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.06,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 1000, margin: "0 auto" }}>
          <div className="landing-features" style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 36 }}>
            {[
              {
                icon: "👋",
                title: "Visitor Follow-Up",
                body: "Never lose track of a first-time guest. Assign, schedule, and close the loop — right from your dashboard.",
              },
              {
                icon: "🙏",
                title: "Prayer Triage",
                body: "See which prayer requests need immediate pastoral attention. Flag urgent needs before they go unnoticed.",
              },
              {
                icon: "🏥",
                title: "Care Requests",
                body: "Hospital visits, grief, meals, counseling referrals. Coordinate your whole care team in one place.",
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  flex: 1,
                  background: CARD_BG,
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  padding: "28px 24px",
                }}
              >
                <FeatureIcon>{f.icon}</FeatureIcon>
                <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 600, color: TEXT }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: 15, color: TEXT_SOFT, lineHeight: 1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 15, color: TEXT_MUTED, fontStyle: "italic", margin: 0 }}>
            Built for churches of 50–500. No tech team required.
          </p>
        </div>
      </section>

      {/* Divider — Bible glow */}
      <section
        style={{
          position: "relative",
          height: 300,
          overflow: "hidden",
          background: PAGE_BG,
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
          <img
            src="/splash-bible-glow-REV.jpg"
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              filter: "brightness(0.35)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, #0d0612 0%, rgba(13,6,18,0.72) 30%, rgba(13,6,18,0.72) 70%, #0d0612 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 32px",
              textAlign: "center",
            }}
          >
            <blockquote
              style={{
                margin: 0,
                fontSize: "clamp(22px, 4vw, 32px)",
                fontStyle: "italic",
                fontWeight: 400,
                color: TEXT,
                lineHeight: 1.45,
                textShadow: "0 2px 24px rgba(0,0,0,0.85), 0 0 40px rgba(13,6,18,0.9)",
                maxWidth: 640,
              }}
            >
              &quot;He calls his own sheep by name.&quot;
              <footer style={{ display: "block", marginTop: 12, fontSize: "0.55em", fontStyle: "normal", color: TEXT_SOFT }}>
                — John 10:3
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Two ways to experience */}
      <section style={{ padding: "72px 24px", background: PAGE_BG }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2
            style={{
              margin: "0 0 32px",
              fontSize: 28,
              fontWeight: 700,
              textAlign: "center",
              color: TEXT,
            }}
          >
            Two ways to experience
          </h2>
          <div className="landing-two-ways" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                flex: 1,
                background: CARD_BG,
                borderRadius: 16,
                border: `1px solid ${BORDER}`,
                padding: 32,
              }}
            >
              <img
                src="/splash-forest.jpg"
                alt=""
                style={{
                  width: "100%",
                  height: 120,
                  borderRadius: 12,
                  objectFit: "cover",
                  display: "block",
                  marginBottom: 20,
                }}
              />
              <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>
                Daily Scripture. Guided Prayer. Faith that grows.
              </h3>
              <p style={{ margin: "0 0 24px", fontSize: 15, color: TEXT_SOFT, lineHeight: 1.6 }}>
                Download Shepherd&apos;s Path and walk with God — one moment at a time.
              </p>
              <a
                href="https://apps.apple.com/us/app/shepherds-path/id6742929981"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  background: "transparent",
                  color: TEXT,
                  border: "1px solid rgba(255,255,255,0.2)",
                  padding: "12px 24px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Download on the App Store
              </a>
            </div>

            <div
              style={{
                flex: 1,
                background: CARD_BG,
                borderRadius: 16,
                border: `1px solid ${BORDER}`,
                padding: 32,
              }}
            >
              <img
                src="/splash-pew.jpg"
                alt=""
                style={{
                  width: "100%",
                  height: 120,
                  borderRadius: 12,
                  objectFit: "cover",
                  display: "block",
                  marginBottom: 20,
                }}
              />
              <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>
                Know your flock. Reach them before they drift.
              </h3>
              <p style={{ margin: "0 0 24px", fontSize: 15, color: TEXT_SOFT, lineHeight: 1.6 }}>
                Shepherd&apos;s Path gives your team the visibility and tools to care for every member, every week.
              </p>
              <Link
                to="/demo"
                style={{
                  display: "inline-block",
                  background: AMBER,
                  color: "#fff",
                  padding: "12px 22px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                See the pastor&apos;s view →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          position: "relative",
          padding: "80px 24px 96px",
          background: PAGE_BG,
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/splash-shepherd.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.1,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 32, fontWeight: 700, color: TEXT }}>
            Ready to see it in action?
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 17, color: TEXT_SOFT, lineHeight: 1.65 }}>
            Explore the full Grace Community demo — live data, real workflows, no login required.
          </p>
          <Link
            to="/demo"
            style={{
              display: "inline-block",
              background: AMBER,
              color: "#fff",
              padding: "18px 48px",
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Explore the live demo →
          </Link>
          <p style={{ margin: "18px 0 0", fontSize: 13, color: TEXT_MUTED }}>
            No login. No credit card. Demo data resets periodically.
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
          .landing-features {
            flex-direction: row !important;
          }
          .landing-two-ways {
            flex-direction: row !important;
          }
        }
      `}</style>
    </div>
  );
}
