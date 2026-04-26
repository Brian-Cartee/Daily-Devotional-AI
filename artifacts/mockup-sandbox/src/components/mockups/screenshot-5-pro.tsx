export default function Screenshot5Pro() {
  const bg = "#0d0612";
  const card = "#1a0f22";
  const primary = "#c04ee8";
  const gold = "#e09a1a";
  const fg = "#ede8de";
  const muted = "#9988aa";
  const border = "#2e1a3d";

  const features = [
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>, text: "Daily devotional with guided prayer", color: primary },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>, text: "AI-powered Bible study companion", color: "#9b4de0" },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, text: "Community prayer wall", color: "#7a30cc" },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, text: "Unlimited verse memorization", color: "#6020bb" },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, text: "Daily scripture reminders", color: gold },
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
        width: 900,
        height: 900,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(192,78,232,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Status bar */}
      <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", flexShrink: 0, position: "relative" }}>
        <span style={{ color: fg, fontSize: 32, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="28" viewBox="0 0 44 28" fill="none"><rect x="0" y="8" width="8" height="20" rx="2" fill={fg} opacity="0.4"/><rect x="12" y="4" width="8" height="24" rx="2" fill={fg} opacity="0.6"/><rect x="24" y="0" width="8" height="28" rx="2" fill={fg} opacity="0.8"/><rect x="36" y="0" width="8" height="28" rx="2" fill={fg}/></svg>
          <svg width="50" height="26" viewBox="0 0 50 26" fill="none"><rect x="0.5" y="0.5" width="44" height="25" rx="5.5" stroke={fg} strokeOpacity="0.4"/><rect x="2" y="2" width="36" height="22" rx="4" fill={fg}/><path d="M46 9.5V16.5C47.381 15.972 48 14.833 48 13C48 11.167 47.381 10.028 46 9.5Z" fill={fg} fillOpacity="0.4"/></svg>
        </div>
      </div>

      {/* Hero section */}
      <div style={{ padding: "32px 48px 0", textAlign: "center", flexShrink: 0, position: "relative" }}>
        <div style={{
          width: 96, height: 96, borderRadius: 28,
          background: "linear-gradient(135deg, #c04ee8 0%, #7a30cc 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <p style={{ color: muted, fontSize: 22, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 3, fontWeight: 600 }}>Unlock everything</p>
        <p style={{ color: fg, fontSize: 52, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.1 }}>Shepherd's Path Pro</p>
        <p style={{ color: muted, fontSize: 26, margin: 0, lineHeight: 1.5 }}>
          Go deeper in your faith with the full experience
        </p>
      </div>

      {/* Features */}
      <div style={{ padding: "36px 48px 0", display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            background: card, borderRadius: 18,
            padding: "22px 28px", border: `1px solid ${border}`,
            display: "flex", alignItems: "center", gap: 22,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: f.color, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {f.icon}
            </div>
            <p style={{ color: fg, fontSize: 26, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>{f.text}</p>
            <div style={{ marginLeft: "auto" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing cards */}
      <div style={{ padding: "32px 48px 0", display: "flex", gap: 20, flexShrink: 0 }}>
        {/* Annual — highlighted */}
        <div style={{
          flex: 1.2,
          background: "linear-gradient(140deg, rgba(192,78,232,0.2) 0%, rgba(122,1,141,0.15) 100%)",
          borderRadius: 24, padding: "28px 28px",
          border: `2px solid ${primary}`,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)",
            background: primary, borderRadius: 100, padding: "8px 24px",
          }}>
            <span style={{ color: "white", fontSize: 18, fontWeight: 700 }}>BEST VALUE</span>
          </div>
          <p style={{ color: muted, fontSize: 20, margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: 1.5 }}>Annual</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ color: fg, fontSize: 52, fontWeight: 800 }}>$34</span>
            <span style={{ color: muted, fontSize: 24 }}>/year</span>
          </div>
          <p style={{ color: primary, fontSize: 20, margin: "4px 0 0", fontWeight: 600 }}>$2.83/month — save 53%</p>
        </div>

        {/* Monthly */}
        <div style={{
          flex: 1,
          background: card, borderRadius: 24, padding: "28px 28px",
          border: `1px solid ${border}`,
        }}>
          <p style={{ color: muted, fontSize: 20, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1.5 }}>Monthly</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ color: fg, fontSize: 52, fontWeight: 800 }}>$5.99</span>
          </div>
          <p style={{ color: muted, fontSize: 20, margin: "4px 0 0" }}>per month</p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "28px 48px 0", flexShrink: 0 }}>
        <button style={{
          width: "100%", background: "linear-gradient(135deg, #c04ee8, #7a30cc)",
          borderRadius: 22, padding: "34px 40px", border: "none", cursor: "pointer",
          boxShadow: "0 8px 40px rgba(192,78,232,0.35)",
        }}>
          <span style={{ color: "white", fontSize: 32, fontWeight: 700 }}>Start Free Trial</span>
        </button>
        <p style={{ color: muted, fontSize: 21, textAlign: "center", margin: "16px 0 0" }}>7-day free trial. Cancel anytime.</p>
      </div>

      {/* Bottom caption */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
        <p style={{ color: muted, fontSize: 26, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
          Your faith journey, fully equipped
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
