import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getUserName, syncUserNameFromServer } from "@/lib/userName";
import { isLateNight } from "@/lib/nightMode";
import { getBrandSplashCount, incrementBrandSplashCount } from "@/lib/introState";

const ENTRY_KEY = "sp_entry_shown_date";
const LAST_VISIT_KEY = "sp_last_visit_date";
const DAILY_OPEN_COUNT_KEY = "sp_daily_open_count";
const DAILY_OPEN_DATE_KEY = "sp_daily_open_date";
const DAILY_POOL_IDX_KEY = "sp_daily_pool_idx";
const MAX_SPLASHES_PER_DAY = 3;

function getOnboardingBurdenLine(): string | null {
  try {
    const burden = localStorage.getItem("sp_start_burden");
    switch (burden) {
      case "lost":           return "You said you're finding your way.";
      case "hard-season":    return "You said life feels heavy.";
      case "grow-deeper":    return "You said you want to go deeper.";
      case "peace":          return "You said you need peace.";
      case "coming-back":    return "You said you're coming back.";
      case "grateful":       return "You said you're grateful and open.";
      default:               return null;
    }
  } catch { return null; }
}

type EntryType = "brand" | "heart" | "letter";

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
  { label: "Peace",     icon: "🕊️", color: "#3b82f6", desc: "Seeking stillness",       verse: { text: "Peace I leave with you; my peace I give you.", ref: "John 14:27" } },
  { label: "Joy",       icon: "☀️", color: "#f97316", desc: "My heart is full",         verse: { text: "In your presence there is fullness of joy; at your right hand are pleasures forevermore.", ref: "Psalm 16:11" } },
  { label: "Talk it through", icon: "🧭", color: "#8b5cf6", desc: "Looking for direction", verse: { text: "Your word is a lamp for my feet, a light on my path.", ref: "Psalm 119:105" } },
  { label: "Strength",  icon: "⚡", color: "#f59e0b", desc: "I'm feeling weak",         verse: { text: "The Lord is my strength and my shield; my heart trusts in him.", ref: "Psalm 28:7" } },
  { label: "Grief",     icon: "💧", color: "#6366f1", desc: "I'm hurting",              verse: { text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18" } },
  { label: "Gratitude", icon: "🌿", color: "#10b981", desc: "I want to give thanks",    verse: { text: "This is the day the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" } },
];

/** Images + single-line copy for rotating brand splash (visit 3+). One per day. */
const BRAND_SPLASH_POOL = [
  { image: "/splash-shepherd.png",    line: "The path is still here." },
  { image: "/splash-forest.png",      line: "Something brought you back." },
  { image: "/splash-bible-glow-REV.png",  line: "He's been waiting." },
  { image: "/splash-well.png",        line: "Draw near." },
  { image: "/splash-prayer.png",      line: "You don't have to have it figured out." },
  { image: "/splash-cobblestone.png", line: "He meets you where you are." },
  { image: "/splash-candle.png",      line: "He's still here." },
];

function getTodayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function getDayVerse() {
  const idx = Math.floor(Date.now() / 86_400_000) % DAILY_VERSES.length;
  return DAILY_VERSES[idx];
}

/** Get/increment today's open count and return the pool entry for this open. */
function getDailyOpenEntry(): { entry: typeof BRAND_SPLASH_POOL[0]; openIndex: number } {
  const today = getTodayStr();
  const lastDate = localStorage.getItem(DAILY_OPEN_DATE_KEY);
  let count = 0;
  let poolIdx = 0;

  if (lastDate === today) {
    count = parseInt(localStorage.getItem(DAILY_OPEN_COUNT_KEY) ?? "0", 10);
    poolIdx = parseInt(localStorage.getItem(DAILY_POOL_IDX_KEY) ?? "0", 10);
  } else {
    // New day — reset, but offset pool index so we don't always start on same image
    const dayOffset = Math.floor(Date.now() / 86_400_000);
    poolIdx = dayOffset % BRAND_SPLASH_POOL.length;
    localStorage.setItem(DAILY_OPEN_DATE_KEY, today);
    localStorage.setItem(DAILY_POOL_IDX_KEY, String(poolIdx));
    localStorage.setItem(DAILY_OPEN_COUNT_KEY, "0");
  }

  const entry = BRAND_SPLASH_POOL[poolIdx % BRAND_SPLASH_POOL.length]!;
  // Advance for next open
  const nextIdx = (poolIdx + 1) % BRAND_SPLASH_POOL.length;
  localStorage.setItem(DAILY_POOL_IDX_KEY, String(nextIdx));
  localStorage.setItem(DAILY_OPEN_COUNT_KEY, String(count + 1));
  localStorage.setItem(DAILY_OPEN_DATE_KEY, today);

  return { entry, openIndex: count };
}

function getEntryType(): EntryType {
  return "brand";
}

export function markEntryShown() {
  localStorage.setItem(ENTRY_KEY, getTodayStr());
  localStorage.setItem(LAST_VISIT_KEY, getTodayStr());
}

// ─── Brand Splash ────────────────────────────────────────────────────────────

function BrandSplash({ onDismiss }: { onDismiss: () => void }) {
  const [ready, setReady] = useState(false);
  const [allowDismiss, setAllowDismiss] = useState(false);
  const visitCount = getBrandSplashCount(); // all-time count for first/second ever
  const { entry } = getDailyOpenEntry();

  const isFirst  = visitCount === 0;
  const isSecond = visitCount === 1;

  const image    = isFirst ? "/splash-door.png" : isSecond ? "/splash-road-sunset-REV.png" : entry.image;
  const headline = isFirst
    ? "Step inside."
    : isSecond
    ? "Glad you came back."
    : entry.line;
  const subline  = isSecond ? "Come in." : null;
  const cta      = isFirst ? "Enter" : isSecond ? "I'm here" : "Enter";

  useEffect(() => {
    incrementBrandSplashCount();
    // Show content after image loads feel
    const t1 = setTimeout(() => setReady(true), 300);
    // Allow tap-anywhere dismiss after brief moment
    const t2 = setTimeout(() => setAllowDismiss(true), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: "#000" }}
      onClick={() => allowDismiss && onDismiss()}
    >
      {/* Full-bleed image */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ opacity: 0.88 }}
        />
      </motion.div>

      {/* Gradient — bottom third */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 35%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* Wordmark — top left */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="absolute top-14 left-6 text-white/70 text-[9px] font-semibold tracking-[0.32em] uppercase"
        style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
      >
        Shepherd&rsquo;s Path
      </motion.p>

      {/* Text — lower third */}
      <motion.div
        className="absolute left-0 right-0"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 140px)" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 16 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1
          className="text-white text-center px-8 leading-tight"
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: "clamp(2rem, 7vw, 2.6rem)",
            fontWeight: 300,
            letterSpacing: "-0.01em",
          }}
        >
          {headline}
        </h1>
        {subline && (
          <p
            className="text-white/55 text-center mt-2"
            style={{ fontFamily: "'Georgia', serif", fontSize: "1.1rem", fontWeight: 300 }}
          >
            {subline}
          </p>
        )}
      </motion.div>

      {/* CTA — bottom */}
      <motion.div
        className="absolute left-6 right-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 44px)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 10 }}
        transition={{ duration: 0.6, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          data-testid="button-brand-splash-enter"
          className="w-full py-4 rounded-2xl text-white font-semibold text-base tracking-wide transition-opacity active:opacity-70"
          style={{
            border: "1px solid rgba(255,255,255,0.45)",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {cta}
        </button>
      </motion.div>
    </div>
  );
}

// ─── Heart Entry ──────────────────────────────────────────────────────────────

function HeartEntry({ onDismiss }: { onDismiss: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => { setSubmitted(true); };

  if (submitted) {
    const emotion = selected !== null ? HEART_EMOTIONS[selected] : null;
    const displayVerse = emotion ? emotion.verse : getDayVerse();
    const displayIcon = emotion ? emotion.icon : "✨";
    const displayLabel = emotion ? "A word for your heart" : "A word for today";

    return (
      <motion.div
        key="result"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center"
        style={{ background: "linear-gradient(160deg, #442f74 0%, #2d1a5e 100%)" }}
      >
        <div className="text-5xl mb-6">{displayIcon}</div>
        <p className="text-white/50 text-xs tracking-widest uppercase mb-4">{displayLabel}</p>
        <p className="text-white text-xl leading-relaxed mb-2" style={{ fontFamily: "'Georgia', serif" }}>
          "{displayVerse.text}"
        </p>
        <p className="text-white/45 text-sm mb-8" style={{ fontFamily: "'Georgia', serif" }}>
          — {displayVerse.ref}
        </p>
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
        <p className="text-white/35 text-xs tracking-widest uppercase">Shepherd's Path</p>
        <button onClick={onDismiss} className="text-white/30 text-xs py-1 px-2">Skip</button>
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
          <p className="text-white/40 text-sm">You can begin wherever you are.</p>
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
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: e.color }}>
                  <svg className="w-3 h-3" fill="white" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          className="mt-3 w-full py-4 rounded-2xl text-white font-medium text-base transition-all duration-200"
          style={{
            background: selected !== null ? "linear-gradient(135deg, #7A018D, #442f74)" : "rgba(255,255,255,0.12)",
            boxShadow: selected !== null ? "0 8px 32px rgba(122,1,141,0.35)" : "none",
          }}
          data-testid="button-bring-me-a-word"
        >
          Bring me a word
        </button>
      </div>
    </div>
  );
}

// ─── Letter Entry ─────────────────────────────────────────────────────────────

function LetterEntry({ onDismiss }: { onDismiss: () => void }) {
  const [name, setName] = useState<string | null>(getUserName);
  const hour = new Date().getHours();

  useEffect(() => {
    if (!name) syncUserNameFromServer().then((n) => { if (n) setName(n); });
  }, []);

  const dayOfWeek = new Date().getDay();
  const isSunday = dayOfWeek === 0;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const verse = getDayVerse();
  const burdenLine = getOnboardingBurdenLine();
  const pastoralLines = isSunday
    ? `A new week begins. Whatever last week carried, today is a fresh page. God's mercies are new every morning — and especially on this one.${burdenLine ? ` ${burdenLine} That hasn't changed.` : ""}`
    : `There's no catching up here. God hasn't stopped thinking about you. You can start right where you are.${burdenLine ? ` ${burdenLine} He still does.` : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#faf8f5" }}>
      <div className="shrink-0 px-6 pt-14 pb-6" style={{ background: "linear-gradient(160deg, #442f74 0%, #2d1a5e 100%)" }}>
        <p className="text-white/65 text-xs tracking-widest uppercase mb-2">Shepherd's Path</p>
        <div className="flex items-end justify-between">
          <h1 className="text-white font-light" style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem" }}>
            {greeting}{name ? `, ${name}.` : "."}
          </h1>
          <button onClick={onDismiss} className="text-white/60 text-sm pb-1">Skip</button>
        </div>
      </div>

      <div className="mx-5 -mt-4 rounded-2xl p-5 shadow-sm" style={{ background: "white", border: "1px solid rgba(68,47,116,0.08)" }}>
        <p className="leading-relaxed text-gray-700 mb-4" style={{ fontFamily: "'Georgia', serif", fontSize: "1rem" }}>
          {pastoralLines}
        </p>
        <div className="pl-4 border-l-2 mb-1" style={{ borderColor: "#442f74" }}>
          <p className="text-gray-600 italic leading-relaxed" style={{ fontFamily: "'Georgia', serif", fontSize: "0.9375rem" }}>
            "{verse.text}"
          </p>
          <p className="text-gray-500 mt-1.5" style={{ fontSize: "0.8125rem" }}>— {verse.ref}</p>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto flex flex-col items-center justify-end px-5 gap-3"
        style={{ paddingBottom: "max(48px, calc(24px + env(safe-area-inset-bottom, 0px)))", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <button
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl text-white font-medium text-base"
          style={{ background: "linear-gradient(135deg, #7A018D, #442f74)", boxShadow: "0 8px 32px rgba(122,1,141,0.25)" }}
          data-testid="button-letter-enter"
        >
          {isSunday ? "Begin this week" : "I'm here"}
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

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
        transition={{ duration: 0.35 }}
      >
        {entryType === "brand"  && <BrandSplash onDismiss={handleDismiss} />}
        {entryType === "heart"  && <HeartEntry  onDismiss={handleDismiss} />}
        {entryType === "letter" && <LetterEntry onDismiss={handleDismiss} />}
      </motion.div>
    </AnimatePresence>
  );
}

export function shouldShowHomeEntry(inNativeApp = false): boolean {
  const welcomed = localStorage.getItem("sp_welcomed");
  // Native shell users are always past onboarding — don't require sp_welcomed
  if (!welcomed && !inNativeApp) return false;
  const today = getTodayStr();
  const lastDate = localStorage.getItem(DAILY_OPEN_DATE_KEY);
  const count = lastDate === today
    ? parseInt(localStorage.getItem(DAILY_OPEN_COUNT_KEY) ?? "0", 10)
    : 0;
  return count < MAX_SPLASHES_PER_DAY;
}
