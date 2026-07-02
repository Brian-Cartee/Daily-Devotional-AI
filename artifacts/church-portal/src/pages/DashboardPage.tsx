import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useChurch } from "../contexts/ChurchContext";
import { api, type DashboardAlerts } from "../lib/api";

const HEADING = "#1a1520";
const SUBTEXT = "#6b7280";
const CARD_BG = "#ffffff";
const CARD_BORDER = "#e5e7eb";
const LABEL = "#9ca3af";
const NUMBER = "#111827";
const BODY = "#6b7280";

interface Props {
  session: { email: string; churchId: string; role: string };
}

function QuickActionLink({ label, to, primary = false }: { label: string; to: string; primary?: boolean }) {
  const [hover, setHover] = useState(false);

  const baseStyle = {
    display: "inline-block" as const,
    background: CARD_BG,
    borderRadius: "10px",
    padding: "14px 20px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    transition: "border-color 0.15s ease, color 0.15s ease",
    ...(primary
      ? {
          border: "1px solid rgba(217,119,6,0.4)",
          color: "#d97706",
        }
      : {
          border: `1px solid ${hover ? "rgba(196, 78, 224, 0.4)" : CARD_BORDER}`,
          color: hover ? "#7c3aed" : "#374151",
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
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: HEADING }}>Dashboard</h1>
      <p style={{ margin: "0 0 8px", color: SUBTEXT, fontSize: 14 }}>
        Welcome back, {session.email}
      </p>
      {church && (
        <p style={{ margin: "0 0 32px", fontSize: 14, color: SUBTEXT }}>
          {church.name}
        </p>
      )}
      {!church && !loading && (
        <p style={{ margin: "0 0 32px", color: SUBTEXT, fontSize: 14 }}>Could not load church info.</p>
      )}
      {loading && !stats && (
        <p style={{ margin: "0 0 32px", color: SUBTEXT, fontSize: 14 }}>Loading stats...</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              padding: "20px 24px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: LABEL,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              {card.label}
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, color: NUMBER, marginBottom: 4, lineHeight: 1.1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 13, color: LABEL }}>{card.sub}</div>
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: HEADING }}>Needs Attention</h2>
        {alerts === null ? (
          <p style={{ color: SUBTEXT, fontSize: 14 }}>Loading alerts...</p>
        ) : alerts.overdueVisitors.length === 0 && alerts.urgentPrayers.length === 0 ? (
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 12,
              padding: "12px 16px",
              color: SUBTEXT,
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
                  borderLeft: "3px solid #f59e0b",
                  borderRadius: 12,
                  padding: "12px 16px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: NUMBER, marginBottom: 4 }}>
                  ⚠️ {[v.first_name, v.last_name].filter(Boolean).join(" ")}
                </div>
                <div style={{ fontSize: 13, color: BODY }}>
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
                  borderLeft: "3px solid #dc2626",
                  borderRadius: 12,
                  padding: "12px 16px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: NUMBER, marginBottom: 4 }}>
                  🔴 {p.is_anonymous ? "Anonymous" : (p.display_name || "Member")}
                </div>
                <div style={{ fontSize: 13, color: BODY, fontStyle: "italic", marginBottom: 4 }}>
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

      <div>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: HEADING }}>Quick actions</h2>
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
