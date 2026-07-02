import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useChurch } from "../contexts/ChurchContext";
import { api, type DashboardAlerts } from "../lib/api";

const CARD_BG = "#1a1520";
const CARD_BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#ede8e0";
const TEXT_MUTED = "rgba(237, 232, 224, 0.55)";

interface Props {
  session: { email: string; churchId: string; role: string };
}

function QuickActionLink({ label, to, primary = false }: { label: string; to: string; primary?: boolean }) {
  const [hover, setHover] = useState(false);

  const baseStyle = {
    display: "inline-block" as const,
    borderRadius: "12px",
    padding: "14px 20px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    transition: "border-color 0.15s ease, background 0.15s ease",
    ...(primary
      ? {
          background: hover ? "rgba(217, 119, 6, 0.16)" : "rgba(217, 119, 6, 0.12)",
          border: `1px solid ${hover ? "rgba(217, 119, 6, 0.4)" : "rgba(217, 119, 6, 0.3)"}`,
          color: "#fbbf24",
        }
      : {
          background: hover ? "rgba(255,255,255,0.04)" : CARD_BG,
          border: `1px solid ${hover ? "rgba(196, 78, 224, 0.3)" : CARD_BORDER}`,
          color: TEXT,
        }),
  };

  return (
    <Link
      to={to}
      style={baseStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {label} →
    </Link>
  );
}

export default function DashboardPage({ session }: Props) {
  const { church, stats, loading } = useChurch();
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);

  useEffect(() => {
    api.dashboard
      .get()
      .then((data) => setAlerts(data.alerts))
      .catch(() => setAlerts({ overdueVisitors: [], urgentPrayers: [] }));
  }, []);

  const cards = [
    { label: "Prayer requests", value: stats?.activePrayerCount ?? "—", sub: "awaiting response", to: "/prayer-inbox" },
    { label: "Members", value: stats?.memberCount ?? "—", sub: "active in app", to: "/members" },
    { label: "Announcements", value: stats?.publishedAnnouncementCount ?? "—", sub: "published", to: "/announcements" },
    { label: "Visitors logged", value: stats?.visitorsThisMonth ?? "—", sub: "this month", to: "/visitors" },
  ];

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 600, color: TEXT }}>Dashboard</h1>
      <p style={{ margin: "0 0 8px", color: TEXT_MUTED, fontSize: 14 }}>
        Welcome back, {session.email}
      </p>
      {church && (
        <p style={{ margin: "0 0 32px", fontSize: 15, fontWeight: 500, color: TEXT }}>
          {church.name}
        </p>
      )}
      {!church && !loading && (
        <p style={{ margin: "0 0 32px", color: TEXT_MUTED, fontSize: 14 }}>Could not load church info.</p>
      )}
      {loading && !stats && (
        <p style={{ margin: "0 0 32px", color: TEXT_MUTED, fontSize: 14 }}>Loading stats...</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 16,
              padding: "20px 24px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: TEXT_MUTED,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              {card.label}
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, color: TEXT, marginBottom: 4, lineHeight: 1.1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 13, color: TEXT_MUTED }}>{card.sub}</div>
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: TEXT }}>Needs Attention</h2>
        {alerts === null ? (
          <p style={{ color: TEXT_MUTED, fontSize: 14 }}>Loading alerts...</p>
        ) : alerts.overdueVisitors.length === 0 && alerts.urgentPrayers.length === 0 ? (
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 12,
              padding: "12px 16px",
              color: TEXT_MUTED,
              fontSize: 14,
            }}
          >
            ✓ All caught up — no urgent needs right now
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.overdueVisitors.map((v) => (
              <Link
                key={`visitor-${v.id}`}
                to="/visitors"
                style={{
                  display: "block",
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  borderLeft: "3px solid rgba(217,119,6,0.6)",
                  borderRadius: "0 8px 8px 0",
                  padding: "12px 16px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: TEXT, marginBottom: 4 }}>
                  ⚠️ {[v.first_name, v.last_name].filter(Boolean).join(" ")}
                </div>
                <div style={{ fontSize: 13, color: TEXT_MUTED }}>
                  visited {v.days_since} {v.days_since === 1 ? "day" : "days"} ago · no follow-up
                </div>
              </Link>
            ))}
            {alerts.urgentPrayers.map((p) => (
              <Link
                key={`prayer-${p.id}`}
                to="/prayer-inbox"
                style={{
                  display: "block",
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  borderLeft: "3px solid rgba(220,38,38,0.6)",
                  borderRadius: "0 8px 8px 0",
                  padding: "12px 16px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: TEXT, marginBottom: 4 }}>
                  🔴 {p.is_anonymous ? "Anonymous" : (p.display_name || "Member")}
                </div>
                <div style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic", marginBottom: 4 }}>
                  {p.request.length > 80 ? `${p.request.slice(0, 80)}…` : p.request}
                </div>
                <div style={{ fontSize: 13, color: "#dc2626" }}>
                  {p.days_waiting} {p.days_waiting === 1 ? "day" : "days"}, no response
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 16,
          padding: "24px",
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: TEXT }}>Quick actions</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "View prayer inbox", to: "/prayer-inbox" },
            { label: "Post announcement", to: "/announcements" },
            { label: "Log a visitor", to: "/visitors", primary: true },
            { label: "Church settings", to: "/settings" },
            { label: "View analytics", to: "/analytics" },
          ].map(({ label, to, primary }) => (
            <QuickActionLink key={label} label={label} to={to} primary={primary} />
          ))}
        </div>
      </div>
    </div>
  );
}
