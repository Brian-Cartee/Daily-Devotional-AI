import { useState, useEffect } from "react";

const verse = "Cast all your anxiety on Him because He cares for you.";
const reference = "1 Peter 5:7";

export function TheWhisper() {
  const [displayedText, setDisplayedText] = useState("");
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < verse.length) {
        setDisplayedText(verse.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowCta(true), 600);
      }
    }, 38);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-between"
      style={{ background: "linear-gradient(180deg, #0d0a1a 0%, #1a0f2e 40%, #2d1454 100%)" }}>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 bg-white opacity-5"
          style={{ height: "50%", boxShadow: "0 0 80px 40px rgba(255,255,255,0.04)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-64"
          style={{ background: "linear-gradient(to top, rgba(68,47,116,0.3), transparent)" }} />
        {[...Array(18)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 60 + "%",
              opacity: Math.random() * 0.4 + 0.1,
            }} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center pt-12 px-6">
        <div className="w-36 h-20 rounded-xl overflow-hidden mb-3 opacity-80"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
          <img
            src="/__mockup/images/hero-landing.png"
            alt="The Path"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <p className="text-white/40 text-xs tracking-[0.25em] uppercase font-light">Shepherd's Path</p>
      </div>

      <div className="relative z-10 flex flex-col items-center px-8 -mt-16">
        <div className="w-12 h-px bg-white/20 mb-8" />
        <p className="text-white/30 text-xs tracking-[0.2em] uppercase font-light mb-6">Today's Word</p>
        <p className="text-white text-center leading-relaxed mb-3"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.35rem", minHeight: "6rem" }}>
          "{displayedText}
          <span className="animate-pulse">|</span>"
        </p>
        <p className="text-white/50 text-sm mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          — {reference}
        </p>
        <div className="w-12 h-px bg-white/20 mt-8" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full px-8 pb-12">
        <div className={`transition-all duration-700 w-full flex flex-col items-center gap-4 ${showCta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <button className="w-full py-4 rounded-2xl text-white font-medium text-base tracking-wide"
            style={{ background: "linear-gradient(135deg, #7A018D, #442f74)", boxShadow: "0 8px 32px rgba(122,1,141,0.4)" }}>
            Walk with me today
          </button>
          <button className="text-white/40 text-sm py-2">
            What's on your heart instead?
          </button>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <div className="w-8 h-px bg-white/20" />
          <p className="text-white/25 text-xs tracking-widest uppercase">Day 12 of your journey</p>
          <div className="w-8 h-px bg-white/20" />
        </div>
      </div>
    </div>
  );
}
