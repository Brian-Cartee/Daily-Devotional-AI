import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useChurch } from "../contexts/ChurchContext";
import { api, type DashboardAlerts } from "../lib/api";

interface Props {
  session: { email: string; churchId: string; role: string };
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
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 600 }}>Dashboard</h1>
      <p style={{ margin: "0 0 8px", color: "#6b7280", fontSize: 14 }}>
        Welcome back, {session.email}
      </p>
      {church && (
        <p style={{ margin: "0 0 32px", fontSize: 15, fontWeight: 500, color: "#1b4332" }}>
          {church.name}
        </p>
      )}
      {!church && !loading && (
        <p style={{ margin: "0 0 32px", color: "#9ca3af", fontSize: 14 }}>Could not load church info.</p>
      )}
      {loading && !stats && (
        <p style={{ margin: "0 0 32px", color: "#9ca3af", fontSize: 14 }}>Loading stats...</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            style={{
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
              padding: "20px 24px", textDecoration: "none", color: "inherit",
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, color: "#1b4332", marginBottom: 4 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{card.sub}</div>
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Needs Attention</h2>
        {alerts === null ? (
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading alerts...</p>
        ) : alerts.overdueVisitors.length === 0 && alerts.urgentPrayers.length === 0 ? (
          <div
            style={{
              background: "#e8f5ee",
              border: "1px solid #b7e4c7",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#1b4332",
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
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "12px 16px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1b4332", marginBottom: 4 }}>
                  ⚠️ {[v.first_name, v.last_name].filter(Boolean).join(" ")}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
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
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "12px 16px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1b4332", marginBottom: 4 }}>
                  🔴 {p.is_anonymous ? "Anonymous" : (p.display_name || "Member")}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic", marginBottom: 4 }}>
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

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "24px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Quick actions</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "View prayer inbox", to: "/prayer-inbox" },
            { label: "Post announcement", to: "/announcements" },
            { label: "Log a visitor", to: "/visitors" },
            { label: "Church settings", to: "/settings" },
            { label: "View analytics", to: "/analytics" },
          ].map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              style={{
                display: "inline-block", background: "#e8f5ee", color: "#2d6a4f",
                padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
