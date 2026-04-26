export default function Screenshot1Home() {
  const bg = "#0d0612";
  const card = "#1a0f22";
  const primary = "#c04ee8";
  const gold = "#e09a1a";
  const fg = "#ede8de";
  const muted = "#9988aa";
  const border = "#2e1a3d";

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
      {/* Status bar */}
      <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", flexShrink: 0 }}>
        <span style={{ color: fg, fontSize: 32, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="28" viewBox="0 0 44 28" fill="none"><rect x="0" y="8" width="8" height="20" rx="2" fill={fg} opacity="0.4"/><rect x="12" y="4" width="8" height="24" rx="2" fill={fg} opacity="0.6"/><rect x="24" y="0" width="8" height="28" rx="2" fill={fg} opacity="0.8"/><rect x="36" y="0" width="8" height="28" rx="2" fill={fg}/></svg>
          <svg width="50" height="26" viewBox="0 0 50 26" fill="none"><rect x="0.5" y="0.5" width="44" height="25" rx="5.5" stroke={fg} strokeOpacity="0.4"/><rect x="2" y="2" width="36" height="22" rx="4" fill={fg}/><path d="M46 9.5V16.5C47.381 15.972 48 14.833 48 13C48 11.167 47.381 10.028 46 9.5Z" fill={fg} fillOpacity="0.4"/></svg>
        </div>
      </div>

      {/* Hero: Verse image */}
      <div style={{
        position: "relative",
        margin: "8px 32px 0",
        borderRadius: 28,
        overflow: "hidden",
        height: 920,
        flexShrink: 0,
        background: "linear-gradient(160deg, #2d0050 0%, #0d0612 40%, #1a0028 70%, #3a0060 100%)",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(192,78,232,0.38) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 80%, rgba(224,154,26,0.12) 0%, transparent 60%)" }} />
        {/* Cross shape */}
        <div style={{ position: "absolute", left: "50%", top: "10%", transform: "translateX(-50%)", opacity: 0.1 }}>
          <div style={{ width: 14, height: 340, background: "white", margin: "0 auto", borderRadius: 7 }} />
          <div style={{ width: 170, height: 14, background: "white", borderRadius: 7, marginTop: -215, marginLeft: -78 }} />
        </div>
        {/* Stars/particles */}
        {[{x:15,y:12},{x:75,y:18},{x:40,y:8},{x:85,y:25},{x:25,y:30}].map((p, i) => (
          <div key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} />
        ))}
        {/* Verse content */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "48px 52px",
          background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 50%, transparent 80%)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 24, fontWeight: 600, letterSpacing: 3.5, textTransform: "uppercase" }}>Today's Word</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 22, fontWeight: 500, letterSpacing: 2 }}>MON, APR 28</span>
          </div>
          <div style={{ width: 60, height: 3, background: primary, borderRadius: 2, marginBottom: 26, opacity: 0.9 }} />
          <p style={{ color: "#fff", fontSize: 42, fontWeight: 400, lineHeight: 1.5, margin: "0 0 22px", fontStyle: "italic" }}>
            "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures."
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 26, fontWeight: 500 }}>Psalm 23:1–2</span>
          </div>
        </div>
      </div>

      {/* Streak card */}
      <div style={{ margin: "28px 32px 0", background: card, borderRadius: 20, padding: "28px 36px", display: "flex", alignItems: "center", gap: 26, border: `1px solid ${border}`, flexShrink: 0 }}>
        <div style={{ width: 80, height: 80, borderRadius: 22, background: "rgba(224,154,26,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <div>
          <p style={{ color: muted, fontSize: 22, fontWeight: 500, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 2 }}>Day Streak</p>
          <p style={{ color: fg, fontSize: 48, fontWeight: 700, margin: 0 }}>12 days</p>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right" }}>
          <p style={{ color: muted, fontSize: 22, margin: "0 0 4px" }}>Best</p>
          <p style={{ color: fg, fontSize: 36, fontWeight: 600, margin: 0 }}>18 days</p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ margin: "24px 32px 0", display: "flex", flexDirection: "column", gap: 18, flexShrink: 0 }}>
        <button style={{ background: primary, borderRadius: 20, padding: "34px 44px", display: "flex", alignItems: "center", gap: 22, border: "none", cursor: "pointer" }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div style={{ textAlign: "left" }}>
            <p style={{ color: "white", fontSize: 30, fontWeight: 700, margin: "0 0 4px" }}>Begin Devotional</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 22, margin: 0 }}>4-step guided reflection</p>
          </div>
          <div style={{ flex: 1 }} />
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        <div style={{ display: "flex", gap: 18 }}>
          {[
            { icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, bg: "rgba(192,78,232,0.12)", title: "Prayer Wall", sub: "Pray with others" },
            { icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>, bg: "rgba(224,154,26,0.12)", title: "Guidance", sub: "AI pastoral help" },
          ].map(({ icon, bg, title, sub }) => (
            <button key={title} style={{ flex: 1, background: card, borderRadius: 20, padding: "28px 30px", display: "flex", alignItems: "center", gap: 18, border: `1px solid ${border}`, cursor: "pointer" }}>
              <div style={{ width: 62, height: 62, borderRadius: 18, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
              <div>
                <p style={{ color: fg, fontSize: 26, fontWeight: 600, margin: "0 0 4px" }}>{title}</p>
                <p style={{ color: muted, fontSize: 20, margin: 0 }}>{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Divider with verse */}
      <div style={{ margin: "32px 32px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: border }} />
          <span style={{ color: muted, fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2 }}>This Week</span>
          <div style={{ flex: 1, height: 1, background: border }} />
        </div>

        <div style={{ display: "flex", gap: 18 }}>
          {[
            { label: "Mon", active: true },
            { label: "Tue", active: true },
            { label: "Wed", active: true },
            { label: "Thu", active: false },
            { label: "Fri", active: false },
            { label: "Sat", active: false },
            { label: "Sun", active: false },
          ].map(({ label, active }) => (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 16,
                background: active ? "rgba(192,78,232,0.2)" : card,
                border: `1px solid ${active ? "rgba(192,78,232,0.5)" : border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {active && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{ color: active ? primary : muted, fontSize: 20, fontWeight: active ? 600 : 400 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quote banner */}
      <div style={{
        margin: "28px 32px 0",
        background: "linear-gradient(135deg, rgba(192,78,232,0.15) 0%, rgba(122,48,204,0.1) 100%)",
        borderRadius: 20, padding: "30px 36px",
        border: `1px solid rgba(192,78,232,0.25)`,
        flexShrink: 0,
      }}>
        <p style={{ color: fg, fontSize: 28, fontStyle: "italic", lineHeight: 1.55, margin: "0 0 14px" }}>
          "Your word is a lamp to my feet and a light to my path."
        </p>
        <p style={{ color: muted, fontSize: 22, margin: 0 }}>Psalm 119:105</p>
      </div>

      {/* Caption */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 60px" }}>
        <p style={{ color: muted, fontSize: 30, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
          Start every morning rooted in scripture
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
