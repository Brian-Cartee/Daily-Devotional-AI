import { useState, useEffect, useRef } from "react";
import { saveBookmark, getBookmark } from "@/lib/bookmarks";
import { ResumeBar } from "@/components/ResumeBar";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HeartHandshake, Loader2, Share2, Check, BookOpen, MessageCircle, Bookmark, BookmarkCheck, Flame, Heart, ImageDown, Zap, Wand2, Star } from "lucide-react";
import { createShareImage, getDailyVersePhoto } from "@/lib/shareImage";
import { SiX, SiFacebook, SiWhatsapp, SiTelegram } from "react-icons/si";
import { useDailyVerse } from "@/hooks/use-verses";
import { streamAI } from "@/lib/streamAI";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BibleStudyChat } from "@/components/BibleStudyChat";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { ShareButton } from "@/components/ShareButton";
import { useToast } from "@/hooks/use-toast";
import { capitalizeDivinePronouns } from "@/lib/divinePronouns";
import { getStoredLang } from "@/lib/language";
import { getUserName } from "@/lib/userName";
import { ListenButton } from "@/components/ListenButton";
import { getDevotionalHeroPhoto } from "@/lib/shareImage";
import { canUseAi, recordAiUsage, getRemainingAi } from "@/lib/aiUsage";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { Link } from "wouter";
import { UpgradeModal } from "@/components/UpgradeModal";
import { AchievementModal } from "@/components/AchievementModal";
import { checkStreakAchievement, checkDevotionalFirstComplete, markAchievementSeen, type Achievement } from "@/lib/achievements";
import { TipPrompt, shouldShowTip } from "@/components/TipPrompt";
import { ShareInviteCard } from "@/components/ShareInviteCard";

function StepLabel({ number: _number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <div className="h-px w-5 bg-border/70" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/85">{label}</span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}

function PrayerText({ text }: { text: string }) {
  const cleaned = text.replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "").trim();
  return (
    <p className="text-[15px] leading-[2] text-foreground/75 italic font-normal">
      {cleaned}
    </p>
  );
}

export default function Devotional() {
  const { data: verse, isLoading: isVerseLoading, error: verseError } = useDailyVerse();
  const [reflectionContent, setReflectionContent] = useState("");
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionError, setReflectionError] = useState(false);
  const [prayerContent, setPrayerContent] = useState("");
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [devotionalStarted, setDevotionalStarted] = useState(false);
  const [savedReflection, setSavedReflection] = useState(false);
  const [savedPrayer, setSavedPrayer] = useState(false);
  const [savedVerse, setSavedVerse] = useState(false);
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number; visitDates?: string[] } | null>(null);
  const pendingStreakAchievementRef = useRef<Achievement | null>(null);
  const reflectionAbortRef = useRef<AbortController | null>(null);
  const prayerAbortRef = useRef<AbortController | null>(null);
  const [gratitudeInput, setGratitudeInput] = useState("");
  const [gratitudePrayer, setGratitudePrayer] = useState("");
  const [gratitudePrayerLoading, setGratitudePrayerLoading] = useState(false);
  const [savedGratitude, setSavedGratitude] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [nudgeName, setNudgeName] = useState(() => getUserName() ?? "");
  const [nudgeEmail, setNudgeEmail] = useState("");
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(() => !!localStorage.getItem("sp_nudge_dismissed"));
  const [includeDailyArt, setIncludeDailyArt] = useState(false);
  const [nudgeTab, setNudgeTab] = useState<"email" | "sms">("email");
  const [nudgePhone, setNudgePhone] = useState("");
  const [nudgeSmsLoading, setNudgeSmsLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [showTipPrompt, setShowTipPrompt] = useState(false);
  const [streakForTip, setStreakForTip] = useState(0);
  const [verseArtUrl, setVerseArtUrl] = useState<string | null>(null);
  const [showAiArt, setShowAiArt] = useState(true);
  const [friendPromptDismissed, setFriendPromptDismissed] = useState(false);
  const [friendShareDone, setFriendShareDone] = useState(false);
  const [forTwoContent, setForTwoContent] = useState("");
  const [forTwoLoading, setForTwoLoading] = useState(false);
  const [verseInMemory, setVerseInMemory] = useState(false);
  const [memoryVerseId, setMemoryVerseId] = useState<number | null>(null);
  const { toast } = useToast();

  // Check if today's verse art has already been generated (cached on server)
  const verseDate = verse?.date ?? "";
  useQuery({
    queryKey: ["/api/verse-art", verseDate],
    queryFn: async () => {
      if (!verseDate) return null;
      const res = await fetch(`/api/verse-art/${verseDate}`);
      const data = await res.json();
      if (data.imageUrl) setVerseArtUrl(data.imageUrl);
      return data;
    },
    enabled: !!verseDate,
    staleTime: Infinity,
  });

  const verseArtMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/verse-art/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verseDate: verse?.date, verseText: verse?.text, verseReference: verse?.reference }),
      });
      if (!res.ok) throw new Error("Generation failed");
      return res.json() as Promise<{ imageUrl: string }>;
    },
    onSuccess: (data) => {
      setVerseArtUrl(data.imageUrl);
      toast({ description: "Your verse art is ready ✨" });
    },
    onError: () => toast({ description: "Could not generate art. Please try again.", variant: "destructive" }),
  });

  // Memory verse — check if today's verse is already saved
  useQuery({
    queryKey: ["/api/memory-verses", verseDate],
    queryFn: async () => {
      if (!verseDate || !verse) return [];
      const res = await fetch(`/api/memory-verses?sessionId=${getSessionId()}`);
      const rows: { id: number; reference: string }[] = await res.json();
      const match = rows.find(r => r.reference === verse.reference);
      if (match) { setVerseInMemory(true); setMemoryVerseId(match.id); }
      return rows;
    },
    enabled: !!verseDate && !!verse,
    staleTime: Infinity,
  });

  const handleToggleMemory = async () => {
    if (!verse) return;
    if (verseInMemory && memoryVerseId) {
      await fetch(`/api/memory-verses/${memoryVerseId}?sessionId=${getSessionId()}`, { method: "DELETE" });
      setVerseInMemory(false);
      setMemoryVerseId(null);
      toast({ description: "Removed from memory verses." });
    } else {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/memory-verses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), reference: verse.reference, text: verse.text, savedAt: today }),
      });
      if (res.ok) {
        const row = await res.json();
        setVerseInMemory(true);
        setMemoryVerseId(row.id);
        toast({ description: "Verse saved to Memory. Find it in your Journal." });
      }
    }
  };

  const handleForTwo = async () => {
    if (!verse || forTwoLoading) return;
    setForTwoLoading(true);
    try {
      const res = await fetch("/api/devotional/for-two", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verseReference: verse.reference,
          verseText: verse.text,
          reflection: reflectionContent,
          lang: getStoredLang(),
        }),
      });
      const data = await res.json();
      setForTwoContent(data.content ?? "");
    } catch {
      toast({ description: "Could not generate companion reflection. Please try again.", variant: "destructive" });
    }
    setForTwoLoading(false);
  };

  // Show thank-you toast if returning from tip checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tip") === "thank-you") {
      toast({ description: "Thank you for your gift. It means everything. 🙏" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  const saveMutation = useMutation({
    mutationFn: async (body: { type: string; content: string; reference?: string; verseDate?: string }) => {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, sessionId }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal", sessionId] });
      if (variables.type === "reflection") setSavedReflection(true);
      if (variables.type === "prayer") setSavedPrayer(true);
      if (variables.type === "verse") setSavedVerse(true);
      toast({ description: "Saved to your journal." });
    },
    onError: () => toast({ description: "Could not save. Please try again.", variant: "destructive" }),
  });

  useEffect(() => {
    if (verse && !devotionalStarted) {
      setDevotionalStarted(true);
      saveBookmark("devotional", {
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        label: `Today's devotional · ${verse.reference}`,
      });
      const lang = getStoredLang();
      const userName = getUserName() ?? undefined;
      generateReflection(verse.id, lang, userName);
      generatePrayer(verse.id, lang, userName);
      fetch("/api/streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).then(r => r.json()).then(data => {
        if (data.currentStreak) {
          setStreak(data);
          const achievement = checkStreakAchievement(data.currentStreak, data.isNewDay);
          if (achievement) {
            pendingStreakAchievementRef.current = achievement;
          }
        }
      }).catch(() => {});
    }
  }, [verse]);

  useEffect(() => {
    return () => {
      reflectionAbortRef.current?.abort();
      prayerAbortRef.current?.abort();
    };
  }, []);

  const generateReflection = async (verseId: number, lang: string, userName?: string) => {
    reflectionAbortRef.current?.abort();
    const controller = new AbortController();
    reflectionAbortRef.current = controller;
    setReflectionLoading(true);
    setReflectionContent("");
    setReflectionError(false);
    try {
      const result = await streamAI("/api/ai/generate", {
        verseId, type: "reflection", lang, userName,
        sessionId: getSessionId(), daysWithApp: getRelationshipAge(),
      }, (text) => setReflectionContent(capitalizeDivinePronouns(text)), controller.signal);
      if (!controller.signal.aborted) {
        setReflectionContent(capitalizeDivinePronouns(result));
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setReflectionError(true);
    }
    if (!controller.signal.aborted) setReflectionLoading(false);
  };

  const generatePrayer = async (verseId: number, lang: string, userName?: string) => {
    prayerAbortRef.current?.abort();
    const controller = new AbortController();
    prayerAbortRef.current = controller;
    setPrayerLoading(true);
    setPrayerContent("");
    setPrayerError(false);
    try {
      const result = await streamAI("/api/ai/generate", {
        verseId, type: "prayer", lang, userName,
        sessionId: getSessionId(), daysWithApp: getRelationshipAge(),
      }, (text) => setPrayerContent(capitalizeDivinePronouns(text)), controller.signal);
      if (!controller.signal.aborted) {
        setPrayerContent(capitalizeDivinePronouns(result));
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setPrayerError(true);
    }
    if (!controller.signal.aborted) setPrayerLoading(false);
  };

  const handleGratitudePrayer = async () => {
    if (!gratitudeInput.trim() || !verse) return;
    if (!canUseAi()) { setShowUpgrade(true); return; }
    recordAiUsage();
    setGratitudePrayerLoading(true);
    setGratitudePrayer("");
    try {
      const res = await fetch("/api/chat/passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageRef: verse.reference,
          passageText: verse.text,
          lang: getStoredLang(),
          userName: getUserName() ?? undefined,
          sessionId: getSessionId(),
          daysWithApp: getRelationshipAge(),
          messages: [{
            role: "user",
            content: `This person has just spent time with ${verse.reference}: "${verse.text}". They want to close by speaking their heart to God. Here is what they are grateful for today: "${gratitudeInput.trim()}". Write an intimate, personal closing prayer — 3 to 5 sentences — as if they are quietly talking to God, not performing for an audience. Let their specific gratitude and the spirit of today's verse meet each other naturally inside the prayer. Begin with "Lord," or "Father," — close with "Amen." Make it feel like it could only have been written for this person, in this moment. Warm. Unhurried. Real. When addressing God, capitalize You, Your, Yours. Never capitalize "you" or "your" when referring to the person praying.`,
          }],
        }),
      });
      const data = await res.json();
      const prayer = capitalizeDivinePronouns(data.content ?? "");
      setGratitudePrayer(prayer);

      // Fire achievement after full devotional completion (Step 4 — Thank Him)
      if (prayer) {
        const devotionalAchievement = checkDevotionalFirstComplete();
        if (devotionalAchievement) {
          setTimeout(() => {
            markAchievementSeen(devotionalAchievement.id);
            setCurrentAchievement(devotionalAchievement);
          }, 1200);
        } else if (pendingStreakAchievementRef.current) {
          const streakAchievement = pendingStreakAchievementRef.current;
          pendingStreakAchievementRef.current = null;
          setTimeout(() => {
            markAchievementSeen(streakAchievement.id);
            setCurrentAchievement(streakAchievement);
          }, 1200);
        }
      }
    } catch {
      setGratitudePrayer("Sorry, we couldn't generate your prayer right now. Please try again.");
    }
    setGratitudePrayerLoading(false);
  };

  const handleNudgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nudgeEmail.trim()) return;
    setNudgeLoading(true);
    try {
      const body: { email: string; name?: string; includeDailyArt?: boolean } = { email: nudgeEmail.trim(), includeDailyArt };
      if (nudgeName.trim()) body.name = nudgeName.trim();
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok || res.status === 409) {
        setEmailSubmitted(true);
        localStorage.setItem("sp_nudge_dismissed", "1");
      } else {
        toast({ description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setNudgeLoading(false);
  };

  const handleNudgeSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nudgePhone.trim()) return;
    setNudgeSmsLoading(true);
    try {
      const res = await fetch("/api/sms/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: nudgePhone.trim() }),
      });
      if (res.ok || res.status === 201 || res.status === 200) {
        setEmailSubmitted(true);
        localStorage.setItem("sp_nudge_dismissed", "1");
      } else {
        toast({ description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setNudgeSmsLoading(false);
  };

  const handleNudgeDismiss = () => {
    localStorage.setItem("sp_nudge_dismissed", "1");
    setNudgeDismissed(true);
  };

  const handleShare = async () => {
    if (!verse) return;
    const prayerText = prayerContent
      ? "\n\n🙏 " + prayerContent.replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "").trim()
      : "";
    const text = `📖 ${verse.reference}\n\n"${verse.text}"${prayerText}\n\n— Shepherd's Path`;
    if (navigator.share) {
      try { await navigator.share({ title: `Today's Word: ${verse.reference}`, text }); } catch { }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendToFriend = async () => {
    if (!verse) return;
    const reflectionSnippet = reflectionContent
      ? "\n\n" + reflectionContent.split("\n").filter(p => p.trim())[0]
      : "";
    const text = `I was thinking of you while reading today's verse.\n\n"${verse.text}"\n— ${verse.reference}${reflectionSnippet}\n\nRead yours at shepherdspathai.com`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "I thought of you today", text });
        setFriendShareDone(true);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setFriendShareDone(true);
      } catch {}
    }
  };

  const handleShareImage = async () => {
    if (!verse || sharingImage) return;
    setSharingImage(true);
    try {
      const blob = await createShareImage(verse.text, verse.reference, verseArtUrl);
      const file = new File([blob], "shepherds-path-devotional.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${verse.reference} — Shepherd's Path` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "shepherds-path-devotional.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { }
    setSharingImage(false);
  };

  const APP_URL = "https://daily-devotional-ai.replit.app";

  const buildShareText = () => {
    if (!verse) return "";
    return `📖 ${verse.reference}\n\n"${verse.text}"\n\nReflect & pray with me at Shepherd's Path 🙏\n${APP_URL}`;
  };

  const shareOnX = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(APP_URL)}`, "_blank", "noopener,width=600,height=450");
  };

  const shareOnFacebook = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${text}&u=https://daily-devotional-ai.replit.app`, "_blank", "noopener,width=600,height=450");
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  };

  const shareOnTruthSocial = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://truthsocial.com/share?text=${text}`, "_blank", "noopener");
  };

  const shareOnTelegram = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://t.me/share/url?url=${encodeURIComponent(APP_URL)}&text=${text}`, "_blank", "noopener");
  };

  if (isVerseLoading) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background pt-14">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40 mb-4" />
          <p className="text-muted-foreground text-sm font-medium">Loading today's word...</p>
        </div>
      </>
    );
  }

  if (verseError || !verse) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background pt-14">
          <div className="bg-card border border-border p-10 rounded-2xl text-center max-w-md shadow-sm">
            <HeartHandshake className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Just a moment</h2>
            <p className="text-muted-foreground text-sm">We couldn't load today's verse. Take a breath and try refreshing.</p>
            <Button variant="outline" className="mt-6 rounded-full px-8 font-semibold" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </>
    );
  }

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric"
  });

  return (
    <>
      <NavBar />

      {/* Hero */}
      <div className="relative h-[40vh] min-h-[260px] max-h-[400px] overflow-hidden pt-14">
        <img
          src={getDevotionalHeroPhoto()}
          alt="Morning devotional"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-end h-full pb-8 px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/25 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-widest mb-2 drop-shadow-lg whitespace-nowrap">
              Daily Devotional · {dateStr}
            </div>
            <p className="text-white text-[13px] italic drop-shadow-lg" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>Walk the path. Follow the Word.</p>
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-xl mx-auto px-5 pb-24 -mt-2 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >

          {/* Streak indicator + weekly tracker */}
          <AnimatePresence>
            {streak && streak.currentStreak >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center gap-2 py-1"
                data-testid="streak-indicator"
              >
                {/* Day count row */}
                <div className="flex items-center gap-2.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500/80" />
                  <span className="text-[12px] font-medium text-muted-foreground">
                    Day #{streak.currentStreak} of my Walk
                  </span>
                  {streak.longestStreak > streak.currentStreak && (
                    <span className="text-[11px] text-muted-foreground/50">· best {streak.longestStreak}</span>
                  )}
                </div>

                {/* Weekly dots */}
                {(() => {
                  const LABELS = ["M","T","W","T","F","S","S"];
                  const today = new Date();
                  const day = today.getDay();
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - ((day === 0 ? 7 : day) - 1));
                  const weekDates = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    return d.toISOString().split("T")[0];
                  });
                  const todayIdx = day === 0 ? 6 : day - 1;
                  const visitSet = new Set(streak.visitDates ?? []);
                  return (
                    <div className="flex items-center gap-1.5">
                      {LABELS.map((label, i) => {
                        const visited = visitSet.has(weekDates[i]);
                        const isToday = i === todayIdx;
                        const isFuture = i > todayIdx;
                        return (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isToday ? "text-primary/80" : "text-muted-foreground/30"}`}>
                              {label}
                            </span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              visited && isToday
                                ? "bg-primary shadow-sm"
                                : visited
                                ? "border border-primary/25 bg-transparent"
                                : isToday
                                ? "border border-primary/40 bg-primary/5"
                                : isFuture
                                ? "border border-muted-foreground/10 bg-muted/20"
                                : "border border-muted-foreground/15 bg-muted/15"
                            }`}>
                              {visited && isToday && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
                              {visited && !isToday && <div className="w-2 h-2 rounded-full bg-primary" />}
                              {!visited && isToday && <div className="w-1 h-1 rounded-full bg-primary/60" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Streak Pro nudge — soft, contextual, only at 5+ days for non-Pro users */}
          {streak && streak.currentStreak >= 5 && !isProVerifiedLocally() && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
            >
              <Link
                href="/pricing"
                data-testid="link-streak-pro-nudge"
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-2xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 text-[12px] font-medium hover:bg-amber-100/60 dark:hover:bg-amber-950/30 transition-colors group"
              >
                <Zap className="w-3 h-3 shrink-0" />
                <span>{streak.currentStreak}-day streak — Pro protects it so one busy day never resets your progress</span>
              </Link>
            </motion.div>
          )}

          {/* STEP 1: TODAY'S WORD — cinematic hero card */}
          <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/10 dark:ring-white/8">

            {/* ── Photo hero ─────────────────────────────────── */}
            <div
              className="relative flex flex-col items-center justify-center px-8 text-center select-none bg-stone-900"
              style={{
                minHeight: verse.text.length > 200 ? "500px" : verse.text.length > 100 ? "460px" : "420px",
              }}
            >
              {/* Photo layer — img tag so it loads reliably (same pattern as hero) */}
              <img
                src={(showAiArt && verseArtUrl) ? verseArtUrl : "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1080&q=85&auto=format&fit=crop"}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  filter: (showAiArt && verseArtUrl) ? "brightness(0.6) saturate(1.1)" : "brightness(0.82) saturate(1.1)",
                }}
              />

              {/* Gradient overlay — bottom darkened for text legibility, top stays bright */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.35) 100%)" }} />

              {/* Loading shimmer while generating AI art */}
              {verseArtMutation.isPending && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <p className="text-white/80 text-[13px] font-medium tracking-wide">Painting your verse…</p>
                </div>
              )}

              {/* Edge veil — deeper darkening at top/bottom for pill + reference legibility */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 25%, rgba(0,0,0,0.10) 75%, rgba(0,0,0,0.55) 100%)" }}
              />

              {/* Ghost decorative quote mark */}
              <div
                className="absolute left-3 top-[18%] text-[200px] leading-none font-serif pointer-events-none"
                style={{ color: "rgba(255,255,255,0.07)", userSelect: "none" }}
                aria-hidden="true"
              >
                ❝
              </div>

              {/* Top pill — step label */}
              <div className="absolute top-4 left-4 z-10">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 px-3 py-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/15">
                  Today's Word
                </span>
              </div>


              {/* Verse + reference */}
              <div className="relative z-10 py-14 max-w-lg">
                <blockquote
                  className="verse-text text-balance mb-6"
                  style={{
                    fontSize: verse.text.length > 180 ? "1.75rem" : verse.text.length > 100 ? "2.1rem" : "2.6rem",
                    lineHeight: 1.45,
                    textShadow: "0 2px 22px rgba(0,0,0,0.80)",
                    fontStyle: "italic",
                    color: "white",
                  }}
                >
                  "{verse.text}"
                </blockquote>

                {/* Glowing reference line */}
                <div className="flex items-center justify-center gap-3">
                  <div className="h-px flex-1 max-w-[56px]" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.35))" }} />
                  <span
                    className="text-[13px] font-bold text-white/90 tracking-wide flex items-center gap-1.5"
                    style={{ textShadow: "0 1px 10px rgba(0,0,0,0.6)" }}
                  >
                    <BookOpen className="w-3.5 h-3.5 opacity-75" />
                    {verse.reference}
                  </span>
                  <div className="h-px flex-1 max-w-[56px]" style={{ background: "linear-gradient(to left, transparent, rgba(255,255,255,0.35))" }} />
                </div>
              </div>
            </div>

            {/* ── Action bar ─────────────────────────────────── */}
            <div className="bg-card border-t border-border/20">
              <div className="grid grid-cols-4 divide-x divide-border/30 px-0">
                <div className="flex justify-center py-3.5">
                  <ListenButton
                    text={`${verse.text} — ${verse.reference}`}
                    label="Listen"
                    vertical
                  />
                </div>
                <button
                  data-testid="button-share-image"
                  onClick={handleShareImage}
                  disabled={sharingImage}
                  className="flex flex-col items-center gap-1.5 py-3.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                >
                  {sharingImage
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ImageDown className="w-4 h-4" />}
                  <span className="text-[11px] font-semibold leading-none">Save Image</span>
                </button>
                <button
                  data-testid="button-share"
                  onClick={handleShare}
                  className="flex flex-col items-center gap-1.5 py-3.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                  <span className="text-[11px] font-semibold leading-none">{copied ? "Copied!" : "Share"}</span>
                </button>
                <button
                  data-testid="button-generate-verse-art"
                  onClick={() => {
                    if (verseArtUrl) {
                      setShowAiArt(v => !v);
                    } else {
                      verseArtMutation.mutate();
                    }
                  }}
                  disabled={verseArtMutation.isPending}
                  className="flex flex-col items-center gap-1.5 py-3.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                >
                  {verseArtMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Wand2 className={`w-4 h-4 ${verseArtUrl && showAiArt ? "text-primary" : ""}`} />}
                  <span className="text-[11px] font-semibold leading-none">
                    {verseArtMutation.isPending ? "Painting…" : verseArtUrl ? (showAiArt ? "AI Art ✓" : "Original") : "AI Art"}
                  </span>
                </button>
              </div>

              {/* Social sharing row */}
              <div className="px-4 pb-3.5 pt-0.5 border-t border-border/20 flex items-center justify-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/40 font-medium mr-1">Share</span>
                <button data-testid="share-x" onClick={shareOnX} title="Share on X" className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all">
                  <SiX className="w-3.5 h-3.5" />
                </button>
                <button data-testid="share-facebook" onClick={shareOnFacebook} title="Share on Facebook" className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-[#1877F2] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all">
                  <SiFacebook className="w-3.5 h-3.5" />
                </button>
                <button data-testid="share-whatsapp" onClick={shareOnWhatsApp} title="Share on WhatsApp" className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-[#25D366] hover:bg-green-50 dark:hover:bg-green-950/40 transition-all">
                  <SiWhatsapp className="w-3.5 h-3.5" />
                </button>
                <button data-testid="share-truthsocial" onClick={shareOnTruthSocial} title="Share on Truth Social" className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-[#7347CC] hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-all">
                  <span className="text-[11px] font-black leading-none">T</span>
                </button>
                <button data-testid="share-telegram" onClick={shareOnTelegram} title="Share on Telegram" className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-[#2AABEE] hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all">
                  <SiTelegram className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-border/40 mx-1" />
                <button
                  data-testid="button-remember-verse"
                  onClick={handleToggleMemory}
                  title={verseInMemory ? "Remove from memory" : "Commit to memory"}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${verseInMemory ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40" : "text-muted-foreground/50 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"}`}
                >
                  <Star className={`w-3.5 h-3.5 ${verseInMemory ? "fill-amber-500" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2: REFLECTION */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={2} label="Reflection" />
            <AnimatePresence mode="wait">
              {reflectionLoading && !reflectionContent && (
                <motion.div key="ref-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-full" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-5/6" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-4/5" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-3/4 mt-1" />
                </motion.div>
              )}
              {reflectionContent && (
                <motion.div key="ref-content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                  <div className="text-[15px] leading-relaxed text-foreground/80 space-y-3">
                    {reflectionContent.split("\n").filter(p => p.trim()).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                  {!reflectionLoading && (
                    <div className="mt-4 flex items-center gap-4">
                      <ShareButton title={`Reflection — ${verse.reference}`} text={reflectionContent} className="text-[12px] font-semibold" />
                      <ListenButton text={reflectionContent} label="Listen" />
                    </div>
                  )}
                  {!reflectionLoading && reflectionContent && !friendPromptDismissed && (
                    <motion.div
                      key="friend-prompt"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2, duration: 0.7, ease: "easeOut" }}
                      className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 flex items-start gap-3"
                    >
                      <Heart className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {friendShareDone ? (
                          <p className="text-[13px] text-primary font-medium">Sent. That meant something. 🙏</p>
                        ) : (
                          <>
                            <p className="text-[13px] text-foreground/80 leading-snug">
                              Did someone come to mind while reading this?
                            </p>
                            <div className="flex items-center gap-4 mt-2 flex-wrap">
                              <button
                                data-testid="button-send-to-friend"
                                onClick={handleSendToFriend}
                                className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
                              >
                                Send it to them →
                              </button>
                              {!forTwoContent && (
                                <button
                                  data-testid="button-reflect-together"
                                  onClick={handleForTwo}
                                  disabled={forTwoLoading}
                                  className="text-[12px] font-semibold text-primary/60 hover:text-primary/80 transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                  {forTwoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                  Reflect together ↗
                                </button>
                              )}
                            </div>
                            {forTwoContent && (
                              <div className="mt-3 pt-3 border-t border-primary/10 space-y-2">
                                {forTwoContent.split("\n").filter(p => p.trim()).map((para, i) => (
                                  <p key={i} className="text-[12.5px] text-foreground/75 leading-relaxed">{para}</p>
                                ))}
                                <ShareButton title={`Reflect Together — ${verse?.reference}`} text={forTwoContent} className="text-[11px] font-semibold mt-1" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <button
                        data-testid="button-dismiss-friend-prompt"
                        onClick={() => setFriendPromptDismissed(true)}
                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors text-lg leading-none mt-0.5 flex-shrink-0"
                        aria-label="Dismiss"
                      >
                        ×
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
              {reflectionError && (
                <motion.p key="ref-error" className="text-sm text-muted-foreground italic">
                  Could not load reflection. <button onClick={() => generateReflection(verse.id, getStoredLang(), getUserName() ?? undefined)} className="underline text-primary">Try again</button>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* ── Daily Email Nudge — appears after reflection, before prayer ── */}
          <AnimatePresence>
            {reflectionContent && !emailSubmitted && !nudgeDismissed && (
              <motion.div
                key="email-nudge"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: 1.8, duration: 0.7, ease: "easeOut" }}
                className="rounded-2xl overflow-hidden shadow-sm"
                style={{ background: "linear-gradient(135deg, hsl(38 60% 96%) 0%, hsl(258 30% 96%) 100%)", border: "1px solid hsl(38 40% 85% / 0.8)" }}
                data-testid="email-nudge-card"
              >
                <div className="px-6 pt-5 pb-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary/60 mb-1">Daily Devotional</p>
                  <p className="text-[17px] font-bold text-foreground leading-snug">Want us to bring this to you every morning?</p>
                  <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                    Scripture and a personal reflection — free, always.
                  </p>
                </div>

                {/* Tab toggle */}
                <div className="px-6 pt-3 pb-1">
                  <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/10 rounded-xl">
                    <button
                      data-testid="nudge-tab-email"
                      onClick={() => setNudgeTab("email")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                        nudgeTab === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      ✉ Email
                    </button>
                    <button
                      data-testid="nudge-tab-sms"
                      onClick={() => setNudgeTab("sms")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                        nudgeTab === "sms" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      💬 Text
                    </button>
                  </div>
                </div>

                {nudgeTab === "email" ? (
                  <form onSubmit={handleNudgeSubmit} className="px-6 pb-2 pt-3 space-y-2.5">
                    <input
                      type="text"
                      value={nudgeName}
                      onChange={e => setNudgeName(e.target.value)}
                      placeholder="Your first name (optional)"
                      data-testid="input-nudge-name"
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                    />
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={nudgeEmail}
                        onChange={e => setNudgeEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        data-testid="input-nudge-email"
                        className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 min-w-0"
                      />
                      <Button
                        type="submit"
                        disabled={nudgeLoading || !nudgeEmail.trim()}
                        data-testid="button-nudge-subscribe"
                        className="rounded-xl px-4 font-bold shrink-0 text-sm"
                      >
                        {nudgeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send it"}
                      </Button>
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
                      <input
                        type="checkbox"
                        checked={includeDailyArt}
                        onChange={e => setIncludeDailyArt(e.target.checked)}
                        data-testid="checkbox-nudge-daily-art"
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                      <span className="text-[12px] text-muted-foreground leading-snug">Also include today's Moment of Beauty image</span>
                    </label>
                  </form>
                ) : (
                  <form onSubmit={handleNudgeSmsSubmit} className="px-6 pb-2 pt-3 space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={nudgePhone}
                        onChange={e => setNudgePhone(e.target.value)}
                        placeholder="(555) 000-0000"
                        required
                        data-testid="input-nudge-phone"
                        className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 min-w-0"
                      />
                      <Button
                        type="submit"
                        disabled={nudgeSmsLoading || !nudgePhone.trim()}
                        data-testid="button-nudge-sms-subscribe"
                        className="rounded-xl px-4 font-bold shrink-0 text-sm"
                      >
                        {nudgeSmsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send it"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">US numbers only. Reply STOP any time to unsubscribe.</p>
                  </form>
                )}

                <div className="px-6 pb-4 pt-1 text-center">
                  <button
                    onClick={handleNudgeDismiss}
                    data-testid="button-nudge-dismiss"
                    className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 3: PRAYER */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={3} label="Prayer" />
            <AnimatePresence mode="wait">
              {prayerLoading && !prayerContent && (
                <motion.div key="pray-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-full" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-5/6" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-2/3" />
                </motion.div>
              )}
              {prayerContent && (
                <motion.div key="pray-content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                  <PrayerText text={prayerContent} />
                  {!prayerLoading && (
                    <div className="mt-4 flex items-center gap-4">
                      <ShareButton title={`Prayer — ${verse.reference}`} text={prayerContent} className="text-[12px] font-semibold" />
                      <ListenButton text={prayerContent} label="Listen" />
                    </div>
                  )}
                </motion.div>
              )}
              {prayerError && (
                <motion.p key="pray-error" className="text-sm text-muted-foreground italic">
                  Could not load prayer. <button onClick={() => generatePrayer(verse.id, getStoredLang(), getUserName() ?? undefined)} className="underline text-primary">Try again</button>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* STEP 4: THANK HIM */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={4} label="Thank Him" />
            <p className="text-[14px] text-muted-foreground mb-4 leading-relaxed">
              What are you grateful for today?
            </p>
            <textarea
              value={gratitudeInput}
              onChange={(e) => setGratitudeInput(e.target.value)}
              placeholder="My family, a quiet morning, a door that opened..."
              rows={3}
              data-testid="input-gratitude"
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 text-[14px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-primary/25 resize-none placeholder:text-muted-foreground/50 transition-shadow"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleGratitudePrayer}
                disabled={!gratitudeInput.trim() || gratitudePrayerLoading}
                data-testid="button-generate-gratitude-prayer"
                className="rounded-xl font-semibold"
              >
                {gratitudePrayerLoading
                  ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Praying...</>
                  : <><Heart className="w-3.5 h-3.5 mr-2" /> Generate Closing Prayer</>
                }
              </Button>
            </div>

            <AnimatePresence>
              {gratitudePrayer && (
                <motion.div
                  key="gratitude-prayer"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="mt-6 pt-5 border-t border-border/40"
                >
                  <PrayerText text={gratitudePrayer} />
                  <div className="mt-4 flex items-center gap-4 flex-wrap">
                    <ShareButton
                      title={`Closing Prayer — ${verse.reference}`}
                      text={gratitudePrayer}
                      className="text-[12px] font-semibold"
                    />
                    <ListenButton text={gratitudePrayer} label="Listen" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Save Today's Devotional — slim inline bar */}
          {(reflectionContent || prayerContent) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-[#fdf8f0] dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/30 rounded-xl px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Bookmark className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <div className="flex items-center gap-x-3 gap-y-1 flex-1 flex-wrap">
                  <span className="text-[12px] font-semibold text-amber-900 dark:text-amber-200">Save to Journal:</span>
                  {[
                    { label: "Verse", available: !!verse?.text, saved: savedVerse },
                    { label: "Reflection", available: !!reflectionContent, saved: savedReflection },
                    { label: "Prayer", available: !!prayerContent, saved: savedPrayer },
                    ...(gratitudePrayer ? [{ label: "Closing Prayer", available: true, saved: savedGratitude }] : []),
                  ].map(({ label, available, saved }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-all ${saved ? "bg-amber-500 border-amber-500" : "border-amber-300/80 dark:border-amber-600"}`}>
                        {saved && <Check className="w-2 h-2 text-white" strokeWidth={3.5} />}
                      </div>
                      <span className={`text-[11.5px] font-medium transition-all ${saved ? "line-through text-amber-400/50" : available ? "text-amber-800 dark:text-amber-300" : "text-amber-400/40"}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  data-testid="btn-save-all-devotional"
                  size="sm"
                  className="shrink-0 rounded-lg text-xs h-7 px-3 font-semibold"
                  disabled={
                    (savedVerse || !verse?.text) &&
                    (savedReflection || !reflectionContent) &&
                    (savedPrayer || !prayerContent) &&
                    (!gratitudePrayer || savedGratitude)
                  }
                  onClick={() => {
                    if (!savedVerse && verse?.text) saveMutation.mutate({ type: "verse", content: verse.text, reference: verse.reference, verseDate: verse.date });
                    if (!savedReflection && reflectionContent) saveMutation.mutate({ type: "reflection", content: reflectionContent, reference: verse?.reference, verseDate: verse?.date });
                    if (!savedPrayer && prayerContent) saveMutation.mutate({ type: "prayer", content: prayerContent, reference: verse?.reference, verseDate: verse?.date });
                    if (!savedGratitude && gratitudePrayer) { saveMutation.mutate({ type: "prayer", content: gratitudePrayer, reference: verse?.reference, verseDate: verse?.date }); setSavedGratitude(true); }
                  }}
                >
                  {saveMutation.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : "Save All"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="pt-1">
            <button
              data-testid="button-ask-scripture"
              onClick={() => setChatOpen(v => !v)}
              className="w-full rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-all px-5 py-4 text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">Ask About This Scripture</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">History · context · cross-references · application</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <MessageCircle className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </button>
          </div>

          {/* Share & Invite — always visible once verse loads */}
          <ShareInviteCard />

          {/* AI Chat */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.4 }}
              >
                <BibleStudyChat
                  verseId={verse.id}
                  initialReflection={reflectionContent}
                />
              </motion.div>
            )}
          </AnimatePresence>


        </motion.div>
      </main>

      <AnimatePresence>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {currentAchievement && (
          <AchievementModal
            achievement={currentAchievement}
            onClose={() => {
              const achieved = currentAchievement;
              setCurrentAchievement(null);
              // After a milestone streak achievement, gently offer the tip prompt
              const milestones = ["streak_7", "streak_14", "streak_30", "streak_60", "streak_100"];
              if (milestones.includes(achieved.id) && shouldShowTip()) {
                const s = streak?.currentStreak ?? 7;
                setTimeout(() => { setStreakForTip(s); setShowTipPrompt(true); }, 600);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTipPrompt && (
          <TipPrompt
            streakDays={streakForTip}
            onClose={() => setShowTipPrompt(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
