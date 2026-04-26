export default function Screenshot5Pro() {
  const bg = "#0d0612";
  const card = "#1a0f22";
  const primary = "#c04ee8";
  const gold = "#e09a1a";
  const fg = "#ede8de";
  const muted = "#9988aa";
  const border = "#2e1a3d";
  const green = "#22c55e";

  const features = [
    {
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      ),
      title: "Unlimited AI Guidance",
      sub: "Unlimited daily conversations — free users get 3/day",
      color: primary,
    },
    {
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
        </svg>
      ),
      title: "Personalized Faith Journeys",
      sub: "Adaptive, multi-week plans built around your spiritual goals",
      color: "#9b4de0",
    },
    {
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      title: "Exclusive Sermon Library",
      sub: "Curated teachings, series, and deep-dive studies",
      color: gold,
    },
    {
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
      ),
      title: "Spiritual Growth Insights",
      sub: "Track streaks, milestones, and reflections over time",
      color: "#7a30cc",
    },
    {
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      title: "Ad-Free & Offline Access",
      sub: "Distraction-free faith. Works anywhere, even without signal",
      color: "#5b8dee",
    },
  ];

  return (
    <div style={{
      width: 1290,
      height: 2796,
      background: bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Decorative glow */}
      <div style={{
        position: "absolute",
        top: -300,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1200,
        height: 1100,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(192,78,232,0.14) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Status bar */}
      <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px", flexShrink: 0 }}>
        <span style={{ color: fg, fontSize: 36, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="50" height="32" viewBox="0 0 44 28" fill="none"><rect x="0" y="8" width="8" height="20" rx="2" fill={fg} opacity="0.4"/><rect x="12" y="4" width="8" height="24" rx="2" fill={fg} opacity="0.6"/><rect x="24" y="0" width="8" height="28" rx="2" fill={fg} opacity="0.8"/><rect x="36" y="0" width="8" height="28" rx="2" fill={fg}/></svg>
          <svg width="56" height="30" viewBox="0 0 50 26" fill="none"><rect x="0.5" y="0.5" width="44" height="25" rx="5.5" stroke={fg} strokeOpacity="0.4"/><rect x="2" y="2" width="36" height="22" rx="4" fill={fg}/><path d="M46 9.5V16.5C47.381 15.972 48 14.833 48 13C48 11.167 47.381 10.028 46 9.5Z" fill={fg} fillOpacity="0.4"/></svg>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "52px 56px 0", textAlign: "center", flexShrink: 0 }}>
        <div style={{
          width: 132, height: 132, borderRadius: 38,
          background: "linear-gradient(145deg, #c04ee8 0%, #7a30cc 60%, #4a1880 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 32px",
          boxShadow: "0 0 60px rgba(192,78,232,0.55), 0 0 28px rgba(192,78,232,0.3)",
        }}>
          <svg width="82" height="76" viewBox="0 0 62 58" fill="none">
            <line x1="31" y1="6" x2="4" y2="52" stroke="white" strokeWidth="11" strokeLinecap="round"/>
            <line x1="31" y1="6" x2="58" y2="52" stroke="white" strokeWidth="11" strokeLinecap="round"/>
            <line x1="31" y1="9" x2="7" y2="50" stroke="rgba(255,255,255,0.25)" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ color: primary, fontSize: 26, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 4, fontWeight: 700 }}>Shepherd's Path Pro</p>
        <p style={{ color: fg, fontSize: 62, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.08 }}>Go deeper.<br/>Grow stronger.</p>
        <p style={{ color: muted, fontSize: 30, margin: 0, lineHeight: 1.5, padding: "0 20px" }}>
          Everything you need for a more intentional faith walk
        </p>
      </div>

      {/* Features */}
      <div style={{ padding: "48px 56px 0", display: "flex", flexDirection: "column", gap: 20, flexShrink: 0 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            background: card, borderRadius: 22,
            padding: "28px 32px",
            border: `1px solid ${border}`,
            display: "flex", alignItems: "center", gap: 26,
          }}>
            <div style={{
              width: 70, height: 70, borderRadius: 20,
              background: f.color, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {f.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: fg, fontSize: 29, fontWeight: 700, margin: "0 0 6px" }}>{f.title}</p>
              <p style={{ color: muted, fontSize: 23, margin: 0, lineHeight: 1.35 }}>{f.sub}</p>
            </div>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        ))}
      </div>

      {/* Ministry mission banner */}
      <div style={{
        margin: "36px 56px 0",
        background: "linear-gradient(135deg, rgba(224,154,26,0.13) 0%, rgba(192,78,232,0.10) 100%)",
        borderRadius: 24,
        border: "1px solid rgba(224,154,26,0.45)",
        padding: "34px 36px",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 17, flexShrink: 0,
            background: "rgba(224,154,26,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={gold} fillOpacity="0.25"/>
            </svg>
          </div>
          <p style={{ color: gold, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: 0.3 }}>
            You're funding the mission
          </p>
        </div>
        <p style={{ color: fg, fontSize: 25, margin: "0 0 12px", lineHeight: 1.55, fontWeight: 500 }}>
          Pro subscribers are the reason Shepherd's Path stays{" "}
          <span style={{ color: gold, fontWeight: 700 }}>completely free</span> for the thousands who need it most.
        </p>
        <p style={{ color: muted, fontSize: 23, margin: 0, lineHeight: 1.5 }}>
          Every subscription directly supports this ministry — extending its reach to people who could never pay for it.
        </p>
      </div>

      {/* Pricing */}
      <div style={{ padding: "30px 56px 0", display: "flex", gap: 22, flexShrink: 0 }}>
        {/* Annual */}
        <div style={{
          flex: 1.2,
          background: "linear-gradient(140deg, rgba(192,78,232,0.2) 0%, rgba(122,1,141,0.15) 100%)",
          borderRadius: 26, padding: "36px 32px",
          border: `2px solid ${primary}`,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
            background: primary, borderRadius: 100, padding: "9px 28px",
            whiteSpace: "nowrap",
          }}>
            <span style={{ color: "white", fontSize: 22, fontWeight: 700 }}>BEST VALUE</span>
          </div>
          <p style={{ color: muted, fontSize: 23, margin: "14px 0 8px", textTransform: "uppercase", letterSpacing: 1.5 }}>Annual</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ color: fg, fontSize: 58, fontWeight: 800 }}>$44.99</span>
            <span style={{ color: muted, fontSize: 26 }}>/yr</span>
          </div>
          <p style={{ color: primary, fontSize: 23, margin: "6px 0 0", fontWeight: 600 }}>$3.75/mo — save 37%</p>
        </div>

        {/* Monthly */}
        <div style={{
          flex: 1,
          background: card, borderRadius: 26, padding: "36px 32px",
          border: `1px solid ${border}`,
        }}>
          <p style={{ color: muted, fontSize: 23, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1.5 }}>Monthly</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ color: fg, fontSize: 58, fontWeight: 800 }}>$5.99</span>
          </div>
          <p style={{ color: muted, fontSize: 23, margin: "6px 0 0" }}>per month</p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "28px 56px 0", flexShrink: 0 }}>
        <button style={{
          width: "100%",
          background: "linear-gradient(135deg, #c04ee8, #7a30cc)",
          borderRadius: 24, padding: "42px 48px", border: "none", cursor: "pointer",
          boxShadow: "0 10px 50px rgba(192,78,232,0.4)",
        }}>
          <span style={{ color: "white", fontSize: 36, fontWeight: 700 }}>Start Free Trial</span>
        </button>
        <p style={{ color: muted, fontSize: 24, textAlign: "center", margin: "18px 0 0" }}>
          7-day free trial. Cancel anytime. No commitment.
        </p>
      </div>

      {/* Scripture closer */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
      }}>
        <div style={{
          width: 48,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${border}, transparent)`,
          marginBottom: 32,
        }} />
        <p style={{
          color: muted,
          fontSize: 26,
          textAlign: "center",
          lineHeight: 1.6,
          margin: "0 0 16px",
          fontStyle: "italic",
          opacity: 0.85,
        }}>
          "As iron sharpens iron, so one person sharpens another."
        </p>
        <p style={{ color: "#5a4a6a", fontSize: 22, margin: 0, fontWeight: 500 }}>Proverbs 27:17</p>
      </div>

      {/* Tab bar */}
      <div style={{
        height: 160,
        background: "#110818",
        borderTop: `1px solid ${border}`,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-around",
        padding: "20px 20px 0",
        flexShrink: 0,
      }}>
        {[
          { icon: <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: "Home", active: true },
          { icon: <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, label: "Prayer", active: false },
          { icon: <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>, label: "Settings", active: false },
        ].map(({ icon, label, active }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 120 }}>
            {icon}
            <span style={{ fontSize: 24, color: active ? primary : muted, fontWeight: active ? 600 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
