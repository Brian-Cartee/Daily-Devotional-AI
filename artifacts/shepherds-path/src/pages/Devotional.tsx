import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { saveBookmark, getBookmark } from "@/lib/bookmarks";
import { ResumeBar } from "@/components/ResumeBar";
import { motion, AnimatePresence } from "framer-motion";
import { HeartHandshake, Loader2, Share2, Check, BookOpen, MessageCircle, Bookmark, BookmarkCheck, Flame, Heart, ImageDown, Zap, Star, Headphones, Square, ChevronDown, X, Download, RefreshCw, Sparkles, Lock } from "lucide-react";
import { createShareImage, createStoryShareImage, getDailyVersePhoto, PHOTO_POOL } from "@/lib/shareImage";
import { isProVerifiedLocally, activateProCode } from "@/lib/proStatus";
import { apiSessionExtras } from "@/lib/requestExtras";
import { recordStreakVisit } from "@/lib/streakApi";
import { SiX, SiFacebook, SiWhatsapp, SiTelegram, SiInstagram, SiPinterest } from "react-icons/si";
import { useDailyVerse } from "@/hooks/use-verses";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";
import { resolveDevotionalHeroBackground } from "@/lib/resolveHeroBackground";
import {
  buildFriendVerseShareText,
  buildVerseSharePreviewUrl,
  buildVerseShareText,
  copyToClipboard,
  downloadBlob,
  easternVerseDateKey,
  shareImageBlob,
  shareImageFilename,
} from "@/lib/shareVerse";
import { streamAI, AiLimitReachedError } from "@/lib/streamAI";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { ShareButton } from "@/components/ShareButton";
import { ShareVerseImageButton } from "@/components/ShareableVerseImage";
import { StreakMilestone } from "@/components/StreakMilestone";
import { useToast } from "@/hooks/use-toast";
import { formatVerseForDisplay } from "@/lib/verseText";
import { getStoredLang } from "@/lib/language";
import { getUserName, getUserVoice, hydrateUserName, setUserNameAsync } from "@/lib/userName";
import { getTodayObservance } from "@/lib/observanceDays";
import { ListenButton } from "@/components/ListenButton";
import { useTTS, prewarmTTS } from "@/hooks/use-tts";
import { canUseAi, recordAiUsage, getRemainingAi } from "@/lib/aiUsage";
import { isLateNight } from "@/lib/nightMode";
import { Link } from "wouter";
import { UpgradeModal } from "@/components/UpgradeModal";
import { AchievementModal } from "@/components/AchievementModal";
import { checkStreakAchievement, checkDevotionalFirstComplete, markAchievementSeen, getBadge, type Achievement } from "@/lib/achievements";
import { isSacredSessionQuiet } from "@/lib/sacredSession";
import { TipPrompt, shouldShowTip } from "@/components/TipPrompt";
import { ShareInviteCard } from "@/components/ShareInviteCard";
import { FirstDayCard } from "@/components/EngagementCards";
import {
  getCachedReflection,
  getCachedPrayer,
  cacheReflection,
  cachePrayer,
  clearDevotionalSession,
  shouldUseCachedDevotional,
} from "@/lib/devotionalSession";
import { AdditionalSermonsSection } from "@/components/AdditionalSermonsSection";
import { DevotionalCompletionThreshold } from "@/components/DevotionalCompletionThreshold";
import { PastorVideoCard } from "@/components/PastorVideoCard";
import { getThresholdNeed } from "@/lib/thresholdState";
import { getRhythm } from "@/lib/faithRhythm";
import {
  mapFaithFocusToPastorVideoTone,
  mapThresholdNeedToPastorVideoTone,
} from "@/lib/pastorVideoTone";
import { usePastorVideo } from "@/hooks/use-pastor-video";
import { ScriptureContext } from "@/components/ScriptureContext";
import { BibleStudyChat } from "@/components/BibleStudyChat";
import { speakShepherdLine } from "@/lib/shepherdVoice";
import { SessionStillness } from "@/components/SessionStillness";
import { getListenFirstPreference } from "@/lib/listenFirst";
import {
  DEVOTIONAL_ENTRY_UPDATED_EVENT,
  getDevotionalEntryMode,
  type DevotionalEntryMode,
} from "@/lib/devotionalEntry";
import { journalSavedToast } from "@/lib/journalToast";
import {
  canStartDevotionalChain,
  canUseListenFirstAuto,
  recordDevotionalChainStarted,
  LISTEN_LIMIT_COPY,
} from "@/lib/listenPolicy";
import { markReturningHome } from "@/lib/introState";
import {
  type DevotionalContinuityIntent,
  markDevotionalVisited,
  shouldOfferDevotionalContinuityChoice,
} from "@/lib/devotionalContinuity";
import { isNativeWebViewShell } from "@/lib/platform";

/** iOS-safe external link opener — anchor click bypasses Safari popup blocker */
const openLink = (url: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

function StepLabel({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)/0.9), hsl(var(--primary)/0.55))",
          boxShadow: "0 0 12px hsl(var(--primary)/0.30), 0 2px 6px rgba(0,0,0,0.15)",
        }}
      >
        <span className="text-[11px] font-bold text-primary-foreground leading-none">{number}</span>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/70">{label}</span>
      <div className="h-px flex-1" style={{ background: "linear-gradient(to right, hsl(var(--primary)/0.25), transparent)" }} />
    </div>
  );
}

function PrayerText({ text }: { text: string }) {
  const cleaned = text.replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "").trim();
  return (
    <p className="text-[18px] leading-[1.72] text-foreground font-normal">
      {cleaned}
    </p>
  );
}

export default function Devotional() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const listenFromHome = new URLSearchParams(search).get("listen") === "1";
  const { data: verse, isLoading: isVerseLoading, error: verseError } = useDailyVerse();
  const [reflectionContent, setReflectionContent] = useState("");
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionError, setReflectionError] = useState(false);
  const [reflectionInput, setReflectionInput] = useState("");
  const [reflectionInputSubmitted, setReflectionInputSubmitted] = useState<string | null>(null);
  const [reflectListenResponse, setReflectListenResponse] = useState("");
  const [reflectListenComplete, setReflectListenComplete] = useState(false);
  const [reflectListenReply, setReflectListenReply] = useState("");
  const [reflectListenReplySubmitted, setReflectListenReplySubmitted] = useState<string | null>(null);
  const [reflectListenLoading, setReflectListenLoading] = useState(false);
  const [reflectListenStreamingText, setReflectListenStreamingText] = useState("");
  const [prayerContent, setPrayerContent] = useState("");
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState(false);

  const [copied, setCopied] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [devotionalStarted, setDevotionalStarted] = useState(false);
  const [showStillness, setShowStillness] = useState(false);
  const listenFirstTriggeredRef = useRef(false);
  const homeListenTriggeredRef = useRef(false);
  const [entryTriggered, setEntryTriggered] = useState(false);
  const [devotionalEntryMode, setDevotionalEntryMode] = useState<DevotionalEntryMode>(
    () => getDevotionalEntryMode(),
  );
  const [savedReflection, setSavedReflection] = useState(false);
  const [savedPrayer, setSavedPrayer] = useState(false);
  const [savedVerse, setSavedVerse] = useState(false);
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number; visitDates?: string[] } | null>(null);
  const pendingStreakAchievementRef = useRef<Achievement | null>(null);
  const completionThresholdRef = useRef<HTMLDivElement>(null);
  const completionAchievementsFiredRef = useRef(false);
  const reflectionAbortRef = useRef<AbortController | null>(null);
  const prayerAbortRef = useRef<AbortController | null>(null);
  const generationStartedRef = useRef(false);
  const hydratedVerseIdRef = useRef<number | null>(null);
  const hydratedNameRef = useRef<string | null>(null);
  const continuityIntentRef = useRef<DevotionalContinuityIntent>("fresh");
  const [continuityResolved, setContinuityResolved] = useState(
    () => !shouldOfferDevotionalContinuityChoice(),
  );
  const [continuityIntent, setContinuityIntent] = useState<DevotionalContinuityIntent>("fresh");
  const [gratitudeInput, setGratitudeInput] = useState("");
  const [gratitudePrayer, setGratitudePrayer] = useState("");
  const [gratitudePrayerLoading, setGratitudePrayerLoading] = useState(false);
  const [gratitudeListenResponse, setGratitudeListenResponse] = useState("");
  const [gratitudeListenComplete, setGratitudeListenComplete] = useState(false);
  const [gratitudeListenReply, setGratitudeListenReply] = useState("");
  const [gratitudeListenReplySubmitted, setGratitudeListenReplySubmitted] = useState<string | null>(null);
  const [gratitudeListenLoading, setGratitudeListenLoading] = useState(false);
  const [savedGratitude, setSavedGratitude] = useState(false);
  const [listenSection, setListenSection] = useState<"verse" | "reflection" | "prayer" | null>(null);
  const [showListenReply, setShowListenReply] = useState(false);
  const [listenReply, setListenReply] = useState("");
  const [listenReplySaved, setListenReplySaved] = useState(false);
  const listenReplyRef = useRef<HTMLTextAreaElement | null>(null);
  const [reflectionReply, setReflectionReply] = useState("");
  const [reflectionReplySaved, setReflectionReplySaved] = useState(false);
  const ttsListen = useTTS();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showListenUpgrade, setShowListenUpgrade] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [showTipPrompt, setShowTipPrompt] = useState(false);
  const [streakForTip, setStreakForTip] = useState(0);
  const [verseArtUrl, setVerseArtUrl] = useState<string | null>(null);
  const [showAiArt, setShowAiArt] = useState(true);
  const [friendIntercessionDismissed, setFriendIntercessionDismissed] = useState(false);
  const [showPostCompletionCtas, setShowPostCompletionCtas] = useState(false);
  const [showOptionalReflection, setShowOptionalReflection] = useState(false);
  const [showOptionalGratitude, setShowOptionalGratitude] = useState(false);
  /** After closing gratitude: null = gentle fork; carry = send-off; stay = daily message + optional depth */
  const [completionPath, setCompletionPath] = useState<null | "carry" | "stay">(null);
  const stayOpenerSpokenRef = useRef(false);
  const DEVOTIONAL_STAY_OPENER = "You stayed. Let's go a little deeper — what's sitting with you from today?";

  const devotionalPastorTone =
    mapThresholdNeedToPastorVideoTone(getThresholdNeed()) ??
    mapFaithFocusToPastorVideoTone(getRhythm()?.focus);
  const devotionalPastorVideo = usePastorVideo(
    devotionalPastorTone,
    !!prayerContent && !prayerLoading && completionPath === "stay",
  );
  const [primarySermonChannel, setPrimarySermonChannel] = useState<string | undefined>();
  const [listenHintSeen, setListenHintSeen] = useState(() => !!localStorage.getItem("sp_listen_intro_seen"));
  const [showShareRow, setShowShareRow] = useState(false);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);
  const [sharePreviewBlob, setSharePreviewBlob] = useState<Blob | null>(null);
  const [sharePreviewFormat, setSharePreviewFormat] = useState<"square" | "story">("square");
  const [regeneratingPreview, setRegeneratingPreview] = useState(false);
  const [forTwoContent, setForTwoContent] = useState("");
  const [forTwoLoading, setForTwoLoading] = useState(false);
  const [verseInMemory, setVerseInMemory] = useState(false);
  const [nameHydrated, setNameHydrated] = useState(false);
  const [savedProfileName, setSavedProfileName] = useState<string | null>(() => getUserName());
  const [nameDraft, setNameDraft] = useState("");
  const [savingNameDraft, setSavingNameDraft] = useState(false);
  const [refreshingForName, setRefreshingForName] = useState(false);
  const [personalizePhase, setPersonalizePhase] = useState<"reflection" | "prayer" | null>(null);
  const quickPersonalizeRef = useRef(false);
  const autoPersonalizeVerseRef = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const inNativeApp = isNativeWebViewShell();
  const AI_PERSONALIZE_TIMEOUT_MS = 75_000;

  const resolvedProfileName = savedProfileName ?? getUserName();

  useEffect(() => {
    let active = true;
    void hydrateUserName().then(({ name }) => {
      if (!active) return;
      if (name) setSavedProfileName(name);
      setNameHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const reflectionIncludesName = (text: string, fullName: string | null) => {
    const first = fullName?.trim().split(/\s+/)[0];
    if (!first) return false;
    return new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
  };

  const resetGratitudeListenState = () => {
    setGratitudeListenResponse("");
    setGratitudeListenComplete(false);
    setGratitudeListenReply("");
    setGratitudeListenReplySubmitted(null);
    setGratitudeListenLoading(false);
  };

  const resetReflectListenState = () => {
    setReflectListenResponse("");
    setReflectListenStreamingText("");
    setReflectListenComplete(false);
    setReflectListenReply("");
    setReflectListenReplySubmitted(null);
    setReflectListenLoading(false);
    setReflectionInputSubmitted(null);
  };

  const beginDevotionalGeneration = (verseId: number, userName?: string) => {
    const lang = getStoredLang();
    const name = userName ?? resolvedProfileName ?? undefined;
    generationStartedRef.current = true;
    const cachedRefl = getCachedReflection(verseId, name ?? null);
    const cachedPryr = getCachedPrayer(verseId, name ?? null);
    if (shouldUseCachedDevotional(verseId, name ?? null)) {
      setReflectionContent(cachedRefl);
      setPrayerContent(cachedPryr);
      return;
    }
    setReflectionContent("");
    setPrayerContent("");
    if (cachedRefl && !cachedPryr) {
      setReflectionContent(cachedRefl);
      generatePrayer(verseId, lang, name, cachedRefl);
      return;
    }
    if (quickPersonalizeRef.current) {
      generateReflection(verseId, lang, name);
      return;
    }
    generateReflection(verseId, lang, name);
  };

  const regenerateWithMyName = (verseId: number, explicitName?: string) => {
    quickPersonalizeRef.current = true;
    setRefreshingForName(true);
    setPersonalizePhase("reflection");
    clearDevotionalSession();
    generationStartedRef.current = false;
    hydratedVerseIdRef.current = null;
    hydratedNameRef.current = null;
    reflectionAbortRef.current?.abort();
    prayerAbortRef.current?.abort();
    setReflectionContent("");
    setPrayerContent("");
    setReflectionError(false);
    setPrayerError(false);
    resetReflectListenState();
    resetGratitudeListenState();
    setEntryTriggered(true);
    beginDevotionalGeneration(verseId, explicitName ?? resolvedProfileName ?? getUserName() ?? undefined);
  };

  useEffect(() => {
    if (!refreshingForName) return;
    if (reflectionLoading) {
      setPersonalizePhase("reflection");
      return;
    }
    if (reflectionContent && resolvedProfileName && reflectionIncludesName(reflectionContent, resolvedProfileName)) {
      setRefreshingForName(false);
      if (prayerLoading) setPersonalizePhase("prayer");
      else if (!prayerLoading && prayerContent) setPersonalizePhase(null);
    }
    if (reflectionError || prayerError) {
      setRefreshingForName(false);
      setPersonalizePhase(null);
      quickPersonalizeRef.current = false;
    }
  }, [refreshingForName, reflectionLoading, prayerLoading, reflectionContent, prayerContent, prayerError, reflectionError, resolvedProfileName]);

  useEffect(() => {
    if (!prayerLoading && !reflectionLoading) {
      setPersonalizePhase(null);
      quickPersonalizeRef.current = false;
    } else if (prayerLoading && reflectionContent && !reflectionLoading) {
      setPersonalizePhase("prayer");
    }
  }, [prayerLoading, reflectionLoading, reflectionContent]);

  // If we know your name but today's cached reflection was generated without it, refresh once
  useEffect(() => {
    if (!nameHydrated || !verse?.id || !entryTriggered || !reflectionContent || reflectionLoading || prayerLoading) return;
    const name = resolvedProfileName;
    if (!name) return;
    if (shouldUseCachedDevotional(verse.id, name)) return;
    if (reflectionIncludesName(reflectionContent, name)) return;
    if (autoPersonalizeVerseRef.current === verse.id) return;
    autoPersonalizeVerseRef.current = verse.id;
    regenerateWithMyName(verse.id);
  }, [
    nameHydrated,
    verse?.id,
    entryTriggered,
    reflectionContent,
    reflectionLoading,
    prayerLoading,
    resolvedProfileName,
  ]);

  useEffect(() => {
    if (!prayerContent || prayerLoading || completionPath !== "stay") {
      setShowPostCompletionCtas(false);
      return;
    }
    const t = window.setTimeout(() => setShowPostCompletionCtas(true), 5000);
    return () => window.clearTimeout(t);
  }, [prayerContent, prayerLoading, completionPath]);

  useEffect(() => {
    setCompletionPath(null);
    setPrimarySermonChannel(undefined);
    setFriendIntercessionDismissed(false);
    stayOpenerSpokenRef.current = false;
  }, [verse?.id]);

  useEffect(() => {
    if (completionPath !== "stay") return;
    if (stayOpenerSpokenRef.current) return;
    stayOpenerSpokenRef.current = true;
    let cancelSpeak: (() => void) | undefined;
    const t = window.setTimeout(() => {
      cancelSpeak = speakShepherdLine(DEVOTIONAL_STAY_OPENER);
    }, 600);
    return () => {
      window.clearTimeout(t);
      cancelSpeak?.();
    };
  }, [completionPath]);

  const [memoryVerseId, setMemoryVerseId] = useState<number | null>(null);
  const { toast } = useToast();

  const verseDate = verse?.date ?? "";
  const bundledHeroSrc = getDevotionalHeroImage(verseDate || undefined);
  const [heroBgSrc, setHeroBgSrc] = useState<string | null>(null);
  const heroBgBlobRef = useRef<string | null>(null);
  const heroBgForDisplay = heroBgSrc ?? bundledHeroSrc;
  const autoGeneratingVerseArtRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (heroBgBlobRef.current) {
      URL.revokeObjectURL(heroBgBlobRef.current);
      heroBgBlobRef.current = null;
    }
    setHeroBgSrc(null);

    void resolveDevotionalHeroBackground(verseDate || undefined, verseArtUrl).then((src) => {
      if (cancelled) {
        if (src.startsWith("blob:")) URL.revokeObjectURL(src);
        return;
      }
      if (src.startsWith("blob:")) heroBgBlobRef.current = src;
      setHeroBgSrc(src);
    });

    return () => {
      cancelled = true;
      if (heroBgBlobRef.current) {
        URL.revokeObjectURL(heroBgBlobRef.current);
        heroBgBlobRef.current = null;
      }
    };
  }, [verseDate, verseArtUrl]);
  useQuery({
    queryKey: ["/api/verse-art", verseDate],
    queryFn: async () => {
      if (!verseDate) return null;
      const res = await fetch(`/api/verse-art/${verseDate}`);
      const data = await res.json();
      if (data.imageUrl) {
        setVerseArtUrl(data.imageUrl);
      } else if (!data.cached && verse && !autoGeneratingVerseArtRef.current) {
        autoGeneratingVerseArtRef.current = true;
        fetch("/api/verse-art/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verseDate: verse.date,
            verseText: verse.text,
            verseReference: verse.reference,
            ...apiSessionExtras(),
          }),
        })
          .then(r => r.json())
          .then(d => { if (d.imageUrl) setVerseArtUrl(d.imageUrl); })
          .catch(() => {});
      }
      return data;
    },
    enabled: !!verseDate && !!verse,
    staleTime: Infinity,
  });

  const verseArtMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/verse-art/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verseDate: verse?.date,
          verseText: verse?.text,
          verseReference: verse?.reference,
          ...apiSessionExtras(),
        }),
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
          ...apiSessionExtras(),
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

  // Lock body scroll while share preview sheet is open
  useEffect(() => {
    if (sharePreviewUrl) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sharePreviewUrl]);
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  const notifyJournalSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/journal", sessionId] });
    toast(journalSavedToast(() => navigate("/journal")));
  };

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
      notifyJournalSaved();
    },
    onError: () => toast({ description: "Could not save. Please try again.", variant: "destructive" }),
  });

  // Effect 1: Immediate setup when verse loads — bookmark, prewarm TTS, streak
  useEffect(() => {
    if (verse && !devotionalStarted) {
      setDevotionalStarted(true);
      saveBookmark("devotional", {
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        label: `Today's devotional · ${verse.reference}`,
      });
      prewarmTTS(`${verse.text} — ${verse.reference}`, getUserVoice(), "verse");
      recordStreakVisit()
        .then((data) => {
          if (data.currentStreak) {
            setStreak(data);
            if (data.freezeApplied) {
              toast({
                description: "Pro kept your streak — one grace day used this month.",
              });
            }
            const achievement = checkStreakAchievement(data.currentStreak, data.isNewDay);
            if (achievement) {
              pendingStreakAchievementRef.current = achievement;
            }
          }
        })
        .catch(() => {});
    }
  }, [verse]);

  useEffect(() => {
    continuityIntentRef.current = continuityIntent;
  }, [continuityIntent]);

  useEffect(() => {
    markDevotionalVisited();
  }, []);

  const resolveContinuity = (intent: DevotionalContinuityIntent) => {
    setContinuityIntent(intent);
    continuityIntentRef.current = intent;
    setContinuityResolved(true);
    setEntryTriggered(true);
    generationStartedRef.current = false;
  };

  // Hydrate reflection/prayer from session only after name is known and cache matches that name
  useEffect(() => {
    if (!verse?.id || !nameHydrated) return;
    const userName = resolvedProfileName;
    const nameKey = userName ?? "";
    if (hydratedVerseIdRef.current === verse.id && hydratedNameRef.current === nameKey) return;

    const verseChanged = hydratedVerseIdRef.current !== verse.id;
    hydratedVerseIdRef.current = verse.id;
    hydratedNameRef.current = nameKey;
    if (verseChanged) generationStartedRef.current = false;

    const cachedRefl = getCachedReflection(verse.id, userName);
    const cachedPryr = getCachedPrayer(verse.id, userName);
    setReflectionContent(cachedRefl);
    setPrayerContent(cachedPryr);
    if (cachedRefl && shouldUseCachedDevotional(verse.id, userName)) {
      setEntryTriggered(true);
    }
  }, [verse?.id, nameHydrated]);

  // Effect 2: Generate reflection/prayer once the user begins (after continuity choice when applicable)
  useEffect(() => {
    if (!verse || !entryTriggered || !continuityResolved || !nameHydrated || generationStartedRef.current) return;
    beginDevotionalGeneration(verse.id, resolvedProfileName ?? undefined);
  }, [verse, entryTriggered, continuityResolved, nameHydrated, resolvedProfileName]);

  useEffect(() => {
    const syncEntryMode = () => setDevotionalEntryMode(getDevotionalEntryMode());
    window.addEventListener(DEVOTIONAL_ENTRY_UPDATED_EVENT, syncEntryMode);
    return () => window.removeEventListener(DEVOTIONAL_ENTRY_UPDATED_EVENT, syncEntryMode);
  }, []);

  // Auto-begin immediately when preference is "auto" (no delayed flash)
  useEffect(() => {
    if (!verse || entryTriggered || !nameHydrated) return;
    if (devotionalEntryMode !== "auto") return;
    // In auto mode, never wait for a continuity choice — start fresh immediately
    if (!continuityResolved) {
      resolveContinuity("fresh");
      return;
    }
    setEntryTriggered(true);
  }, [verse, entryTriggered, continuityResolved, nameHydrated, devotionalEntryMode]);

  useEffect(() => {
    return () => {
      reflectionAbortRef.current?.abort();
      prayerAbortRef.current?.abort();
    };
  }, []);

  const generateReflection = async (
    verseId: number,
    lang: string,
    userName?: string,
    opts?: { reflectionInput?: string; reflectListenReply?: string },
  ) => {
    reflectionAbortRef.current?.abort();
    const controller = new AbortController();
    reflectionAbortRef.current = controller;
    const quick = quickPersonalizeRef.current;
    const timeoutId = window.setTimeout(() => controller.abort(), AI_PERSONALIZE_TIMEOUT_MS);
    setReflectionLoading(true);
    setReflectionContent("");
    setReflectionError(false);
    try {
      const result = await streamAI("/api/ai/generate", {
        verseId, type: "reflection", lang, userName,
        sessionId: getSessionId(), daysWithApp: getRelationshipAge(),
        isLateNight: isLateNight(),
        continuityIntent: quick ? "fresh" : continuityIntentRef.current,
        quickPersonalize: quick,
        ...(opts?.reflectionInput ? { reflectionInput: opts.reflectionInput } : {}),
        ...(opts?.reflectListenReply ? { reflectListenReply: opts.reflectListenReply } : {}),
      }, (text) => setReflectionContent(capitalizeDivinePronouns(text)), controller.signal);
      if (!controller.signal.aborted) {
        const finalText = capitalizeDivinePronouns(result);
        setReflectionContent(finalText);
        const nameForCache = userName ?? getUserName() ?? null;
        cacheReflection(finalText, verseId, nameForCache);
        if (!quick) prewarmTTS(finalText, getUserVoice());
        generatePrayer(
          verseId,
          lang,
          userName ?? nameForCache ?? undefined,
          finalText,
          opts?.reflectListenReply,
        );
      }
    } catch (e: unknown) {
      if (e instanceof AiLimitReachedError) {
        setShowUpgrade(true);
      } else if ((e as { name?: string })?.name === "AbortError") {
        if (quick) {
          setReflectionError(true);
          toast({
            title: "Taking longer than usual",
            description: "Check your connection and tap Try again below.",
            variant: "destructive",
          });
        }
      } else {
        setReflectionError(true);
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
    if (!controller.signal.aborted) setReflectionLoading(false);
  };

  const streamReflectListen = async (input: string): Promise<boolean> => {
    if (!verse) return false;
    setReflectListenStreamingText("");
    setReflectListenResponse("");
    setReflectListenComplete(false);
    setReflectListenReply("");
    setReflectListenReplySubmitted(null);
    try {
      const res = await fetch("/api/devotional/reflect-listen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verseText: verse.text,
          verseReference: verse.reference,
          reflectionInput: input,
          userName: getUserName() ?? undefined,
          sessionId: getSessionId(),
          daysWithApp: getRelationshipAge(),
          ...apiSessionExtras(),
        }),
      });
      if (res.status === 429) {
        setShowUpgrade(true);
        return false;
      }
      if (!res.ok || !res.body) return false;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setReflectListenStreamingText(accumulated);
      }
      if (!accumulated.trim()) return false;
      setReflectListenResponse(accumulated);
      setReflectListenStreamingText("");
      setReflectListenComplete(true);
      return true;
    } catch {
      return false;
    }
  };

  const handleReflect = async () => {
    const input = reflectionInput.trim();
    if (!input || !verse) return;
    setReflectionInputSubmitted(input);
    await saveOptionalReflectionToJournal(input);
  };

  const handleReflectListenContinue = async () => {
    const reply = reflectListenReply.trim();
    if (!reply || !verse || !reflectionInputSubmitted) return;
    setReflectListenReplySubmitted(reply);
    await saveOptionalReflectionToJournal(reflectionInputSubmitted, reply);
  };

  const handleReflectListenKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleReflectListenContinue();
    }
  };

  const generatePrayer = async (
    verseId: number,
    lang: string,
    userName?: string,
    reflectionContext?: string,
    userReflectionReply?: string,
  ) => {
    prayerAbortRef.current?.abort();
    const controller = new AbortController();
    prayerAbortRef.current = controller;
    const quick = quickPersonalizeRef.current;
    const timeoutId = window.setTimeout(() => controller.abort(), AI_PERSONALIZE_TIMEOUT_MS);
    setPrayerLoading(true);
    setPrayerContent("");
    setPrayerError(false);
    try {
      const result = await streamAI("/api/ai/generate", {
        verseId, type: "prayer", lang, userName,
        sessionId: getSessionId(), daysWithApp: getRelationshipAge(),
        isLateNight: isLateNight(),
        continuityIntent: quick ? "fresh" : continuityIntentRef.current,
        quickPersonalize: quick,
        ...(reflectionContext ? { reflectionContext } : {}),
        ...(userReflectionReply ? { userReflectionReply } : {}),
      }, (text) => setPrayerContent(capitalizeDivinePronouns(text)), controller.signal);
      if (!controller.signal.aborted) {
        const finalPrayer = capitalizeDivinePronouns(result);
        setPrayerContent(finalPrayer);
        cachePrayer(finalPrayer, verseId, userName ?? getUserName() ?? null);
        if (!quick) {
          const cleaned = finalPrayer.replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "").trim();
          prewarmTTS(cleaned, "nova");
        }
      }
    } catch (e: unknown) {
      if (e instanceof AiLimitReachedError) {
        setShowUpgrade(true);
      } else if ((e as { name?: string })?.name === "AbortError") {
        if (quick) {
          setPrayerError(true);
          toast({
            title: "Prayer is taking longer than usual",
            description: "Your reflection may be ready — tap Try again on the prayer section.",
            variant: "destructive",
          });
        }
      } else {
        setPrayerError(true);
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
    if (!controller.signal.aborted) setPrayerLoading(false);
  };

  const saveOptionalReflectionToJournal = async (input: string, reply?: string) => {
    if (!verse) return;
    const content = [input.trim(), reply?.trim()].filter(Boolean).join("\n\n");
    if (!content) return;
    try {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          verseRef: verse.reference,
          verseText: verse.text,
          content,
          type: "reflection",
        }),
      });
      setReflectionReplySaved(true);
      notifyJournalSaved();
    } catch {
      setReflectionReplySaved(true);
    }
  };

  const fireDevotionalCompletionAchievements = () => {
    if (isSacredSessionQuiet()) return;
    const devotionalAchievement = checkDevotionalFirstComplete();
    // If streak > 1 the user has clearly completed before — mark silently, never show again.
    const alreadyPastFirstDay = (streak?.currentStreak ?? 0) > 1 || pendingStreakAchievementRef.current !== null;
    if (devotionalAchievement && !alreadyPastFirstDay) {
      setTimeout(() => {
        markAchievementSeen(devotionalAchievement.id);
        setCurrentAchievement(devotionalAchievement);
      }, 800);
      return;
    }
    if (devotionalAchievement) markAchievementSeen(devotionalAchievement.id);
    if (pendingStreakAchievementRef.current) {
      const streakAchievement = pendingStreakAchievementRef.current;
      pendingStreakAchievementRef.current = null;
      setTimeout(() => {
        markAchievementSeen(streakAchievement.id);
        setCurrentAchievement(streakAchievement);
      }, 800);
    }
  };

  const generateGratitudePrayerDirect = async (options?: {
    listenReply?: string;
    userReflectionReply?: string;
  }) => {
    if (!gratitudeInput.trim() || !verse) return;
    if (!canUseAi()) {
      setShowUpgrade(true);
      return;
    }
    recordAiUsage();
    setGratitudePrayerLoading(true);
    setGratitudePrayer("");
    const listenReplyExtra = options?.listenReply?.trim()
      ? `\n\nWhen I asked them more about this gift, they shared: '${options.listenReply.trim()}'`
      : "";
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
          ...(options?.userReflectionReply ? { userReflectionReply: options.userReflectionReply } : {}),
          messages: [{
            role: "user",
            content: `This person has just spent time with ${verse.reference}: "${verse.text}".${reflectionContent ? ` Their reflection landed on this: "${reflectionContent.split("\n").filter(p => p.trim())[0]}"` : ""} They want to close by speaking their heart to God. Here is what they are grateful for today: "${gratitudeInput.trim()}".${listenReplyExtra} Write an intimate, personal closing prayer — 3 to 5 sentences — as if they are quietly talking to God, not performing for an audience. Let their gratitude, the spirit of today's verse${reflectionContent ? ", and the emotional thread of the reflection" : ""} meet each other naturally inside the prayer. Open with "Lord," or "Father," — then immediately name the specific thing they just shared (use their exact words or very close paraphrase, not a category like "gratitude" or "blessings"). Do not open with a generic phrase like "thank You for this day" or "we come before You." Close with "Amen." Make it feel like it could only have been written for this person, in this moment. Warm. Unhurried. Real. When addressing God, capitalize You, Your, Yours. Never capitalize "you" or "your" when referring to the person praying.`,
          }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let rawPrayer = "";
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawPrayer += decoder.decode(value, { stream: true });
          setGratitudePrayer(capitalizeDivinePronouns(rawPrayer));
        }
      }
      const prayer = capitalizeDivinePronouns(rawPrayer);
      setGratitudePrayer(prayer);
    } catch {
      setGratitudePrayer("Sorry, we couldn't generate your prayer right now. Please try again.");
    }
    setGratitudePrayerLoading(false);
  };

  const streamGratitudeListen = async (): Promise<boolean> => {
    if (!verse || !gratitudeInput.trim()) return false;
    setGratitudeListenResponse("");
    setGratitudeListenComplete(false);
    setGratitudeListenReply("");
    setGratitudeListenReplySubmitted(null);
    try {
      const res = await fetch("/api/devotional/gratitude-listen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gratitudeInput: gratitudeInput.trim(),
          verseReference: verse.reference,
          userName: getUserName() ?? undefined,
          sessionId: getSessionId(),
          daysWithApp: getRelationshipAge(),
          ...apiSessionExtras(),
        }),
      });
      if (res.status === 429) {
        setShowUpgrade(true);
        return false;
      }
      if (!res.ok || !res.body) return false;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setGratitudeListenResponse(accumulated);
      }
      if (!accumulated.trim()) return false;
      setGratitudeListenComplete(true);
      return true;
    } catch {
      return false;
    }
  };

  const handleGratitudePrayer = async () => {
    if (!gratitudeInput.trim() || !verse || gratitudeListenLoading || gratitudePrayerLoading) return;
    if (!canUseAi()) {
      setShowUpgrade(true);
      return;
    }
    resetGratitudeListenState();
    setGratitudeListenLoading(true);
    const listenOk = await streamGratitudeListen();
    setGratitudeListenLoading(false);
    if (!listenOk) {
      resetGratitudeListenState();
      await generateGratitudePrayerDirect();
    }
  };

  const handleGratitudeListenContinue = async () => {
    const reply = gratitudeListenReply.trim();
    if (!reply || gratitudePrayerLoading) return;
    setGratitudeListenReplySubmitted(reply);
    await generateGratitudePrayerDirect({
      listenReply: reply,
      userReflectionReply: reply,
    });
  };

  const handleGratitudeListenKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleGratitudeListenContinue();
    }
  };

  const stopFullListen = () => {
    ttsListen.stop();
    setListenSection(null);
  };

  const devotionalCoreComplete =
    !!verse && !!prayerContent.trim() && !prayerLoading;

  // Story moments appear when the user reaches the completion fork — not when prayer finishes
  useEffect(() => {
    completionAchievementsFiredRef.current = false;
  }, [verse?.id]);

  useEffect(() => {
    if (!devotionalCoreComplete || completionPath !== null) return;
    const el = completionThresholdRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.35);
        if (!visible || completionAchievementsFiredRef.current) return;
        completionAchievementsFiredRef.current = true;
        fireDevotionalCompletionAchievements();
      },
      { threshold: [0.35, 0.5] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [devotionalCoreComplete, completionPath]);

  const fullListenReady =
    !!verse &&
    !!reflectionContent.trim() &&
    !reflectionLoading &&
    !!prayerContent.trim() &&
    !prayerLoading;

  const listenFirstReady = devotionalCoreComplete;

  const showFullListenBar =
    !!verse && (!!reflectionContent.trim() || reflectionLoading || !!prayerContent.trim() || prayerLoading);

  const startFullListen = async () => {
    if (ttsListen.playing || ttsListen.loading) { stopFullListen(); return; }
    if (!listenHintSeen) { localStorage.setItem("sp_listen_intro_seen", "1"); setListenHintSeen(true); }

    if (!canStartDevotionalChain()) {
      setShowListenUpgrade(true);
      return;
    }

    if (!fullListenReady) {
      toast({
        title: prayerLoading || !prayerContent.trim() ? "Prayer is still preparing" : "Reflection is still preparing",
        description: "Full listen plays all three parts in order — verse, reflection, then prayer. One moment.",
      });
      return;
    }

    setShowListenReply(false);
    setListenReplySaved(false);
    setListenReply("");

    const cleanPrayer = prayerContent
      .replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "")
      .trim();

    const sections: Array<{ key: string; text: string }> = [
      { key: "verse", text: `${verse!.text}. ${verse!.reference}.` },
      { key: "reflection", text: reflectionContent.trim() },
      { key: "prayer", text: cleanPrayer },
    ];

    recordDevotionalChainStarted();

    await ttsListen.playChain(
      sections,
      (_, key) => setListenSection(key as "verse" | "reflection" | "prayer"),
      () => {
        setListenSection(null);
        setShowListenReply(true);
        setTimeout(() => listenReplyRef.current?.focus(), 300);
      },
      {
        chainScope: "devotional",
        onLimit: () => setShowListenUpgrade(true),
      },
    );

    setListenSection(null);
  };

  const startListenFirst = async () => {
    if (ttsListen.playing || ttsListen.loading) { stopFullListen(); return; }
    if (!listenHintSeen) { localStorage.setItem("sp_listen_intro_seen", "1"); setListenHintSeen(true); }

    if (!canStartDevotionalChain()) {
      setShowListenUpgrade(true);
      return;
    }

    if (!listenFirstReady) {
      toast({
        title: "Prayer is still preparing",
        description: "Listen-first plays today's verse and prayer — one moment.",
      });
      return;
    }

    const cleanPrayer = prayerContent
      .replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "")
      .trim();

    const sections: Array<{ key: string; text: string }> = [
      { key: "verse", text: `${verse!.text}. ${verse!.reference}.` },
      { key: "prayer", text: cleanPrayer },
    ];

    recordDevotionalChainStarted();

    await ttsListen.playChain(
      sections,
      (_, key) => setListenSection(key as "verse" | "reflection" | "prayer"),
      () => setListenSection(null),
      {
        chainScope: "devotional",
        onLimit: () => setShowListenUpgrade(true),
      },
    );

    setListenSection(null);
  };

  useEffect(() => {
    if (!fullListenReady || listenFirstTriggeredRef.current) return;
    if (!canUseListenFirstAuto() || !getListenFirstPreference()) return;
    listenFirstTriggeredRef.current = true;
    const t = setTimeout(() => {
      void startFullListen();
    }, 800);
    return () => clearTimeout(t);
  }, [fullListenReady]);

  useEffect(() => {
    if (!listenFromHome || homeListenTriggeredRef.current) return;
    if (!listenFirstReady) return;
    homeListenTriggeredRef.current = true;
    void startListenFirst();
  }, [listenFromHome, listenFirstReady]);

  const handleShare = async () => {
    if (!verse) return;
    const date = verse.date ?? easternVerseDateKey();
    const prayerSnippet = prayerContent
      ? prayerContent.replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "").trim().slice(0, 200)
      : undefined;
    const text = buildVerseShareText({
      text: verse.text,
      reference: verse.reference,
      date,
      extraLine: prayerSnippet ? `A prayer for today:\n"${prayerSnippet}"` : undefined,
    });
    if (navigator.share) {
      try {
        await navigator.share({ title: `Today's Word: ${verse.reference}`, text });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendToFriend = async () => {
    if (!verse) return;
    const senderName = getUserName();
    const date = verse.date ?? easternVerseDateKey();

    // Try to create a personalized /s/:id share link
    let shareUrl: string | null = null;
    try {
      const r = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verse: verse.text,
          reference: verse.reference,
          senderName: senderName || null,
          heroDate: date,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        shareUrl = data.url ?? null;
      }
    } catch {
      /* fall through to plain text */
    }

    const fromLine = senderName?.trim()
      ? `${senderName.trim()} was thinking of you.`
      : "Someone was thinking of you.";
    const text = shareUrl
      ? `${fromLine}\n\n"${verse.text}"\n— ${verse.reference}\n\n${shareUrl}`
      : buildFriendVerseShareText(verse.text, verse.reference, senderName, date);

    if (navigator.share) {
      try {
        await navigator.share({ title: fromLine, text });
        setFriendShareDone(true);
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setFriendShareDone(true);
      } catch {
        /* noop */
      }
    }
  };

  const handleShareImage = async () => {
    if (!verse || sharingImage) return;
    setSharingImage(true);
    try {
      const blob = await createShareImage(verse.text, verse.reference, heroBgForDisplay);
      const url = URL.createObjectURL(blob);
      // Clean up any previous preview URL
      if (sharePreviewUrl) URL.revokeObjectURL(sharePreviewUrl);
      setSharePreviewBlob(blob);
      setSharePreviewUrl(url);
    } catch { }
    setSharingImage(false);
  };

  const handleNativeShareImage = async () => {
    if (!sharePreviewBlob || !verse) return;
    const filename = shareImageFilename(verse.reference);
    const result = await shareImageBlob(sharePreviewBlob, {
      filename,
      title: `${verse.reference} — Shepherd's Path`,
      text: buildShareText(),
    });
    if (result === "shared") {
      toast({ title: "Ready to send", description: "Choose Messages, Instagram, or any app." });
    } else if (result === "saved") {
      toast({ title: "Saved to your device", description: "Share from Photos or try the share sheet again." });
    }
  };

  const handleDownloadImage = () => {
    if (!sharePreviewBlob || !verse) return;
    downloadBlob(sharePreviewBlob, shareImageFilename(verse.reference));
    toast({ title: "Saved", description: "Your verse image is in Photos or Downloads." });
  };

  const closeSharePreview = () => {
    if (sharePreviewUrl) URL.revokeObjectURL(sharePreviewUrl);
    setSharePreviewUrl(null);
    setSharePreviewBlob(null);
    setSharePreviewFormat("square");
  };

  const handleSwitchShareFormat = async (fmt: "square" | "story") => {
    if (!verse || fmt === sharePreviewFormat || regeneratingPreview) return;
    setRegeneratingPreview(true);
    try {
      const activeBg = heroBgForDisplay;
      const blob = fmt === "story"
        ? await createStoryShareImage(verse.text, verse.reference, activeBg)
        : await createShareImage(verse.text, verse.reference, activeBg);
      const url = URL.createObjectURL(blob);
      if (sharePreviewUrl) URL.revokeObjectURL(sharePreviewUrl);
      setSharePreviewBlob(blob);
      setSharePreviewUrl(url);
      setSharePreviewFormat(fmt);
    } catch { }
    setRegeneratingPreview(false);
  };

  const handleRefreshScene = async () => {
    if (!verse || regeneratingPreview) return;
    setRegeneratingPreview(true);
    try {
      // Build full pool: today's real photo + the curated fallback set
      const activeBg = heroBgForDisplay;
      const extendedPool = [bundledHeroSrc, ...PHOTO_POOL];
      const others = extendedPool.filter(u => u !== activeBg);
      const pool = others.length > 0 ? others : extendedPool;
      const randomUrl = pool[Math.floor(Math.random() * pool.length)];
      const blob = sharePreviewFormat === "story"
        ? await createStoryShareImage(verse.text, verse.reference, randomUrl)
        : await createShareImage(verse.text, verse.reference, randomUrl);
      const url = URL.createObjectURL(blob);
      if (sharePreviewUrl) URL.revokeObjectURL(sharePreviewUrl);
      setSharePreviewBlob(blob);
      setSharePreviewUrl(url);
    } catch { }
    setRegeneratingPreview(false);
  };

  const buildShareText = () => {
    if (!verse) return "";
    const date = verse.date ?? easternVerseDateKey();
    return buildVerseShareText({ text: verse.text, reference: verse.reference, date });
  };

  const verseShareUrl = () =>
    buildVerseSharePreviewUrl(verse?.date ?? easternVerseDateKey());

  const shareOnX = () => {
    if (!verse) return;
    const tweetText = encodeURIComponent(
      `📖 ${verse.reference}\n\n"${verse.text}"\n\nSit in Scripture · Shepherd's Path`,
    );
    openLink(`https://x.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(verseShareUrl())}`);
  };

  const shareOnFacebook = () => {
    const quote = encodeURIComponent(
      `📖 ${verse?.reference ?? ""}\n\n"${verse?.text ?? ""}"\n\nSit in Scripture · Shepherd's Path`,
    );
    openLink(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verseShareUrl())}&quote=${quote}`,
    );
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(buildShareText());
    openLink(`https://wa.me/?text=${text}`);
  };

  const shareOnInstagram = async () => {
    if (sharePreviewBlob && verse) {
      downloadBlob(sharePreviewBlob, shareImageFilename(verse.reference));
    }
    const text = buildShareText();
    const copied = await copyToClipboard(text);
    openLink("https://www.instagram.com");
    toast({
      title: sharePreviewBlob ? (copied ? "Ready for Instagram" : "Image saved") : copied ? "Caption copied" : "Open Instagram",
      description: sharePreviewBlob
        ? copied
          ? "Image saved & caption copied — add from Photos in Stories, paste caption."
          : "Image saved — add from Photos in Stories or feed."
        : copied
          ? "Paste the caption into your story or post."
          : "Share today's verse from the app.",
    });
  };

  const shareOnPinterest = () => {
    if (!verse) return;
    const description = encodeURIComponent(`📖 ${verse.reference} — "${verse.text}" — Reflect & pray at Shepherd's Path 🙏`);
    openLink(
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(verseShareUrl())}&description=${description}`,
    );
  };

  const shareOnTelegram = () => {
    if (!verse) return;
    const msg = encodeURIComponent(
      `📖 ${verse.reference}\n\n"${verse.text}"\n\nReflect & pray with me at Shepherd's Path 🙏`
    );
    openLink(`https://t.me/share/url?url=${encodeURIComponent(verseShareUrl())}&text=${msg}`);
  };

  if (isVerseLoading) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40 mb-4" />
          <p className="text-muted-foreground text-sm font-medium">Loading today's word...</p>
        </div>
      </>
    );
  }

  if (verseError || !verse) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
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

  const todayObservance = getTodayObservance();

  return (
    <>
      {/* Main content */}
      <main
        className={`max-w-xl mx-auto px-4 pt-4 relative z-10 ${
          inNativeApp ? "pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]" : "pb-24"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >

          {/* High-observance day — quiet, inclusive, non-structural */}
          {todayObservance && (
            <p
              data-testid="text-observance-day"
              className="text-center text-[11px] text-muted-foreground/50 italic py-1"
            >
              For many, today is {todayObservance.name}.
            </p>
          )}

          {/* STEP 1: TODAY'S WORD — cinematic hero card */}
          <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/10 dark:ring-white/8">

            {/* ── Photo hero ─────────────────────────────────── */}
            <div
              className="relative flex flex-col items-center justify-center px-8 text-center select-none bg-stone-900 min-h-[420px]"
            >
              {/* Photo layer — verse-specific AI art first, daily art as fallback */}
              <img
                src={heroBgForDisplay}
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  const fallback = bundledHeroSrc;
                  if (!el.src.includes(fallback.split("?")[0]!)) el.src = fallback;
                }}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "brightness(0.72) saturate(1.1)" }}
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

              {/* Top bar — single merged pill */}
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/15">
                  Today's Word · {dateStr}
                </span>
              </div>


              {/* Verse + reference */}
              <div className="relative z-10 py-14 w-full max-w-lg text-center">
                <blockquote
                  className="verse-text text-balance mb-6"
                  style={{
                    textAlign: "center",
                    fontSize:
                      verse.text.length > 180 ? "1.55rem" :
                      verse.text.length > 130 ? "1.75rem" :
                      verse.text.length > 90  ? "1.95rem" :
                      verse.text.length > 65  ? "2.2rem"  :
                      "2.5rem",
                    lineHeight: 1.45,
                    textShadow: "0 2px 22px rgba(0,0,0,0.80)",
                    fontStyle: "italic",
                    color: "white",
                  }}
                >
                  {formatVerseForDisplay(verse.text)}
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
              <div className="grid grid-cols-3 divide-x divide-border/30 px-0">
                <div className="flex justify-center py-3.5">
                  <ListenButton
                    text={`${verse.text} — ${verse.reference}`}
                    label="Listen quietly"
                    vertical
                  />
                </div>
                <div className="flex justify-center py-3.5">
                  <ShareVerseImageButton
                    verseText={verse.text}
                    verseReference={verse.reference}
                    imageBgUrl={heroBgForDisplay}
                    vertical
                    testId="button-share-image"
                    label="Save card"
                  />
                </div>
                <button
                  data-testid="button-share"
                  onClick={() => { handleShare(); setShowShareRow(v => !v); }}
                  className="flex flex-col items-center gap-1.5 py-3.5 text-foreground/55 hover:text-primary transition-colors"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className={`w-5 h-5 ${showShareRow ? "text-primary" : ""}`} />}
                  <span className="text-[12px] font-semibold leading-none">{copied ? "Copied!" : "Share verse"}</span>
                </button>
              </div>

              {/* Context — background on this passage */}
              <div className="px-4 pt-2 pb-2.5 flex items-center justify-center border-t border-border/20">
                <ScriptureContext reference={verse.reference} text={verse.text} verseId={verse.id} />
              </div>

              {/* Social sharing row — revealed when Share is tapped */}
              <AnimatePresence>
                {showShareRow && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-3 border-t border-border/20 flex flex-col items-center gap-3">
                      <span className="text-[11px] text-foreground/50 font-medium tracking-wide uppercase">Also share to</span>
                      <div className="flex items-center justify-center gap-2.5">
                        <button data-testid="share-x" onClick={shareOnX} title="Share on X"
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-black text-white active:scale-95 transition-transform shadow-md">
                          <SiX className="w-[16px] h-[16px]" />
                        </button>
                        <button data-testid="share-facebook" onClick={shareOnFacebook} title="Share on Facebook"
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1877F2] text-white active:scale-95 transition-transform shadow-md">
                          <SiFacebook className="w-[16px] h-[16px]" />
                        </button>
                        <button data-testid="share-whatsapp" onClick={shareOnWhatsApp} title="Share on WhatsApp"
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#25D366] text-white active:scale-95 transition-transform shadow-md">
                          <SiWhatsapp className="w-[16px] h-[16px]" />
                        </button>
                        <button data-testid="share-instagram" onClick={shareOnInstagram} title="Copy for Instagram"
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform shadow-md"
                          style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}>
                          <SiInstagram className="w-[16px] h-[16px]" />
                        </button>
                        <button data-testid="share-telegram" onClick={shareOnTelegram} title="Share on Telegram"
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2AABEE] text-white active:scale-95 transition-transform shadow-md">
                          <SiTelegram className="w-[16px] h-[16px]" />
                        </button>
                        <button data-testid="share-pinterest" onClick={shareOnPinterest} title="Pin to Pinterest"
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#E60023] text-white active:scale-95 transition-transform shadow-md">
                          <SiPinterest className="w-[16px] h-[16px]" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Full Devotional Listen Mode ──────────────────── */}
              {showFullListenBar && (
                <div className="mx-4 mb-4 mt-1 rounded-xl border border-primary/18 px-4 py-3 flex items-center justify-between gap-3 overflow-hidden relative" style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.07) 0%, hsl(var(--primary)/0.03) 100%)" }}>
                  {/* Subtle top line */}
                  <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)/0.35), transparent)" }} />
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${listenSection || ttsListen.loading ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary"}`}
                      style={listenSection || ttsListen.loading ? { boxShadow: "0 0 10px hsl(var(--primary)/0.35)" } : {}}>
                      {ttsListen.loading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Headphones className="w-4 h-4" />
                      }
                    </div>
                    <div className="min-w-0">
                      {ttsListen.blocked ? (
                        <>
                          <p className="text-[12px] font-bold text-amber-500 leading-none">Tap to play</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">Your device needs a tap first</p>
                        </>
                      ) : ttsListen.error ? (
                        <>
                          <p className="text-[12px] font-bold text-muted-foreground leading-none">Audio temporarily unavailable</p>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-none">Read the devotional below</p>
                        </>
                      ) : ttsListen.loading ? (
                        <>
                          <p className="text-[12px] font-bold text-primary leading-none">
                            {ttsListen.loadingLong ? "Still on its way…" : "Preparing audio…"}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                            <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                          </div>
                        </>
                      ) : listenSection ? (
                        <>
                          <p className="text-[12px] font-bold text-primary leading-none">Now playing</p>
                          {/* Waveform bars */}
                          <div className="flex items-end gap-[2px] mt-1.5" style={{ height: 14 }}>
                            {[0, 70, 140, 210, 280, 350, 420].map((delay, idx) => (
                              <motion.div
                                key={idx}
                                className="rounded-full flex-shrink-0"
                                style={{ width: 2, background: "hsl(var(--primary)/0.7)" }}
                                animate={{ height: ["4px", idx % 2 === 0 ? "12px" : "8px", "4px"] }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: delay / 1000 }}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-[13px] font-semibold text-foreground leading-none">Full devotional</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                            {fullListenReady
                              ? "Verse · Encouragement · Prayer — one continuous listen"
                              : prayerLoading || !prayerContent.trim()
                                ? "Verse · Encouragement · Prayer preparing…"
                                : "Verse · Encouragement · Prayer preparing…"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={ttsListen.blocked ? ttsListen.resumeAfterBlock : startFullListen}
                    disabled={!fullListenReady && !ttsListen.blocked && !listenSection && !ttsListen.loading}
                    data-testid="button-full-devotional-listen"
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold transition-all flex-shrink-0 ${
                      ttsListen.blocked
                        ? "bg-amber-500 text-white shadow-sm"
                        : listenSection || ttsListen.loading
                        ? "bg-primary/20 text-primary"
                        : fullListenReady
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground/70 cursor-not-allowed"
                    }`}
                    style={fullListenReady && !listenSection && !ttsListen.loading && !ttsListen.blocked ? { boxShadow: "0 4px 14px hsl(var(--primary)/0.28)" } : {}}
                  >
                    {ttsListen.blocked ? (
                      <><Headphones className="w-3 h-3" /> Tap to play</>
                    ) : ttsListen.loading ? (
                      <><Square className="w-3 h-3 fill-current" /> Stop</>
                    ) : listenSection ? (
                      <><Square className="w-3 h-3 fill-current" /> Stop</>
                    ) : !fullListenReady ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Preparing</>
                    ) : (
                      <><Headphones className="w-3 h-3" /> Listen</>
                    )}
                  </button>
                </div>
              )}

              {/* ── Post-listen reply ─────────────────────────────── */}
              <AnimatePresence>
                {showListenReply && (
                  <motion.div
                    key="listen-reply"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="mx-4 mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 pt-3 pb-4"
                  >
                    <p className="text-[13px] font-semibold text-foreground mb-2 leading-snug">
                      How does that speak to you today?
                    </p>
                    <textarea
                      ref={listenReplyRef}
                      data-testid="textarea-listen-reply"
                      value={listenReply}
                      onChange={e => setListenReply(e.target.value)}
                      placeholder="Share your thoughts, feelings, or a simple word…"
                      spellCheck
                      rows={3}
                      className="w-full resize-none rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[16px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={() => setShowListenReply(false)}
                        className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Dismiss
                      </button>
                      {listenReplySaved ? (
                        <span className="text-[12px] font-semibold text-primary flex items-center gap-1">
                          <Check className="w-3 h-3" /> Saved to journal
                        </span>
                      ) : (
                        <button
                          data-testid="btn-save-listen-reply"
                          disabled={!listenReply.trim()}
                          onClick={async () => {
                            if (!listenReply.trim() || !verse) return;
                            try {
                              await fetch("/api/journal", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  sessionId: getSessionId(),
                                  verseRef: verse.reference,
                                  verseText: verse.text,
                                  content: listenReply.trim(),
                                  type: "reflection",
                                }),
                              });
                              setListenReplySaved(true);
                              notifyJournalSaved();
                            } catch { setListenReplySaved(true); }
                          }}
                          className="text-[12px] font-bold rounded-full bg-primary text-primary-foreground px-3 py-1 disabled:opacity-40 hover:bg-primary/90 transition-colors"
                        >
                          Save to Journal
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Return visit — fresh vs continue (default: fresh, verse-led) */}
          <AnimatePresence>
            {!continuityResolved && !entryTriggered && !reflectionContent && !reflectionLoading && (
              <motion.div
                key="continuity-choice"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center gap-4 py-6 px-2"
                data-testid="devotional-continuity-choice"
              >
                <p className="text-[13px] text-muted-foreground/70 text-center leading-relaxed max-w-[300px]">
                  Welcome back. Today&apos;s Scripture stands on its own — unless something is still on your heart.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-[320px]">
                  <button
                    type="button"
                    data-testid="button-devotional-fresh"
                    onClick={() => resolveContinuity("fresh")}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground text-[14px] font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                  >
                    Start fresh
                  </button>
                  <button
                    type="button"
                    data-testid="button-devotional-continue"
                    onClick={() => resolveContinuity("continue")}
                    className="flex-1 inline-flex items-center justify-center px-5 py-3 rounded-full border border-border/70 bg-muted/40 text-[14px] font-semibold text-foreground/90 hover:bg-muted/60 transition-all active:scale-95"
                  >
                    Still on my heart
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Deliberate entry — tap-to-begin when user prefers it in settings */}
          <AnimatePresence>
            {devotionalEntryMode === "tap" &&
              continuityResolved &&
              !entryTriggered &&
              !reflectionContent &&
              !reflectionLoading && (
              <motion.div
                key="begin-entry"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center gap-4 py-6"
              >
                <p className="text-[13px] text-muted-foreground/55 text-center leading-relaxed max-w-[260px]">
                  Sit with this a moment. Begin when you're ready.
                </p>
                <button
                  data-testid="button-begin-devotional"
                  onClick={() => setEntryTriggered(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-[14px] font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                >
                  Begin today's devotional
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name — after verse, before reflection (iOS-safe layout) */}
          <AnimatePresence>
            {entryTriggered && nameHydrated && !resolvedProfileName && verse?.id && (
              <motion.div
                key="devotional-name-prompt"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="bg-card border border-primary/25 rounded-2xl px-5 py-6 shadow-sm"
                data-testid="card-devotional-name-prompt"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/80 mb-2">
                  Before your reflection
                </p>
                <p className="text-[15px] font-semibold text-foreground/95 leading-snug mb-1">
                  What should we call you?
                </p>
                <p className="text-[13px] text-muted-foreground/85 leading-snug mb-4">
                  Your first name shapes today&apos;s reflection and prayer. Tap Save — we&apos;ll refresh both in about 30 seconds.
                </p>
                <form
                  className="flex flex-col gap-3 w-full min-w-0"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = nameDraft.trim();
                    if (!trimmed || !verse?.id || savingNameDraft) return;
                    setSavingNameDraft(true);
                    setReflectionContent("");
                    setPrayerContent("");
                    setRefreshingForName(true);
                    void setUserNameAsync(trimmed).then((ok) => {
                      setSavingNameDraft(false);
                      if (!ok) {
                        setRefreshingForName(false);
                        toast({
                          title: "Could not save your name",
                          description: "Check your connection and try again.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setSavedProfileName(trimmed);
                      autoPersonalizeVerseRef.current = null;
                      regenerateWithMyName(verse.id, trimmed);
                    });
                  }}
                >
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onFocus={() => {
                      requestAnimationFrame(() => {
                        nameInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
                      });
                    }}
                    placeholder="Your first name"
                    maxLength={40}
                    autoComplete="given-name"
                    enterKeyHint="done"
                    data-testid="input-devotional-name"
                    className="w-full min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-[16px] outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div
                    className={
                      inNativeApp
                        ? "sticky bottom-0 z-10 -mx-1 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-card/95 backdrop-blur-sm"
                        : undefined
                    }
                  >
                    <button
                      type="submit"
                      disabled={!nameDraft.trim() || savingNameDraft}
                      data-testid="btn-save-devotional-name"
                      className="w-full min-h-[48px] rounded-xl bg-primary px-4 py-3.5 text-[16px] font-bold text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform shadow-sm"
                    >
                      {savingNameDraft ? "Saving…" : "Save name"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 2: ENCOURAGEMENT (auto-generated) */}
          {(entryTriggered || !!reflectionContent || reflectionLoading || reflectionError) && (
          <div className="bg-card border border-border/60 rounded-2xl px-5 py-8 shadow-sm">
            <StepLabel number={2} label="Encouragement" />
            {resolvedProfileName && verse?.id && reflectionContent && !reflectionLoading && !reflectionIncludesName(reflectionContent, resolvedProfileName) && (
              <div
                className="mb-5 rounded-xl border border-primary/30 px-4 py-3.5"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.1) 0%, hsl(var(--primary)/0.04) 100%)" }}
                data-testid="banner-personalize-reflection"
              >
                <p className="text-[14px] font-medium text-foreground/90 leading-snug mb-2.5">
                  Hi {resolvedProfileName.split(/\s+/)[0]} — we can refresh today&apos;s reflection and prayer to include your name.
                </p>
                <button
                  type="button"
                  data-testid="btn-personalize-reflection"
                  onClick={() => regenerateWithMyName(verse.id)}
                  disabled={reflectionLoading || prayerLoading || refreshingForName}
                  className="w-full flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-[15px] font-bold text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  Personalize reflection &amp; prayer
                </button>
              </div>
            )}
            {!resolvedProfileName && reflectionContent && !refreshingForName && !reflectionLoading && (
              <p className="text-[12px] text-muted-foreground/75 mb-4 leading-snug">
                This reflection is general — add your name in the card above and tap Save to personalize it.
              </p>
            )}
            {(personalizePhase || savingNameDraft) && (
              <p className="text-[13px] text-center text-primary/85 font-medium mb-3 leading-snug">
                {savingNameDraft
                  ? "Saving your name…"
                  : personalizePhase === "prayer"
                    ? "Encouragement ready — writing your prayer…"
                    : reflectionContent
                      ? "Almost there…"
                      : "Writing today's encouragement — words will appear as they arrive"}
              </p>
            )}

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
                  <div className="text-[17px] leading-[1.72] text-foreground/95 space-y-4">
                    {reflectionContent.split("\n").filter(p => p.trim()).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                  {!reflectionLoading && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <ShareButton title={`Reflection — ${verse.reference}`} text={reflectionContent} className="text-[12px] font-semibold" />
                      <ListenButton key={`reflection-tts-${verse.id}-${reflectionContent.length}`} text={reflectionContent} label="Listen to this" />
                    </div>
                  )}
                  {!reflectionLoading && (
                    <p className="text-[11px] text-muted-foreground/75 mt-3 flex items-center gap-1.5">
                      <span>✝</span>
                      <span>Grounded in Scripture. Guided by the Holy Spirit.</span>
                    </p>
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
          )}

          {/* ── Daily Email Nudge — MOVED: now after prayer/benediction ── */}

          {/* Reflection → Prayer connector — only shown after reflection loads */}
          {reflectionContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="flex items-center gap-3 px-2"
            >
              <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, hsl(var(--primary)/0.22))" }} />
              <div className="flex flex-col items-center gap-1">
                <div
                  className="relative w-4 h-4 flex items-center justify-center"
                  style={{ opacity: 0.5 }}
                >
                  <div className="absolute w-px h-full rounded-full" style={{ background: "hsl(var(--primary)/0.7)" }} />
                  <div className="absolute h-px w-full rounded-full" style={{ background: "hsl(var(--primary)/0.7)", marginTop: "-30%" }} />
                </div>
                <span className="text-[10px] text-muted-foreground/60 italic tracking-widest select-none uppercase">carry it into prayer</span>
              </div>
              <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, hsl(var(--primary)/0.22))" }} />
            </motion.div>
          )}

          {/* STEP 3: PRAYER */}
          <div className="relative">
            {/* Ambient candle glow behind prayer card */}
            <motion.div
              className="absolute inset-x-4 bottom-0 h-24 pointer-events-none rounded-b-2xl"
              style={{ background: "radial-gradient(ellipse at center bottom, hsl(258 70% 45% / 0.15) 0%, transparent 75%)", filter: "blur(16px)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative rounded-2xl px-5 py-8 shadow-sm overflow-hidden" style={{ background: "linear-gradient(160deg, hsl(var(--background)) 0%, hsl(258 40% 8% / 0.6) 100%)", border: "1px solid hsl(258 45% 55% / 0.22)" }}>
              {/* Top shimmer line */}
              <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)/0.5), transparent)" }} />
              <StepLabel number={3} label="Prayer" />
              <AnimatePresence mode="wait">
                {prayerLoading && !prayerContent && (
                  <motion.div key="pray-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                    {personalizePhase === "prayer" && (
                      <p className="text-[12px] text-center text-muted-foreground/75 pb-1">Writing your prayer…</p>
                    )}
                    <div className="h-3.5 bg-muted animate-pulse rounded-full w-full" />
                    <div className="h-3.5 bg-muted animate-pulse rounded-full w-5/6" />
                    <div className="h-3.5 bg-muted animate-pulse rounded-full w-2/3" />
                  </motion.div>
                )}
                {prayerContent && (
                  <motion.div key="pray-content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                    <p className="text-[12px] text-muted-foreground/80 italic mb-5 leading-relaxed">
                      You can take this as your own — or let it guide your words.
                    </p>
                    <PrayerText text={prayerContent} />
                    <p className="text-[12px] text-muted-foreground/65 italic mt-6 leading-relaxed">
                      Stay here for a moment if you need to.
                    </p>
                    {!prayerLoading && (
                      <div className="mt-4 flex items-center gap-4">
                        <ShareButton title={`Prayer — ${verse.reference}`} text={prayerContent} className="text-[12px] font-semibold" />
                        <ListenButton text={prayerContent} label="Listen quietly" />
                      </div>
                    )}
                  </motion.div>
                )}
                {prayerError && (
                  <motion.p key="pray-error" className="text-sm text-muted-foreground italic">
                    Could not load prayer. <button onClick={() => generatePrayer(verse.id, getStoredLang(), getUserName() ?? undefined, reflectionContent || undefined, reflectListenReplySubmitted ?? undefined)} className="underline text-primary">Try again</button>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* OPTIONAL: Personal reflection (after prayer — journal & listen only) */}
          {devotionalCoreComplete && (
            <div
              className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden"
              data-testid="optional-devotional-reflection"
            >
              {!showOptionalReflection && !reflectionInputSubmitted ? (
                <button
                  type="button"
                  onClick={() => setShowOptionalReflection(true)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left active:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60 mb-0.5">Optional</p>
                    <p className="text-[14px] font-medium text-foreground/80">What struck you about this verse?</p>
                  </div>
                  <span className="text-muted-foreground/40 text-lg ml-3">+</span>
                </button>
              ) : (
              <div className="px-5 py-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60 mb-3">
                Optional
              </p>
              <p className="text-[15px] font-medium text-foreground/90 mb-1 leading-snug">
                What struck you about this verse?
              </p>
              <p className="text-[13px] text-muted-foreground/75 mb-4 leading-relaxed">
                Share a thought if you&apos;d like — saved to your journal, not required to finish.
              </p>

              {reflectionReplySaved && reflectionInputSubmitted ? (
                <div className="flex items-center gap-2 py-2 text-primary">
                  <Check className="w-4 h-4" />
                  <span className="text-[13px] font-semibold">Saved to your journal</span>
                </div>
              ) : (
                <>
                  {reflectionInputSubmitted && (
                    <p
                      className="text-[14px] text-foreground/80 leading-relaxed mb-4"
                      data-testid="text-devotional-reflection-input-submitted"
                    >
                      {reflectionInputSubmitted}
                    </p>
                  )}

                  {!reflectionInputSubmitted && (
                    <div className="mb-4">
                      <textarea
                        value={reflectionInput}
                        onChange={(e) => setReflectionInput(e.target.value)}
                        placeholder="Even a word or a feeling is enough."
                        rows={3}
                        data-testid="input-devotional-reflection"
                        className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-[16px] text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary/40 leading-relaxed"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleReflect()}
                          disabled={!reflectionInput.trim()}
                          data-testid="button-reflect-with-me"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save to journal
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
              )}
            </div>
          )}

          {/* Give Thanks section removed — contemplative flow ends at the selah screen */}
          {false && devotionalCoreComplete && (
          <div className="relative overflow-hidden rounded-2xl shadow-sm" style={{ background: "linear-gradient(160deg, hsl(38 80% 6% / 0.5) 0%, hsl(var(--card)) 100%)", border: "1px solid hsl(38 70% 55% / 0.22)" }}>
            {/* Top warm glow line */}
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(217,119,6,0.6), rgba(234,88,12,0.6), transparent)" }} />
            {/* Subtle warm ambient glow top-right */}
            <div className="absolute -top-6 -right-6 w-32 h-32 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(217,119,6,0.10) 0%, transparent 70%)", filter: "blur(20px)" }} />

            {!showOptionalGratitude && !gratitudePrayer ? (
              <button
                type="button"
                onClick={() => setShowOptionalGratitude(true)}
                className="w-full flex items-center justify-between px-7 py-4 text-left active:bg-amber-950/20 transition-colors"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500/70 mb-0.5">Optional · Give Thanks</p>
                  <p className="text-[14px] font-medium text-foreground/80">What feels like a gift today?</p>
                </div>
                <span className="text-amber-500/50 text-lg ml-3">+</span>
              </button>
            ) : (
            <div className="px-7 py-7">
            <StepLabel number={4} label="Give thanks" />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500/70 mb-2">
              Optional
            </p>
            <p className="text-[14px] text-muted-foreground mb-4 leading-relaxed">
              What feels like a gift today?
            </p>
            <textarea
              value={gratitudeInput}
              onChange={(e) => setGratitudeInput(e.target.value)}
              placeholder={"One thing. Even something small.\nOptional — you can finish without this."}
              spellCheck
              rows={3}
              data-testid="input-gratitude"
              className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3.5 text-[16px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 resize-none placeholder:text-muted-foreground/65 transition-all"
            />
            <div className="mt-3">
              <div className="relative">
                {/* Warm pulse ring on the gratitude prayer button */}
                {!gratitudePrayerLoading && !gratitudeListenLoading && !gratitudeListenComplete && gratitudeInput.trim() && !gratitudePrayer && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ background: "linear-gradient(135deg, #d97706, #ea580c)" }}
                    animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                {!gratitudeListenComplete && !gratitudeListenLoading && (
                  <button
                    onClick={() => void handleGratitudePrayer()}
                    disabled={!gratitudeInput.trim() || gratitudePrayerLoading}
                    data-testid="button-generate-gratitude-prayer"
                    className="relative w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: gratitudeInput.trim() ? "0 6px 22px rgba(124,58,237,0.28)" : undefined }}
                  >
                    {gratitudePrayerLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding words…</>
                      : <><Heart className="w-3.5 h-3.5" /> Receive a closing prayer</>
                    }
                  </button>
                )}
              </div>
            </div>

            {gratitudeListenLoading && (
              <div className="flex items-center justify-center gap-1.5 py-5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400/60 animate-pulse" />
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400/60 animate-pulse"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400/60 animate-pulse"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            )}

            {gratitudeListenComplete && !gratitudeListenReplySubmitted && !gratitudeListenLoading && (
              <div className="mt-5 space-y-3">
                <div className="border-l-2 border-violet-500/60 pl-4">
                  <p className="text-[15px] leading-relaxed text-foreground/80 italic">
                    {gratitudeListenResponse}
                  </p>
                </div>
                <textarea
                  value={gratitudeListenReply}
                  onChange={(e) => setGratitudeListenReply(e.target.value)}
                  onKeyDown={handleGratitudeListenKeyDown}
                  placeholder="Keep going... there's no right answer."
                  rows={2}
                  disabled={gratitudePrayerLoading}
                  data-testid="input-gratitude-listen-reply"
                  className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-[16px] text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary/40 leading-relaxed disabled:opacity-50"
                />
                <p className="text-[12px] text-muted-foreground/60 text-center leading-relaxed">
                  One more thought and we&apos;ll close together.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleGratitudeListenContinue()}
                    disabled={!gratitudeListenReply.trim() || gratitudePrayerLoading}
                    data-testid="button-gratitude-listen-continue"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 px-4 py-2.5 text-[14px] font-semibold text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gratitudePrayerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue →"}
                  </button>
                </div>
              </div>
            )}

            {gratitudeListenReplySubmitted && (
              <p
                className="text-[13px] text-muted-foreground/70 italic text-right max-w-[88%] ml-auto leading-relaxed mt-5"
                data-testid="text-gratitude-listen-user-reply"
              >
                {gratitudeListenReplySubmitted}
              </p>
            )}

            <AnimatePresence>
              {gratitudePrayer && (
                <motion.div
                  key="gratitude-prayer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.0, ease: "easeOut" }}
                  className="mt-7 pt-6"
                  style={{ borderTop: "1px solid rgba(217,119,6,0.2)" }}
                >
                  <p className="text-[17px] italic mb-4 -mt-1" style={{ fontFamily: "'Georgia', serif", color: "hsl(var(--primary) / 0.9)" }}>
                    This completes your devotional for today.
                  </p>
                  {/* Small amen cross above the closing prayer */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, rgba(217,119,6,0.3))" }} />
                    <div className="relative w-3.5 h-3.5 flex items-center justify-center opacity-50">
                      <div className="absolute w-px h-full rounded-full bg-amber-500" />
                      <div className="absolute h-px w-full rounded-full bg-amber-500" style={{ marginTop: "-35%" }} />
                    </div>
                    <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, rgba(217,119,6,0.3))" }} />
                  </div>
                  <PrayerText text={gratitudePrayer} />
                  <p className="text-[12px] text-amber-600/50 dark:text-amber-400/40 italic mt-5 leading-relaxed">
                    Hold onto that.
                  </p>
                  <div className="mt-3 flex items-center gap-4 flex-wrap">
                    <ShareButton
                      title={`Closing Prayer — ${verse.reference}`}
                      text={gratitudePrayer}
                      className="text-[12px] font-semibold"
                    />
                    <ListenButton text={gratitudePrayer} label="Listen quietly" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
            )}
          </div>
          )}

          {/* Devotional benediction — after today's prayer */}
          {devotionalCoreComplete && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
              className="text-center px-4 py-4"
              data-testid="devotional-benediction"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, hsl(var(--primary)/0.20))" }} />
                <div className="flex items-center gap-2.5">
                  <div className="relative w-3 h-3 flex items-center justify-center opacity-40">
                    <div className="absolute w-px h-full rounded-full" style={{ background: "hsl(var(--primary))" }} />
                    <div className="absolute h-px w-full rounded-full" style={{ background: "hsl(var(--primary))", marginTop: "-35%" }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/45 select-none">
                    {streak && streak.currentStreak > 1 ? `Day ${streak.currentStreak} complete` : "Day 1 complete"}
                  </span>
                  <div className="relative w-3 h-3 flex items-center justify-center opacity-40">
                    <div className="absolute w-px h-full rounded-full" style={{ background: "hsl(var(--primary))" }} />
                    <div className="absolute h-px w-full rounded-full" style={{ background: "hsl(var(--primary))", marginTop: "-35%" }} />
                  </div>
                </div>
                <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, hsl(var(--primary)/0.20))" }} />
              </div>
              <p className="text-[14px] text-muted-foreground/75 leading-relaxed italic" style={{ fontFamily: "'Georgia', serif" }}>
                {streak && streak.currentStreak >= 7
                  ? "You've walked this path faithfully. The Word has been working in you longer than you know."
                  : streak && streak.currentStreak >= 3
                  ? "You came back again. That matters more than you realize."
                  : "You spent time in the Word today. Let it stay with you."}
              </p>
            </motion.div>
          )}

          {/* Save Today's Devotional — completion ritual before carry/stay fork */}
          {devotionalCoreComplete && (reflectionContent || prayerContent) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="rounded-xl px-4 py-3 shadow-sm"
              style={{ background: "rgba(245,158,11,0.09)", border: "1px solid rgba(245,158,11,0.25)" }}
              data-testid="devotional-journal-save"
            >
              <div className="flex items-center gap-3">
                <Bookmark className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <div className="flex items-center gap-x-3 gap-y-1 flex-1 flex-wrap">
                  <span className="text-[12px] font-semibold text-amber-900 dark:text-amber-200">Save to Journal:</span>
                  {[
                    { label: "Verse", available: !!verse?.text, saved: savedVerse },
                    { label: "Reflection", available: !!reflectionContent, saved: savedReflection },
                    { label: "Prayer", available: !!prayerContent, saved: savedPrayer },
                    { label: "Memory", available: !!verse?.text, saved: verseInMemory },
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
                    (verseInMemory || !verse?.text)
                  }
                  onClick={() => {
                    if (!savedVerse && verse?.text) saveMutation.mutate({ type: "verse", content: verse.text, reference: verse.reference, verseDate: verse.date });
                    if (!savedReflection && reflectionContent) saveMutation.mutate({ type: "reflection", content: reflectionContent, reference: verse?.reference, verseDate: verse?.date });
                    if (!savedPrayer && prayerContent) saveMutation.mutate({ type: "prayer", content: prayerContent, reference: verse?.reference, verseDate: verse?.date });
                    if (!verseInMemory && verse?.text) handleToggleMemory();
                  }}
                >
                  {saveMutation.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : "Save All"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Gentle fork — ease in after benediction; Carry is the default */}
          {devotionalCoreComplete && completionPath === null && (
            <DevotionalCompletionThreshold
              ref={completionThresholdRef}
              onCarry={() => {
                setCompletionPath("carry");
                window.setTimeout(() => setShowStillness(true), 450);
              }}
              onStay={() => setCompletionPath("stay")}
              onUpgrade={() => setShowUpgrade(true)}
            />
          )}

          {devotionalCoreComplete && completionPath === "carry" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center px-4 pb-2 space-y-3"
            >
              <p className="text-[13px] text-muted-foreground/65 italic" style={{ fontFamily: "'Georgia', serif" }}>
                Go in peace. The Word goes with you.
              </p>
              <button
                type="button"
                data-testid="btn-devotional-stillness-again"
                onClick={() => setShowStillness(true)}
                className="text-[12px] font-medium text-muted-foreground/70 hover:text-foreground underline-offset-2 hover:underline"
              >
                Pause in stillness again
              </button>
              <button
                type="button"
                data-testid="btn-devotional-switch-to-stay"
                onClick={() => setCompletionPath("stay")}
                className="block mx-auto text-[12px] text-muted-foreground/50 hover:text-primary/80 transition-colors"
              >
                Actually — I have a few more minutes
              </button>
            </motion.div>
          )}

          {completionPath === "stay" && reflectionContent && verse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="px-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70 text-center mb-3">
                EXPLORE TODAY&apos;S VERSE
              </p>
              <BibleStudyChat
                verseId={verse.id}
                verseReference={verse.reference}
                initialReflection={reflectionContent}
                prayerContent={prayerContent ?? undefined}
              />
            </motion.div>
          )}

          {completionPath === "stay" && devotionalPastorVideo && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="px-1"
            >
              <PastorVideoCard
                pastorName={devotionalPastorVideo.pastor_name}
                churchName={devotionalPastorVideo.church_name}
                title={devotionalPastorVideo.title}
                youtubeUrl={devotionalPastorVideo.youtube_url}
                sectionLabel="GO DEEPER TODAY"
              />
            </motion.div>
          )}

          {/* Streak indicator + weekly tracker (after they choose a path) */}
          {streak && (
            <StreakMilestone
              streakCount={streak.currentStreak}
              userName={resolvedProfileName?.split(/\s+/)[0]}
            />
          )}
          <AnimatePresence>
            {devotionalCoreComplete && completionPath !== null && streak && streak.currentStreak >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                className="flex flex-col items-center gap-2 py-1"
                data-testid="streak-indicator"
              >
                <div className="flex items-center gap-2.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500/80" />
                  <span className="text-[12px] font-medium text-muted-foreground">
                    Day #{streak.currentStreak} of my Walk
                  </span>
                  {streak.longestStreak > streak.currentStreak && (
                    <span className="text-[11px] text-muted-foreground/50">· best {streak.longestStreak}</span>
                  )}
                </div>
                {(() => {
                  const badge = getBadge(streak.currentStreak);
                  if (!badge) return null;
                  return (
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/8 border border-primary/20"
                      data-testid="streak-badge"
                    >
                      <span className="text-[10px] font-bold text-primary/70 tracking-wide">{badge.name}</span>
                      <span className="text-[9px] text-muted-foreground/50">· {badge.verse}</span>
                    </div>
                  );
                })()}
                {(() => {
                  const LABELS = ["M", "T", "W", "T", "F", "S", "S"];
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
                            <span
                              className={`text-[9px] font-bold uppercase tracking-widest ${isToday ? "text-primary/80" : "text-muted-foreground/30"}`}
                            >
                              {label}
                            </span>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                visited && isToday
                                  ? "bg-primary shadow-sm"
                                  : visited
                                    ? "border border-primary/25 bg-transparent"
                                    : isToday
                                      ? "border border-primary/40 bg-primary/5"
                                      : isFuture
                                        ? "border border-muted-foreground/10 bg-muted/20"
                                        : "border border-muted-foreground/15 bg-muted/15"
                              }`}
                            >
                              {visited && isToday && (
                                <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                              )}
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

          {/* Streak Pro nudge — only on "stay" path, after quiet pause */}
          {showPostCompletionCtas && completionPath === "stay" && devotionalCoreComplete && streak && streak.currentStreak >= 5 && !isProVerifiedLocally() && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              <Link
                href="/pricing"
                data-testid="link-streak-pro-nudge"
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-2xl text-amber-700 dark:text-amber-400 text-[12px] font-medium transition-colors group"
                style={{ background: "rgba(245,158,11,0.09)", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <Zap className="w-3 h-3 shrink-0" />
                <span>If this rhythm is helping, Pro adds more listening, your full archive, and one grace day each month — optional.</span>
              </Link>
            </motion.div>
          )}

          {/* Daily email/SMS sign-up moved to home page footer — see LandingHome */}

          {/* Intercession nudge — once devotional is complete, after journal save offer */}
          {completionPath === "stay" && devotionalCoreComplete && !friendIntercessionDismissed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="mx-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 flex items-start gap-3"
              data-testid="friend-intercession-card"
            >
              <Heart className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-foreground/90 leading-snug">
                  Did someone come to mind?
                </p>
                <p className="text-[13px] text-muted-foreground/80 leading-snug mt-1">
                  That&apos;s often the Spirit stirring something in you. A few words of prayer for them is enough.
                </p>
                <button
                  data-testid="button-pray-for-friend"
                  onClick={() =>
                    navigate(
                      `/guidance?situation=${encodeURIComponent(
                        "I want to pray for someone who came to mind while I was in prayer and reading Scripture today.",
                      )}`,
                    )
                  }
                  className="mt-2.5 text-[14px] font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Pray for them →
                </button>
              </div>
              <button
                data-testid="button-dismiss-friend-prompt"
                onClick={() => setFriendIntercessionDismissed(true)}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors text-lg leading-none mt-0.5 flex-shrink-0"
                aria-label="Dismiss"
              >
                ×
              </button>
            </motion.div>
          )}

          {/* More teaching — secondary to the one daily message */}
          {completionPath === "stay" && reflectionContent && verse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="px-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/40 text-center mb-2">
                Optional
              </p>
              <AdditionalSermonsSection
                verseId={verse.id}
                verseReference={verse.reference}
                reflectionContent={reflectionContent}
                primaryChannel={primarySermonChannel}
              />
            </motion.div>
          )}

          {completionPath !== null && (
            <>
              <FirstDayCard isFirstDay={streak?.currentStreak === 1 && !!prayerContent} />
              <ShareInviteCard />
            </>
          )}


        </motion.div>
      </main>

      <SessionStillness
        open={showStillness}
        verseText={verse?.text ?? ""}
        verseRef={verse?.reference ?? ""}
        onDone={() => {
          setShowStillness(false);
          markReturningHome();
          navigate("/");
        }}
      />

      <AnimatePresence>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
        {showListenUpgrade && (
          <UpgradeModal
            onClose={() => setShowListenUpgrade(false)}
            title="Hear today's Word without limits"
            subtitle={LISTEN_LIMIT_COPY.devotional}
          />
        )}
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

      {/* ── Share Image Preview Sheet ──────────────────────────── */}
      <AnimatePresence>
        {sharePreviewUrl && (
          <>
            {/* Backdrop — lower z than sheet */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/75"
              style={{ zIndex: 199 }}
              onClick={closeSharePreview}
              onTouchMove={e => e.stopPropagation()}
            />
            {/* Bottom sheet — higher z than backdrop */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl flex flex-col"
              style={{ zIndex: 200, maxWidth: 480, margin: "0 auto", maxHeight: "92dvh" }}
              onClick={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
            >
              {/* Handle + header — sticky so X is always reachable */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 relative">
                <div className="w-10 h-1 rounded-full bg-border/60 absolute left-1/2 -translate-x-1/2 top-2.5" />
                <p className="text-[12px] font-semibold uppercase tracking-widest text-foreground/50 mt-1">Preview</p>
                <button
                  onClick={closeSharePreview}
                  data-testid="button-close-share-preview"
                  className="ml-auto p-1.5 rounded-full text-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Scrollable content area */}
              <div className="overflow-y-auto flex-1 overscroll-contain" style={{ touchAction: "pan-y" }}>

              {/* Format toggle */}
              <div className="px-4 pb-1 flex gap-2">
                <button
                  onClick={() => handleSwitchShareFormat("square")}
                  disabled={regeneratingPreview}
                  data-testid="button-devotional-format-square"
                  className="flex-1 py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: sharePreviewFormat === "square" ? "rgba(122,1,141,0.55)" : "rgba(255,255,255,0.07)",
                    border: sharePreviewFormat === "square" ? "1px solid rgba(180,80,220,0.50)" : "1px solid rgba(255,255,255,0.10)",
                    color: sharePreviewFormat === "square" ? "rgba(220,170,255,0.95)" : "rgba(255,255,255,0.45)",
                  }}
                >
                  <div className="w-[14px] h-[14px] rounded-[2px] border-2 flex-shrink-0" style={{ borderColor: "currentColor" }} />
                  <div className="text-left">
                    <div className="text-[12px] font-semibold leading-tight">Square</div>
                    <div className="text-[10px] opacity-60 leading-tight">Instagram · Feed</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSwitchShareFormat("story")}
                  disabled={regeneratingPreview}
                  data-testid="button-devotional-format-story"
                  className="flex-1 py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: sharePreviewFormat === "story" ? "rgba(122,1,141,0.55)" : "rgba(255,255,255,0.07)",
                    border: sharePreviewFormat === "story" ? "1px solid rgba(180,80,220,0.50)" : "1px solid rgba(255,255,255,0.10)",
                    color: sharePreviewFormat === "story" ? "rgba(220,170,255,0.95)" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {regeneratingPreview
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    : <div className="w-[10px] h-[16px] rounded-[2px] border-2 flex-shrink-0" style={{ borderColor: "currentColor" }} />
                  }
                  <div className="text-left">
                    <div className="text-[12px] font-semibold leading-tight">Story</div>
                    <div className="text-[10px] opacity-60 leading-tight">Reels · TikTok</div>
                  </div>
                </button>
              </div>

              {/* Image preview */}
              <div className="px-4 pb-3 relative">
                <img
                  src={sharePreviewUrl ?? undefined}
                  alt="Share preview"
                  className="w-full rounded-xl shadow-md mx-auto"
                  style={{
                    aspectRatio: sharePreviewFormat === "story" ? "9/16" : "1/1",
                    objectFit: "cover",
                    maxHeight: sharePreviewFormat === "story" ? 360 : undefined,
                  }}
                />
                {/* Refresh scene button */}
                <button
                  onClick={handleRefreshScene}
                  disabled={regeneratingPreview}
                  data-testid="button-refresh-scene"
                  title="New scene"
                  className="absolute bottom-6 right-7 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/90 active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: "rgba(0,0,0,0.52)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {regeneratingPreview
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <RefreshCw className="w-3 h-3" />
                  }
                  New scene
                </button>

              </div>

              {/* Action buttons */}
              <div className="px-4 pb-3 flex gap-3">
                <button
                  onClick={handleNativeShareImage}
                  data-testid="button-share-image-native"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] active:scale-95 transition-transform shadow-md"
                >
                  <Share2 className="w-4 h-4" />
                  Share image
                </button>
                <button
                  onClick={handleDownloadImage}
                  data-testid="button-download-image"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border/50 text-foreground/70 font-semibold text-[14px] active:scale-95 transition-transform"
                >
                  <Download className="w-4 h-4" />
                  Save
                </button>
              </div>

              {/* Social share row */}
              <div className="px-4 pb-5 pt-1 border-t border-border/20">
                <p className="text-[11px] text-foreground/40 font-medium tracking-wide uppercase text-center mb-3">Share link to</p>
                <div className="flex items-center justify-center gap-2.5">
                  <button data-testid="share-preview-x" onClick={shareOnX} title="Share on X"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-black text-white active:scale-95 transition-transform shadow-md">
                    <SiX className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-preview-facebook" onClick={shareOnFacebook} title="Share on Facebook"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1877F2] text-white active:scale-95 transition-transform shadow-md">
                    <SiFacebook className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-preview-whatsapp" onClick={shareOnWhatsApp} title="Share on WhatsApp"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#25D366] text-white active:scale-95 transition-transform shadow-md">
                    <SiWhatsapp className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-preview-instagram" onClick={shareOnInstagram} title="Copy for Instagram"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform shadow-md"
                    style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}>
                    <SiInstagram className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-preview-telegram" onClick={shareOnTelegram} title="Share on Telegram"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2AABEE] text-white active:scale-95 transition-transform shadow-md">
                    <SiTelegram className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-preview-pinterest" onClick={shareOnPinterest} title="Pin to Pinterest"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#E60023] text-white active:scale-95 transition-transform shadow-md">
                    <SiPinterest className="w-[16px] h-[16px]" />
                  </button>
                </div>
                <p className="text-[10px] text-foreground/30 text-center mt-2.5">Sends a link — recipients see a verse card preview automatically in Messages &amp; social apps.</p>
              </div>
              </div>{/* end scroll wrapper */}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
