import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useChurch } from "../contexts/ChurchContext";

interface Props {
  session: { email: string; churchId: string; role: string };
  onLogout: () => void;
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/prayer-inbox", label: "Prayer Inbox" },
  { to: "/visitors", label: "Visitors" },
  { to: "/announcements", label: "Announcements" },
  { to: "/members", label: "Members" },
  { to: "/settings", label: "Profile" },
  { to: "/resources", label: "Resources" },
  { to: "/prayer-settings", label: "Prayer Wall" },
  { to: "/small-groups", label: "Small Groups" },
  { to: "/sermon-followup", label: "Sermon Follow-up" },
  { to: "/analytics", label: "Analytics" },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          style={({ isActive }) => ({
            display: "block",
            padding: "10px 20px",
            fontSize: 14,
            color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
            background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
            textDecoration: "none",
            fontWeight: isActive ? 500 : 400,
            borderLeft: isActive ? "3px solid #74c69d" : "3px solid transparent",
            whiteSpace: "nowrap",
          })}
        >
          {label}
        </NavLink>
      ))}
    </>
  );
}

export default function Layout({ session, onLogout }: Props) {
  const { church } = useChurch();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Mobile top bar */}
      <header
        style={{
          display: "none",
          background: "#1b4332",
          color: "#fff",
          padding: "12px 16px",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
        className="church-mobile-header"
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.5)" }}>
            Shepherd's Path
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {church?.name ?? "Church Admin"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          style={{ background: "rgba(255,255,255,0.12)", color: "#fff", padding: "8px 12px", fontSize: 18, lineHeight: 1 }}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>

      {menuOpen && (
        <nav
          style={{
            display: "none",
            background: "#1b4332",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
          className="church-mobile-nav"
        >
          <div style={{ display: "flex", flexDirection: "column", minWidth: "max-content" }}>
            <NavItems onNavigate={() => setMenuOpen(false)} />
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{session.email}</div>
              <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", padding: "6px 14px", fontSize: 13, width: "100%" }}>
                Sign out
              </button>
            </div>
          </div>
        </nav>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside
          style={{
            width: 220,
            background: "#1b4332",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
          className="church-sidebar"
        >
          <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
              Shepherd's Path
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>
              {church?.name ?? "Church Admin"}
            </div>
          </div>

          <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
            <NavItems />
          </nav>

          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 13 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.email}
            </div>
            <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", padding: "6px 14px", fontSize: 13, width: "100%" }}>
              Sign out
            </button>
          </div>
        </aside>

        <main style={{ flex: 1, padding: "24px 20px", overflowY: "auto" }} className="church-main">
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .church-sidebar { display: none !important; }
          .church-mobile-header { display: flex !important; }
          .church-mobile-nav { display: block !important; }
          .church-main { padding: 20px 16px !important; }
        }
      `}</style>
    </div>
  );
}
