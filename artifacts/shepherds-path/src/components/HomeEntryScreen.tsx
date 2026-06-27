import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getUserName, setUserName, syncUserNameFromServer, hasBeenPrompted, markNamePrompted } from "@/lib/userName";
import { getSessionId } from "@/lib/session";
import { SHEPHERD_VOICE } from "@/lib/shepherdVoice";
import { isLateNight } from "@/lib/nightMode";
import {
  advanceEntrySplash,
  canShowEntrySplash,
  getOnboardingSplashCount,
  hasCommittedEntrySplashThisSession,
  hasDismissedEntrySplashThisSession,
  markEntrySplashCommittedThisSession,
  markEntrySplashDismissedThisSession,
} from "@/lib/entrySplashState";
import { markNativeShellUiPainted } from "@/lib/platform";
import { preloadDailySplashImages } from "@/lib/dailySplash";
import { formatVerseForDisplay } from "@/lib/verseText";
import { prewarmTTS } from "@/hooks/use-tts";

/** First door only — let the image land before the name invitation. */
const FIRST_DOOR_NAME_DWELL_MS = 4000;

const ENTRY_KEY = "sp_entry_shown_date";
const LAST_VISIT_KEY = "sp_last_visit_date";

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

// Opens 0–4: one-time onboarding sequence. After that: 2 pool splashes + short door per Eastern day.
const SPLASH_SEQUENCE = [
  { image: "/splash-door.jpg",            headline: "Step inside.",              subline: null,              cta: "Enter"  },
  { image: "/splash-road-sunset-REV.jpg", headline: "There you are.",            subline: "He never left.",  cta: "I'm here" },
  { image: "/splash-bible-glow-REV.jpg",  headline: "He's been waiting.",        subline: null,              cta: "Enter"  },
  { image: "/splash-mic-REV.jpg",         headline: "Talk it through.",          subline: "He's listening.", cta: "I'm here" },
  { image: "/splash-shepherd.jpg",        headline: "The path is still here.",   subline: null,              cta: "Enter"  },
];

if (typeof window !== "undefined") {
  SPLASH_SEQUENCE.forEach(({ image }) => {
    const img = new Image();
    img.src = image;
  });
  preloadDailySplashImages();
}

const NAME_ICEBREAKER = {
  voice: SHEPHERD_VOICE,
  greeting: "Step inside.",
  question: "What do I call you, friend?",
  skip: "Just passing through",
} as const;

type IcebreakerCharacter = typeof NAME_ICEBREAKER;

type BrandSplashInit = {
  openCount: number;
  splash: (typeof SPLASH_SEQUENCE)[number];
  showIcebreaker: boolean;
  showCallback: boolean;
  callbackMessage: string | null;
  character: IcebreakerCharacter | null;
  icebreakerDone: boolean;
  shortSplash: boolean;
};

export type { BrandSplashInit };

function resolveBrandSplashInit(): BrandSplashInit {
  const advanced = advanceEntrySplash();
  const doorSplash = SPLASH_SEQUENCE[0]!;
  const noIcebreaker = {
    showIcebreaker: false,
    showCallback: false,
    callbackMessage: null,
    character: null,
    icebreakerDone: true,
    shortSplash: false,
  } as const;

  if (!advanced) {
    return { openCount: getOnboardingSplashCount(), splash: doorSplash, ...noIcebreaker };
  }

  const openCount =
    advanced.slot === "onboarding"
      ? getOnboardingSplashCount() - 1
      : getOnboardingSplashCount();

  const splash = {
    image: advanced.image,
    headline: advanced.headline,
    subline: advanced.subline,
    cta: advanced.cta,
  };

  // Name prompt only on the first onboarding splash (door). Opens 2–5 are image-only.
  if (advanced.slot === "onboarding" && openCount === 0 && !hasBeenPrompted()) {
    return {
      openCount,
      splash,
      showIcebreaker: true,
      showCallback: false,
      callbackMessage: null,
      character: NAME_ICEBREAKER,
      icebreakerDone: false,
      shortSplash: false,
    };
  }

  return {
    openCount,
    splash,
    ...noIcebreaker,
    shortSplash: advanced.isShortDoor,
  };
}

/** Reserve and return the next entry splash — call once per cold open before mounting UI. */
export function commitEntrySplash(): BrandSplashInit | null {
  if (hasDismissedEntrySplashThisSession()) return null;
  if (hasCommittedEntrySplashThisSession()) return null;
  if (!canShowEntrySplash()) return null;
  const init = resolveBrandSplashInit();
  if (!init) return null;
  markEntrySplashCommittedThisSession();
  return init;
}

function fireSplashDismiss(onDismiss: () => void) {
  markEntrySplashDismissedThisSession();
  markEntryShown();
  try {
    (window as Window & { __spSignalReady?: () => void }).__spSignalReady?.();
    markNativeShellUiPainted();
  } catch {
    /* noop */
  }
  onDismiss();
}

function SplashTapButton({
  testId,
  label,
  onPress,
  primary = true,
}: {
  testId: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const busyRef = useRef(false);
  const fire = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    window.setTimeout(() => { busyRef.current = false; }, 600);
    onPress();
  };

  return (
    <button
      type="button"
      onTouchEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        fire();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        fire();
      }}
      data-testid={testId}
      className="w-full py-4 rounded-2xl text-white font-semibold text-base tracking-wide transition-opacity active:opacity-70 touch-manipulation"
      style={{
        border: primary ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.28)",
        background: primary ? "rgba(0,0,0,0.45)" : "transparent",
        backdropFilter: primary ? "blur(16px)" : undefined,
        WebkitBackdropFilter: primary ? "blur(16px)" : undefined,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function getTodayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function getDayVerse() {
  const idx = Math.floor(Date.now() / 86_400_000) % DAILY_VERSES.length;
  return DAILY_VERSES[idx];
}

function getEntryType(): EntryType {
  return "brand";
}

export function markEntryShown() {
  localStorage.setItem(ENTRY_KEY, getTodayStr());
  localStorage.setItem(LAST_VISIT_KEY, getTodayStr());
}

// ─── Brand Splash ────────────────────────────────────────────────────────────

function BrandSplash({ init, onDismiss }: { init: BrandSplashInit; onDismiss: () => void }) {
  const { splash, character, shortSplash } = init;
  const shouldDelayNamePrompt = init.showIcebreaker && !init.showCallback && !shortSplash;
  const [showIcebreaker, setShowIcebreaker] = useState(
    init.showIcebreaker && !shouldDelayNamePrompt,
  );
  const [showCallback, setShowCallback] = useState(init.showCallback);
  const [callbackMessage] = useState(init.callbackMessage);
  const [icebreakerDone, setIcebreakerDone] = useState(init.icebreakerDone);
  const [nameInput, setNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const icebreakerSpeechRef = useRef<HTMLAudioElement | null>(null);
  const icebreakerEngagedRef = useRef(false);

  const { image, headline, subline, cta } = splash;
  const overlayActive = showIcebreaker || showCallback;
  const revealSplashUi = icebreakerDone;

  const stopIcebreakerSpeech = useCallback(() => {
    icebreakerEngagedRef.current = true;
    if (icebreakerSpeechRef.current) {
      icebreakerSpeechRef.current.pause();
      icebreakerSpeechRef.current = null;
    }
  }, []);

  const finishIcebreaker = useCallback(() => {
    stopIcebreakerSpeech();
    setShowIcebreaker(false);
    setShowCallback(false);
    setIcebreakerDone(true);
  }, [stopIcebreakerSpeech]);

  useLayoutEffect(() => {
    (window as Window & { __spSignalReady?: () => void }).__spSignalReady?.();
  }, []);

  // Peel native fg-cover whenever splash is visible — AppState/resume can stack it above us.
  useEffect(() => {
    const peel = () => {
      if (document.visibilityState !== "visible") return;
      (window as Window & { __spSignalReady?: () => void }).__spSignalReady?.();
    };
    peel();
    const interval = window.setInterval(peel, 1200);
    document.addEventListener("visibilitychange", peel);
    window.addEventListener("focus", peel);
    window.addEventListener("pageshow", peel);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", peel);
      window.removeEventListener("focus", peel);
      window.removeEventListener("pageshow", peel);
    };
  }, []);

  useEffect(() => {
    if (!shouldDelayNamePrompt || !character) return;
    const text = `${character.greeting} ${character.question}`;
    prewarmTTS(text, character.voice, "guidance");
    const t = window.setTimeout(() => setShowIcebreaker(true), FIRST_DOOR_NAME_DWELL_MS);
    return () => window.clearTimeout(t);
  }, [shouldDelayNamePrompt, character]);

  useLayoutEffect(() => {
    if (!showIcebreaker) return;
    requestAnimationFrame(() => {
      try {
        inputRef.current?.focus();
      } catch {
        /* WKWebView may block programmatic focus */
      }
    });
  }, [showIcebreaker]);

  useEffect(() => {
    if (!showCallback) return;
    const fallback = window.setTimeout(() => finishIcebreaker(), 8000);
    return () => window.clearTimeout(fallback);
  }, [showCallback, finishIcebreaker]);

  useEffect(() => {
    if (nameInput.trim()) stopIcebreakerSpeech();
  }, [nameInput, stopIcebreakerSpeech]);

  useEffect(() => {
    if (!showIcebreaker && !showCallback) return;
    if (showIcebreaker && !character) return;
    if (showCallback && !callbackMessage) return;

    icebreakerEngagedRef.current = false;
    let cancelled = false;
    const voice = character?.voice ?? "fable";
    const text = showCallback
      ? callbackMessage
      : `${character!.greeting} ${character!.question}`;
    const advanceAfterSpeech = showCallback;

    const dwellTimer = window.setTimeout(() => {
      if (cancelled || icebreakerEngagedRef.current) return;
      if (document.visibilityState === "hidden") return;

      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice,
          scope: "guidance",
          sessionId: getSessionId(),
        }),
      })
        .then((r) => (r.ok ? r.blob() : null))
        .then((blob) => {
          if (cancelled || icebreakerEngagedRef.current || !blob) return;
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          icebreakerSpeechRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            if (icebreakerSpeechRef.current === audio) icebreakerSpeechRef.current = null;
            if (advanceAfterSpeech && !cancelled && !icebreakerEngagedRef.current) {
              window.setTimeout(() => finishIcebreaker(), 350);
            }
          };
          audio.play().catch(() => {});
        })
        .catch(() => {});
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(dwellTimer);
      if (icebreakerSpeechRef.current) {
        icebreakerSpeechRef.current.pause();
        icebreakerSpeechRef.current = null;
      }
    };
  }, [showIcebreaker, showCallback, character, callbackMessage, finishIcebreaker]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSubmitName = () => {
    try {
      const trimmed = nameInput.trim();
      if (trimmed) {
        setUserName(trimmed);
      } else {
        markNamePrompted();
      }
    } catch {
      markNamePrompted();
    }
    finishIcebreaker();
  };

  const handleSkip = () => {
    markNamePrompted();
    finishIcebreaker();
  };

  const skipLabel = character?.skip ?? "Skip";

  return (
    <div
      data-testid="sp-splash-active"
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 1000001, background: "#000" }}
    >
      {/* Full-bleed image — visible immediately behind icebreaker */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: shortSplash ? 1.02 : 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: shortSplash ? 0.55 : 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ opacity: 0.88 }}
        />
      </motion.div>

      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 35%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: revealSplashUi ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-14 left-6 text-white/70 text-[9px] font-semibold tracking-[0.32em] uppercase"
        style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
      >
        Shepherd&rsquo;s Path
      </motion.p>

      <AnimatePresence>
        {showIcebreaker && character && (
          <motion.div
            key="icebreaker"
            data-testid="splash-icebreaker"
            className="absolute inset-0 z-20 flex items-center justify-center px-5"
            style={{ background: "rgba(0,0,0,0.42)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "320px",
                padding: "28px 24px 22px",
                borderRadius: "20px",
                background: "rgba(8, 6, 14, 0.82)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "1.15rem",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.92)",
                  lineHeight: 1.45,
                  marginBottom: "10px",
                }}
              >
                {character.greeting}
              </p>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "1.05rem",
                  fontStyle: "italic",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.5,
                  marginBottom: "20px",
                }}
              >
                {character.question}
              </p>
              <input
                ref={inputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitName();
                }}
                placeholder="Your name"
                autoComplete="given-name"
                autoCapitalize="words"
                data-testid="input-splash-name"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: "16px",
                  marginBottom: "12px",
                  outline: "none",
                }}
              />
              <SplashTapButton
                testId="button-splash-name-continue"
                label="Continue"
                onPress={handleSubmitName}
              />
            <button
              type="button"
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSkip();
              }}
              onClick={(e) => {
                e.preventDefault();
                handleSkip();
              }}
              data-testid="button-splash-name-skip"
              className="touch-manipulation"
              style={{
                display: "block",
                width: "100%",
                marginTop: "14px",
                padding: "8px 4px",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.38)",
                fontSize: "13px",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {skipLabel}
            </button>
            </div>
          </motion.div>
        )}

        {showCallback && callbackMessage && (
          <motion.div
            key="callback"
            data-testid="splash-icebreaker-callback"
            className="absolute inset-0 z-20 flex items-center justify-center px-5"
            style={{ background: "rgba(0,0,0,0.42)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={(e) => {
              e.stopPropagation();
              finishIcebreaker();
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "320px",
                padding: "28px 24px",
                borderRadius: "20px",
                background: "rgba(8, 6, 14, 0.82)",
                border: "1px solid rgba(255,255,255,0.12)",
                textAlign: "center",
              }}
              >
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "1.15rem",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.90)",
                  lineHeight: 1.5,
                  marginBottom: "18px",
                }}
              >
                {callbackMessage}
              </p>
              <SplashTapButton
                testId="button-splash-callback-continue"
                label="Continue"
                onPress={finishIcebreaker}
                primary={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {revealSplashUi && (
        <>
          <motion.div
            className="absolute left-0 right-0"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 140px)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
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

          <motion.div
            className="absolute left-6 right-6"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 44px)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <SplashTapButton
              testId="button-brand-splash-enter"
              label={cta}
              onPress={onDismiss}
            />
          </motion.div>
        </>
      )}
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
            {formatVerseForDisplay(verse.text)}
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
  splashInit: BrandSplashInit;
  onDismiss: () => void;
}

export function HomeEntryScreen({ splashInit, onDismiss }: HomeEntryScreenProps) {
  const [entryType] = useState<EntryType>(() => getEntryType());

  const handleDismiss = () => {
    fireSplashDismiss(onDismiss);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="entry"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        {entryType === "brand"  && <BrandSplash init={splashInit} onDismiss={handleDismiss} />}
        {entryType === "heart"  && <HeartEntry  onDismiss={handleDismiss} />}
        {entryType === "letter" && <LetterEntry onDismiss={handleDismiss} />}
      </motion.div>
    </AnimatePresence>
  );
}

export function shouldShowHomeEntry(_inNativeApp = false): boolean {
  return canShowEntrySplash();
}
