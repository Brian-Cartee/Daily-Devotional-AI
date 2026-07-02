import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useChurch } from "../contexts/ChurchContext";

import type { Session } from "../App";

const SIDEBAR_BG = "#0f0b14";
const TEXT = "#ede8e0";
const TEXT_MUTED = "rgba(237, 232, 224, 0.55)";
const PURPLE_EYEBROW = "rgba(196, 78, 224, 0.7)";
const PURPLE_ACTIVE_BG = "rgba(196, 78, 224, 0.12)";
const PURPLE_ACTIVE_TEXT = "#d8b4fe";
const PAGE_BG = "#0d0612";

interface Props {
  session: Session;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/prayer-inbox", label: "Prayer Inbox" },
  { to: "/visitors", label: "Visitors" },
  { to: "/care-requests", label: "Care Requests" },
  { to: "/announcements", label: "Announcements" },
  { to: "/members", label: "Members" },
  { to: "/settings", label: "Profile" },
  { to: "/resources", label: "Resources" },
  { to: "/prayer-settings", label: "Prayer Wall" },
  { to: "/small-groups", label: "Small Groups" },
  { to: "/sermon-followup", label: "Sermon Follow-up" },
  { to: "/analytics", label: "Analytics" },
];

function SidebarNavLink({ to, label, onNavigate }: { to: string; label: string; onNavigate?: () => void }) {
  const [hover, setHover] = useState(false);

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={({ isActive }) => ({
        display: "block",
        padding: "10px 20px",
        fontSize: 14,
        color: isActive ? PURPLE_ACTIVE_TEXT : hover ? TEXT : "rgba(237, 232, 224, 0.65)",
        background: isActive ? PURPLE_ACTIVE_BG : hover ? "rgba(255,255,255,0.04)" : "transparent",
        textDecoration: "none",
        fontWeight: isActive ? 500 : 400,
        borderLeft: isActive ? "3px solid rgba(196, 78, 224, 0.6)" : "3px solid transparent",
        borderRadius: isActive ? "0 8px 8px 0" : 0,
        whiteSpace: "nowrap",
        transition: "background 0.15s ease, color 0.15s ease",
      })}
    >
      {label}
    </NavLink>
  );
}

function SignOutButton({ onLogout, fullWidth = false }: { onLogout: () => void; fullWidth?: boolean }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onLogout}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "transparent",
        color: hover ? TEXT : TEXT_MUTED,
        padding: fullWidth ? "6px 0" : "6px 0",
        fontSize: 13,
        fontWeight: 400,
        width: fullWidth ? "100%" : "auto",
        textAlign: fullWidth ? "left" : "left",
        border: "none",
        cursor: "pointer",
        transition: "color 0.15s ease",
      }}
    >
      Sign out
    </button>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label }) => (
        <SidebarNavLink key={to} to={to} label={label} onNavigate={onNavigate} />
      ))}
    </>
  );
}

export default function Layout({ session, onLogout }: Props) {
  const { church } = useChurch();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: PAGE_BG }}>
      {/* Mobile top bar */}
      <header
        style={{
          display: "none",
          background: SIDEBAR_BG,
          color: TEXT,
          padding: "12px 16px",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
        className="church-mobile-header"
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: PURPLE_EYEBROW,
            }}
          >
            Shepherd&apos;s Path
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: TEXT }}>
            {church?.name ?? "Church Admin"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: TEXT,
            padding: "8px 12px",
            fontSize: 18,
            lineHeight: 1,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
          }}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>

      {menuOpen && (
        <nav
          style={{
            display: "none",
            background: SIDEBAR_BG,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
          className="church-mobile-nav"
        >
          <div style={{ display: "flex", flexDirection: "column", minWidth: "max-content" }}>
            <NavItems onNavigate={() => setMenuOpen(false)} />
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 8 }}>{session.email}</div>
              <SignOutButton onLogout={onLogout} fullWidth />
            </div>
          </div>
        </nav>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside
          style={{
            width: 220,
            background: SIDEBAR_BG,
            color: TEXT,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
          className="church-sidebar"
        >
          <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: PURPLE_EYEBROW,
                marginBottom: 6,
              }}
            >
              Shepherd&apos;s Path
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3, color: TEXT }}>
              {church?.name ?? "Church Admin"}
            </div>
          </div>

          <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
            <NavItems />
          </nav>

          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 13 }}>
            <div
              style={{
                color: TEXT_MUTED,
                marginBottom: 8,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session.email}
            </div>
            <SignOutButton onLogout={onLogout} fullWidth />
          </div>
        </aside>

        <main
          style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: PAGE_BG, color: TEXT }}
          className="church-main"
        >
          {session.isDemo && (
            <div
              style={{
                background: "rgba(217, 119, 6, 0.12)",
                borderBottom: "1px solid rgba(217, 119, 6, 0.25)",
                padding: "10px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                fontSize: 13,
                color: "#fbbf24",
                flexShrink: 0,
              }}
            >
              <span>
                <strong>You&apos;re exploring a live demo</strong> — this is Grace Community Church. Data resets periodically. Write actions are disabled.
              </span>
              <a
                href="https://admin.shepherdspathai.com"
                style={{ color: "#fbbf24", fontWeight: 600, whiteSpace: "nowrap", textDecoration: "underline" }}
              >
                Set up your church →
              </a>
            </div>
          )}
          <div style={{ flex: 1, padding: "24px 20px" }}>
            <Outlet />
          </div>
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
