import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, SmilePlus, BarChart3, Share2, Copy, Check, Compass, ArrowRight, ChevronRight, Bell, BellOff, Loader2, Mail, Moon } from "lucide-react";
import { isLateNight, getNightTimeLabel, getNightGreeting } from "@/lib/nightMode";
import { getTodayFramework } from "@/lib/faithFramework";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  isReturningUser,
  isReturnCardDismissedToday,
  dismissReturnCard,
  getDaysAway,
  daysSinceGuidance,
  hasGratitudeThisWeek,
  markGratitudeThisWeek,
  getNextTip,
  dismissTip,
  getTodayCheckin,
  saveCheckin,
  CHECKIN_PROMPTS,
  isSunday,
  isSundaySummaryDismissed,
  dismissSundaySummary,
  getTimeGreeting,
  shouldShowFirstStepsCard,
  dismissFirstStepsCard,
  type CheckinEmotion,
} from "@/lib/engagementCards";
import { getActivePlanId, getPlanProgress, READING_PLANS } from "@/lib/readingPlans";
import { getUserName } from "@/lib/userName";
import { getSessionId } from "@/lib/session";
import { Link } from "wouter";

// ── Shared slide-in animation ─────────────────────────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

// ── 1. Time-aware greeting header ─────────────────────────────────────────────
export function GreetingHeader() {
  const name = getUserName();
  const greeting = getTimeGreeting();
  const lateNight = isLateNight();
  if (!name) return null;
  if (lateNight) {
    return (
      <div data-testid="text-greeting-header" className="px-0.5 -mb-1">
        <p className="text-[11px] font-semibold text-foreground/35 tabular-nums tracking-wide uppercase mb-0.5">{getNightTimeLabel()}</p>
        <p className="text-[17px] font-bold text-foreground/75">{getNightGreeting(name)}</p>
      </div>
    );
  }
  return (
    <p
      data-testid="text-greeting-header"
      className="text-[15px] font-semibold text-foreground/60 px-0.5 -mb-1"
    >
      {greeting}, {name}.
    </p>
  );
}

// ── 1b. Late-night presence banner ────────────────────────────────────────────
export function LateNightBannerCard() {
  const [dismissed, setDismissed] = useState(false);
  if (!isLateNight() || dismissed) return null;
  return (
    <motion.div
      {...fadeIn}
      className="relative rounded-2xl overflow-hidden border border-indigo-950/60 dark:border-indigo-800/40 shadow-lg"
      style={{ background: "linear-gradient(145deg, hsl(240 40% 10%) 0%, hsl(258 42% 15%) 60%, hsl(240 35% 8%) 100%)" }}
    >
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent 0%, hsl(258 42% 45%) 40%, hsl(220 60% 55%) 100%)" }} />
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-indigo-300/70" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/70">Still with you · {getNightTimeLabel()}</p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            data-testid="button-dismiss-night-banner"
            className="text-white/20 hover:text-white/50 transition-colors p-1 -mr-1 -mt-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <h2 className="text-[19px] font-black text-white/90 leading-snug tracking-tight mb-2">
          Whatever brought you here<br />at this hour — you're not alone.
        </h2>
        <p className="text-[13px] text-white/55 leading-relaxed mb-4">
          This is a safe place to bring what you're carrying. You don't need to have it together to open this app. God meets people exactly where they are — including at {getNightTimeLabel()}.
        </p>
        <div className="flex gap-2.5">
          <Link href="/devotional">
            <button
              data-testid="button-night-banner-devotional"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[12px] font-bold text-white/90 border border-white/15 hover:border-white/25 hover:bg-white/5 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Open devotional
            </button>
          </Link>
          <Link href="/guidance">
            <button
              data-testid="button-night-banner-guidance"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600/50 hover:bg-indigo-600/70 text-[12px] font-bold text-white/90 border border-indigo-500/30 transition-all"
            >
              <Compass className="w-3.5 h-3.5" />
              Seek guidance
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── 2. Returning-user grace card ──────────────────────────────────────────────
type ReturnScenario = "plan" | "guidance" | "long-absence" | "gentle";

interface ReturnCardContent {
  scenario: ReturnScenario;
  line1: string;
  line2: string;
  line3: string;
  ctaLabel: string;
  ctaHref: string;
  gradient: string;
  border: string;
  bg: string;
  labelColor: string;
  xColor: string;
}

function buildReturnContent(daysAway: number): ReturnCardContent {
  // Priority 1 — active reading plan
  const planId = getActivePlanId();
  if (planId) {
    const plan = READING_PLANS.find(p => p.id === planId);
    const completed = getPlanProgress(planId).size;
    const nextDay = completed + 1;
    const planName = plan?.title ?? "your reading plan";
    return {
      scenario: "plan",
      line1: `You were moving through Day ${completed} of ${planName}.`,
      line2: `Day ${nextDay} is here when you're ready.`,
      line3: "There's no need to catch up — just continue.",
      ctaLabel: `Continue Day ${nextDay}`,
      ctaHref: "/reading-plans",
      gradient: "from-emerald-400 via-teal-400 to-cyan-400",
      border: "border-emerald-200 dark:border-emerald-800/50",
      bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
      labelColor: "text-emerald-600 dark:text-emerald-400",
      xColor: "text-emerald-400 hover:text-emerald-600",
    };
  }

  // Priority 2 — recent guidance session (within 7 days)
  const sincGuidance = daysSinceGuidance();
  if (sincGuidance >= 1 && sincGuidance <= 7) {
    return {
      scenario: "guidance",
      line1: "You started something here.",
      line2: "You can continue that conversation, or begin again from where you are today.",
      line3: "You don't have to carry it the same way.",
      ctaLabel: "Return to Guidance",
      ctaHref: "/guidance",
      gradient: "from-violet-400 via-primary to-indigo-400",
      border: "border-violet-200 dark:border-violet-800/50",
      bg: "bg-violet-50/60 dark:bg-violet-950/20",
      labelColor: "text-primary dark:text-violet-400",
      xColor: "text-violet-400 hover:text-violet-600",
    };
  }

  // Priority 3 — long absence (7+ days)
  if (daysAway >= 7) {
    return {
      scenario: "long-absence",
      line1: "You're here now.",
      line2: "You can begin with what's on your heart today.",
      line3: "Nothing has been lost.",
      ctaLabel: "Begin",
      ctaHref: "/guidance",
      gradient: "from-amber-400 via-orange-400 to-rose-400",
      border: "border-amber-200 dark:border-amber-800/50",
      bg: "bg-amber-50/60 dark:bg-amber-950/20",
      labelColor: "text-amber-600 dark:text-amber-400",
      xColor: "text-amber-400 hover:text-amber-600",
    };
  }

  // Default — 2–6 days, no specific context
  return {
    scenario: "gentle",
    line1: "You can start right where you are.",
    line2: "Today's word is ready whenever you are.",
    line3: "",
    ctaLabel: "Keep walking",
    ctaHref: "/devotional",
    gradient: "from-sky-400 via-blue-400 to-indigo-400",
    border: "border-sky-200 dark:border-sky-800/50",
    bg: "bg-sky-50/60 dark:bg-sky-950/20",
    labelColor: "text-sky-600 dark:text-sky-400",
    xColor: "text-sky-400 hover:text-sky-600",
  };
}

export function ReturningUserCard() {
  const [content, setContent] = useState<ReturnCardContent | null>(null);

  useEffect(() => {
    const days = getDaysAway();
    if (days < 2 || isReturnCardDismissedToday()) return;
    setContent(buildReturnContent(days));
  }, []);

  function dismiss() {
    dismissReturnCard();
    setContent(null);
  }

  if (!content) return null;

  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-returning-user"
        className={`relative rounded-2xl border ${content.border} ${content.bg} px-5 py-4 shadow-sm overflow-hidden`}
      >
        <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${content.gradient}`} />
        <button
          onClick={dismiss}
          data-testid="button-dismiss-returning"
          aria-label="Dismiss"
          className={`absolute top-3 right-3 transition-colors ${content.xColor}`}
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-[15px] font-semibold text-foreground leading-snug mb-1 pr-6">
          {content.line1}
        </p>
        <p className="text-[13px] text-foreground/70 leading-relaxed">
          {content.line2}
        </p>
        {content.line3 && (
          <p className="text-[13px] text-foreground/55 leading-relaxed mt-0.5 mb-3">
            {content.line3}
          </p>
        )}
        {!content.line3 && <div className="mb-3" />}
        <Link href={content.ctaHref} onClick={dismiss}>
          <button
            data-testid="button-returning-cta"
            className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${content.labelColor} hover:opacity-80 transition-opacity`}
          >
            {content.ctaLabel} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}

// ── 3. Gratitude weekly prompt ────────────────────────────────────────────────
interface GratitudePromptCardProps {
  sessionId: string;
}

const GRATITUDE_COPY: Record<"hard" | "okay" | "grateful" | "none", {
  header: string; prompt: string; placeholder: string; journalTitle: string;
}> = {
  hard: {
    header: "Stay a moment",
    prompt: "What's one thing you're holding onto right now?",
    placeholder: "Whatever's weighing on you…",
    journalTitle: "What I'm holding onto",
  },
  okay: {
    header: "Take a moment",
    prompt: "What stood out to you today?",
    placeholder: "Whatever comes to mind…",
    journalTitle: "Reflection",
  },
  grateful: {
    header: "Take a moment",
    prompt: "Write one thing on your heart — we'll save it to your journal.",
    placeholder: "I'm thankful for…",
    journalTitle: "Gratitude",
  },
  none: {
    header: "Take a moment",
    prompt: "Write one thing on your heart — we'll save it to your journal.",
    placeholder: "Whatever comes to mind…",
    journalTitle: "Reflection",
  },
};

export function GratitudePromptCard({ sessionId }: GratitudePromptCardProps) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const checkin = getTodayCheckin();
  const copy = GRATITUDE_COPY[checkin ?? "none"];

  useEffect(() => {
    if (!hasGratitudeThisWeek()) setVisible(true);
  }, []);

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await apiRequest("POST", "/api/journal", {
        sessionId,
        type: "reflection",
        title: copy.journalTitle,
        content: trimmed,
      });
      markGratitudeThisWeek();
      setSaved(true);
      setTimeout(() => setVisible(false), 1200);
    } catch {
      toast({ title: "Couldn't save", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleDismiss() {
    markGratitudeThisWeek();
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-gratitude-prompt"
        className="relative rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-300" />
        <button
          onClick={handleDismiss}
          data-testid="button-dismiss-gratitude"
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-amber-400 hover:text-amber-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-[12px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2">
          {copy.header}
        </p>
        <p className="text-[14px] text-foreground/85 leading-relaxed mb-3">
          {copy.prompt}
        </p>
        {saved ? (
          <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Saved to your journal — thank you.
          </p>
        ) : (
          <div className="flex gap-2">
            <Textarea
              data-testid="input-gratitude"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={copy.placeholder}
              rows={2}
              className="flex-1 text-[13px] resize-none bg-white/70 dark:bg-black/20 border-amber-200 dark:border-amber-700 focus-visible:ring-amber-400/50"
            />
            <Button
              onClick={handleSave}
              disabled={saving}
              data-testid="button-save-gratitude"
              size="sm"
              className="self-end bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-semibold shadow-sm"
            >
              {saving ? "…" : "Save"}
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── 4. Rotating "Did you know?" tip card ──────────────────────────────────────
export function TipCard() {
  const [tip, setTip] = useState(getNextTip);

  function handleDismiss() {
    if (!tip) return;
    dismissTip(tip.id);
    setTip(null);
  }

  if (!tip) return null;
  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-tip"
        className="relative rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 px-5 py-4 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400" />
        <button
          onClick={handleDismiss}
          data-testid="button-dismiss-tip"
          aria-label="Got it"
          className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">
              Did you know?
            </p>
            <p className="text-[13px] font-semibold text-foreground/90 mb-0.5">{tip.heading}</p>
            <p className="text-[13px] text-foreground/70 leading-snug">{tip.body}</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          data-testid="button-tip-gotit"
          className="mt-3 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Got it →
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ── 5. Daily check-in emotion card ────────────────────────────────────────────
export function CheckinCard() {
  const [selected, setSelected] = useState<CheckinEmotion | null>(getTodayCheckin);

  function handleSelect(emotion: CheckinEmotion) {
    saveCheckin(emotion);
    setSelected(emotion);
    // Fire event so HeroAIPrompt can pre-fill
    window.dispatchEvent(
      new CustomEvent("sp-fill-prompt", { detail: { text: CHECKIN_PROMPTS[emotion] } })
    );
  }

  const EMOTIONS: { key: CheckinEmotion; emoji: string; label: string }[] = [
    { key: "hard", emoji: "😔", label: "Hard day" },
    { key: "okay", emoji: "😌", label: "Steady" },
    { key: "grateful", emoji: "🙏", label: "Grateful" },
  ];

  return (
    <motion.div
      {...fadeIn}
      data-testid="card-checkin"
      className="rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
          <SmilePlus className="w-3.5 h-3.5 text-rose-500" />
        </div>
        <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
          {isLateNight() ? "What's on your heart tonight?" : "How are you doing today, really?"}
        </p>
      </div>
      <div className="flex gap-2">
        {EMOTIONS.map(({ key, emoji, label }) => (
          <button
            key={key}
            data-testid={`button-checkin-${key}`}
            onClick={() => handleSelect(key)}
            className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 border transition-all ${
              selected === key
                ? "bg-primary/10 border-primary/40 text-primary"
                : "bg-muted/40 border-border/50 text-foreground/70 hover:bg-muted/70 active:scale-95"
            }`}
          >
            <span className="text-xl">{emoji}</span>
            <span className="text-[11px] font-semibold leading-none">{label}</span>
          </button>
        ))}
      </div>
      {selected && (
        <p className="mt-2.5 text-[12px] text-muted-foreground text-center">
          A reflection has been suggested above — feel free to edit it.
        </p>
      )}
    </motion.div>
  );
}

// ── 6. Shareable verse button (used inside the rhythm card) ──────────────────
interface ShareVerseButtonProps {
  verseText: string;
  verseRef: string;
}

export function ShareVerseButton({ verseText, verseRef }: ShareVerseButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function handleShare() {
    const formatted = `"${verseText}"\n— ${verseRef}\n\nvia Shepherd's Path`;
    if (navigator.share) {
      try {
        await navigator.share({ text: formatted });
      } catch {
        // user cancelled — no toast needed
      }
      return;
    }
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "Paste it anywhere to share." });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      data-testid="button-share-verse"
      aria-label="Share this verse"
      className="flex items-center gap-1 text-[11px] font-semibold text-primary/60 hover:text-primary transition-colors"
    >
      {copied ? <Copy className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}

// ── 7. Sunday weekly summary card ─────────────────────────────────────────────
interface SundaySummaryCardProps {
  streak: number;
  visitCount: number;
}

export function SundaySummaryCard({ streak, visitCount }: SundaySummaryCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isSunday() && !isSundaySummaryDismissed()) setVisible(true);
  }, []);

  function dismiss() {
    dismissSundaySummary();
    setVisible(false);
  }

  const SUNDAY_VERSES = [
    { text: "This is the day that the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" },
    { text: "And let us not grow weary of doing good, for in due season we will reap, if we do not give up.", ref: "Galatians 6:9" },
    { text: "The steadfast love of the Lord never ceases; His mercies never come to an end; they are new every morning.", ref: "Lamentations 3:22-23" },
    { text: "Come to Me, all who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
  ];
  const sundayVerse = SUNDAY_VERSES[new Date().getDate() % SUNDAY_VERSES.length];

  if (!visible) return null;
  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-sunday-summary"
        className="relative rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-5 py-4 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400" />
        <button
          onClick={dismiss}
          data-testid="button-dismiss-sunday"
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-green-500 hover:text-green-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-green-700 dark:text-green-400">
            This week with God
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-3">
          {[
            { value: streak, label: "day streak" },
            { value: visitCount, label: "days opened" },
          ].map(({ value, label }) => (
            <div key={label} className="flex-1 rounded-xl bg-white/60 dark:bg-black/20 border border-green-200/60 dark:border-green-700/40 px-3 py-2 text-center">
              <p className="text-[22px] font-black text-green-700 dark:text-green-300 leading-none">{value}</p>
              <p className="text-[10px] font-semibold text-green-600/70 dark:text-green-400/70 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Verse for the week ahead */}
        <div className="px-3.5 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-green-200/40">
          <p className="text-[11px] font-bold uppercase tracking-widest text-green-600/70 mb-1.5">A verse for the week ahead</p>
          <p className="text-[13px] italic text-foreground/80 leading-relaxed mb-1">"{sundayVerse.text}"</p>
          <p className="text-[11px] font-bold text-green-700/70 dark:text-green-400/70">— {sundayVerse.ref}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── 8. First Steps seeker card (days 1–7) ──────────────────────────────────────
interface FirstStepsCardProps {
  daysWithApp: number;
}

export function FirstStepsCard({ daysWithApp }: FirstStepsCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldShowFirstStepsCard(daysWithApp)) setVisible(true);
  }, [daysWithApp]);

  function dismiss() {
    dismissFirstStepsCard();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-first-steps"
        className="relative rounded-2xl border border-border/60 bg-muted/30 overflow-hidden"
      >
        <button
          onClick={dismiss}
          data-testid="button-dismiss-first-steps"
          aria-label="Dismiss"
          className="absolute top-2.5 right-2.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="px-4 pt-3.5 pb-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-snug">
              New here? There's a journey built for you.
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <Link href="/understand?j=first-steps" onClick={dismiss}>
                <button
                  data-testid="button-start-first-steps"
                  className="text-[12px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Start First Steps →
                </button>
              </Link>
              <button
                onClick={dismiss}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-skip-first-steps"
              >
                I'm familiar with the Bible
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── 8. Weekly deep reflection question ────────────────────────────────────────

const WEEKLY_QUESTIONS = [
  "What's the one area of your life you haven't fully surrendered to God?",
  "What fear has been louder than your faith this week?",
  "Who in your life needs prayer you haven't offered yet?",
  "What has God been quietly asking you to let go of?",
  "Where have you seen His faithfulness in the past month?",
  "What sin have you been excusing rather than confessing?",
  "Is there someone you need to forgive?",
  "What would you do differently if you truly believed God was in control?",
  "When did you last feel closest to God — and what led you there?",
  "What does loving your neighbor actually look like for you this week?",
  "What blessing have you received that you haven't thanked Him for?",
  "If you could ask God one honest question right now, what would it be?",
];

function getWeekOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

const WEEKLY_Q_KEY = "sp_weekly_q_seen";

function hasSeenWeeklyQuestion(): boolean {
  try {
    const raw = localStorage.getItem(WEEKLY_Q_KEY);
    if (!raw) return false;
    return JSON.parse(raw).week === getWeekOfYear();
  } catch { return false; }
}

function markWeeklyQuestionSeen(): void {
  try {
    localStorage.setItem(WEEKLY_Q_KEY, JSON.stringify({ week: getWeekOfYear() }));
  } catch { /* ignore */ }
}

export function WeeklyReflectionCard() {
  const [visible, setVisible] = useState(false);
  const question = WEEKLY_QUESTIONS[getWeekOfYear() % WEEKLY_QUESTIONS.length];

  useEffect(() => {
    if (!hasSeenWeeklyQuestion()) setVisible(true);
  }, []);

  function handleDismiss() {
    markWeeklyQuestionSeen();
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-weekly-reflection"
        className="relative rounded-2xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-950/20 px-5 py-4 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-400" />
        <button
          onClick={handleDismiss}
          data-testid="button-dismiss-weekly-reflection"
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-violet-400 hover:text-violet-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-2">
          This week's reflection
        </p>
        <p className="text-[15px] font-bold text-foreground leading-snug mb-3 pr-6">
          {question}
        </p>
        <Link href="/guidance">
          <button
            onClick={markWeeklyQuestionSeen}
            data-testid="button-weekly-reflection-cta"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            Bring this to God <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}

// ── 7-Day Faith Framework — daily card ────────────────────────────────────────
export function FrameworkDayCard() {
  const day = getTodayFramework();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-framework-day"
        className={`relative rounded-2xl border overflow-hidden shadow-sm ${day.color.border} ${day.color.bg}`}
      >
        <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${day.color.gradient}`} />

        <button
          onClick={() => setDismissed(true)}
          data-testid="button-dismiss-framework"
          aria-label="Dismiss"
          className={`absolute top-3 right-3 transition-colors ${day.color.text} opacity-60 hover:opacity-100`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-4 pb-4 pr-10">
          {/* Label row */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${day.color.text}`}>
              7-Day Faith Framework
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${day.color.badge}`}>
              {day.dayName}
            </span>
          </div>

          {/* Day name */}
          <h3 className="text-[19px] font-black text-foreground leading-tight tracking-tight mb-0.5">
            {day.name}
          </h3>
          <p className={`text-[12px] font-bold uppercase tracking-widest mb-2 ${day.color.text}`}>
            {day.theme}
          </p>

          {/* Description */}
          <p className="text-[13px] text-foreground/70 leading-relaxed mb-3">
            {day.description}
          </p>

          {/* Verse */}
          <div className={`rounded-xl border px-3.5 py-3 mb-3 ${day.color.border} ${day.color.bg}`} style={{ background: "rgba(255,255,255,0.35)" }}>
            <p className="text-[13px] italic text-foreground/80 leading-relaxed mb-1">
              "{day.verse.text}"
            </p>
            <p className={`text-[11px] font-bold ${day.color.text}`}>— {day.verse.ref}</p>
          </div>

          {/* CTA */}
          <Link href={day.actionRoute}>
            <button
              data-testid="button-framework-cta"
              className={`inline-flex items-center gap-1.5 text-[13px] font-bold transition-colors ${day.color.text}`}
            >
              {day.actionLabel} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── NotificationNudgeCard — home screen card for users who haven't enabled notifs ──
const NOTIF_NUDGE_KEY = "sp_notif_nudge_dismissed";

export function NotificationNudgeCard() {
  const { toast } = useToast();
  const sessionId = getSessionId();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "denied">("idle");
  const [pushSupported, setPushSupported] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(NOTIF_NUDGE_KEY)) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    setPushSupported("serviceWorker" in navigator);
    setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(NOTIF_NUDGE_KEY, "1");
    setVisible(false);
  }

  async function handleEnable() {
    if (!pushSupported) {
      toast({ description: "Push notifications aren't supported in this browser. Try enabling email reminders instead." });
      dismiss();
      return;
    }
    setStatus("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await fetch("/api/push/vapid-key");
      const { publicKey } = await vapidRes.json();
      const convertedKey = await urlBase64ToUint8Array(publicKey);
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedKey });
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, subscription: subJson }),
      });
      localStorage.setItem(NOTIF_NUDGE_KEY, "1");
      setStatus("done");
    } catch {
      setStatus("denied");
    }
  }

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-notif-nudge"
        className="relative rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 px-5 py-4 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

        {status === "done" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 py-0.5"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground leading-snug">Reminders are on.</p>
              <p className="text-[12px] text-foreground/60">We'll send your morning verse every day. 🙏</p>
            </div>
          </motion.div>
        ) : status === "denied" ? (
          <div className="pr-5">
            <p className="text-[13px] font-bold text-foreground mb-1">Notifications are blocked in your browser.</p>
            <p className="text-[12px] text-foreground/60 leading-relaxed">
              Go to your browser settings → Notifications → allow Shepherd's Path. Or use the bell icon in the top-right corner anytime.
            </p>
            <button onClick={dismiss} className="text-[12px] text-amber-700 dark:text-amber-400 font-semibold mt-2 hover:opacity-70 transition-opacity">Got it</button>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700/40 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" style={{ width: 17, height: 17 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-foreground leading-snug mb-0.5">Never miss a morning with God.</p>
              <p className="text-[12px] text-foreground/60 leading-relaxed mb-3">
                A daily verse and reflection, sent to your phone before the day starts. One tap to set it up.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleEnable}
                  disabled={status === "loading"}
                  data-testid="button-notif-nudge-enable"
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-[12px] font-bold px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {status === "loading"
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Setting up…</>
                    : <><Bell className="w-3.5 h-3.5" /> Turn on reminders</>
                  }
                </button>
                <button
                  onClick={dismiss}
                  data-testid="button-notif-nudge-dismiss"
                  className="text-[12px] text-foreground/40 hover:text-foreground/60 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              data-testid="button-notif-nudge-x"
              aria-label="Dismiss"
              className="text-amber-400 hover:text-amber-600 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── WalkMilestoneCard — grounding acknowledgment for 30/60/100 day users ────────
const MILESTONE_DAYS = [30, 60, 100];

function getMilestoneContent(days: number) {
  if (days >= 100) return {
    label: "One hundred days",
    headline: "A hundred mornings.",
    body: "A hundred days of returning. This is no longer something you started. It's something you do. Walk on.",
    gradient: "from-amber-400 via-yellow-400 to-amber-500",
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50/60 dark:bg-amber-950/30",
    labelColor: "text-amber-700 dark:text-amber-400",
    xColor: "text-amber-400 hover:text-amber-600",
  };
  if (days >= 60) return {
    label: "Sixty days",
    headline: "A rhythm, not a routine.",
    body: "Two months of returning. Is there anything you're carrying differently now? Not better — differently. That's what this kind of walking does.",
    gradient: "from-violet-400 via-primary to-indigo-400",
    border: "border-violet-200 dark:border-violet-800",
    bg: "bg-violet-50/60 dark:bg-violet-950/30",
    labelColor: "text-primary dark:text-violet-400",
    xColor: "text-violet-400 hover:text-violet-600",
  };
  return {
    label: "Thirty days",
    headline: "This has become something.",
    body: "Most people try and step away. You kept walking. That's not achievement — it's faithfulness. The path is familiar now. That's how it's supposed to feel.",
    gradient: "from-sky-400 via-blue-400 to-indigo-400",
    border: "border-sky-200 dark:border-sky-800",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    labelColor: "text-sky-600 dark:text-sky-400",
    xColor: "text-sky-400 hover:text-sky-600",
  };
}

export function WalkMilestoneCard({ daysWithApp }: { daysWithApp: number }) {
  const [visible, setVisible] = useState(false);
  const milestoneDay = MILESTONE_DAYS.slice().reverse().find(m => daysWithApp >= m) ?? 0;

  useEffect(() => {
    if (!milestoneDay) return;
    const key = `sp_walk_milestone_${milestoneDay}`;
    if (localStorage.getItem(key)) return;
    // Only show for the first 3 days after hitting a milestone
    const daysSince = daysWithApp - milestoneDay;
    if (daysSince > 3) return;
    setVisible(true);
  }, [milestoneDay, daysWithApp]);

  function dismiss() {
    const key = `sp_walk_milestone_${milestoneDay}`;
    localStorage.setItem(key, "1");
    setVisible(false);
  }

  if (!visible) return null;
  const content = getMilestoneContent(daysWithApp);

  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-walk-milestone"
        className={`relative rounded-2xl border ${content.border} ${content.bg} px-5 py-4 shadow-sm overflow-hidden`}
      >
        <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${content.gradient}`} />
        <button
          onClick={dismiss}
          data-testid="button-dismiss-milestone"
          aria-label="Dismiss"
          className={`absolute top-3 right-3 transition-colors ${content.xColor}`}
        >
          <X className="w-4 h-4" />
        </button>
        <p className={`text-[12px] font-bold uppercase tracking-widest mb-1.5 pr-6 ${content.labelColor}`}>
          {content.label}
        </p>
        <p className="text-[15px] font-bold text-foreground leading-snug mb-1">
          {content.headline}
        </p>
        <p className="text-[13px] text-foreground/70 leading-relaxed">
          {content.body}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

// ── FirstDayCard — shown after Day 1 devotional to convert into Day 2 ──────────
const FIRSTDAY_KEY = "sp_firstday_nudge_done";

async function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

export function FirstDayCard({ isFirstDay }: { isFirstDay: boolean }) {
  const { toast } = useToast();
  const sessionId = getSessionId();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "denied" | "email">("idle");
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);

  useEffect(() => {
    if (!isFirstDay) return;
    if (localStorage.getItem(FIRSTDAY_KEY)) return;
    const alreadyGranted = "Notification" in window && Notification.permission === "granted";
    if (alreadyGranted) return;
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setPushSupported(supported);
    setVisible(true);
  }, [isFirstDay]);

  function dismiss() {
    localStorage.setItem(FIRSTDAY_KEY, "1");
    setVisible(false);
  }

  async function handleEnable() {
    localStorage.setItem(FIRSTDAY_KEY, "1");
    if (!pushSupported) { setStatus("email"); return; }
    setStatus("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await fetch("/api/push/vapid-key");
      const { publicKey } = await vapidRes.json();
      const convertedKey = await urlBase64ToUint8Array(publicKey);
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedKey });
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, subscription: subJson }),
      });
      setStatus("done");
    } catch {
      setStatus("denied");
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmailDone(true);
      toast({ description: "You'll get tomorrow's verse by email. 🙏" });
    } catch {
      toast({ description: "Could not subscribe. Try again.", variant: "destructive" });
    }
  }

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-first-day"
        className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-violet-50/80 to-indigo-50/60 dark:from-violet-950/30 dark:to-indigo-950/20 px-5 py-5 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-400 to-indigo-400" />

        {status !== "done" && (
          <button
            onClick={dismiss}
            data-testid="button-dismiss-firstday"
            aria-label="Dismiss"
            className="absolute top-3 right-3 text-primary/40 hover:text-primary/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {status === "done" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-1 gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-[15px] font-bold text-foreground">You're set for tomorrow.</p>
            <p className="text-[13px] text-foreground/60 leading-relaxed">
              We'll send you a gentle reminder before the day starts. See you on Day 2.
            </p>
            <button onClick={dismiss} className="text-[12px] text-primary font-semibold mt-1 hover:opacity-70 transition-opacity">
              Done
            </button>
          </motion.div>
        ) : status === "denied" ? (
          <div>
            <p className="text-[13px] font-bold text-foreground mb-1">Notifications are blocked.</p>
            <p className="text-[12px] text-foreground/60 mb-3 leading-relaxed">
              You can enable them in your browser settings, or subscribe by email instead.
            </p>
            <button
              onClick={() => setStatus("email")}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:opacity-70 transition-opacity"
            >
              <Mail className="w-3.5 h-3.5" /> Get tomorrow's verse by email
            </button>
          </div>
        ) : status === "email" ? (
          <div>
            <p className="text-[13px] font-bold text-foreground mb-2.5">Get Day 2 in your inbox.</p>
            {emailDone ? (
              <div className="flex items-center gap-1.5 text-[13px] text-emerald-600 font-medium">
                <Check className="w-4 h-4" /> Subscribed — see you tomorrow.
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  data-testid="firstday-email-input"
                  className="flex-1 bg-white dark:bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 min-w-0"
                />
                <Button type="submit" size="sm" disabled={!email.trim()} className="rounded-xl shrink-0 text-[12px]">
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-foreground leading-snug">You spent time in the Word today.</p>
                <p className="text-[13px] text-foreground/65 leading-relaxed mt-1">
                  Would you like a gentle reminder so you can return tomorrow?
                </p>
              </div>
            </div>

            <Button
              onClick={handleEnable}
              disabled={status === "loading"}
              data-testid="button-firstday-enable"
              className="w-full rounded-xl text-[13px] font-bold h-10 mb-2"
            >
              {status === "loading"
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Setting up…</>
                : <><Bell className="w-4 h-4 mr-2" /> Yes, remind me tomorrow</>
              }
            </Button>

            <div className="flex items-center justify-between">
              <button
                onClick={() => { localStorage.setItem(FIRSTDAY_KEY, "1"); setStatus("email"); }}
                className="text-[11px] text-foreground/45 hover:text-primary transition-colors"
              >
                Prefer email instead
              </button>
              <button
                onClick={dismiss}
                data-testid="button-firstday-skip"
                className="text-[11px] text-foreground/40 hover:text-foreground/60 transition-colors"
              >
                No thanks
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
