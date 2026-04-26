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
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
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
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
        </svg>
      ),
      title: "Personalized Faith Journeys",
      sub: "Adaptive, multi-week plans built around your spiritual goals",
      color: "#9b4de0",
    },
    {
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      title: "Exclusive Sermon Library",
      sub: "Curated teachings, series, and deep-dive studies",
      color: gold,
    },
    {
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
      ),
      title: "Spiritual Growth Insights",
      sub: "Track streaks, milestones, and reflections over time",
      color: "#7a30cc",
    },
    {
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
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
        top: -200,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1000,
        height: 900,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(192,78,232,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Status bar */}
      <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", flexShrink: 0 }}>
        <span style={{ color: fg, fontSize: 32, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="28" viewBox="0 0 44 28" fill="none"><rect x="0" y="8" width="8" height="20" rx="2" fill={fg} opacity="0.4"/><rect x="12" y="4" width="8" height="24" rx="2" fill={fg} opacity="0.6"/><rect x="24" y="0" width="8" height="28" rx="2" fill={fg} opacity="0.8"/><rect x="36" y="0" width="8" height="28" rx="2" fill={fg}/></svg>
          <svg width="50" height="26" viewBox="0 0 50 26" fill="none"><rect x="0.5" y="0.5" width="44" height="25" rx="5.5" stroke={fg} strokeOpacity="0.4"/><rect x="2" y="2" width="36" height="22" rx="4" fill={fg}/><path d="M46 9.5V16.5C47.381 15.972 48 14.833 48 13C48 11.167 47.381 10.028 46 9.5Z" fill={fg} fillOpacity="0.4"/></svg>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "24px 48px 0", textAlign: "center", flexShrink: 0 }}>
        <div style={{
          width: 88, height: 88, borderRadius: 26,
          background: "linear-gradient(135deg, #c04ee8 0%, #7a30cc 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "0 0 40px rgba(192,78,232,0.4)",
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <p style={{ color: primary, fontSize: 20, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>Shepherd's Path Pro</p>
        <p style={{ color: fg, fontSize: 48, fontWeight: 800, margin: "0 0 10px", lineHeight: 1.1 }}>Go deeper.<br/>Grow stronger.</p>
        <p style={{ color: muted, fontSize: 24, margin: 0, lineHeight: 1.5, padding: "0 20px" }}>
          Everything you need for a more intentional faith walk
        </p>
      </div>

      {/* Features */}
      <div style={{ padding: "24px 48px 0", display: "flex", flexDirection: "column", gap: 14, flexShrink: 0 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            background: card, borderRadius: 18,
            padding: "20px 24px",
            border: `1px solid ${border}`,
            display: "flex", alignItems: "center", gap: 20,
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16,
              background: f.color, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {f.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: fg, fontSize: 25, fontWeight: 700, margin: "0 0 4px" }}>{f.title}</p>
              <p style={{ color: muted, fontSize: 20, margin: 0, lineHeight: 1.35 }}>{f.sub}</p>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        ))}
      </div>

      {/* Ministry mission banner */}
      <div style={{
        margin: "20px 48px 0",
        background: `linear-gradient(135deg, rgba(224,154,26,0.13) 0%, rgba(192,78,232,0.10) 100%)`,
        borderRadius: 20,
        border: `1px solid rgba(224,154,26,0.45)`,
        padding: "26px 30px",
        flexShrink: 0,
      }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: "rgba(224,154,26,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={gold} fillOpacity="0.25"/>
            </svg>
          </div>
          <p style={{ color: gold, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: 0.3 }}>
            You're funding the mission
          </p>
        </div>
        <p style={{ color: fg, fontSize: 21, margin: "0 0 10px", lineHeight: 1.55, fontWeight: 500 }}>
          Pro subscribers are the reason Shepherd's Path stays <span style={{ color: gold, fontWeight: 700 }}>completely free</span> for the thousands who need it most.
        </p>
        <p style={{ color: muted, fontSize: 19, margin: 0, lineHeight: 1.5 }}>
          Every subscription directly supports this ministry — extending its reach to people who could never pay for it.
        </p>
      </div>

      {/* Pricing */}
      <div style={{ padding: "18px 48px 0", display: "flex", gap: 18, flexShrink: 0 }}>
        {/* Annual */}
        <div style={{
          flex: 1.2,
          background: "linear-gradient(140deg, rgba(192,78,232,0.2) 0%, rgba(122,1,141,0.15) 100%)",
          borderRadius: 22, padding: "26px 26px",
          border: `2px solid ${primary}`,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)",
            background: primary, borderRadius: 100, padding: "7px 22px",
            whiteSpace: "nowrap",
          }}>
            <span style={{ color: "white", fontSize: 18, fontWeight: 700 }}>BEST VALUE</span>
          </div>
          <p style={{ color: muted, fontSize: 19, margin: "14px 0 6px", textTransform: "uppercase", letterSpacing: 1.5 }}>Annual</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ color: fg, fontSize: 48, fontWeight: 800 }}>$44.99</span>
            <span style={{ color: muted, fontSize: 22 }}>/yr</span>
          </div>
          <p style={{ color: primary, fontSize: 19, margin: "4px 0 0", fontWeight: 600 }}>$3.75/mo — save 37%</p>
        </div>

        {/* Monthly */}
        <div style={{
          flex: 1,
          background: card, borderRadius: 22, padding: "26px 26px",
          border: `1px solid ${border}`,
        }}>
          <p style={{ color: muted, fontSize: 19, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1.5 }}>Monthly</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ color: fg, fontSize: 48, fontWeight: 800 }}>$5.99</span>
          </div>
          <p style={{ color: muted, fontSize: 19, margin: "4px 0 0" }}>per month</p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "18px 48px 0", flexShrink: 0 }}>
        <button style={{
          width: "100%",
          background: "linear-gradient(135deg, #c04ee8, #7a30cc)",
          borderRadius: 20, padding: "32px 40px", border: "none", cursor: "pointer",
          boxShadow: "0 8px 40px rgba(192,78,232,0.35)",
        }}>
          <span style={{ color: "white", fontSize: 30, fontWeight: 700 }}>Start Free Trial</span>
        </button>
        <p style={{ color: muted, fontSize: 20, textAlign: "center", margin: "12px 0 0" }}>
          7-day free trial. Cancel anytime. No commitment.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        height: 140,
        background: "#110818",
        borderTop: `1px solid ${border}`,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-around",
        padding: "16px 20px 0",
        flexShrink: 0,
        marginTop: "auto",
      }}>
        {[
          { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: "Home", active: true },
          { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, label: "Prayer", active: false },
          { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>, label: "Settings", active: false },
        ].map(({ icon, label, active }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 100 }}>
            {icon}
            <span style={{ fontSize: 20, color: active ? primary : muted, fontWeight: active ? 600 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
