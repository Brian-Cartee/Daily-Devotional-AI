import { Link } from "react-router-dom";
import { useChurch } from "../contexts/ChurchContext";

interface Props {
  session: { email: string; churchId: string; role: string };
}

export default function DashboardPage({ session }: Props) {
  const { church, stats, loading } = useChurch();

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
