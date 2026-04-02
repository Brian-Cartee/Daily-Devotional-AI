import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Share2, RefreshCw, ChevronRight, BookOpen, ArrowLeft,
  Copy, Check, Star, Users, Sparkles, BookMarked, ImageIcon, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/NavBar";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { TriviaQuestion } from "@shared/schema";
import { createTriviaScoreCardImage } from "@/lib/shareImage";

const CATEGORIES = [
  { id: "life-of-jesus",    label: "Life of Jesus",     emoji: "✝️", from: "from-rose-500",    to: "to-amber-500",   bg: "from-rose-50 to-amber-50",   border: "border-rose-200",   dark: "dark:from-rose-950/40 dark:to-amber-950/30 dark:border-rose-800/40" },
  { id: "old-testament",    label: "Old Testament",     emoji: "📜", from: "from-amber-500",   to: "to-orange-500",  bg: "from-amber-50 to-orange-50", border: "border-amber-200",  dark: "dark:from-amber-950/40 dark:to-orange-950/30 dark:border-amber-800/40" },
  { id: "new-testament",    label: "New Testament",     emoji: "📖", from: "from-blue-500",    to: "to-indigo-500",  bg: "from-blue-50 to-indigo-50",  border: "border-blue-200",   dark: "dark:from-blue-950/40 dark:to-indigo-950/30 dark:border-blue-800/40" },
  { id: "bible-characters", label: "Bible Characters",  emoji: "👤", from: "from-violet-500",  to: "to-purple-500",  bg: "from-violet-50 to-purple-50",border: "border-violet-200", dark: "dark:from-violet-950/40 dark:to-purple-950/30 dark:border-violet-800/40" },
  { id: "psalms-wisdom",    label: "Psalms & Wisdom",   emoji: "🕊️", from: "from-emerald-500", to: "to-teal-500",    bg: "from-emerald-50 to-teal-50", border: "border-emerald-200",dark: "dark:from-emerald-950/40 dark:to-teal-950/30 dark:border-emerald-800/40" },
  { id: "books-authors",    label: "Books & Authors",   emoji: "📚", from: "from-orange-500",  to: "to-red-500",     bg: "from-orange-50 to-red-50",   border: "border-orange-200", dark: "dark:from-orange-950/40 dark:to-red-950/30 dark:border-orange-800/40" },
];

const RESULT_VERSES = [
  { min: 10, max: 10, verse: "Well done, good and faithful servant!", ref: "Matthew 25:21" },
  { min: 8,  max: 9,  verse: "Let the word of Christ dwell in you richly in all wisdom.", ref: "Colossians 3:16" },
  { min: 6,  max: 7,  verse: "Study to show yourself approved to God, a worker who does not need to be ashamed.", ref: "2 Timothy 2:15" },
  { min: 4,  max: 5,  verse: "Your word is a lamp to my feet and a light to my path.", ref: "Psalm 119:105" },
  { min: 0,  max: 3,  verse: "His mercies are new every morning; great is His faithfulness.", ref: "Lamentations 3:23" },
];

function getResultVerse(score: number) {
  return RESULT_VERSES.find(r => score >= r.min && score <= r.max) || RESULT_VERSES[3];
}

function getScoreLabel(score: number, total: number) {
  const pct = score / total;
  if (pct === 1)    return { label: "Perfect!",      color: "text-amber-500" };
  if (pct >= 0.8)   return { label: "Excellent!",    color: "text-emerald-600" };
  if (pct >= 0.6)   return { label: "Well done!",    color: "text-blue-600" };
  if (pct >= 0.4)   return { label: "Keep studying", color: "text-orange-500" };
  return              { label: "Keep reading!",        color: "text-rose-500" };
}

type Phase = "select" | "loading" | "challenge-intro" | "playing" | "results";

interface ChallengeCtx {
  challengerName: string;
  challengerScore: number;
  total: number;
  category: string;
  categoryLabel: string;
}

export default function TriviaPage() {
  const params = useParams<{ id?: string }>();
  const challengeId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("select");
  const [category, setCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [challengeCtx, setChallengeCtx] = useState<ChallengeCtx | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [playerName, setPlayerName] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("sp_display_name") || "") : ""
  );
  const scoreCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!challengeId) return;
    setPhase("loading");
    fetch(`/api/trivia/challenge/${challengeId}`)
      .then(r => r.json())
      .then(data => {
        if (data.challenge) {
          const c = data.challenge;
          setChallengeCtx({ challengerName: c.challengerName, challengerScore: c.score, total: c.total, category: c.category, categoryLabel: c.categoryLabel });
          const cat = CATEGORIES.find(x => x.id === c.category) || CATEGORIES[0];
          setCategory(cat);
          setQuestions(c.questions);
          setPhase("challenge-intro");
        } else {
          setPhase("select");
        }
      })
      .catch(() => setPhase("select"));
  }, [challengeId]);

  async function startCategory(cat: typeof CATEGORIES[0]) {
    setCategory(cat);
    setPhase("loading");
    try {
      const [qRes, playRes] = await Promise.all([
        fetch(`/api/trivia/questions/${cat.id}`),
        fetch("/api/trivia/play", { method: "POST" }),
      ]);
      const data = await qRes.json();
      const playData = await playRes.json().catch(() => ({ count: 0 }));
      if (playData.count) setPlayCount(playData.count);
      if (!data.questions?.length) throw new Error("No questions");
      setQuestions(data.questions);
      setCurrentIdx(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setRevealed(false);
      setPhase("playing");
    } catch {
      toast({ title: "Could not load questions", description: "Please try again.", variant: "destructive" });
      setPhase("select");
    }
  }

  function startChallengePlay() {
    setCurrentIdx(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setRevealed(false);
    setPhase("playing");
  }

  function selectAnswer(idx: number) {
    if (revealed) return;
    setSelectedAnswer(idx);
    setRevealed(true);
  }

  function nextQuestion() {
    const newAnswers = [...answers, selectedAnswer!];
    if (currentIdx + 1 >= questions.length) {
      const score = newAnswers.filter((a, i) => a === questions[i].correctIndex).length;
      setAnswers(newAnswers);
      setPhase("results");
      if (!challengeId) createChallenge(newAnswers, score);
    } else {
      setAnswers(newAnswers);
      setCurrentIdx(currentIdx + 1);
      setSelectedAnswer(null);
      setRevealed(false);
    }
  }

  async function createChallenge(finalAnswers: number[], score: number) {
    if (!category) return;
    try {
      const name = playerName.trim() || "A Friend";
      const res = await fetch("/api/trivia/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengerName: name,
          category: category.id,
          categoryLabel: category.label,
          score,
          total: questions.length,
          questions,
        }),
      });
      const data = await res.json();
      if (data.challenge?.id) {
        const url = `${window.location.origin}/trivia/${data.challenge.id}`;
        setShareUrl(url);
      }
    } catch {
      console.error("Failed to create challenge");
    }
  }

  async function shareResult(score: number) {
    const url = shareUrl || window.location.href;
    const catLabel = category?.label || challengeCtx?.categoryLabel || "Bible";
    const catEmoji = category?.emoji
      ?? (challengeCtx?.category ? (CATEGORIES.find(c => c.id === challengeCtx.category)?.emoji ?? "📖") : "📖");
    const { label } = getScoreLabel(score, questions.length);
    const resultVerse = getResultVerse(score);
    const shareText = `I scored ${score}/${questions.length} on the ${catLabel} Bible Challenge! ${label} 📖 Can you beat me?`;

    setIsGeneratingCard(true);
    let imageBlob: Blob | null = null;
    try {
      imageBlob = await createTriviaScoreCardImage({
        score,
        total: questions.length,
        label,
        categoryEmoji: catEmoji,
        categoryLabel: catLabel,
        verse: resultVerse.verse,
        verseRef: resultVerse.ref,
      });
    } catch { imageBlob = null; }
    setIsGeneratingCard(false);

    try {
      if (imageBlob && typeof navigator.canShare === "function") {
        const file = new File([imageBlob], "bible-challenge.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: shareText, url });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title: "Bible Challenge — Shepherd's Path", text: shareText, url });
        return;
      }
    } catch { /* user cancelled — do nothing */ }

    await navigator.clipboard.writeText(`${shareText}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: "Copied to clipboard!", description: "Paste it anywhere to share your challenge." });
  }

  const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
  const q = questions[currentIdx];
  const catObj = category;

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-4">

        {/* ── Category Selection ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {phase === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="text-center pt-4 pb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg mb-3">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-[26px] font-bold text-foreground">Bible Challenge</h1>
                <p className="text-[14px] text-muted-foreground mt-1">Test your knowledge. Challenge a friend to beat your score.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat, i) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => startCategory(cat)}
                    data-testid={`btn-trivia-cat-${cat.id}`}
                    className={`relative rounded-2xl border ${cat.border} ${cat.dark} bg-gradient-to-br ${cat.bg} p-4 text-left active:scale-[0.97] transition-transform shadow-sm hover:shadow-md cursor-pointer overflow-hidden`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${cat.from} ${cat.to}`} />
                    <span className="text-2xl leading-none mb-2 block">{cat.emoji}</span>
                    <p className="text-[13px] font-bold text-foreground leading-snug">{cat.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">10 questions</p>
                  </motion.button>
                ))}
              </div>

              <p className="text-center text-[11px] text-muted-foreground mt-5">
                Questions refresh weekly • All categories are free
              </p>
            </motion.div>
          )}

          {/* ── Loading ────────────────────────────────────────────────── */}
          {phase === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                <BookOpen className="w-10 h-10 text-primary/60" />
              </motion.div>
              <p className="text-[15px] text-muted-foreground">Preparing your questions…</p>
            </motion.div>
          )}

          {/* ── Challenge Intro ────────────────────────────────────────── */}
          {phase === "challenge-intro" && challengeCtx && (
            <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-6">
              <div className="relative rounded-2xl overflow-hidden shadow-xl mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-violet-700 to-indigo-800" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.12)_0%,transparent_70%)]" />
                <div className="relative px-6 py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-3">
                    <Trophy className="w-8 h-8 text-amber-300" />
                  </div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/60 mb-1">You've been challenged!</p>
                  <h2 className="text-[24px] font-bold text-white leading-tight">
                    {challengeCtx.challengerName} scored
                  </h2>
                  <div className="text-[56px] font-bold text-amber-300 leading-none my-2">
                    {challengeCtx.challengerScore}<span className="text-[28px] text-white/60">/{challengeCtx.total}</span>
                  </div>
                  <p className="text-[14px] text-white/75">on {challengeCtx.categoryLabel}</p>
                  <p className="text-[15px] font-semibold text-white mt-2">Can you beat it?</p>
                </div>
              </div>

              <Button onClick={startChallengePlay} data-testid="btn-accept-challenge" className="w-full h-12 text-[16px] font-semibold rounded-xl">
                Accept the Challenge
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
              <button onClick={() => navigate("/trivia")} className="w-full text-center text-[13px] text-muted-foreground mt-3 py-2">
                Pick a different category instead
              </button>
            </motion.div>
          )}

          {/* ── Playing ────────────────────────────────────────────────── */}
          {phase === "playing" && q && (
            <motion.div key={`q-${currentIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="pt-2">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setPhase("select")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] font-medium text-muted-foreground">{catObj?.label}</p>
                    <p className="text-[12px] font-bold text-foreground">{currentIdx + 1} / {questions.length}</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${catObj?.from || "from-primary"} ${catObj?.to || "to-violet-500"}`}
                      initial={{ width: `${(currentIdx / questions.length) * 100}%` }}
                      animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5 mb-4">
                <p className="text-[18px] font-semibold text-foreground leading-snug">{q.question}</p>
                {q.verseRef && (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">{q.verseRef}</p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5 mb-4">
                {q.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === q.correctIndex;
                  let style = "border-border bg-card hover:bg-muted/50 active:scale-[0.98]";
                  if (revealed) {
                    if (isCorrect)       style = "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30";
                    else if (isSelected) style = "border-rose-400 bg-rose-50 dark:bg-rose-950/30";
                    else                 style = "border-border bg-card opacity-50";
                  } else if (isSelected) {
                    style = "border-primary bg-primary/8";
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => selectAnswer(idx)}
                      data-testid={`btn-answer-${idx}`}
                      disabled={revealed}
                      className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all ${style} cursor-pointer`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`text-[13px] font-bold shrink-0 mt-0.5 ${revealed && isCorrect ? "text-emerald-600" : revealed && isSelected ? "text-rose-500" : "text-muted-foreground"}`}>
                          {["A", "B", "C", "D"][idx]}
                        </span>
                        <p className={`text-[14px] leading-snug ${revealed && isCorrect ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>{opt}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl px-4 py-3 mb-4 border ${selectedAnswer === q.correctIndex ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40" : "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/40"}`}
                  >
                    <p className={`text-[12px] font-bold mb-0.5 ${selectedAnswer === q.correctIndex ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {selectedAnswer === q.correctIndex ? "✓ Correct!" : `✗ The answer is ${q.options[q.correctIndex]}`}
                    </p>
                    <p className="text-[13px] text-foreground/80 leading-relaxed">{q.explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {revealed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button onClick={nextQuestion} data-testid="btn-next-question" className="w-full h-11 rounded-xl font-semibold">
                    {currentIdx + 1 >= questions.length ? "See Results" : "Next Question"}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Results ────────────────────────────────────────────────── */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-4">

              {/* Score card — designed to look great as a screenshot */}
              <div ref={scoreCardRef} className="relative rounded-2xl overflow-hidden shadow-2xl mb-5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-violet-700 to-indigo-900" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.13)_0%,transparent_70%)]" />
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-300/60 via-white/80 to-amber-300/60" />

                <div className="relative px-6 py-8 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/12 border border-white/20 mb-4">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                      {catObj?.label || challengeCtx?.categoryLabel}
                    </span>
                  </div>

                  <div className="text-[72px] font-bold text-white leading-none mb-1">
                    {score}
                    <span className="text-[32px] text-white/50">/{questions.length}</span>
                  </div>

                  <p className={`text-[22px] font-bold mb-4 ${getScoreLabel(score, questions.length).color.replace("text-", "text-")} text-amber-300`}>
                    {getScoreLabel(score, questions.length).label}
                  </p>

                  {challengeCtx && (
                    <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 mb-4 inline-block">
                      <p className="text-[12px] text-white/70">
                        {score > challengeCtx.challengerScore
                          ? `🎉 You beat ${challengeCtx.challengerName}! (${challengeCtx.challengerScore}/${challengeCtx.total})`
                          : score === challengeCtx.challengerScore
                          ? `Tied with ${challengeCtx.challengerName}! (${challengeCtx.challengerScore}/${challengeCtx.total})`
                          : `${challengeCtx.challengerName} scored ${challengeCtx.challengerScore}/${challengeCtx.total}`}
                      </p>
                    </div>
                  )}

                  <p className="text-[13px] text-white/65 italic px-2 leading-relaxed">
                    "{getResultVerse(score).verse}"
                  </p>
                  <p className="text-[11px] text-white/45 mt-1">— {getResultVerse(score).ref}</p>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em]">Shepherd's Path</p>
                  </div>
                </div>
              </div>

              {/* Play count social proof */}
              {playCount > 1 && (
                <p className="text-center text-[12px] text-white/50 mb-3 flex items-center justify-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {playCount.toLocaleString()} {playCount === 1 ? "person" : "people"} played today
                </p>
              )}

              {/* Share button — the viral hook */}
              <Button
                onClick={() => shareResult(score)}
                disabled={isGeneratingCard}
                data-testid="btn-share-score"
                className="w-full h-12 text-[15px] font-semibold rounded-xl mb-1 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
              >
                {isGeneratingCard
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating your card…</>
                  : copied
                  ? <><Check className="w-4 h-4 mr-2" />Link copied!</>
                  : <><ImageIcon className="w-4 h-4 mr-2" />Share My Score Card</>
                }
              </Button>
              <p className="text-center text-[11px] text-muted-foreground mb-3">
                📸 Save the card → share to Instagram Stories, iMessage, WhatsApp
              </p>

              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <Button
                  variant="outline"
                  onClick={() => { setPhase("select"); setCategory(null); setAnswers([]); setShareUrl(null); }}
                  data-testid="btn-new-category"
                  className="h-10 text-[13px] rounded-xl"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  New Category
                </Button>
                <Button
                  variant="outline"
                  onClick={() => catObj && startCategory(catObj)}
                  data-testid="btn-play-again"
                  className="h-10 text-[13px] rounded-xl"
                >
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                  Play Again
                </Button>
              </div>

              {/* Nudge for challenge visitors (non-users) */}
              {challengeId && (
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-violet-500/6 px-5 py-5 text-center">
                  <BookMarked className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-[15px] font-semibold text-foreground mb-1">Want to go deeper?</p>
                  <p className="text-[13px] text-muted-foreground mb-3 leading-relaxed">
                    Daily devotionals, guided prayer, and Bible journeys — all free to start.
                  </p>
                  <Link href="/">
                    <Button className="w-full h-10 text-[13px] rounded-xl" data-testid="btn-trivia-explore-app">
                      Explore Shepherd's Path
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
