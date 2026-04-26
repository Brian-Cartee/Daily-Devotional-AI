export default function Screenshot3Prayer() {
  const bg = "#0d0612";
  const card = "#1a0f22";
  const primary = "#c04ee8";
  const gold = "#e09a1a";
  const fg = "#ede8de";
  const muted = "#9988aa";
  const border = "#2e1a3d";

  const prayers = [
    { id: 1, text: "Praying for my daughter's surgery tomorrow — please stand with us for peace and healing.", count: 47, mine: true },
    { id: 2, text: "Lord, I'm struggling with anxiety and fear about the future. Please grant me your peace that passes understanding.", count: 31, mine: false },
    { id: 3, text: "Praising God for answered prayer! My husband found work after six months. He is faithful.", count: 89, mine: true },
    { id: 4, text: "Interceding for our nation's leaders. May wisdom and righteousness guide their decisions.", count: 22, mine: false },
    { id: 5, text: "Please pray for my marriage. We are going through a difficult season and need God's restoration.", count: 56, mine: false },
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
      {/* Status bar */}
      <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", flexShrink: 0 }}>
        <span style={{ color: fg, fontSize: 32, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="28" viewBox="0 0 44 28" fill="none"><rect x="0" y="8" width="8" height="20" rx="2" fill={fg} opacity="0.4"/><rect x="12" y="4" width="8" height="24" rx="2" fill={fg} opacity="0.6"/><rect x="24" y="0" width="8" height="28" rx="2" fill={fg} opacity="0.8"/><rect x="36" y="0" width="8" height="28" rx="2" fill={fg}/></svg>
          <svg width="50" height="26" viewBox="0 0 50 26" fill="none"><rect x="0.5" y="0.5" width="44" height="25" rx="5.5" stroke={fg} strokeOpacity="0.4"/><rect x="2" y="2" width="36" height="22" rx="4" fill={fg}/><path d="M46 9.5V16.5C47.381 15.972 48 14.833 48 13C48 11.167 47.381 10.028 46 9.5Z" fill={fg} fillOpacity="0.4"/></svg>
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: "24px 48px 28px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(192,78,232,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div>
              <p style={{ color: muted, fontSize: 20, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Community</p>
              <p style={{ color: fg, fontSize: 36, fontWeight: 700, margin: 0 }}>Prayer Wall</p>
            </div>
          </div>
          <button style={{
            background: primary, borderRadius: 14, padding: "14px 28px",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span style={{ color: "white", fontSize: 22, fontWeight: 600 }}>Add Prayer</span>
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
          {[
            { label: "Prayers today", value: "142" },
            { label: "Believers praying", value: "2,847" },
            { label: "Answered prayers", value: "319" },
          ].map(({ label, value }) => (
            <div key={label} style={{
              flex: 1, background: card, borderRadius: 14, padding: "18px 20px",
              border: `1px solid ${border}`, textAlign: "center",
            }}>
              <p style={{ color: primary, fontSize: 30, fontWeight: 700, margin: "0 0 4px" }}>{value}</p>
              <p style={{ color: muted, fontSize: 18, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prayer list */}
      <div style={{ padding: "0 48px", display: "flex", flexDirection: "column", gap: 16, flex: 1, overflow: "hidden" }}>
        {prayers.map((prayer) => (
          <div key={prayer.id} style={{
            background: card,
            borderRadius: 20,
            padding: "28px 32px",
            border: `1px solid ${border}`,
          }}>
            <p style={{ color: fg, fontSize: 25, lineHeight: 1.55, margin: "0 0 20px" }}>{prayer.text}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span style={{ color: muted, fontSize: 21 }}>{prayer.count} praying</span>
              </div>
              <button style={{
                background: prayer.mine ? primary : "transparent",
                borderRadius: 12, padding: "12px 24px",
                border: prayer.mine ? "none" : `1.5px solid ${border}`,
                cursor: "pointer",
              }}>
                <span style={{ color: prayer.mine ? "white" : muted, fontSize: 21, fontWeight: 600 }}>
                  {prayer.mine ? "Prayed" : "I'll pray"}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Caption */}
      <div style={{ padding: "24px 60px", textAlign: "center", flexShrink: 0 }}>
        <p style={{ color: muted, fontSize: 28, lineHeight: 1.5, margin: 0 }}>
          Lift each other up. Stand together in faith.
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
          { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: "Home", active: false },
          { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, label: "Prayer", active: true },
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
