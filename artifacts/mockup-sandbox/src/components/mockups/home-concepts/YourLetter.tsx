import { useState } from "react";

const sections = [
  { id: "devotional", icon: "📖", label: "Today's Devotional", sub: "Genesis 1 — Day 4" },
  { id: "prayer", icon: "🙏", label: "Prayer Wall", sub: "247 praying right now" },
  { id: "journey", icon: "🗺️", label: "Bible Journey", sub: "12 days in — keep going" },
  { id: "journal", icon: "✍️", label: "My Journal", sub: "Last entry: 2 days ago" },
];

export function YourLetter() {
  const [tapped, setTapped] = useState<string | null>(null);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: "#faf8f5" }}>

      <div className="px-6 pt-14 pb-5"
        style={{ background: "linear-gradient(160deg, #442f74 0%, #2d1a5e 100%)" }}>
        <p className="text-white/50 text-xs tracking-widest uppercase mb-1">Shepherd's Path</p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-white font-light" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem" }}>
              Good morning,
            </h1>
            <h1 className="text-white" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem" }}>
              friend.
            </h1>
          </div>
          <div className="text-right pb-1">
            <p className="text-white/50 text-xs">Your journey</p>
            <p className="text-white text-2xl font-light">12 <span className="text-sm text-white/60">days</span></p>
          </div>
        </div>
      </div>

      <div className="mx-6 -mt-4 rounded-2xl p-5 shadow-sm"
        style={{ background: "white", border: "1px solid rgba(68,47,116,0.08)" }}>
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "#442f74", opacity: 0.5 }}>
          A word prepared for you today
        </p>
        <p className="leading-relaxed text-gray-800 mb-3"
          style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem" }}>
          "You've been carrying something this week. God sees it. Here is what He wants you to know today —"
        </p>
        <div className="pl-4 border-l-2 mb-3" style={{ borderColor: "#442f74" }}>
          <p className="text-gray-700 italic text-sm leading-relaxed"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            "Cast all your anxiety on Him because He cares for you."
          </p>
          <p className="text-gray-400 text-xs mt-1">— 1 Peter 5:7</p>
        </div>
        <button className="w-full py-3 rounded-xl text-white text-sm font-medium mt-1"
          style={{ background: "linear-gradient(135deg, #7A018D, #442f74)" }}>
          Go deeper with this word
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 pt-5 pb-6">
        <p className="text-xs tracking-widest uppercase mb-3 text-gray-400">Where would you like to go?</p>
        <div className="grid grid-cols-2 gap-3">
          {sections.map((s) => (
            <button key={s.id}
              onClick={() => setTapped(s.id)}
              className="flex flex-col items-start p-4 rounded-2xl text-left transition-all duration-150"
              style={{
                background: tapped === s.id ? "#f0ebf8" : "white",
                border: `1px solid ${tapped === s.id ? "#442f74" : "rgba(0,0,0,0.06)"}`,
                boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
              }}>
              <span className="text-2xl mb-2">{s.icon}</span>
              <p className="font-medium text-gray-800 text-sm leading-tight">{s.label}</p>
              <p className="text-gray-400 text-xs mt-1">{s.sub}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "rgba(68,47,116,0.06)", border: "1px solid rgba(68,47,116,0.1)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ background: "rgba(68,47,116,0.12)" }}>🔥</div>
          <div>
            <p className="text-sm font-medium text-gray-800">12-day streak — keep going!</p>
            <p className="text-xs text-gray-400">Check in today to protect it</p>
          </div>
        </div>
      </div>
    </div>
  );
}
