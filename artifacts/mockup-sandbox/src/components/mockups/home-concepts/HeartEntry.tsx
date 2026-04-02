import { useState } from "react";

const emotions = [
  { label: "Peace", icon: "🕊️", color: "#3b82f6", desc: "I need stillness" },
  { label: "Guidance", icon: "🧭", color: "#8b5cf6", desc: "I need direction" },
  { label: "Strength", icon: "⚡", color: "#f59e0b", desc: "I'm feeling weak" },
  { label: "Grief", icon: "💧", color: "#6366f1", desc: "I'm hurting" },
  { label: "Gratitude", icon: "🌿", color: "#10b981", desc: "I want to give thanks" },
];

export function HeartEntry() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center px-8 text-center"
        style={{ background: "linear-gradient(160deg, #442f74 0%, #2d1a5e 100%)" }}>
        <div className="text-5xl mb-6">🕊️</div>
        <p className="text-white/60 text-xs tracking-widest uppercase mb-4">A word for your heart</p>
        <p className="text-white text-xl leading-relaxed mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}>
          "Be still, and know that I am God."
        </p>
        <p className="text-white/50 text-sm mb-10" style={{ fontFamily: "'Playfair Display', serif" }}>
          — Psalm 46:10
        </p>
        <button className="w-full py-4 rounded-2xl text-white font-medium"
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
          Go deeper with this
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg, #442f74 0%, #2d1a5e 100%)" }}>

      <div className="flex items-center justify-between px-6 pt-14 pb-2">
        <div>
          <p className="text-white/40 text-xs tracking-widest uppercase">Shepherd's Path</p>
          <p className="text-white/30 text-xs mt-1">Wednesday morning</p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs">12 day streak</p>
          <div className="flex gap-1 mt-1 justify-end">
            {[...Array(7)].map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < 5 ? "bg-white/60" : "bg-white/15"}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
        <div className="mb-8">
          <h1 className="text-white font-light leading-snug mb-2"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem" }}>
            What's on your heart right now?
          </h1>
          <p className="text-white/40 text-sm">Your answer shapes your experience today.</p>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          {emotions.map((e) => (
            <button key={e.label}
              onClick={() => setSelected(e.label)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-200"
              style={{
                background: selected === e.label
                  ? `${e.color}30`
                  : "rgba(255,255,255,0.07)",
                border: `1px solid ${selected === e.label ? e.color + "80" : "rgba(255,255,255,0.1)"}`,
                transform: selected === e.label ? "scale(1.02)" : "scale(1)",
              }}>
              <span className="text-2xl">{e.icon}</span>
              <div className="flex-1">
                <p className="text-white font-medium text-base">{e.label}</p>
                <p className="text-white/45 text-xs mt-0.5">{e.desc}</p>
              </div>
              {selected === e.label && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: e.color }}>
                  <svg className="w-3 h-3" fill="white" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => selected && setSubmitted(true)}
          className="mt-6 w-full py-4 rounded-2xl text-white font-medium text-base transition-all duration-200"
          style={{
            background: selected ? "linear-gradient(135deg, #7A018D, #442f74)" : "rgba(255,255,255,0.08)",
            opacity: selected ? 1 : 0.5,
            boxShadow: selected ? "0 8px 32px rgba(122,1,141,0.4)" : "none",
          }}>
          Bring me a word
        </button>
      </div>
    </div>
  );
}
