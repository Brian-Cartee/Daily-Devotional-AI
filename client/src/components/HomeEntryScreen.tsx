import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2 } from "lucide-react";
import { getUserName } from "@/lib/userName";
import { isLateNight } from "@/lib/nightMode";

function shareVerse(text: string, ref: string) {
  const shareText = `I thought of you when I read this. 🙏\n\n"${text}"\n— ${ref}\n\nShepherd's Path · shepherdspath.app`;
  if (navigator.share) {
    navigator.share({ text: shareText }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(shareText).catch(() => {});
  }
}

const ENTRY_KEY = "sp_entry_shown_date";
const LAST_VISIT_KEY = "sp_last_visit_date";

type EntryType = "whisper" | "heart" | "letter";

const DAILY_VERSES = [
  { text: "Cast all your anxiety on Him because He cares for you.", ref: "1 Peter 5:7" },
  { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
  { text: "For I know the plans I have for you — plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" },
];

const HEART_EMOTIONS = [
  { label: "Peace", icon: "🕊️", color: "#3b82f6", desc: "I need stillness", verse: { text: "Peace I leave with you; my peace I give you.", ref: "John 14:27" } },
  { label: "Guidance", icon: "🧭", color: "#8b5cf6", desc: "I need direction", verse: { text: "Your word is a lamp for my feet, a light on my path.", ref: "Psalm 119:105" } },
  { label: "Strength", icon: "⚡", color: "#f59e0b", desc: "I'm feeling weak", verse: { text: "The Lord is my strength and my shield; my heart trusts in him.", ref: "Psalm 28:7" } },
  { label: "Grief", icon: "💧", color: "#6366f1", desc: "I'm hurting", verse: { text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18" } },
  { label: "Gratitude", icon: "🌿", color: "#10b981", desc: "I want to give thanks", verse: { text: "This is the day the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" } },
];

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getDayVerse() {
  const idx = Math.floor(Date.now() / 86_400_000) % DAILY_VERSES.length;
  return DAILY_VERSES[idx];
}

function getEntryType(): EntryType {
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  if (lastVisit && lastVisit !== getTodayStr()) {
    const daysDiff = (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff >= 3) return "letter";
  }
  if (dayOfWeek === 0) return "letter";
  if (hour >= 19 || isLateNight()) return "heart";
  return "whisper";
}

function markEntryShown() {
  localStorage.setItem(ENTRY_KEY, getTodayStr());
  localStorage.setItem(LAST_VISIT_KEY, getTodayStr());
}

function WhisperEntry({ onDismiss }: { onDismiss: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const [showCta, setShowCta] = useState(false);
  const verse = getDayVerse();

  useEffect(() => {
    let i = 0;
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < verse.text.length) {
          setDisplayedText(verse.text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowCta(true), 600);
        }
      }, 35);
      return () => clearInterval(interval);
    }, 400);
    return () => clearTimeout(delay);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0d0a1a 0%, #1a0f2e 40%, #2d1454 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: (i % 3 === 0 ? 2 : 1) + "px",
              height: (i % 3 === 0 ? 2 : 1) + "px",
              left: ((i * 37 + 11) % 100) + "%",
              top: ((i * 53 + 7) % 65) + "%",
              opacity: 0.1 + (i % 4) * 0.07,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center pt-12">
        <div
          className="w-48 h-28 sm:w-72 sm:h-44 rounded-2xl overflow-hidden mb-3"
          style={{ opacity: 0.88, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
        >
          <img
            src="/hero-landing.png"
            alt="The Path"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <p className="text-white/35 text-xs tracking-[0.25em] uppercase font-light">
          Shepherd's Path
        </p>
      </div>

      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        <div className="w-10 h-px bg-white/15 mb-7" />
        <p className="text-white/30 text-xs tracking-[0.2em] uppercase font-light mb-5">
          A word for today
        </p>
        <p
          className="text-white text-center leading-relaxed mb-3 sm:text-2xl"
          style={{ fontFamily: "'Georgia', serif", fontSize: "1.3rem", minHeight: "5.5rem" }}
        >
          "{displayedText}
          <span className="animate-pulse opacity-60">|</span>"
        </p>
        <p className="text-white/45 text-sm mt-2" style={{ fontFamily: "'Georgia', serif" }}>
          — {verse.ref}
        </p>
        <div className="w-10 h-px bg-white/15 mt-7" />
      </div>

      <div
        className="relative z-10 flex flex-col items-center w-full px-8"
        style={{ paddingBottom: "max(56px, calc(40px + env(safe-area-inset-bottom, 0px)))" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={showCta ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5 }}
          className="w-full flex flex-col items-center gap-4"
        >
          <button
            onClick={onDismiss}
            className="w-full py-4 rounded-2xl text-white font-medium text-base tracking-wide"
            style={{
              background: "linear-gradient(135deg, #7A018D, #442f74)",
              boxShadow: "0 8px 32px rgba(122,1,141,0.35)",
            }}
            data-testid="button-whisper-enter"
          >
            Walk with me today
          </button>
          <button
            onClick={() => shareVerse(verse.text, verse.ref)}
            className="flex items-center justify-center gap-2 text-white/45 text-sm py-2 transition-opacity hover:text-white/65"
            data-testid="button-whisper-share"
          >
            <Share2 className="w-3.5 h-3.5" />
            Send this to someone
          </button>
          <button onClick={onDismiss} className="text-white/25 text-xs py-1">
            Skip
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function HeartEntry({ onDismiss }: { onDismiss: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
  };

  if (submitted && selected !== null) {
    const emotion = HEART_EMOTIONS[selected];
    return (
      <motion.div
        key="result"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center"
        style={{ background: "linear-gradient(160deg, #442f74 0%, #2d1a5e 100%)" }}
      >
        <div className="text-5xl mb-6">{emotion.icon}</div>
        <p className="text-white/50 text-xs tracking-widest uppercase mb-4">
          A word for your heart
        </p>
        <p
          className="text-white text-xl leading-relaxed mb-2"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          "{emotion.verse.text}"
        </p>
        <p className="text-white/45 text-sm mb-8" style={{ fontFamily: "'Georgia', serif" }}>
          — {emotion.verse.ref}
        </p>
        <button
          onClick={() => shareVerse(emotion.verse.text, emotion.verse.ref)}
          className="flex items-center justify-center gap-2 text-white/50 text-sm mb-4 py-2 px-4 rounded-xl transition-opacity hover:text-white/70"
          data-testid="button-heart-share"
        >
          <Share2 className="w-3.5 h-3.5" />
          Send this to someone
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl text-white font-medium"
          style={{ background: "linear-gradient(135deg, #7A018D, #442f74)" }}
          data-testid="button-heart-enter"
        >
          Enter the app
        </button>
      </motion.div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "linear-gradient(160deg, #442f74 0%, #2d1a5e 100%)" }}
    >
      <div className="shrink-0 flex items-center justify-between px-6 pt-12 pb-1">
        <div>
          <p className="text-white/35 text-xs tracking-widest uppercase">Shepherd's Path</p>
        </div>
        <button onClick={onDismiss} className="text-white/30 text-xs py-1 px-2">
          Skip
        </button>
      </div>

      <div
        className="flex-1 flex flex-col px-6 pt-3 overflow-y-auto"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div className="mb-4">
          <h1
            className="text-white font-light leading-snug mb-1"
            style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem" }}
          >
            What's on your heart right now?
          </h1>
          <p className="text-white/40 text-sm">Your answer shapes your time with God today.</p>
        </div>

        <div className="flex flex-col gap-2">
          {HEART_EMOTIONS.map((e, i) => (
            <button
              key={e.label}
              onClick={() => setSelected(i)}
              className="flex items-center gap-4 px-5 py-3 rounded-2xl text-left transition-all duration-200"
              style={{
                background: selected === i ? `${e.color}28` : "rgba(255,255,255,0.07)",
                border: `1px solid ${selected === i ? e.color + "70" : "rgba(255,255,255,0.1)"}`,
                transform: selected === i ? "scale(1.02)" : "scale(1)",
              }}
            >
              <span className="text-2xl">{e.icon}</span>
              <div className="flex-1">
                <p className="text-white font-medium text-base">{e.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{e.desc}</p>
              </div>
              {selected === i && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: e.color }}
                >
                  <svg className="w-3 h-3" fill="white" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={selected === null}
          className="mt-3 w-full py-4 rounded-2xl text-white font-medium text-base transition-all duration-200"
          style={{
            background: selected !== null ? "linear-gradient(135deg, #7A018D, #442f74)" : "rgba(255,255,255,0.08)",
            opacity: selected !== null ? 1 : 0.5,
            boxShadow: selected !== null ? "0 8px 32px rgba(122,1,141,0.35)" : "none",
          }}
        >
          Bring me a word
        </button>
      </div>
    </div>
  );
}

function LetterEntry({ onDismiss }: { onDismiss: () => void }) {
  const name = getUserName();
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const isSunday = dayOfWeek === 0;
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const verse = getDayVerse();

  const pastoralLines = isSunday
    ? "A new week begins. Whatever last week carried, today is a fresh page. God's mercies are new every morning — and especially on this one."
    : "It's good to have you back. God hasn't stopped thinking about you. He's been waiting for this moment with you.";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#faf8f5" }}>
      <div
        className="shrink-0 px-6 pt-14 pb-6"
        style={{ background: "linear-gradient(160deg, #442f74 0%, #2d1a5e 100%)" }}
      >
        <p className="text-white/40 text-xs tracking-widest uppercase mb-2">Shepherd's Path</p>
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="text-white font-light"
              style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem" }}
            >
              {greeting}{name ? "," : "."}
            </h1>
            {name && (
              <h1
                className="text-white"
                style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem" }}
              >
                {name}.
              </h1>
            )}
          </div>
          <button onClick={onDismiss} className="text-white/30 text-xs pb-1">
            Skip
          </button>
        </div>
      </div>

      <div
        className="mx-5 -mt-4 rounded-2xl p-5 shadow-sm"
        style={{ background: "white", border: "1px solid rgba(68,47,116,0.08)" }}
      >
        <p
          className="leading-relaxed text-gray-700 mb-4"
          style={{ fontFamily: "'Georgia', serif", fontSize: "1rem" }}
        >
          {pastoralLines}
        </p>
        <div className="pl-4 border-l-2 mb-1" style={{ borderColor: "#442f74" }}>
          <p
            className="text-gray-600 italic text-sm leading-relaxed"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            "{verse.text}"
          </p>
          <p className="text-gray-400 text-xs mt-1">— {verse.ref}</p>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto flex flex-col items-center justify-end px-5 gap-3"
        style={{ paddingBottom: "max(48px, calc(24px + env(safe-area-inset-bottom, 0px)))", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <button
          onClick={() => shareVerse(verse.text, verse.ref)}
          className="flex items-center justify-center gap-2 text-sm py-2 px-4 rounded-xl transition-opacity"
          style={{ color: "#442f74", opacity: 0.65 }}
          data-testid="button-letter-share"
        >
          <Share2 className="w-3.5 h-3.5" />
          Send this to someone
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl text-white font-medium text-base"
          style={{
            background: "linear-gradient(135deg, #7A018D, #442f74)",
            boxShadow: "0 8px 32px rgba(122,1,141,0.25)",
          }}
          data-testid="button-letter-enter"
        >
          {isSunday ? "Begin this week" : "I'm here"}
        </button>
      </div>
    </div>
  );
}

interface HomeEntryScreenProps {
  onDismiss: () => void;
}

export function HomeEntryScreen({ onDismiss }: HomeEntryScreenProps) {
  const [entryType] = useState<EntryType>(() => getEntryType());

  const handleDismiss = () => {
    markEntryShown();
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="entry"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {entryType === "whisper" && <WhisperEntry onDismiss={handleDismiss} />}
        {entryType === "heart" && <HeartEntry onDismiss={handleDismiss} />}
        {entryType === "letter" && <LetterEntry onDismiss={handleDismiss} />}
      </motion.div>
    </AnimatePresence>
  );
}

export function shouldShowHomeEntry(): boolean {
  const today = getTodayStr();
  const lastShown = localStorage.getItem(ENTRY_KEY);
  const welcomed = localStorage.getItem("sp_welcomed");
  return !!welcomed && lastShown !== today;
}
