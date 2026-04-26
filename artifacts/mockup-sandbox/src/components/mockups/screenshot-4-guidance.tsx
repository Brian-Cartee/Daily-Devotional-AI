export default function Screenshot4Guidance() {
  const bg = "#0d0612";
  const card = "#1a0f22";
  const primary = "#c04ee8";
  const gold = "#e09a1a";
  const fg = "#ede8de";
  const muted = "#9988aa";
  const border = "#2e1a3d";

  const messages = [
    {
      role: "user",
      text: "I've been struggling with forgiveness. There's someone who hurt me deeply and I feel like I can't let go. What does the Bible say about this?",
    },
    {
      role: "assistant",
      text: "I hear the weight in what you're carrying, and I want you to know that struggling with forgiveness is one of the most human experiences there is.\n\nJesus spoke about this directly in Matthew 18:21–22, when Peter asked how many times he should forgive — and Jesus answered, 'seventy times seven.' Not a limit, but a posture of the heart.\n\nForgiveness in Scripture isn't about excusing what was done to you. Colossians 3:13 says, 'Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.'\n\nThe key insight: forgiveness is something God empowers you to do — not something you must manufacture on your own. It begins with a choice, but it is sustained by grace.\n\nWould you like to pray through this together, or explore what Scripture says about healing after being hurt?",
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
      {/* Status bar */}
      <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", flexShrink: 0 }}>
        <span style={{ color: fg, fontSize: 32, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="28" viewBox="0 0 44 28" fill="none"><rect x="0" y="8" width="8" height="20" rx="2" fill={fg} opacity="0.4"/><rect x="12" y="4" width="8" height="24" rx="2" fill={fg} opacity="0.6"/><rect x="24" y="0" width="8" height="28" rx="2" fill={fg} opacity="0.8"/><rect x="36" y="0" width="8" height="28" rx="2" fill={fg}/></svg>
          <svg width="50" height="26" viewBox="0 0 50 26" fill="none"><rect x="0.5" y="0.5" width="44" height="25" rx="5.5" stroke={fg} strokeOpacity="0.4"/><rect x="2" y="2" width="36" height="22" rx="4" fill={fg}/><path d="M46 9.5V16.5C47.381 15.972 48 14.833 48 13C48 11.167 47.381 10.028 46 9.5Z" fill={fg} fillOpacity="0.4"/></svg>
        </div>
      </div>

      {/* Header */}
      <div style={{
        padding: "20px 48px 20px",
        borderBottom: `1px solid ${border}`,
        display: "flex", alignItems: "center", gap: 20, flexShrink: 0,
      }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, #c04ee8, #7a30cc)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <p style={{ color: fg, fontSize: 30, fontWeight: 700, margin: "0 0 4px" }}>Pastoral Guidance</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
            <p style={{ color: muted, fontSize: 20, margin: 0 }}>Scripture-rooted counsel</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, padding: "32px 48px", display: "flex", flexDirection: "column", gap: 32, overflow: "hidden" }}>
        {/* Suggested topics */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["Forgiveness", "Anxiety & fear", "Purpose", "Marriage", "Grief"].map((topic) => (
            <div key={topic} style={{
              background: card, borderRadius: 100,
              padding: "12px 24px", border: `1px solid ${border}`,
            }}>
              <span style={{ color: muted, fontSize: 20 }}>{topic}</span>
            </div>
          ))}
        </div>

        {/* User message */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{
            background: "rgba(192,78,232,0.2)",
            borderRadius: "20px 20px 6px 20px",
            padding: "22px 28px",
            maxWidth: "78%",
            border: `1px solid rgba(192,78,232,0.3)`,
          }}>
            <p style={{ color: fg, fontSize: 24, lineHeight: 1.6, margin: 0 }}>{messages[0].text}</p>
          </div>
        </div>

        {/* AI response */}
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg, #c04ee8, #7a30cc)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style={{
            background: card,
            borderRadius: "6px 20px 20px 20px",
            padding: "24px 28px",
            border: `1px solid ${border}`,
            flex: 1,
          }}>
            <p style={{ color: fg, fontSize: 23, lineHeight: 1.65, margin: 0, whiteSpace: "pre-line" }}>{messages[1].text}</p>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div style={{
        padding: "16px 48px 24px",
        borderTop: `1px solid ${border}`,
        flexShrink: 0,
      }}>
        <div style={{
          background: card,
          borderRadius: 20,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          border: `1px solid ${border}`,
        }}>
          <p style={{ color: muted, fontSize: 24, margin: 0, flex: 1 }}>Ask for guidance or prayer...</p>
          <button style={{
            width: 56, height: 56, borderRadius: 14,
            background: primary, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

      {/* Caption */}
      <div style={{ padding: "8px 60px 20px", textAlign: "center", flexShrink: 0 }}>
        <p style={{ color: muted, fontSize: 26, lineHeight: 1.5, margin: 0 }}>
          Pastoral counsel grounded in Scripture, available whenever you need it
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
