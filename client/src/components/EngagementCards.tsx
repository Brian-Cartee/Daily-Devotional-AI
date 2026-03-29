import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, SmilePlus, BarChart3, Share2, Copy, Check, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  isReturningUser,
  isReturnCardDismissedToday,
  dismissReturnCard,
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
import { getUserName } from "@/lib/userName";
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
  if (!name) return null;
  return (
    <p
      data-testid="text-greeting-header"
      className="text-[15px] font-semibold text-foreground/60 px-0.5 -mb-1"
    >
      {greeting}, {name}.
    </p>
  );
}

// ── 2. Returning-user grace card ──────────────────────────────────────────────
export function ReturningUserCard() {
  const name = getUserName();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isReturningUser() && !isReturnCardDismissedToday()) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    dismissReturnCard();
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <AnimatePresence>
      <motion.div
        {...fadeIn}
        data-testid="card-returning-user"
        className="relative rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-5 py-4 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400" />
        <button
          onClick={dismiss}
          data-testid="button-dismiss-returning"
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-sky-400 hover:text-sky-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-[13px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-1">
          Welcome back{name ? `, ${name}` : ""}
        </p>
        <p className="text-[14px] text-foreground/80 leading-relaxed">
          Sometimes life gets full — that's okay. Today is a good day to return.
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

// ── 3. Gratitude weekly prompt ────────────────────────────────────────────────
interface GratitudePromptCardProps {
  sessionId: string;
}

export function GratitudePromptCard({ sessionId }: GratitudePromptCardProps) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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
        title: "Gratitude",
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
          Before you go
        </p>
        <p className="text-[14px] text-foreground/85 leading-relaxed mb-3">
          Name one thing you're grateful for today. We'll save it to your journal.
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
              placeholder="I'm thankful for…"
              rows={2}
              className="flex-1 text-[13px] resize-none bg-white/70 dark:bg-black/20 border-amber-200 dark:border-amber-700 focus-visible:ring-amber-400/50"
            />
            <Button
              onClick={handleSave}
              disabled={!text.trim() || saving}
              data-testid="button-save-gratitude"
              size="sm"
              className="self-end bg-amber-600 hover:bg-amber-700 text-white"
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
    { key: "okay", emoji: "😌", label: "Doing okay" },
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
          How are you doing today, really?
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
        className="relative rounded-2xl border border-orange-200/70 dark:border-orange-800/40 bg-card overflow-hidden shadow-sm"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300" />
        <button
          onClick={dismiss}
          data-testid="button-dismiss-first-steps"
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-orange-400 hover:text-orange-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
              A place to start
            </p>
          </div>

          <p className="text-[15px] font-bold text-foreground leading-snug mb-1.5">
            New to this? There's a journey built for exactly where you are.
          </p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            Seven passages. No church background required. Written for someone asking real questions — about whether God is real, whether it's too late, and what any of this actually means.
          </p>

          <div className="flex items-center gap-3">
            <Link href="/understand?j=first-steps" onClick={dismiss}>
              <Button
                size="sm"
                data-testid="button-start-first-steps"
                className="rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-[13px] px-5 shadow-sm"
              >
                Start First Steps
              </Button>
            </Link>
            <button
              onClick={dismiss}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-skip-first-steps"
            >
              I'm familiar with the Bible
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
