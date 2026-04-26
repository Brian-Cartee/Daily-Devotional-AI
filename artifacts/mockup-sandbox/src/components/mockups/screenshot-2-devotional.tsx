export default function Screenshot2Devotional() {
  const bg = "#0d0612";
  const card = "#1a0f22";
  const primary = "#c04ee8";
  const gold = "#e09a1a";
  const fg = "#ede8de";
  const muted = "#9988aa";
  const border = "#2e1a3d";

  const steps = [
    { number: 1, title: "Read & Receive", body: "Read today's verse slowly. Let the words settle. Don't rush — God's Word is alive and speaks when we slow down.", color: primary, icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
    { number: 2, title: "Reflect", body: "What does this verse reveal about God's character? What is He saying to you personally in this season?", color: "#9b4de0", icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> },
    { number: 3, title: "Respond in Prayer", body: "Talk to God about what you read. Thank Him, confess, or simply tell Him what's on your heart. He's listening.", color: "#7a30cc", icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { number: 4, title: "Walk It Out", body: "How can you apply this truth today? Identify one small act of obedience or one attitude to carry forward.", color: gold, icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  ];

  return (
    <div style={{ width: 1290, height: 2796, background: bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Status bar */}
      <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", flexShrink: 0 }}>
        <span style={{ color: fg, fontSize: 32, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="28" viewBox="0 0 44 28" fill="none"><rect x="0" y="8" width="8" height="20" rx="2" fill={fg} opacity="0.4"/><rect x="12" y="4" width="8" height="24" rx="2" fill={fg} opacity="0.6"/><rect x="24" y="0" width="8" height="28" rx="2" fill={fg} opacity="0.8"/><rect x="36" y="0" width="8" height="28" rx="2" fill={fg}/></svg>
          <svg width="50" height="26" viewBox="0 0 50 26" fill="none"><rect x="0.5" y="0.5" width="44" height="25" rx="5.5" stroke={fg} strokeOpacity="0.4"/><rect x="2" y="2" width="36" height="22" rx="4" fill={fg}/><path d="M46 9.5V16.5C47.381 15.972 48 14.833 48 13C48 11.167 47.381 10.028 46 9.5Z" fill={fg} fillOpacity="0.4"/></svg>
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: "28px 48px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 36 }}>
          <div style={{ width: 68, height: 68, borderRadius: 20, background: "rgba(192,78,232,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <p style={{ color: muted, fontSize: 22, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: 600 }}>Daily Devotional</p>
            <p style={{ color: fg, fontSize: 42, fontWeight: 700, margin: 0 }}>Today's Reflection</p>
          </div>
        </div>

        {/* Verse banner */}
        <div style={{ background: "linear-gradient(135deg, #2d0050 0%, #1a0f22 100%)", borderRadius: 22, padding: "36px 40px", border: `1px solid rgba(192,78,232,0.3)`, marginBottom: 36, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, top: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(192,78,232,0.1)" }} />
          <p style={{ color: muted, fontSize: 22, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 2.5 }}>Psalm 23:1–2</p>
          <p style={{ color: fg, fontSize: 32, fontStyle: "italic", lineHeight: 1.55, margin: 0 }}>
            "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures."
          </p>
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: "0 48px", display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        {steps.map((step) => (
          <div key={step.number} style={{ background: card, borderRadius: 22, padding: "30px 34px", border: `1px solid ${border}`, display: "flex", gap: 26 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: step.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {step.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <span style={{ color: step.color, fontSize: 20, fontWeight: 700, letterSpacing: 1.5 }}>STEP {step.number}</span>
                <p style={{ color: fg, fontSize: 28, fontWeight: 700, margin: 0 }}>{step.title}</p>
              </div>
              <p style={{ color: muted, fontSize: 24, lineHeight: 1.55, margin: 0 }}>{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: "28px 48px 0", flexShrink: 0 }}>
        <button style={{ width: "100%", background: primary, borderRadius: 22, padding: "34px 44px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span style={{ color: "white", fontSize: 32, fontWeight: 700 }}>Begin Today's Devotional</span>
        </button>
      </div>

      {/* Caption */}
      <div style={{ padding: "28px 60px", textAlign: "center", flexShrink: 0 }}>
        <p style={{ color: muted, fontSize: 28, lineHeight: 1.5, margin: 0 }}>
          A structured daily devotional to deepen your walk with God
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ height: 140, background: "#110818", borderTop: `1px solid ${border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-around", padding: "16px 20px 0", flexShrink: 0 }}>
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
