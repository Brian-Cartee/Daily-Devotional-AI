import { useState, useEffect, useRef, useCallback, useMemo, type KeyboardEvent } from "react";
import { useSearch, useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Send, Loader2, BookOpen, Volume2, VolumeX, BookMarked, CheckCheck, Mic, MicOff, RefreshCw, Lock } from "lucide-react";
import { ListenButton } from "@/components/ListenButton";
import { getGuidanceMode, saveGuidanceMode, type GuidanceMode } from "@/lib/guidanceMode";
import { getCurrentHeartState, buildHeartContext } from "@/lib/heartCheck";
import {
  grantCoachConsentThisSession,
  hasCoachConsentThisSession,
} from "@/lib/coachConsent";
import { CoachConsentModal } from "@/components/coach/CoachConsentModal";
import { PrayerThatStays } from "@/components/prayer/PrayerThatStays";
import { saveLastGuidanceSession } from "@/lib/engagementCards";
import { getTodayFramework } from "@/lib/faithFramework";
import { getGuidanceHeroFallbacks, getGuidanceHeroImage } from "@/lib/guidanceHeroImage";
import { resolveGuidanceHeroBackground } from "@/lib/resolveHeroBackground";
import { getUserName, getUserVoice } from "@/lib/userName";
import { getSessionId } from "@/lib/session";
import { buildShepherdGreeting, speakShepherdLine, prefetchShepherdTTS, shouldPlayShepherdGreeting, markShepherdGreetingPlayed, postGuidanceMemory, speakTakeYourTimeBridge, waitForSubmitBridge, speakShepherdWithMicHandoff, PROCESSING_BRIDGE, PHASE1_REPLY_BRIDGE, VOICE_SILENCE_ENTRY_MS, VOICE_SILENCE_PHASE1_MS, VOICE_SILENCE_FOLLOWUP_MS, VOICE_MIC_HANDOFF_FOLLOWUP_MS } from "@/lib/shepherdVoice";
import { usePhilipVoiceStream } from "@/lib/usePhilipVoiceStream";
import { createPatientVoiceListener, type VoiceListenUiPhase, type PatientVoiceListener } from "@/lib/patientVoiceListen";
import { PhilipVoiceScreen, type PhilipVoiceState } from "@/components/PhilipVoiceScreen";
import { fetchGuidanceRecap, type GuidanceRecap } from "@/lib/guidanceRecap";
import { resolveGuidanceSituation, stashGuidanceSituation } from "@/lib/guidanceSituation";
import {
  consumeCrisisReentryLine,
  isGuidanceSafetyBlock,
  markGuidanceCrisisEncounter,
  markPhilipDisclaimerShown,
  PHILIP_DISCLAIMER,
  shouldShowPhilipDisclaimer,
} from "@/lib/guidanceSafetyClient";
import {
  clampGuidanceInput,
  GUIDANCE_INPUT_MAX,
  GUIDANCE_INPUT_MIN,
  isGuidanceInputValid,
} from "@/lib/guidanceInputLimits";
import { saveCarryToday } from "@/lib/devotionalContinuity";
import { type Journey } from "@/data/journeys";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { isPhilipMode, isSoloMode, incrementSoloSessionCount, shouldShowSoloReintro, markSoloReintroShown, setCompanionMode } from "@/lib/companionMode";
import { WitnessLetterCard } from "@/components/WitnessLetterCard";
import { HoldThisWithMeCard } from "@/components/HoldThisWithMeCard";
import { PatternPhilipCard } from "@/components/PatternPhilipCard";
import { suggestPathwayForSituation } from "@/lib/journeyCatalog";
import { useTTS, prewarmTTS } from "@/hooks/use-tts";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { canUseAi } from "@/lib/aiUsage";
import { apiSessionExtras } from "@/lib/requestExtras";
import { journalSavedToast } from "@/lib/journalToast";
import { refreshAiUsage, getGlobalAiUsage } from "@/hooks/use-ai-usage";
import { AiPauseModal } from "@/components/AiPauseModal";
import { isLateNight } from "@/lib/nightMode";
import { getRelationshipAge } from "@/lib/relationship";
import { UpgradeModal } from "@/components/UpgradeModal";
import { SessionStillness } from "@/components/SessionStillness";
import { GuidanceCompletionThreshold } from "@/components/GuidanceCompletionThreshold";
import { ShareInviteCard } from "@/components/ShareInviteCard";
import { ShareVerseTrigger } from "@/components/ShareVerseSheet";
import { easternVerseDateKey } from "@/lib/shareVerse";
import { useDailyVerse } from "@/hooks/use-verses";
import { getListenFirstPreference } from "@/lib/listenFirst";
import { canStartGuidanceChain, canUseListenFirstAuto, LISTEN_LIMIT_COPY } from "@/lib/listenPolicy";
import { markReturningHome } from "@/lib/introState";
import { markSacredSessionQuiet } from "@/lib/sacredSession";
import { SITUATION_TOPICS } from "@/lib/situationTopics";
import { PastorVideoCard } from "@/components/PastorVideoCard";
import { resolveGuidancePastorVideoTone } from "@/lib/pastorVideoTone";
import { usePastorVideo } from "@/hooks/use-pastor-video";
import { ScriptureSceneCard } from "@/components/ScriptureSceneCard";
import { ShareVerseImageButton } from "@/components/ShareableVerseImage";
import {
  fetchGuidanceVerseAndPrayer,
  formatGuidanceVerseDisplay,
  GUIDANCE_FALLBACK_PRAYER,
  isLikelyPrayerText,
  extractVerseFromGuidanceText,
} from "@/lib/guidanceVersePrayer";

import { useToast } from "@/hooks/use-toast";

interface VerseResult {
  reference: string;
  text: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GuidanceMovements {
  reflection: string;
  scripture: string | null;
  prayer: string;
}

/** Strip any AI-generated markdown bold/italic so the response reads as a single voice */
function cleanResponse(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.+?)\*/g, "$1")        // *italic*
    .replace(/__(.+?)__/g, "$1")        // __bold__
    .replace(/_(.+?)_/g, "$1");         // _italic_
}

function splitGuidanceMovements(raw: string, verse?: VerseResult | null, prayer?: string | null): GuidanceMovements {
  const paras = cleanResponse(raw).split("\n\n").map((p) => p.trim()).filter(Boolean);
  const reflection = paras.slice(0, 2).join("\n\n") || "You’re not alone in this moment.";
  const scripture = verse
    ? `"${verse.text}"\n— ${verse.reference}`
    : extractVerseFromGuidanceText(raw);
  const prayerFromApi = prayer?.trim();
  const candidate = paras.slice(2).join("\n\n").trim();
  const prayerBody =
    prayerFromApi ||
    (isLikelyPrayerText(candidate) ? candidate : "");
  return { reflection, scripture, prayer: prayerBody };
}

function SessionFeedbackSection({
  situation,
  sessionFeedback,
  setSessionFeedback,
  completionPath,
}: {
  situation: string;
  sessionFeedback: "yes" | "not-quite" | null;
  setSessionFeedback: (v: "yes" | "not-quite") => void;
  completionPath?: "carry" | "stay" | null;
}) {
  const submitFeedback = (feedback: "yes" | "not-quite") => {
    setSessionFeedback(feedback);
    fetch("/api/guidance/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        feedback,
        situation: situation.trim().slice(0, 200),
        path: completionPath ?? undefined,
      }),
    }).catch(() => {});
  };
  return (
    <AnimatePresence mode="wait">
      {sessionFeedback === null ? (
        <motion.div
          key="feedback-ask"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full rounded-2xl px-5 py-5 text-center"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.22)" }}
          data-testid="card-guidance-session-feedback"
        >
          <p className="text-[15px] font-semibold text-foreground/90 mb-1">Did this meet you today?</p>
          <p className="text-[12px] text-muted-foreground/60 mb-4 leading-relaxed">
            One tap — helps us stay pastoral, not generic.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              data-testid="button-guidance-feedback-yes"
              onClick={() => submitFeedback("yes")}
              className="px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all active:scale-95"
              style={{ background: "rgba(139,92,246,0.22)", border: "1px solid rgba(139,92,246,0.40)", color: "rgba(196,181,253,0.98)" }}
            >
              Yes, it did
            </button>
            <button
              type="button"
              data-testid="button-guidance-feedback-not-quite"
              onClick={() => submitFeedback("not-quite")}
              className="px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)" }}
            >
              Not this time
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.p
          key="feedback-thanks"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[13px] text-muted-foreground/55 italic text-center py-2"
        >
          {sessionFeedback === "yes" ? "Glad it met you. See you next time." : "Noted — we'll keep listening."}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function GuidanceVpRetry({
  label,
  onRetry,
  loading,
}: {
  label: string;
  onRetry: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[15px] leading-relaxed text-muted-foreground italic">{label}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={loading}
        data-testid="button-guidance-vp-retry"
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        {loading ? "Preparing…" : "Try again"}
      </button>
    </div>
  );
}

function GuidanceVpLoading({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 text-muted-foreground/80 italic text-[15px]">
      <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary/70" />
      <span>{message}</span>
    </div>
  );
}

function getHeroHeading(situation: string, isFirstVisit: boolean): string {
  if (isFirstVisit || !situation) return "What's on\nyour heart?";
  const s = situation.toLowerCase();
  if (/grateful|gratitude|thankful|thankfulness|blessed|blessing/.test(s)) return "What a beautiful\nplace to start";
  if (/happy|joy|joyful|peaceful|peace|content|uplifted|hopeful|celebrat|excit|thriving/.test(s)) return "Let's go\ndeeper from here";
  return "You don't have\nto carry this alone";
}

function getHeroHeadingCompact(situation: string, isFirstVisit: boolean): string {
  if (isFirstVisit || !situation) return "What's on your heart?";
  const s = situation.toLowerCase();
  if (/grateful|gratitude|thankful|thankfulness|blessed|blessing/.test(s)) return "What a beautiful place to start";
  if (/happy|joy|joyful|peaceful|peace|content|uplifted|hopeful|celebrat|excit|thriving/.test(s)) return "Let's go deeper from here";
  return "You don't have to carry this alone";
}

const GUIDANCE_PLACEHOLDERS = [
  "I can't quiet my mind tonight…",
  "Something from today is still heavy…",
  "I need Scripture for what I'm facing…",
  "Help me pray honestly about this…",
];

const NIGHT_INTAKE_PRESETS = [
  "I feel alone",
  "I'm anxious",
  "I'm grieving",
  "I'm exhausted",
] as const;

const BRIDGE_QUESTIONS: Record<string, string> = {
  "I feel alone": "What's making tonight feel that way?",
  "I'm anxious": "What's sitting on you right now — is it one thing or everything at once?",
  "I'm grieving": "Who or what are you carrying tonight?",
  "I'm exhausted": "What's worn you down — is it today specifically or has it been building?",
};

export default function GuidancePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const situation = resolveGuidanceSituation(search);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (new URLSearchParams(search).get("listen") !== "1") return;
    try {
      sessionStorage.setItem("sp_guidance_siri_listen", "1");
    } catch {
      /* noop */
    }
    navigate("/guidance", { replace: true });
  }, [search, navigate]);

  const witnessLetterRef = useRef<string | null>(null);
  const [witnessReady, setWitnessReady] = useState(false);
  const [greetingSpeaking, setGreetingSpeaking] = useState(false);
  const [greetingFallbackText, setGreetingFallbackText] = useState<string | null>(null);
  const autoMicStartedRef = useRef(false);
  const cancelGreetingSpeakRef = useRef<(() => void) | null>(null);
  const greetingBlobRef = useRef<Blob | null>(null);
  const greetingTextRef = useRef<string | null>(null);
  const crisisReentryRef = useRef<string | null | undefined>(undefined);
  const phase1SpokenRef = useRef<string | null>(null);
  const phase2SpokenRef = useRef<string | null>(null);
  const phase1TtsBlobRef = useRef<Promise<Blob | null> | null>(null);
  const phase2TtsBlobRef = useRef<Promise<Blob | null> | null>(null);
  const followUpTtsBlobRef = useRef<Promise<Blob | null> | null>(null);
  const phase1MemorySavedRef = useRef(false);
  const sendOffSpokenRef = useRef<string | null>(null);
  const [phase1SpeechDone, setPhase1SpeechDone] = useState(false);
  const [phase2Speaking, setPhase2Speaking] = useState(false);
  const [phase2SpeechDone, setPhase2SpeechDone] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [responseComplete, setResponseComplete] = useState(false);
  const [conversationPhase, setConversationPhase] = useState<1 | 2>(1);
  const [phase1Response, setPhase1Response] = useState<string | null>(null);
  const [phase1StreamingText, setPhase1StreamingText] = useState("");
  const [phase1Complete, setPhase1Complete] = useState(false);
  const [phase1UserReply, setPhase1UserReply] = useState("");
  const [phase1UserReplySubmitted, setPhase1UserReplySubmitted] = useState<string | null>(null);
  const [phase2Loading, setPhase2Loading] = useState(false);
  const [phase2Started, setPhase2Started] = useState(false);
  const [bridgeQuestion, setBridgeQuestion] = useState<string | null>(null);
  const [bridgeAnswer, setBridgeAnswer] = useState("");
  const [bridgeSubmitted, setBridgeSubmitted] = useState(false);
  const [heartInput, setHeartInput] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [situationTopicId, setSituationTopicId] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [heartListening, setHeartListening] = useState(false);
  const heartVoiceRef = useRef<PatientVoiceListener | null>(null);
  const heartTakeYourTimeRef = useRef<(() => void) | null>(null);
  const [heartListenPhase, setHeartListenPhase] = useState<VoiceListenUiPhase>("listening");
  const [heartShowContinue, setHeartShowContinue] = useState(false);
  const [heartHasRecording, setHeartHasRecording] = useState(false);
  const [showHeartTypeFallback, setShowHeartTypeFallback] = useState(false);
  const [phase1Listening, setPhase1Listening] = useState(false);
  const phase1VoiceRef = useRef<PatientVoiceListener | null>(null);
  const phase1TakeYourTimeRef = useRef<(() => void) | null>(null);
  const [phase1ListenPhase, setPhase1ListenPhase] = useState<VoiceListenUiPhase>("listening");
  const [phase1ShowContinue, setPhase1ShowContinue] = useState(false);
  const [showPhase1TypeFallback, setShowPhase1TypeFallback] = useState(false);
  const [processingBridge, setProcessingBridge] = useState(false);
  const [phase1Interim, setPhase1Interim] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpListening, setFollowUpListening] = useState(false);
  const [followUpListenPhase, setFollowUpListenPhase] = useState<VoiceListenUiPhase>("listening");
  const [followUpSpeaking, setFollowUpSpeaking] = useState(false);
  const followUpVoiceRef = useRef<PatientVoiceListener | null>(null);
  const followUpTakeYourTimeRef = useRef<(() => void) | null>(null);
  const followUpSubmittingRef = useRef(false);
  const followUpSpokenRef = useRef<string | null>(null);
  const stayMicStartedRef = useRef(false);
  const submitFollowUpRef = useRef<(fromVoice: boolean, textOverride?: string) => void>(() => {});
  const [isSending, setIsSending] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showListenUpgrade, setShowListenUpgrade] = useState(false);
  const [showAiPause, setShowAiPause] = useState(false);
  const [isReflecting, setIsReflecting] = useState(() => !!situation.trim());
  const hasSpeechSupport = typeof window !== "undefined" && (
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    || (typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined")
  );
  const framework = getTodayFramework();
  const queryClient = useQueryClient();
  const { data: dailyVerse } = useDailyVerse();
  const verseDate = dailyVerse?.date ?? easternVerseDateKey();
  const verseArtGenStarted = useRef(false);
  const { data: verseArt } = useQuery({
    queryKey: ["/api/verse-art", verseDate],
    queryFn: async () => {
      if (!verseDate) return null;
      const res = await fetch(`/api/verse-art/${verseDate}`);
      if (!res.ok) return null;
      return res.json() as { imageUrl: string | null; cached: boolean };
    },
    enabled: !!verseDate,
    staleTime: 6 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!dailyVerse || !verseDate || verseArt === undefined || verseArtGenStarted.current) return;
    if (verseArt?.imageUrl) return;
    verseArtGenStarted.current = true;
    fetch("/api/verse-art/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verseDate: dailyVerse.date,
        verseText: dailyVerse.text,
        verseReference: dailyVerse.reference,
        ...apiSessionExtras(),
      }),
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["/api/verse-art", verseDate] }))
      .catch(() => {});
  }, [dailyVerse, verseDate, verseArt, queryClient]);

  const [showStillness, setShowStillness] = useState(false);
  const [showSlowVerse, setShowSlowVerse] = useState(false);
  const listenFirstTriggeredRef = useRef(false);
  const lastInputWasVoiceRef = useRef(false);

  const getCrisisReentryLine = () => {
    if (crisisReentryRef.current === undefined) {
      crisisReentryRef.current = consumeCrisisReentryLine();
    }
    return crisisReentryRef.current;
  };

  const [isFirstVisit] = useState(() => !localStorage.getItem("sp_guidance_visited"));
  const [showPhilipDisclaimer] = useState(() => shouldShowPhilipDisclaimer());
  useEffect(() => { localStorage.setItem("sp_guidance_visited", "1"); }, []);
  useEffect(() => {
    if (showPhilipDisclaimer) markPhilipDisclaimerShown();
  }, [showPhilipDisclaimer]);

  useEffect(() => {
    void prefetchShepherdTTS(PROCESSING_BRIDGE);
    void prefetchShepherdTTS(PHASE1_REPLY_BRIDGE);
  }, []);

  const greetingEngagedRef = useRef(false);
  const dynamicOpeningRef = useRef<string | null>(null);
  const heartSubmittingRef = useRef(false);
  const phase1SubmittingRef = useRef(false);
  const [voiceConversation, setVoiceConversation] = useState(false);
  const [phase1Speaking, setPhase1Speaking] = useState(false);

  const philipStream = usePhilipVoiceStream();

  // Derived Philip voice UI state
  const philipVoiceState: PhilipVoiceState = !voiceConversation
    ? "hidden"
    : heartListening || phase1Listening || followUpListening
    ? "listening"
    : processingBridge || isReflecting || phase2Loading
    ? "processing"
    : phase1Speaking || phase2Speaking || followUpSpeaking
    ? "speaking"
    : "idle";

  useEffect(() => {
    if (!situation.trim()) {
      heartSubmittingRef.current = false;
      phase1SubmittingRef.current = false;
      autoMicStartedRef.current = false;
    }
  }, [situation]);

  useEffect(() => {
    if (situation.trim()) {
      setWitnessReady(true);
      return;
    }
    const sessionId = getSessionId();
    if (!sessionId) {
      setWitnessReady(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/guidance/witness-letter?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.letter) witnessLetterRef.current = d.letter;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setWitnessReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [situation]);

  useEffect(() => {
    if (!heartInput.trim()) return;
    greetingEngagedRef.current = true;
    cancelGreetingSpeakRef.current?.();
    cancelGreetingSpeakRef.current = null;
    setGreetingSpeaking(false);
  }, [heartInput]);

  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % GUIDANCE_PLACEHOLDERS.length);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const [guidanceMode, setGuidanceModeState] = useState<GuidanceMode>(() => getGuidanceMode());
  const [coachConsentOpen, setCoachConsentOpen] = useState(false);
  const [pendingCoachRegenerate, setPendingCoachRegenerate] = useState(false);

  const heroArtUrl = getGuidanceHeroImage();
  const [heroImageSrc, setHeroImageSrc] = useState("");
  const heroBlobRef = useRef<string | null>(null);
  const heroFallbacksRef = useRef(getGuidanceHeroFallbacks(heroArtUrl));
  heroFallbacksRef.current = getGuidanceHeroFallbacks(heroArtUrl);

  useEffect(() => {
    let cancelled = false;
    if (heroBlobRef.current) {
      URL.revokeObjectURL(heroBlobRef.current);
      heroBlobRef.current = null;
    }
    setHeroImageSrc("");

    void resolveGuidanceHeroBackground(verseDate, verseArt?.imageUrl ?? null).then((src) => {
      if (cancelled) {
        if (src.startsWith("blob:")) URL.revokeObjectURL(src);
        return;
      }
      if (src.startsWith("blob:")) heroBlobRef.current = src;
      setHeroImageSrc(src);
    });

    return () => {
      cancelled = true;
      if (heroBlobRef.current) {
        URL.revokeObjectURL(heroBlobRef.current);
        heroBlobRef.current = null;
      }
    };
  }, [heroArtUrl, verseDate, verseArt?.imageUrl]);

  const carryVerseToday = () => {
    if (!verse) return;
    saveCarryToday({
      text: verseDisplay?.text ?? verse.text,
      reference: verse.reference,
      source: "guidance",
    });
    toast({ description: "Saved. Carry this verse with you today." });
  };

  const applyGuidanceMode = (mode: GuidanceMode, regenerate = false) => {
    setGuidanceModeState(mode);
    saveGuidanceMode(mode);
    const userMessages = messages.filter((m) => m.role === "user");
    if (regenerate && situation.trim() && userMessages.length <= 1 && !responseComplete) {
      const initialUserMsg: Message = { role: "user", content: situation };
      setMessages([initialUserMsg]);
      setConversationPhase(1);
      setPhase1Complete(false);
      setPhase1Response(null);
      setPhase2Started(false);
      const flowGen = ++guidanceFlowGenRef.current;
      void streamPhase1(flowGen).then((ok) => {
        if (flowGen !== guidanceFlowGenRef.current) return;
        if (!ok) fallbackToSinglePhase(initialUserMsg, mode);
      });
    } else if (regenerate && responseComplete && situation.trim() && userMessages.length <= 1) {
      const initialUserMsg: Message = { role: "user", content: situation };
      setMessages([initialUserMsg]);
      fallbackToSinglePhase(initialUserMsg, mode);
    }
  };

  const handleModeChange = (mode: GuidanceMode) => {
    if (mode === guidanceMode) return;
    if (mode === "coach" && !hasCoachConsentThisSession()) {
      setPendingCoachRegenerate(
        responseComplete && situation.trim() && messages.filter((m) => m.role === "user").length <= 1,
      );
      setCoachConsentOpen(true);
      return;
    }
    applyGuidanceMode(mode, mode === "coach" || mode === "encouraging");
  };

  const [journey, setJourney] = useState<Journey | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState(false);

  const [verse, setVerse] = useState<VerseResult | null>(null);
  const verseDisplay = verse ? formatGuidanceVerseDisplay(verse.text) : null;
  const [prayer, setPrayer] = useState<string | null>(null);
  const [vpLoading, setVpLoading] = useState(false);
  const [vpError, setVpError] = useState(false);

  interface ContextPhoto { url: string; thumb: string; photographerName: string; photographerLink: string; }
  const [contextPhoto, setContextPhoto] = useState<ContextPhoto | null>(null);
  const [prayerSaved, setPrayerSaved] = useState(false);

  const [guidanceExpanded, setGuidanceExpanded] = useState(false);

  interface WalkToday { action: string; scripture: string; }
  const [walkToday, setWalkToday] = useState<WalkToday | null>(null);
  const [walkLoading, setWalkLoading] = useState(false);
  const walkFetchedRef = useRef(false);

  const tts = useTTS();
  const ttsChain = useTTS();
  const [chainSection, setChainSection] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const floatRef = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const [revealStage, setRevealStage] = useState(0);

  const showPhase2Content = phase2Started && conversationPhase === 2;

  const guidancePastorTone = useMemo(() => {
    const topic = SITUATION_TOPICS.find((t) => t.id === situationTopicId);
    return resolveGuidancePastorVideoTone(situationTopicId, topic?.label ?? null, situation);
  }, [situationTopicId, situation]);
  const guidancePastorVideo = usePastorVideo(
    guidancePastorTone,
    showPhase2Content && responseComplete && revealStage >= 3,
  );
  /** After prayer reveals: null = fork; carry = send-off; stay = journey + follow-up */
  const [completionPath, setCompletionPath] = useState<null | "carry" | "stay">(null);
  const [showWitnessLetter, setShowWitnessLetter] = useState(false);
  const [showHoldCard, setShowHoldCard] = useState(false);
  const [showPatternCard, setShowPatternCard] = useState(false);
  const [sendOffText, setSendOffText] = useState<string | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState<"yes" | "not-quite" | null>(null);
  const [sessionRecap, setSessionRecap] = useState<GuidanceRecap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const recapFetchedRef = useRef(false);
  const latestResponseRef = useRef<HTMLDivElement>(null);
  const hasScrolledInitial = useRef(false);
  const hasScrolledFollowUp = useRef(0);
  /** Prevents double-start; cleared when situation query is empty */
  const guidanceStartedForRef = useRef<string | null>(null);
  /** Invalidates in-flight guidance flows when a newer one starts (Strict Mode / remounts). */
  const guidanceFlowGenRef = useRef(0);

  const isReturnEntry = !situation.trim() && witnessReady && !shouldPlayShepherdGreeting();

  const streamResponse = async (
    conversationMessages: Message[],
    explicitMode?: GuidanceMode,
    phase1Context?: { phase1Response: string; phase1UserReply: string },
    opts?: { isFollowUp?: boolean },
  ) => {
    setStreamingText("");
    setResponseComplete(false);
    if (!opts?.isFollowUp) {
      setCompletionPath(null);
      setRevealStage(0);
      listenFirstTriggeredRef.current = false;
      setWalkToday(null);
      setWalkLoading(false);
      walkFetchedRef.current = false;
    }
    try {
      const res = await fetch("/api/guidance/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          messages: conversationMessages,
          userName: getUserName() ?? undefined,
          guidanceMode: explicitMode ?? guidanceMode,
          isLateNight: isLateNight(),
          heartContext: buildHeartContext(getCurrentHeartState()),
          companionMode: isPhilipMode() ? "philip" : "solo",
          ...(phase1Context ?? {}),
          ...apiSessionExtras(),
        }),
      });
      if (res.status === 429) {
        setShowAiPause(true);
        setStreamingText("");
        setResponseComplete(false);
        void refreshAiUsage();
        return;
      }
      if (!res.ok || !res.body) {
        setStreamingText("Having trouble connecting right now. It's worth trying once more — we're here.");
        setResponseComplete(true);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingText(accumulated);
      }
      if (!accumulated.trim()) {
        setStreamingText("We can try that again — give it just a moment.");
        setResponseComplete(true);
        return;
      }
      // Kick off TTS prefetch immediately — overlaps with React re-render cycle
      if (lastInputWasVoiceRef.current) {
        const blobRef = opts?.isFollowUp ? followUpTtsBlobRef : phase2TtsBlobRef;
        blobRef.current = prefetchShepherdTTS(cleanResponse(accumulated));
      }
      setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
      setStreamingText("");
      setResponseComplete(true);
    } catch {
      setStreamingText("Trouble connecting — check your signal and we can try again.");
      setResponseComplete(true);
    }
  };

  const streamPhase1 = async (flowGen: number): Promise<boolean> => {
    setPhase1StreamingText("");
    setPhase1Response(null);
    setPhase1Complete(false);
    setPhase1UserReply("");
    setPhase1UserReplySubmitted(null);
    setPhase2Started(false);
    try {
      const res = await fetch("/api/guidance/phase1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          situationTopicId: situationTopicId ?? undefined,
          userName: getUserName() ?? undefined,
          heartContext: buildHeartContext(getCurrentHeartState()),
          companionMode: isPhilipMode() ? "philip" : "solo",
          ...apiSessionExtras(),
        }),
      });
      if (flowGen !== guidanceFlowGenRef.current) return true;
      if (res.status === 429) {
        setShowAiPause(true);
        void refreshAiUsage();
        return false;
      }
      if (!res.ok || !res.body) return false;
      const safetyLevel = res.headers.get("X-Guidance-Safety");
      if (isGuidanceSafetyBlock(safetyLevel)) {
        markGuidanceCrisisEncounter();
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let earlyTtsFired = false;
      phase1TtsBlobRef.current = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (flowGen !== guidanceFlowGenRef.current) return true;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setPhase1StreamingText(accumulated);
        // Fire TTS on the first complete sentence mid-stream so audio is ready the moment streaming ends
        if (!earlyTtsFired && lastInputWasVoiceRef.current && isPhilipMode()) {
          const wordCount = accumulated.trim().split(/\s+/).length;
          const sentenceMatch = wordCount >= 10 ? accumulated.match(/^[\s\S]+?[.!?]/) : null;
          if (sentenceMatch) {
            phase1TtsBlobRef.current = prefetchShepherdTTS(cleanResponse(sentenceMatch[0].trim()));
            earlyTtsFired = true;
          }
        }
      }
      if (flowGen !== guidanceFlowGenRef.current) return true;
      if (!accumulated.trim()) return false;
      setPhase1Response(accumulated);
      setPhase1StreamingText("");
      setPhase1Complete(true);
      // If early TTS didn't fire (very short response), prefetch full text now
      if (lastInputWasVoiceRef.current && !earlyTtsFired) {
        phase1TtsBlobRef.current = prefetchShepherdTTS(cleanResponse(accumulated));
      }
      void refreshAiUsage();
      return true;
    } catch {
      if (flowGen !== guidanceFlowGenRef.current) return true;
      return false;
    }
  };

  // Fires walk-today in parallel with verse-and-prayer — uses situation alone so it
  // doesn't need to wait for the response stream to finish first.
  const fetchWalkToday = () => {
    if (walkFetchedRef.current || !situation.trim()) return;
    walkFetchedRef.current = true;
    setWalkLoading(true);
    fetch("/api/guidance/walk-today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: situation.trim() }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.action) setWalkToday(data); })
      .catch(() => {})
      .finally(() => setWalkLoading(false));
  };

  const startPhase2 = (phase1Reply?: string | null) => {
    setVpLoading(true);
    fetchJourney();
    void loadVerseAndPrayer(phase1Reply);
    fetchWalkToday(); // parallel — fires alongside verse-and-prayer and response stream
  };

  const fallbackToSinglePhase = (initialUserMsg: Message, mode?: GuidanceMode) => {
    setPhase2Started(true);
    setConversationPhase(2);
    setPhase1Complete(false);
    setPhase1Response(null);
    setPhase1StreamingText("");
    startPhase2();
    void streamResponse([initialUserMsg], mode);
  };

  // Always scroll to top on mount — covers iOS Safari scroll restoration and
  // both the empty (/guidance) and pre-filled (/guidance?situation=…) entry paths
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const fetchJourney = () => {
    if (!situation.trim()) return;
    setJourneyError(false);
    if (!isProVerifiedLocally()) {
      setJourney(null);
      setJourneyLoading(false);
      return;
    }
    setJourneyLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 55_000);
    fetch("/api/journey/life-season", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: situation.trim(), ...apiSessionExtras() }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("journey request failed");
        const j = (await r.json()) as Journey;
        if (!j?.title) throw new Error("invalid journey");
        return j;
      })
      .then((j) => {
        sessionStorage.setItem("sp-guidance-journey", JSON.stringify(j));
        setJourney(j);
      })
      .catch(() => setJourneyError(true))
      .finally(() => {
        window.clearTimeout(timeoutId);
        setJourneyLoading(false);
      });
  };

  const loadVerseAndPrayer = useCallback(async (phase1Reply?: string | null) => {
    const trimmed = situation.trim();
    if (!trimmed) return;

    setVpLoading(true);
    setVpError(false);

    const result = await fetchGuidanceVerseAndPrayer(trimmed, phase1Reply ?? undefined);
    setVpLoading(false);

    if (!result.ok) {
      if (result.limitReached) {
        setShowAiPause(true);
        void refreshAiUsage();
      } else {
        setVpError(true);
        toast({
          title: "Scripture & prayer still preparing",
          description: "Your connection may have been slow — tap Try again on the verse or prayer section.",
        });
      }
      return;
    }

    if (result.verse) setVerse(result.verse);
    if (result.prayer) setPrayer(result.prayer);
    if (!result.verse) setVpError(true);
  }, [situation, toast]);

  const startGuidanceFlow = async () => {
    const flowGen = ++guidanceFlowGenRef.current;
    setCompletionPath(null);
    setRevealStage(0);
    listenFirstTriggeredRef.current = false;
    setVerse(null);
    setPrayer(null);
    setVpLoading(false);
    setVpError(false);
    setConversationPhase(1);
    setPhase1Response(null);
    setPhase1StreamingText("");
    setPhase1Complete(false);
    setPhase1UserReply("");
    setPhase1UserReplySubmitted(null);
    setPhase2Started(false);
    setPhase2Loading(false);
    setResponseComplete(false);
    setStreamingText("");
    setSessionRecap(null);
    setRecapLoading(false);
    recapFetchedRef.current = false;
    setPhase1SpeechDone(false);
    setPhase2SpeechDone(false);
    setPhase2Speaking(false);
    phase2SpokenRef.current = null;
    phase1SpokenRef.current = null;
    followUpSpokenRef.current = null;
    stayMicStartedRef.current = false;
    const initialUserMsg: Message = { role: "user", content: situation };
    setMessages([initialUserMsg]);
    setIsReflecting(true);

    const phase1Ok = await streamPhase1(flowGen);
    if (!lastInputWasVoiceRef.current) {
      setPhase1SpeechDone(true);
    }
    setIsReflecting(false);
    if (flowGen !== guidanceFlowGenRef.current) return;
    if (!phase1Ok) {
      setIsReflecting(false);
      toast({
        description: "Philip couldn't respond just now — tap Continue to try again.",
        variant: "destructive",
      });
      setVpLoading(true);
      fallbackToSinglePhase(initialUserMsg);
    }
  };

  const tryStartGuidanceFromUrl = () => {
    const trimmed = situation.trim();
    if (!trimmed) {
      guidanceStartedForRef.current = null;
      return;
    }
    if (guidanceStartedForRef.current === trimmed) return;

    if (!canUseAi()) {
      setShowAiPause(true);
      return;
    }

    guidanceStartedForRef.current = trimmed;
    postGuidanceMemory(trimmed, undefined, "pending");
    startGuidanceFlow();
  };

  const beginGuidanceEntry = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!canUseAi()) {
      setShowAiPause(true);
      setIsReflecting(false);
      return;
    }
    if (isSoloMode()) incrementSoloSessionCount();
    setHeartInput(trimmed);
    saveLastGuidanceSession();
    stashGuidanceSituation(trimmed);
    guidanceStartedForRef.current = null;

    const paramsNow = new URLSearchParams(window.location.search);
    const alreadyActive = paramsNow.get("active") === "1" && resolveGuidanceSituation(window.location.search) === trimmed;
    if (alreadyActive) {
      tryStartGuidanceFromUrl();
      return;
    }
    navigate("/guidance?active=1", { replace: true });
  };

  const beginGuidanceEntryRef = useRef(beginGuidanceEntry);
  beginGuidanceEntryRef.current = beginGuidanceEntry;

  useEffect(() => {
    const trimmed = situation.trim();
    if (!trimmed) {
      guidanceStartedForRef.current = null;
      setBridgeQuestion(null);
      return;
    }
    if (NIGHT_INTAKE_PRESETS.includes(trimmed as (typeof NIGHT_INTAKE_PRESETS)[number]) && !bridgeSubmitted) {
      setBridgeQuestion(BRIDGE_QUESTIONS[trimmed] ?? null);
      return;
    }
    setBridgeQuestion(null);
    tryStartGuidanceFromUrl();
  }, [situation, bridgeSubmitted, search]);

  const handleBridgeSubmit = () => {
    const answer = bridgeAnswer.trim();
    const preset = situation.trim();
    if (!answer || !bridgeQuestion || !NIGHT_INTAKE_PRESETS.includes(preset as (typeof NIGHT_INTAKE_PRESETS)[number])) {
      return;
    }
    setBridgeSubmitted(true);
    guidanceStartedForRef.current = null;
    navigate(`/guidance?situation=${encodeURIComponent(`${preset} — ${answer}`)}`, { replace: true });
  };

  const handleBridgeKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBridgeSubmit();
    }
  };

  // Save guidance memory when Phase 2 completes (richest payload)
  useEffect(() => {
    if (!responseComplete || !situation.trim() || situation.trim().length < 8) return;
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    const firstResponse = assistantMessages[0]?.content;
    if (!firstResponse) return;
    postGuidanceMemory(situation.trim(), firstResponse, "complete");
  }, [responseComplete, situation, messages]);

  // Save memory from Phase 1 if user doesn't reach Phase 2
  useEffect(() => {
    if (!phase1Complete || !phase1Response?.trim() || phase2Started || phase1MemorySavedRef.current) return;
    if (!situation.trim() || situation.trim().length < 8) return;
    phase1MemorySavedRef.current = true;
    postGuidanceMemory(situation.trim(), phase1Response, "complete");
  }, [phase1Complete, phase1Response, phase2Started, situation]);


  // walk-today is now fired in parallel from startPhase2 — see fetchWalkToday below

  // Mark initial scroll as done — keep user at top so scripture is visible first
  useEffect(() => {
    if (!streamingText || isSending || hasScrolledInitial.current) return;
    hasScrolledInitial.current = true;
    // Do NOT scroll away from top — scripture verse should be the first thing they read
  }, [streamingText, isSending]);

  // Preload prayer blob into tts so "Pray This Aloud" plays instantly
  useEffect(() => {
    if (prayer && responseComplete) {
      tts.preload(prayer, "nova");
    }
  }, [prayer, responseComplete]);

  // Prewarm guidance response TTS so the "Hear this guidance" chain starts fast
  useEffect(() => {
    if (!responseComplete) return;
    const firstResponse = messages.find(m => m.role === "assistant")?.content;
    if (firstResponse) prewarmTTS(firstResponse, getUserVoice());
  }, [responseComplete]);

  // Witness Letter + Hold + Pattern — surface after completion path chosen on deep sessions
  useEffect(() => {
    if (!completionPath || !responseComplete || !situation.trim()) return;
    if (!isPhilipMode()) return;
    const userTurns = messages.filter(m => m.role === "user").length;
    const DEPTH_KEYWORDS = /grief|loss|died|death|shame|afraid|fear|doubt|faith|angry|alone|hurt|broken|exhaust|struggling|lost|sin|confess|marriage|divorce|child|son|daughter|prayer|waiting|don.t know/i;
    const situationIsDeep = situation.trim().length > 80 || DEPTH_KEYWORDS.test(situation);
    const convoIsDeep = userTurns >= 2 || messages.some(m => DEPTH_KEYWORDS.test(m.content));
    if (situationIsDeep || convoIsDeep) {
      const t1 = setTimeout(() => setShowWitnessLetter(true), 800);
      const t2 = setTimeout(() => setShowHoldCard(true), 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [completionPath, responseComplete, situation, messages]);

  // Pattern Philip — surface after 4+ conversations, once per session
  useEffect(() => {
    if (!completionPath || !responseComplete || !situation.trim()) return;
    if (!isPhilipMode()) return;
    const sessionId = getSessionId();
    if (!sessionId) return;
    // Fetch server-side conversation count to gate this
    fetch(`/api/guidance/weekly-allowance?sessionId=${encodeURIComponent(sessionId)}&isPro=${isProVerifiedLocally()}`)
      .then(r => r.ok ? r.json() : null)
      .then(() => {
        // Use the conversation count endpoint instead
        fetch(`/api/guidance/opening?sessionId=${encodeURIComponent(sessionId)}&_countOnly=1`)
          .catch(() => {});
      })
      .catch(() => {});
    // Gate on localStorage-tracked count (incremented at phase1 start server-side, mirrored via opening endpoint convCount)
    const storedCount = parseInt(sessionStorage.getItem("sp_guidance_conv_count") ?? "0", 10);
    if (storedCount >= 3) {
      const t = setTimeout(() => setShowPatternCard(true), 2000);
      return () => clearTimeout(t);
    }
  }, [completionPath, responseComplete, situation]);

  // Fetch contextual Unsplash photo once response lands
  useEffect(() => {
    if (!responseComplete || !situation.trim()) return;
    const cacheKey = `sp_photo_${situation.trim().slice(0, 80)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { try { setContextPhoto(JSON.parse(cached)); } catch {} return; }
    fetch("/api/unsplash/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: situation.trim(), sessionId: apiSessionExtras().sessionId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.url) {
          setContextPhoto(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      })
      .catch(() => {});
  }, [responseComplete]);

  // Progressive reveal — stage the content in after Phase 2 guidance lands (typed path only)
  useEffect(() => {
    if (!showPhase2Content || !responseComplete) return;
    if (voiceConversation) return;
    setRevealStage(1);
    const t1 = setTimeout(() => setRevealStage(s => Math.max(s, 2)), 3000);
    const t2 = setTimeout(() => setRevealStage(s => Math.max(s, 3)), 6000);
    const t3 = setTimeout(() => setRevealStage(s => Math.max(s, 4)), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showPhase2Content, responseComplete, voiceConversation]);

  const scheduleVoiceRevealStages = useCallback(() => {
    setRevealStage(1);
    const t1 = window.setTimeout(() => setRevealStage(s => Math.max(s, 2)), 2500);
    const t2 = window.setTimeout(() => setRevealStage(s => Math.max(s, 3)), 5500);
    const t3 = window.setTimeout(() => setRevealStage(s => Math.max(s, 4)), 9000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  const guidanceListenReady =
    !!verse &&
    !!prayer?.trim() &&
    !vpLoading;

  const startGuidanceListen = async () => {
    if (phase1Speaking || phase2Speaking || followUpSpeaking) return;
    if (ttsChain.playing || ttsChain.loading) {
      ttsChain.stop();
      setChainSection(null);
      return;
    }
    if (!canStartGuidanceChain()) {
      setShowListenUpgrade(true);
      return;
    }
    if (!guidanceListenReady) {
      toast({
        title: !prayer?.trim() || vpLoading ? "Prayer is still preparing" : "Scripture is still preparing",
        description: "Full listen plays Scripture, guidance, then prayer — one continuous flow. One moment.",
      });
      return;
    }
    const firstResponse = messages.find(m => m.role === "assistant")?.content ?? streamingText;
    if (!firstResponse) return;

    const sections: Array<{ key: string; text: string; voice?: string }> = [
      { key: "scripture", text: `${verseDisplay?.text ?? verse!.text}. ${verse!.reference}.` },
      { key: "guidance", text: firstResponse },
      { key: "prayer", text: prayer!.trim(), voice: "nova" },
    ];

    await ttsChain.playChain(
      sections,
      (_, key) => setChainSection(key ?? null),
      () => setChainSection(null),
      {
        chainScope: "guidance",
        onLimit: () => setShowListenUpgrade(true),
      },
    );
    setChainSection(null);
  };

  useEffect(() => {
    if (!guidanceListenReady || !responseComplete || listenFirstTriggeredRef.current) return;
    if (voiceConversation) return;
    const voiceTriggered = lastInputWasVoiceRef.current;
    const listenFirstOn = canUseListenFirstAuto() && getListenFirstPreference();
    if (!voiceTriggered && !listenFirstOn) return;
    listenFirstTriggeredRef.current = true;
    lastInputWasVoiceRef.current = false;
    const t = setTimeout(() => {
      void startGuidanceListen();
    }, 600);
    return () => clearTimeout(t);
  }, [guidanceListenReady, responseComplete]);

  // Scroll follow-up response into view as soon as it starts streaming
  useEffect(() => {
    if (!isSending || !streamingText) return;
    const followUpIndex = messages.filter(m => m.role === "user").length;
    if (followUpIndex <= hasScrolledFollowUp.current) return;
    hasScrolledFollowUp.current = followUpIndex;
    setTimeout(() => {
      latestResponseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [streamingText, isSending, messages]);

  const destroyHeartVoice = useCallback(() => {
    heartTakeYourTimeRef.current?.();
    heartTakeYourTimeRef.current = null;
    heartVoiceRef.current?.destroy();
    heartVoiceRef.current = null;
    setHeartListening(false);
    setHeartListenPhase("listening");
    setInterimTranscript("");
  }, []);

  const destroyPhase1Voice = useCallback(() => {
    phase1TakeYourTimeRef.current?.();
    phase1TakeYourTimeRef.current = null;
    phase1VoiceRef.current?.destroy();
    phase1VoiceRef.current = null;
    setPhase1Listening(false);
    setPhase1ListenPhase("listening");
    setPhase1Interim("");
  }, []);

  const stopHeartListening = useCallback((showContinue = true) => {
    const text = heartVoiceRef.current?.stop() ?? heartInput.trim();
    heartTakeYourTimeRef.current?.();
    heartTakeYourTimeRef.current = null;
    setHeartListening(false);
    setHeartListenPhase("listening");
    setInterimTranscript("");
    if (text) setHeartInput(text);
    if (showContinue && text.trim().length > 0) setHeartShowContinue(true);
    return text.trim();
  }, [heartInput]);

  const startHeartListening = useCallback((fromWelcome = false) => {
    if (heartVoiceRef.current?.isActive()) return;
    if (heartVoiceRef.current) {
      heartVoiceRef.current.destroy();
      heartVoiceRef.current = null;
    }
    if (!fromWelcome) greetingEngagedRef.current = true;
    cancelGreetingSpeakRef.current?.();
    cancelGreetingSpeakRef.current = null;
    setGreetingSpeaking(false);
    setHeartShowContinue(false);
    setHeartListenPhase("listening");

    const listener = createPatientVoiceListener({
      conversational: true,
      spokenPatienceBridge: false,
      autoSubmitSilenceMs: VOICE_SILENCE_ENTRY_MS,
      onTranscript: (final, interim) => {
        if (final) setHeartInput(final);
        setInterimTranscript(interim);
      },
      onPhaseChange: setHeartListenPhase,
      onAutoSubmit: () => {
        if (heartSubmittingRef.current || processingBridge) return;
        const preview = heartVoiceRef.current?.getPreview() ?? heartInput;
        submitHeartEntryRef.current(preview, true);
      },
    });
    if (!listener) return;
    heartVoiceRef.current = listener;
    listener.start();
    setHeartHasRecording(true);
    setHeartListening(true);
  }, []);

  const startHeartListeningRef = useRef(startHeartListening);
  startHeartListeningRef.current = startHeartListening;

  const toggleHeartVoice = () => {
    if (heartListening) {
      const preview = heartVoiceRef.current?.getPreview() ?? heartInput;
      const hasAudio = heartVoiceRef.current?.hasRecordedAudio();
      if (preview.trim().length >= GUIDANCE_INPUT_MIN || hasAudio) {
        submitHeartEntryRef.current(preview, true);
      } else {
        stopHeartListening(false);
      }
      return;
    }
    startHeartListening(false);
  };

  const stopPhase1Listening = useCallback((showContinue = true) => {
    const text = phase1VoiceRef.current?.stop() ?? phase1UserReply.trim();
    phase1TakeYourTimeRef.current?.();
    phase1TakeYourTimeRef.current = null;
    setPhase1Listening(false);
    setPhase1ListenPhase("listening");
    setPhase1Interim("");
    if (text) setPhase1UserReply(text);
    if (showContinue && text.trim().length > 0) setPhase1ShowContinue(true);
    return text.trim();
  }, [phase1UserReply]);

  const startPhase1Listening = useCallback(() => {
    if (phase1VoiceRef.current?.isActive()) return;
    if (phase1VoiceRef.current) {
      phase1VoiceRef.current.destroy();
      phase1VoiceRef.current = null;
    }
    setPhase1ShowContinue(false);
    setPhase1ListenPhase("listening");

    const listener = createPatientVoiceListener({
      conversational: true,
      autoSubmitSilenceMs: VOICE_SILENCE_PHASE1_MS,
      onTranscript: (final, interim) => {
        if (final) setPhase1UserReply(final);
        setPhase1Interim(interim);
      },
      onPhaseChange: setPhase1ListenPhase,
      onTakeYourTime: () => {
        if (phase1TakeYourTimeRef.current) return;
        phase1TakeYourTimeRef.current = speakTakeYourTimeBridge();
      },
      onAutoSubmit: () => {
        if (phase1SubmittingRef.current || phase2Loading || processingBridge || !phase1Response) return;
        handlePhase1ContinueRef.current(undefined, true);
      },
    });
    if (!listener) return;
    phase1VoiceRef.current = listener;
    listener.start();
    setPhase1Listening(true);
  }, []);

  const togglePhase1Voice = () => {
    if (phase1Listening) {
      const preview = phase1VoiceRef.current?.getPreview() ?? phase1UserReply;
      const hasAudio = phase1VoiceRef.current?.hasRecordedAudio();
      if (preview.trim().length >= GUIDANCE_INPUT_MIN || hasAudio) {
        handlePhase1ContinueRef.current(preview, true);
      } else {
        stopPhase1Listening(false);
      }
      return;
    }
    startPhase1Listening();
  };

  const destroyFollowUpVoice = useCallback(() => {
    followUpTakeYourTimeRef.current?.();
    followUpTakeYourTimeRef.current = null;
    followUpVoiceRef.current?.destroy();
    followUpVoiceRef.current = null;
    setFollowUpListening(false);
    setFollowUpListenPhase("listening");
  }, []);

  useEffect(() => () => {
    destroyHeartVoice();
    destroyPhase1Voice();
    destroyFollowUpVoice();
  }, [destroyHeartVoice, destroyPhase1Voice, destroyFollowUpVoice]);

  const startFollowUpListening = useCallback(() => {
    if (followUpVoiceRef.current?.isActive()) return;
    if (followUpSubmittingRef.current || isSending || processingBridge) return;
    if (followUpVoiceRef.current) {
      followUpVoiceRef.current.destroy();
      followUpVoiceRef.current = null;
    }
    setFollowUpListenPhase("listening");

    const listener = createPatientVoiceListener({
      conversational: true,
      autoSubmitSilenceMs: VOICE_SILENCE_FOLLOWUP_MS,
      onTranscript: (final, interim) => {
        const display = (final + (interim ? ` ${interim}` : "")).trim();
        if (display) setFollowUp(display);
      },
      onPhaseChange: setFollowUpListenPhase,
      onTakeYourTime: () => {
        if (followUpTakeYourTimeRef.current) return;
        followUpTakeYourTimeRef.current = speakTakeYourTimeBridge();
      },
      onAutoSubmit: () => {
        if (followUpSubmittingRef.current || isSending || processingBridge) return;
        submitFollowUpRef.current(true);
      },
    });
    if (!listener) return;
    followUpVoiceRef.current = listener;
    listener.start();
    setFollowUpListening(true);
  }, [isSending, processingBridge]);

  const startFollowUpListeningRef = useRef(startFollowUpListening);
  startFollowUpListeningRef.current = startFollowUpListening;

  const stopFollowUpListening = useCallback(() => {
    const text = followUpVoiceRef.current?.stop() ?? followUp.trim();
    followUpTakeYourTimeRef.current?.();
    followUpTakeYourTimeRef.current = null;
    setFollowUpListening(false);
    setFollowUpListenPhase("listening");
    if (text) setFollowUp(text);
    return text.trim();
  }, [followUp]);

  const toggleFollowUpVoice = () => {
    if (followUpListening) {
      const preview = followUpVoiceRef.current?.getPreview() ?? followUp;
      const hasAudio = followUpVoiceRef.current?.hasRecordedAudio();
      if (preview.trim().length >= GUIDANCE_INPUT_MIN || hasAudio) {
        submitFollowUpRef.current(true, preview);
      } else {
        stopFollowUpListening();
      }
      return;
    }
    startFollowUpListening();
  };

  // Stay path — auto-open follow-up mic for voice sessions
  useEffect(() => {
    if (!voiceConversation || completionPath !== "stay" || !hasSpeechSupport) return;
    if (stayMicStartedRef.current || followUpListening || followUpSubmittingRef.current) return;
    if (isSending || processingBridge || followUpSpeaking) return;
    stayMicStartedRef.current = true;
    const t = window.setTimeout(() => {
      startFollowUpListeningRef.current();
    }, VOICE_MIC_HANDOFF_FOLLOWUP_MS);
    return () => window.clearTimeout(t);
  }, [voiceConversation, completionPath, hasSpeechSupport, followUpListening, isSending, processingBridge, followUpSpeaking]);

  // Follow-up turns — Philip speaks; mic reopens for voice sessions
  useEffect(() => {
    if (!voiceConversation || !responseComplete || completionPath !== "stay") return;
    const assistantMsgs = messages.filter((m) => m.role === "assistant");
    if (assistantMsgs.length <= 1) return;
    const text = assistantMsgs[assistantMsgs.length - 1]?.content?.trim();
    if (!text) return;
    if (followUpSpokenRef.current === text) return;
    followUpSpokenRef.current = text;
    destroyFollowUpVoice();
    stayMicStartedRef.current = false;

    let cancelled = false;
    let cancelSpeak: (() => void) | null = null;

    // Consume prefetched blob — started the moment follow-up streaming ended
    const blobPromise = followUpTtsBlobRef.current;
    followUpTtsBlobRef.current = null;

    (async () => {
      const prefetchedBlob = blobPromise ? await blobPromise : null;
      if (cancelled) return;
      cancelSpeak = speakShepherdWithMicHandoff(cleanResponse(text), {
        prefetchedBlob,
        onStart: () => setFollowUpSpeaking(true),
        onSpeakingEnd: () => setFollowUpSpeaking(false),
        handoffDelayMs: VOICE_MIC_HANDOFF_FOLLOWUP_MS,
        onHandoff: () => {
          if (!hasSpeechSupport || isSending || processingBridge) return;
          startFollowUpListeningRef.current();
        },
      });
    })();

    return () => {
      cancelled = true;
      cancelSpeak?.();
      setFollowUpSpeaking(false);
    };
  }, [messages, responseComplete, voiceConversation, completionPath, hasSpeechSupport, isSending, processingBridge, destroyFollowUpVoice]);

  // Fetch Philip's dynamic opening line from the server (runs once per entry when no situation yet)
  useEffect(() => {
    if (situation.trim() || !witnessReady) return;
    dynamicOpeningRef.current = null;
    greetingBlobRef.current = null;
    const sessionId = getSessionId();
    const name = getUserName() ?? "";
    const url = `/api/guidance/opening?sessionId=${encodeURIComponent(sessionId ?? "")}&userName=${encodeURIComponent(name)}`;
    let cancelled = false;
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { line: string; convCount?: number } | null) => {
        if (!cancelled && data?.line) {
          dynamicOpeningRef.current = data.line;
          greetingTextRef.current = data.line;
          prefetchShepherdTTS(data.line, isProVerifiedLocally()).then((blob) => {
            if (!cancelled) greetingBlobRef.current = blob;
          });
        }
        // Store conversation count for Pattern Philip gate
        if (data?.convCount != null) {
          try { sessionStorage.setItem("sp_guidance_conv_count", String(data.convCount)); } catch { /* noop */ }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [situation, witnessReady]);

  // Solo mode — open mic silently without Philip
  useEffect(() => {
    if (situation.trim() || !witnessReady || !hasSpeechSupport) return;
    if (!isSoloMode()) return;
    if (greetingEngagedRef.current || autoMicStartedRef.current) return;
    if (heartListening || heartSubmittingRef.current) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled || greetingEngagedRef.current || autoMicStartedRef.current) return;
      autoMicStartedRef.current = true;
      startHeartListeningRef.current(false);
    }, 800);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [situation, witnessReady, hasSpeechSupport, heartListening]);

  // Philip speaks first — dynamic opening → auto-mic
  useEffect(() => {
    if (situation.trim() || !witnessReady) return;
    if (!isPhilipMode()) return;
    if (greetingEngagedRef.current || autoMicStartedRef.current) return;
    if (heartListening || heartSubmittingRef.current || processingBridge) return;

    let cancelled = false;
    let dwellTimer: number | undefined;
    let autoMicTimer: number | undefined;

    const scheduleAutoMic = (withVoice: boolean) => {
      if (cancelled || greetingEngagedRef.current || autoMicStartedRef.current || !hasSpeechSupport) return;
      autoMicStartedRef.current = true;
      autoMicTimer = window.setTimeout(() => {
        if (!cancelled && !greetingEngagedRef.current) startHeartListeningRef.current(withVoice);
      }, 400);
    };

    const siriListenPending = sessionStorage.getItem("sp_guidance_siri_listen") === "1";

    dwellTimer = window.setTimeout(() => {
      if (cancelled || greetingEngagedRef.current) return;
      if (document.visibilityState === "hidden") {
        scheduleAutoMic(false);
        return;
      }

      const reentryLine = getCrisisReentryLine();
      const fallback = reentryLine
        ? reentryLine
        : buildShepherdGreeting(getUserName(), isFirstVisit, witnessLetterRef.current, null);
      const line = dynamicOpeningRef.current ?? greetingTextRef.current ?? fallback;

      cancelGreetingSpeakRef.current = speakShepherdLine(line, {
        prefetchedBlob: greetingBlobRef.current,
        isPro: isProVerifiedLocally(),
        onStart: () => {
          markShepherdGreetingPlayed();
          setGreetingSpeaking(true);
          setGreetingFallbackText(null);
          try { sessionStorage.removeItem("sp_guidance_siri_listen"); } catch { /* noop */ }
        },
        onFail: () => {
          setGreetingFallbackText(line);
          scheduleAutoMic(false);
        },
        onEnd: () => {
          setGreetingSpeaking(false);
          cancelGreetingSpeakRef.current = null;
          scheduleAutoMic(true);
        },
      });
    }, siriListenPending ? 600 : 1400);

    return () => {
      cancelled = true;
      if (dwellTimer) window.clearTimeout(dwellTimer);
      if (autoMicTimer) window.clearTimeout(autoMicTimer);
      cancelGreetingSpeakRef.current?.();
      cancelGreetingSpeakRef.current = null;
      setGreetingSpeaking(false);
    };
  }, [isFirstVisit, situation, witnessReady, hasSpeechSupport, heartListening, processingBridge]);

  // Phase 1 — speak first reflection for voice sessions; mic reopens when Philip finishes
  useEffect(() => {
    if (!phase1Complete || !phase1Response?.trim()) return;
    if (!lastInputWasVoiceRef.current) return;
    const key = phase1Response.trim();
    if (phase1SpokenRef.current === key) return;
    phase1SpokenRef.current = key;
    destroyPhase1Voice();
    const spokenText = cleanResponse(phase1Response);
    let cancelled = false;

    if (isPhilipMode()) {
      // WebSocket streaming path — audio starts playing before stream ends
      philipStream.speak(spokenText, {
        onStart: () => { if (!cancelled) setPhase1Speaking(true); },
        onEnd: () => {
          if (cancelled) return;
          setPhase1Speaking(false);
          setPhase1SpeechDone(true);
          window.setTimeout(() => {
            if (!cancelled && hasSpeechSupport && !phase2Started && !showPhase1TypeFallback) {
              startPhase1Listening();
            }
          }, 800);
        },
        onError: () => {
          if (cancelled) return;
          // Fallback to blob TTS if WebSocket fails
          const blobPromise = phase1TtsBlobRef.current;
          phase1TtsBlobRef.current = null;
          (async () => {
            const prefetchedBlob = blobPromise ? await blobPromise : null;
            if (cancelled) return;
            speakShepherdWithMicHandoff(spokenText, {
              prefetchedBlob,
              onStart: () => setPhase1Speaking(true),
              onSpeakingEnd: () => { setPhase1Speaking(false); setPhase1SpeechDone(true); },
              onHandoff: () => { if (!hasSpeechSupport || phase2Started || showPhase1TypeFallback) return; startPhase1Listening(); },
            });
          })();
        },
      });
    } else {
      // Solo mode — blob TTS path (no Philip WebSocket)
      const blobPromise = phase1TtsBlobRef.current;
      phase1TtsBlobRef.current = null;
      let cancelSpeak: (() => void) | null = null;
      (async () => {
        const prefetchedBlob = blobPromise ? await blobPromise : null;
        if (cancelled) return;
        cancelSpeak = speakShepherdWithMicHandoff(spokenText, {
          prefetchedBlob,
          onStart: () => setPhase1Speaking(true),
          onSpeakingEnd: () => { setPhase1Speaking(false); setPhase1SpeechDone(true); },
          onHandoff: () => { if (!hasSpeechSupport || phase2Started || showPhase1TypeFallback) return; startPhase1Listening(); },
        });
      })();
    }

    return () => {
      cancelled = true;
      if (isPhilipMode()) philipStream.interrupt();
      // cancelSpeak handled inside async block for solo path
      setPhase1Speaking(false);
    };
  }, [phase1Complete, phase1Response, hasSpeechSupport, phase2Started, showPhase1TypeFallback, startPhase1Listening, destroyPhase1Voice, philipStream]);

  // Phase 2 — Philip speaks "What I'm hearing" for voice sessions before cards appear
  useEffect(() => {
    if (!responseComplete || !voiceConversation || showPhase1TypeFallback) return;
    const text = messages.find(m => m.role === "assistant")?.content?.trim();
    if (!text) return;
    const key = text;
    if (phase2SpokenRef.current === key) return;
    phase2SpokenRef.current = key;
    setPhase2SpeechDone(false);

    let cancelled = false;
    let cancelSpeak: (() => void) | null = null;
    let clearRevealTimers: (() => void) | undefined;

    // Consume prefetched blob — started the moment streaming ended
    const blobPromise = phase2TtsBlobRef.current;
    phase2TtsBlobRef.current = null;

    (async () => {
      const prefetchedBlob = blobPromise ? await blobPromise : null;
      if (cancelled) return;
      cancelSpeak = speakShepherdLine(cleanResponse(text), {
        prefetchedBlob,
        onStart: () => setPhase2Speaking(true),
        onEnd: () => {
          setPhase2Speaking(false);
          setPhase2SpeechDone(true);
          clearRevealTimers = scheduleVoiceRevealStages();
        },
        onFail: () => {
          setPhase2Speaking(false);
          setPhase2SpeechDone(true);
          clearRevealTimers = scheduleVoiceRevealStages();
        },
      });
    })();

    return () => {
      cancelled = true;
      cancelSpeak?.();
      clearRevealTimers?.();
      setPhase2Speaking(false);
    };
  }, [responseComplete, voiceConversation, showPhase1TypeFallback, messages, scheduleVoiceRevealStages]);

  // Session send-off — spoken closure
  useEffect(() => {
    if (!sendOffText?.trim()) return;
    if (sendOffSpokenRef.current === sendOffText) return;
    sendOffSpokenRef.current = sendOffText;
    const cancel = speakShepherdLine(sendOffText);
    return () => cancel();
  }, [sendOffText]);

  useEffect(() => {
    if (!responseComplete || completionPath !== "carry" || recapFetchedRef.current) return;
    const reflection = messages.find((m) => m.role === "assistant")?.content?.trim();
    if (!situation.trim() || !reflection) return;
    recapFetchedRef.current = true;
    setRecapLoading(true);
    void fetchGuidanceRecap({
      situation,
      reflection,
      verseReference: verse?.reference ?? null,
      prayer: prayer ?? null,
    })
      .then((r) => {
        if (r) setSessionRecap(r);
      })
      .finally(() => setRecapLoading(false));
  }, [responseComplete, completionPath, situation, messages, verse, prayer]);

  const submitHeartEntry = (text: string, fromVoice: boolean) => {
    if (heartSubmittingRef.current) return;
    const listener = heartVoiceRef.current;
    let trimmed = clampGuidanceInput(text);

    if (listener?.isActive()) {
      const stopped = listener.stop();
      if (stopped) trimmed = clampGuidanceInput(stopped);
      setHeartInput(stopped || trimmed);
    }

    if (!trimmed && !(fromVoice && listener?.hasRecordedAudio())) {
      toast({
        description: "We didn't catch that — keep talking when the mic opens.",
        variant: "destructive",
      });
      return;
    }

    heartSubmittingRef.current = true;
    lastInputWasVoiceRef.current = fromVoice;
    if (fromVoice) setVoiceConversation(true);
    setHeartShowContinue(false);
    setProcessingBridge(true);
    setIsReflecting(true);

    // Speak audio bridge immediately so there's no dead silence while Whisper + phase1 run.
    // Solo mode: no Philip voice.
    if (fromVoice && isPhilipMode()) speakShepherdLine(PROCESSING_BRIDGE);

    void (async () => {
      let finalText = trimmed;
      try {
        const previewWords = trimmed.split(/\s+/).filter(Boolean).length;
        const fastHandoff = fromVoice && listener && previewWords >= 20;

        if (fastHandoff) {
          heartVoiceRef.current = null;
          setHeartListening(false);
          setHeartListenPhase("listening");
          beginGuidanceEntry(trimmed);
          heartSubmittingRef.current = false;
          setProcessingBridge(false);
          void listener.finalizeTranscript().finally(() => listener.destroy());
          return;
        }

        const refined = fromVoice && listener
          ? await listener.finalizeTranscript()
          : trimmed;
        if (refined.trim()) finalText = clampGuidanceInput(refined);
      } catch {
        /* use preview text */
      } finally {
        if (heartSubmittingRef.current === false) return;
        destroyHeartVoice();
        listener?.destroy();
        setProcessingBridge(false);
        if (!finalText.trim()) {
          heartSubmittingRef.current = false;
          setIsReflecting(false);
          toast({
            description: "We couldn't hear enough to respond — please try again.",
            variant: "destructive",
          });
          return;
        }
        beginGuidanceEntry(finalText);
        heartSubmittingRef.current = false;
      }
    })();
  };

  const submitHeartEntryRef = useRef(submitHeartEntry);
  submitHeartEntryRef.current = submitHeartEntry;

  const handleHeartSubmit = () => {
    const text = clampGuidanceInput(heartInput);
    if (!isGuidanceInputValid(text)) {
      toast({
        description: `Share at least ${GUIDANCE_INPUT_MIN} characters (up to ${GUIDANCE_INPUT_MAX}).`,
        variant: "destructive",
      });
      return;
    }
    submitHeartEntry(text, false);
  };

  const handlePhase1Continue = (textOverride?: string, fromVoiceOverride?: boolean) => {
    if (phase1SubmittingRef.current || phase2Loading || !phase1Response || phase2Started) return;
    const listener = phase1VoiceRef.current;
    let reply = clampGuidanceInput(
      textOverride ?? phase1UserReply ?? listener?.getPreview() ?? "",
    );

    if (listener?.isActive()) {
      const stopped = listener.stop();
      if (stopped) reply = clampGuidanceInput(stopped);
      setPhase1UserReply(stopped || reply);
    }

    if (!reply && !(listener?.hasRecordedAudio())) return;

    phase1SubmittingRef.current = true;
    const fromVoice = fromVoiceOverride ?? (!showPhase1TypeFallback && textOverride === undefined);
    lastInputWasVoiceRef.current = fromVoice;
    if (fromVoice) setVoiceConversation(true);
    setProcessingBridge(true);
    setIsReflecting(true);

    void (async () => {
      try {
        const refined = fromVoice && listener
          ? await listener.finalizeTranscript()
          : reply;
        if (refined.trim()) reply = clampGuidanceInput(refined);
      } catch {
        /* use preview */
      } finally {
        destroyPhase1Voice();
        listener?.destroy();
        setPhase1UserReply(reply);
        setProcessingBridge(false);
        if (!reply.trim()) {
          phase1SubmittingRef.current = false;
          setIsReflecting(false);
          toast({
            description: "We couldn't hear enough — keep talking when the mic opens.",
            variant: "destructive",
          });
          return;
        }
        setPhase2Loading(true);
        setPhase2Started(true);
        setPhase1ShowContinue(false);
        setPhase1UserReplySubmitted(reply);
        setConversationPhase(2);
        setPhase2SpeechDone(false);
        phase2SpokenRef.current = null;
        const initialUserMsg: Message = { role: "user", content: situation };
        startPhase2(reply);
        await streamResponse([initialUserMsg], undefined, {
          phase1Response,
          phase1UserReply: reply,
        });
        setIsReflecting(false);
        setPhase2Loading(false);
        phase1SubmittingRef.current = false;
      }
    })();
  };

  const handlePhase1ContinueRef = useRef(handlePhase1Continue);
  handlePhase1ContinueRef.current = handlePhase1Continue;

  const handleHeartKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleHeartSubmit();
    }
  };

  const handlePhase1Skip = async () => {
    if (phase2Loading || !phase1Response || phase2Started) return;
    destroyPhase1Voice();
    setPhase2Loading(true);
    setPhase2Started(true);
    setConversationPhase(2);
    setIsReflecting(true);
    setTimeout(() => setIsReflecting(false), 700);
    startPhase2(null);
    const initialUserMsg: Message = { role: "user", content: situation };
    await streamResponse([initialUserMsg]);
    setPhase2Loading(false);
  };

  const handlePhase1TypedSubmit = () => {
    const text = clampGuidanceInput(phase1UserReply);
    if (!isGuidanceInputValid(text)) {
      toast({
        description: `Share at least ${GUIDANCE_INPUT_MIN} characters (up to ${GUIDANCE_INPUT_MAX}).`,
        variant: "destructive",
      });
      return;
    }
    handlePhase1Continue(text);
  };

  const handlePhase1KeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showPhase1TypeFallback) handlePhase1TypedSubmit();
    }
  };

  const submitFollowUp = (fromVoice: boolean, textOverride?: string) => {
    if (followUpSubmittingRef.current || isSending) return;
    const listener = followUpVoiceRef.current;
    let text = clampGuidanceInput(textOverride ?? followUp ?? listener?.getPreview() ?? "");

    if (listener?.isActive()) {
      const stopped = listener.stop();
      if (stopped) text = clampGuidanceInput(stopped);
      setFollowUp(stopped || text);
    }

    if (!text && !(fromVoice && listener?.hasRecordedAudio())) {
      toast({
        description: "We didn't catch that — keep talking when the mic opens.",
        variant: "destructive",
      });
      return;
    }

    followUpSubmittingRef.current = true;
    lastInputWasVoiceRef.current = fromVoice;
    if (fromVoice) setVoiceConversation(true);
    setFollowUp("");
    setProcessingBridge(true);
    setIsReflecting(true);

    void (async () => {
      try {
        const refined = fromVoice && listener
          ? await listener.finalizeTranscript()
          : text;
        if (refined.trim()) text = clampGuidanceInput(refined);
      } catch {
        /* use preview */
      } finally {
        destroyFollowUpVoice();
        listener?.destroy();
        setProcessingBridge(false);
        if (!text.trim()) {
          followUpSubmittingRef.current = false;
          setIsReflecting(false);
          toast({
            description: "We couldn't hear enough — keep talking when the mic opens.",
            variant: "destructive",
          });
          return;
        }
        if (!canUseAi()) {
          setShowAiPause(true);
          followUpSubmittingRef.current = false;
          setIsReflecting(false);
          return;
        }
        setIsSending(true);
        setRevealStage((s) => Math.max(s, 4));
        const newUserMsg: Message = { role: "user", content: text };
        const updated = [...messages, newUserMsg];
        setMessages(updated);
        await streamResponse(updated, undefined, undefined, { isFollowUp: true });
        setIsSending(false);
        setIsReflecting(false);
        followUpSubmittingRef.current = false;
      }
    })();
  };

  submitFollowUpRef.current = submitFollowUp;

  const handleSend = async () => {
    const text = followUp.trim();
    if (!text || isSending || followUpSubmittingRef.current) return;
    if (!canUseAi()) { setShowAiPause(true); return; }
    destroyFollowUpVoice();
    setFollowUp("");
    setIsSending(true);
    setIsReflecting(true);
    setRevealStage(s => Math.max(s, 4));
    setTimeout(() => setIsReflecting(false), 700);
    const newUserMsg: Message = { role: "user", content: text };
    const updated = [...messages, newUserMsg];
    setMessages(updated);
    await streamResponse(updated, undefined, undefined, { isFollowUp: true });
    setIsSending(false);
    setTimeout(() => {
      (window.innerWidth < 640 ? floatRef.current : inputRef.current)?.focus();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const beginJourney = () => {
    navigate(`/understand?situation=${encodeURIComponent(situation)}`);
  };

  const savePrayerToJournal = async () => {
    if (!prayer || prayerSaved) return;
    try {
      await apiRequest("POST", "/api/journal", {
        sessionId: getSessionId(),
        type: "prayer",
        title: "A Prayer for My Moment",
        content: prayer,
      });
      setPrayerSaved(true);
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast(journalSavedToast(() => navigate("/journal")));
    } catch {
      toast({ title: "Couldn't save to journal", description: "Please try again.", variant: "destructive" });
    }
  };

  const assistantMessages = messages.filter(m => m.role === "assistant");

  // Skip initial user message AND first AI response — only follow-up exchanges go here
  const conversationThread = messages.slice(2);

  return (
    <>
      <AnimatePresence>
        {voiceConversation && (
          <PhilipVoiceScreen
            state={philipVoiceState}
            speakingText={
              phase1Speaking
                ? (phase1Response ?? undefined)
                : phase2Speaking
                ? (messages[messages.length - 1]?.content ?? undefined)
                : undefined
            }
            caption={
              philipVoiceState === "listening"
                ? undefined
                : philipVoiceState === "processing"
                ? undefined
                : undefined
            }
          />
        )}
      </AnimatePresence>
      <CoachConsentModal
        open={coachConsentOpen}
        onAccept={() => {
          grantCoachConsentThisSession();
          setCoachConsentOpen(false);
          applyGuidanceMode("coach", pendingCoachRegenerate);
          setPendingCoachRegenerate(false);
        }}
        onDecline={() => {
          setCoachConsentOpen(false);
          setPendingCoachRegenerate(false);
        }}
      />
      <main className="min-h-screen pb-32 bg-background">
        {/* Hero image must start at y=0 (no sp-app-top-clearance on main) — matches For You / ThresholdHero */}
        <div
          className={`transition-all duration-700 ease-in-out ${
            !situation && !streamingText
              ? "relative w-full overflow-hidden bg-[#09031e] h-[48vh] min-h-[300px] sm:h-[50vh] sm:min-h-[320px] max-h-[480px]"
              : "relative sp-app-top-clearance pt-2 sm:pt-3 overflow-hidden"
          }`}
          data-testid="guidance-hero"
        >
          {!situation && !streamingText && (
            <>
              {heroImageSrc && (
                <img
                  src={heroImageSrc}
                  alt=""
                  aria-hidden="true"
                  loading="eager"
                  // @ts-ignore - valid HTML attribute supported by browsers
                  fetchpriority="high"
                  className="absolute inset-0 w-full h-full object-cover object-[center_28%]"
                  style={{ filter: "brightness(0.82) saturate(1.15)", transform: "scale(1.08)", transformOrigin: "50% top" }}
                  onError={(e) => {
                    const el = e.currentTarget;
                    const fallbacks = heroFallbacksRef.current;
                    const idx = fallbacks.findIndex((u) => el.src.includes(u.split("?")[0]!));
                    const next = fallbacks[idx + 1];
                    if (next && !el.src.includes(next.split("?")[0]!)) el.src = next;
                  }}
                />
              )}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(8,4,18,0.72) 0%, rgba(8,4,18,0.28) 14%, rgba(8,4,18,0) 38%, rgba(9,3,30,0.55) 78%, hsl(var(--background)) 100%)",
                }}
              />
            </>
          )}

          <AnimatePresence mode="wait">
            {!situation && !streamingText ? (
              <motion.div
                key="hero-expanded"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-5 pb-6 pt-[calc(env(safe-area-inset-top,0px)+3.5rem)]"
              >
                <h1
                  className="text-[2rem] sm:text-[2.5rem] leading-[1.18] text-white text-balance"
                  style={{
                    fontFamily: "var(--font-serif)",
                    textShadow: "0 2px 20px rgba(0,0,0,0.6)",
                  }}
                >
                  {getHeroHeading(situation, isFirstVisit)}
                </h1>
              </motion.div>
            ) : (
              <motion.div
                key="hero-compact"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 max-w-2xl mx-auto px-3 sm:px-5 pt-2 pb-7"
                style={{ background: "linear-gradient(180deg, hsl(265 60% 8% / 0.85) 0%, transparent 100%)" }}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/70 leading-none mb-1.5 pl-0">
                  Talk It Through
                </p>
                <h1 className="text-[22px] font-extrabold text-foreground leading-tight tracking-tight">
                  {getHeroHeadingCompact(situation, isFirstVisit)}
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="max-w-2xl mx-auto px-3 sm:px-4 -mt-5 relative z-20 pt-1 pb-8">

          {/* Header — pastoral welcome */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >

            <AnimatePresence>
              {!responseComplete && !streamingText && !situation && (
                <motion.div
                  key="burden-intro"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className="w-full rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-950/90 via-[#1a0a3e]/85 to-black/50 backdrop-blur-md p-4 sm:p-5 shadow-2xl shadow-violet-900/25 mb-6 focus-within:ring-2 focus-within:ring-violet-400/35 transition-shadow"
                    data-testid="card-guidance-entry"
                  >
                    {showPhilipDisclaimer && (
                      <p
                        className="mb-4 text-[13px] text-white/50 leading-relaxed text-center px-1"
                        data-testid="text-guidance-philip-disclaimer"
                      >
                        {PHILIP_DISCLAIMER}
                      </p>
                    )}
                    {greetingFallbackText && (
                      <div
                        className="mb-4 rounded-xl border border-violet-400/25 bg-violet-950/40 px-4 py-3 text-center"
                        data-testid="text-guidance-greeting-fallback"
                      >
                        <p className="text-[13px] text-white/55 leading-relaxed">
                          Something&apos;s quiet on my end right now — read it here.
                        </p>
                        <p
                          className="mt-2 text-[15px] leading-relaxed text-white/85"
                          style={{ fontFamily: "'Georgia', serif" }}
                        >
                          {greetingFallbackText}
                        </p>
                      </div>
                    )}
                    {/* Voice-first entry — mic opens automatically after spoken welcome */}
                    {hasSpeechSupport && (
                      <div className="flex flex-col items-center mb-4">
                        <motion.button
                          type="button"
                          onClick={toggleHeartVoice}
                          aria-label={heartListening ? "Done speaking — send to Philip" : "Start speaking to Philip"}
                          aria-live="polite"
                          data-testid="button-guidance-heart-voice"
                          className="relative flex items-center justify-center w-28 h-28 rounded-full cursor-pointer touch-manipulation"
                          animate={heartListening ? {
                            boxShadow: [
                              "0 0 0 0px rgba(239,68,68,0.0), 0 0 32px 8px rgba(239,68,68,0.35)",
                              "0 0 0 18px rgba(239,68,68,0.0), 0 0 48px 16px rgba(239,68,68,0.5)",
                              "0 0 0 0px rgba(239,68,68,0.0), 0 0 32px 8px rgba(239,68,68,0.35)",
                            ],
                          } : greetingSpeaking ? {
                            boxShadow: "0 0 28px 6px rgba(139,92,246,0.28)",
                          } : {
                            boxShadow: "0 0 24px 4px rgba(139,92,246,0.18)",
                          }}
                          transition={heartListening ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
                          style={{
                            background: heartListening
                              ? "radial-gradient(circle, rgba(239,68,68,0.30) 0%, rgba(180,20,20,0.14) 100%)"
                              : "radial-gradient(circle, rgba(139,92,246,0.32) 0%, rgba(109,40,217,0.14) 100%)",
                            border: heartListening
                              ? "2px solid rgba(239,68,68,0.70)"
                              : "2px solid rgba(139,92,246,0.50)",
                          }}
                        >
                          {heartListening && (
                            <span className="absolute inset-0 rounded-full animate-ping"
                              style={{ background: "rgba(239,68,68,0.14)" }} />
                          )}
                          <Mic className={`w-10 h-10 relative z-10 ${heartListening ? "text-red-400" : "text-violet-300"}`} />
                        </motion.button>
                        <p className="mt-3 text-[13px] font-medium text-white/65 text-center">
                          {processingBridge
                            ? "Philip is with you…"
                            : heartListening
                              ? heartListenPhase === "thinking"
                                ? "Philip is with what you shared…"
                                : "Philip is listening…"
                              : greetingSpeaking
                                ? "…"
                                : isReturnEntry
                                  ? "Good to have you back — speak when you're ready"
                                  : "Speak when you're ready"}
                        </p>
                        {heartListening && (interimTranscript || heartInput) && (
                          <p className="mt-2 text-[14px] text-white/45 italic text-center max-w-[280px] leading-snug">
                            {interimTranscript || heartInput}
                          </p>
                        )}
                      </div>
                    )}

                    {hasSpeechSupport && !showHeartTypeFallback && (
                      <button
                        type="button"
                        onClick={() => {
                          destroyHeartVoice();
                          setShowHeartTypeFallback(true);
                        }}
                        className="mb-3 w-full text-center text-[12px] text-white/35 hover:text-white/55 transition-colors"
                        data-testid="link-guidance-type-instead"
                      >
                        Type instead
                      </button>
                    )}

                    {showHeartTypeFallback && (
                      <>
                        <label className="sr-only" htmlFor="input-guidance-heart">
                          What&apos;s on your heart
                        </label>
                        <textarea
                          id="input-guidance-heart"
                          value={heartInput}
                          onChange={(e) => setHeartInput(e.target.value.slice(0, GUIDANCE_INPUT_MAX))}
                          onKeyDown={handleHeartKeyDown}
                          spellCheck
                          autoCapitalize="sentences"
                          autoCorrect="on"
                          maxLength={GUIDANCE_INPUT_MAX}
                          placeholder={GUIDANCE_PLACEHOLDERS[placeholderIdx]}
                          rows={3}
                          data-testid="input-guidance-heart"
                          className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.06] px-3.5 sm:px-4 py-3 text-[16px] text-white placeholder:text-white/40 outline-none leading-relaxed focus:ring-2 focus:ring-violet-400/45 focus:border-violet-400/30"
                        />
                        <p className="mt-1 text-[11px] text-white/35 text-right">
                          {heartInput.length}/{GUIDANCE_INPUT_MAX}
                        </p>
                        <button
                          type="button"
                          onClick={handleHeartSubmit}
                          disabled={!isGuidanceInputValid(heartInput) || processingBridge}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-white bg-gradient-to-r from-primary via-violet-600 to-violet-700 shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                        >
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {!hasSpeechSupport && (
                      <>
                        <label className="sr-only" htmlFor="input-guidance-heart">
                          What&apos;s on your heart
                        </label>
                        <textarea
                          id="input-guidance-heart"
                          value={heartInput}
                          onChange={(e) => setHeartInput(e.target.value.slice(0, GUIDANCE_INPUT_MAX))}
                          onKeyDown={handleHeartKeyDown}
                          spellCheck
                          autoCapitalize="sentences"
                          autoCorrect="on"
                          maxLength={GUIDANCE_INPUT_MAX}
                          placeholder={GUIDANCE_PLACEHOLDERS[placeholderIdx]}
                          rows={3}
                          data-testid="input-guidance-heart"
                          className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.06] px-3.5 sm:px-4 py-3 text-[16px] text-white placeholder:text-white/40 outline-none leading-relaxed focus:ring-2 focus:ring-violet-400/45 focus:border-violet-400/30"
                        />
                        <p className="mt-1 text-[11px] text-white/35 text-right">
                          {heartInput.length}/{GUIDANCE_INPUT_MAX}
                        </p>
                        <button
                          type="button"
                          onClick={handleHeartSubmit}
                          disabled={!isGuidanceInputValid(heartInput) || processingBridge}
                          data-testid="button-guidance-heart-submit"
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-white bg-gradient-to-r from-primary via-violet-600 to-violet-700 shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                        >
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <p className="mt-3 text-center text-[11px] text-white/40 leading-relaxed">
                      Private · grounded in Scripture
                      {" · "}
                      <Link
                        href="/sigh"
                        className="text-violet-200/60 underline underline-offset-2 hover:text-violet-100"
                        data-testid="link-guidance-sigh-room"
                      >
                        Need a quieter room?
                      </Link>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => submitHeartEntry(framework.guidanceHint, false)}
                    data-testid="button-framework-guidance-hint"
                    className="mt-2 w-full text-center text-[12px] text-muted-foreground/55 hover:text-muted-foreground/80 transition-colors py-2"
                  >
                    Begin with today&apos;s theme — {framework.name}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Scroll anchor — initial response lands here */}
          <div ref={responseRef} className="-mt-2" />

          {bridgeQuestion && !bridgeSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
              data-testid="card-guidance-bridge"
            >
              <div className="border-l-2 border-violet-500/60 pl-4 mb-5">
                <p
                  className="text-[15px] leading-relaxed text-foreground/80 italic"
                  style={{ fontFamily: "var(--font-reading)" }}
                >
                  {bridgeQuestion}
                </p>
              </div>
              <textarea
                value={bridgeAnswer}
                onChange={(e) => setBridgeAnswer(e.target.value)}
                onKeyDown={handleBridgeKeyDown}
                placeholder="Take your time..."
                rows={3}
                data-testid="input-guidance-bridge-answer"
                className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-[16px] text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary/40 leading-relaxed"
              />
              <p className="text-[12px] text-muted-foreground/60 text-center leading-relaxed mt-3">
                There&apos;s no wrong answer.
              </p>
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={handleBridgeSubmit}
                  disabled={!bridgeAnswer.trim()}
                  data-testid="button-guidance-bridge-continue"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 px-4 py-2.5 text-[14px] font-semibold text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            </motion.div>
          )}

          {/* Sacred Restraint — a breath of quiet before the response begins */}
          <AnimatePresence>
          {isReflecting && situation && (!bridgeQuestion || bridgeSubmitted) && (
              <motion.div
                key="presence"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.6 } }}
                transition={{ duration: 0.5 }}
                className="py-6 mb-2"
              >
                <p className="text-[15px] text-foreground/65 italic leading-relaxed">
                  {processingBridge ? "Philip is reflecting…" : "Sitting with what you shared…"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 1 — empathy + one question */}
          {(phase1StreamingText || phase1Response || (voiceConversation && !showPhase1TypeFallback && !phase2Started && (isReflecting || phase1Speaking || phase1Complete))) && (!bridgeQuestion || bridgeSubmitted) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
              data-testid="text-guidance-phase1"
            >
              {voiceConversation && !showPhase1TypeFallback && !phase1SpeechDone && (
                <div className="flex flex-col items-center py-4 mb-2">
                  <motion.div
                    role="status"
                    aria-live="polite"
                    className="relative flex items-center justify-center w-24 h-24 rounded-full"
                    animate={(phase1Speaking || isReflecting) ? {
                      boxShadow: [
                        "0 0 0 0px rgba(139,92,246,0.0), 0 0 28px 6px rgba(139,92,246,0.30)",
                        "0 0 0 16px rgba(139,92,246,0.0), 0 0 42px 14px rgba(139,92,246,0.45)",
                        "0 0 0 0px rgba(139,92,246,0.0), 0 0 28px 6px rgba(139,92,246,0.30)",
                      ],
                    } : {
                      boxShadow: "0 0 20px 3px rgba(139,92,246,0.14)",
                    }}
                    transition={(phase1Speaking || isReflecting) ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
                    style={{
                      background: "radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(109,40,217,0.10) 100%)",
                      border: "2px solid rgba(139,92,246,0.45)",
                    }}
                  >
                    <Mic className="w-9 h-9 relative z-10 text-violet-400" />
                  </motion.div>
                  <p className="mt-2.5 text-[13px] text-muted-foreground/75 font-medium">
                    {phase1Speaking
                      ? "Philip is speaking…"
                      : isReflecting
                        ? "Philip is reflecting…"
                        : "One moment…"}
                  </p>
                </div>
              )}

              {(!voiceConversation || showPhase1TypeFallback || phase1SpeechDone) && (
              <div className="border-l-2 border-violet-500/45 pl-4">
                <p
                  className="text-[16px] leading-[1.75] text-foreground/75 italic"
                  style={{ fontFamily: "var(--font-reading)" }}
                >
                  {cleanResponse(phase1StreamingText || phase1Response || "")}
                  {!phase1Complete && phase1StreamingText && (
                    <span className="inline-block w-1.5 h-5 bg-violet-400/50 rounded-sm animate-pulse ml-0.5 align-middle not-italic" />
                  )}
                </p>
              </div>
              )}

              {phase1Complete && !phase2Started && (
                <div className="mt-5 space-y-3">
                  {/* Voice-first reply */}
                  {hasSpeechSupport && !showPhase1TypeFallback && voiceConversation && (
                    <div className="flex flex-col items-center py-2">
                      <motion.button
                        type="button"
                        onClick={togglePhase1Voice}
                        disabled={phase1Speaking || processingBridge || phase2Loading}
                        aria-label={phase1Listening ? "Stop speaking" : "Reply to Philip"}
                        aria-live="polite"
                        data-testid="button-guidance-phase1-voice"
                        className="relative flex items-center justify-center w-24 h-24 rounded-full cursor-pointer touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                        animate={(phase1Listening || phase1Speaking) ? {
                          boxShadow: [
                            "0 0 0 0px rgba(239,68,68,0.0), 0 0 28px 6px rgba(239,68,68,0.30)",
                            "0 0 0 16px rgba(239,68,68,0.0), 0 0 42px 14px rgba(239,68,68,0.45)",
                            "0 0 0 0px rgba(239,68,68,0.0), 0 0 28px 6px rgba(239,68,68,0.30)",
                          ],
                        } : {
                          boxShadow: "0 0 20px 3px rgba(139,92,246,0.14)",
                        }}
                        transition={(phase1Listening || phase1Speaking) ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
                        style={{
                          background: phase1Listening
                            ? "radial-gradient(circle, rgba(239,68,68,0.28) 0%, rgba(180,20,20,0.12) 100%)"
                            : phase1Speaking
                              ? "radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(109,40,217,0.10) 100%)"
                              : "radial-gradient(circle, rgba(139,92,246,0.22) 0%, rgba(109,40,217,0.08) 100%)",
                          border: phase1Listening
                            ? "2px solid rgba(239,68,68,0.65)"
                            : "2px solid rgba(139,92,246,0.35)",
                        }}
                      >
                        {phase1Listening && (
                          <span className="absolute inset-0 rounded-full animate-ping"
                            style={{ background: "rgba(239,68,68,0.12)" }} />
                        )}
                        <Mic className={`w-9 h-9 relative z-10 ${phase1Listening ? "text-red-400" : "text-violet-400"}`} />
                      </motion.button>
                      <p className="mt-2.5 text-[12px] text-muted-foreground/70 font-medium">
                        {processingBridge
                          ? "Philip is with you…"
                          : phase1Speaking
                            ? "Philip is speaking…"
                            : phase1Listening
                              ? phase1ListenPhase === "thinking"
                                ? "…"
                                : "Philip is listening…"
                              : "One moment…"}
                      </p>
                      {phase1Listening && (phase1Interim || phase1UserReply) && (
                        <p className="mt-1.5 text-[13px] text-muted-foreground/55 italic text-center max-w-[280px] leading-snug">
                          {phase1Interim || phase1UserReply}
                        </p>
                      )}
                    </div>
                  )}

                  {showPhase1TypeFallback && (
                    <>
                      <textarea
                        value={phase1UserReply}
                        onChange={(e) => setPhase1UserReply(e.target.value.slice(0, GUIDANCE_INPUT_MAX))}
                        onKeyDown={handlePhase1KeyDown}
                        placeholder="Keep going... there's no right answer."
                        rows={3}
                        maxLength={GUIDANCE_INPUT_MAX}
                        disabled={isSending || phase2Loading}
                        data-testid="input-guidance-phase1-reply"
                        className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-[16px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 leading-relaxed disabled:opacity-50"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground/45 text-right">
                        {phase1UserReply.length}/{GUIDANCE_INPUT_MAX}
                      </p>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => void handlePhase1Skip()}
                          disabled={phase2Loading}
                          data-testid="button-guidance-phase1-skip"
                          className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors disabled:opacity-40"
                        >
                          Just walk with me →
                        </button>
                        <button
                          type="button"
                          onClick={handlePhase1TypedSubmit}
                          disabled={!isGuidanceInputValid(phase1UserReply) || phase2Loading || processingBridge}
                          data-testid="button-guidance-phase1-continue"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 px-4 py-2.5 text-[14px] font-semibold text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {phase2Loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue →"}
                        </button>
                      </div>
                    </>
                  )}

                  {!hasSpeechSupport && (
                    <>
                      <textarea
                        value={phase1UserReply}
                        onChange={(e) => setPhase1UserReply(e.target.value.slice(0, GUIDANCE_INPUT_MAX))}
                        onKeyDown={handlePhase1KeyDown}
                        placeholder="Keep going... there's no right answer."
                        rows={3}
                        maxLength={GUIDANCE_INPUT_MAX}
                        disabled={isSending || phase2Loading}
                        data-testid="input-guidance-phase1-reply"
                        className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-[16px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 leading-relaxed disabled:opacity-50"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground/45 text-right">
                        {phase1UserReply.length}/{GUIDANCE_INPUT_MAX}
                      </p>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => void handlePhase1Skip()}
                          disabled={phase2Loading}
                          data-testid="button-guidance-phase1-skip"
                          className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors disabled:opacity-40"
                        >
                          Just walk with me →
                        </button>
                        <button
                          type="button"
                          onClick={handlePhase1TypedSubmit}
                          disabled={!isGuidanceInputValid(phase1UserReply) || phase2Loading || processingBridge}
                          data-testid="button-guidance-phase1-continue"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 px-4 py-2.5 text-[14px] font-semibold text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {phase2Loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue →"}
                        </button>
                      </div>
                    </>
                  )}

                  {hasSpeechSupport && !showPhase1TypeFallback && voiceConversation && (
                    <button
                      type="button"
                      onClick={() => {
                        destroyPhase1Voice();
                        setShowPhase1TypeFallback(true);
                      }}
                      className="w-full text-center text-[12px] text-muted-foreground/45 hover:text-muted-foreground/65 transition-colors"
                      data-testid="link-guidance-phase1-type-instead"
                    >
                      Type instead
                    </button>
                  )}

                  {voiceConversation && !showPhase1TypeFallback && (
                    <button
                      type="button"
                      onClick={() => void handlePhase1Skip()}
                      disabled={phase2Loading}
                      data-testid="button-guidance-phase1-skip"
                      className="w-full text-center text-[12px] text-muted-foreground/45 hover:text-muted-foreground/70 transition-colors disabled:opacity-40"
                    >
                      Just walk with me →
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* User's Phase 1 reply — stays visible above Phase 2 */}
          {phase1UserReplySubmitted && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[14px] text-muted-foreground/70 italic text-right mb-6 max-w-[88%] ml-auto leading-relaxed"
              data-testid="text-guidance-phase1-user-reply"
            >
              {phase1UserReplySubmitted}
            </motion.p>
          )}

          {/* First pastoral response — Phase 2 full guidance */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            {showPhase2Content && voiceConversation && !showPhase1TypeFallback && !phase2SpeechDone && (
              <div className="flex flex-col items-center py-6 mb-4">
                <motion.div
                  role="status"
                  aria-live="polite"
                  className="relative flex items-center justify-center w-24 h-24 rounded-full"
                  animate={(phase2Speaking || phase2Loading || isReflecting) ? {
                    boxShadow: [
                      "0 0 0 0px rgba(139,92,246,0.0), 0 0 28px 6px rgba(139,92,246,0.30)",
                      "0 0 0 16px rgba(139,92,246,0.0), 0 0 42px 14px rgba(139,92,246,0.45)",
                      "0 0 0 0px rgba(139,92,246,0.0), 0 0 28px 6px rgba(139,92,246,0.30)",
                    ],
                  } : {
                    boxShadow: "0 0 20px 3px rgba(139,92,246,0.14)",
                  }}
                  transition={(phase2Speaking || phase2Loading || isReflecting) ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
                  style={{
                    background: "radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(109,40,217,0.10) 100%)",
                    border: "2px solid rgba(139,92,246,0.45)",
                  }}
                >
                  <Mic className="w-9 h-9 relative z-10 text-violet-400" />
                </motion.div>
                <p className="mt-2.5 text-[13px] text-muted-foreground/75 font-medium">
                  {phase2Speaking
                    ? "Philip is speaking…"
                    : phase2Loading || isReflecting
                      ? "Philip is reflecting…"
                      : "One moment…"}
                </p>
              </div>
            )}
            {showPhase2Content && ((!voiceConversation || showPhase1TypeFallback || phase2SpeechDone) && ((streamingText && !isReflecting) || assistantMessages.length > 0)) && (
              <>
                {(() => {
                  const rawText = cleanResponse(isSending
                    ? (assistantMessages[0]?.content ?? "")
                    : (streamingText || (assistantMessages[0]?.content ?? ""))
                  );
                  if (responseComplete && rawText.trim()) {
                    const movements = splitGuidanceMovements(rawText, verse, prayer);
                    return (
                      <div className="space-y-5" data-testid="text-guidance-response">
                        <div className="rounded-2xl border border-border/70 bg-card/40 px-5 py-4">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">
                            What I’m hearing
                          </p>
                          <div
                            className="text-[17px] leading-[1.78] text-foreground"
                            style={{ fontFamily: "var(--font-reading)" }}
                          >
                            {movements.reflection.split("\n\n").map((para, i) => (
                              <p key={i} className="mb-3 last:mb-0">{para}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const paras = rawText.split("\n\n").filter(p => p.trim());
                  const PREVIEW = 3;
                  const showAll = guidanceExpanded || !responseComplete || paras.length <= PREVIEW;
                  const visible = showAll ? paras : paras.slice(0, PREVIEW);
                  return (
                    <div
                      className="text-[18px] leading-[1.72] text-foreground space-y-5"
                      style={{ fontFamily: "var(--font-reading)" }}
                      data-testid="text-guidance-response"
                    >
                      {visible.map((para, i) => <p key={i}>{para}</p>)}
                      {!responseComplete && !isSending && (
                        <span className="inline-block w-1.5 h-5 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-middle" />
                      )}
                      {responseComplete && !showAll && (
                        <button
                          onClick={() => setGuidanceExpanded(true)}
                          data-testid="button-guidance-expand"
                          className="block text-[14px] font-semibold text-primary/80 hover:text-primary transition-colors mt-1"
                        >
                          Keep reading →
                        </button>
                      )}
                    </div>
                  );
                })()}
                {showPhase2Content && responseComplete && revealStage >= 2 && (vpLoading || verse || vpError) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mt-6"
                  >
                    {verse && verseDisplay && (
                      <div className="flex justify-end mb-3">
                        <ListenButton text={`${verseDisplay.text} — ${verse.reference}`} label="Listen" size="sm" scope="verse" />
                      </div>
                    )}
                    {vpLoading && !verse ? (
                      <div className="rounded-2xl bg-primary/8 border border-primary/25 px-6 pt-6 pb-5">
                        <p className="text-[19px] leading-relaxed font-medium text-foreground/65 italic mb-4">
                          "Be still, and know that I am God."
                        </p>
                        <p className="text-[13px] font-bold text-primary/65 tracking-wide">— Psalm 46:10</p>
                      </div>
                    ) : verse && verseDisplay ? (
                      <>
                        <p
                          className="text-[15px] leading-relaxed text-foreground/80 italic mb-3"
                          style={{ fontFamily: "var(--font-reading)" }}
                        >
                          {verseDisplay.intro}
                        </p>
                        <ScriptureSceneCard
                          testId="card-guidance-verse"
                          text={verseDisplay.text}
                          reference={verse.reference}
                          label="Scripture for you"
                          imageSrc={heroImageSrc || "/hero-guidance.jpg"}
                          onBookmark={carryVerseToday}
                          footer={
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setShowSlowVerse(true)}
                                data-testid="button-guidance-read-slowly"
                                className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-white/25 bg-black/25 text-white hover:bg-black/40 transition-colors"
                              >
                                Read slowly
                              </button>
                              <ListenButton
                                text={`${verseDisplay.text} — ${verse.reference}`}
                                label="Listen"
                                size="sm"
                                scope="verse"
                              />
                              <ShareVerseImageButton
                                verseText={verseDisplay.text}
                                verseReference={verse.reference}
                                testId="button-guidance-share-verse-image"
                                className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-white/25 bg-black/25 text-white hover:bg-white/40 transition-colors"
                              />
                            </div>
                          }
                        />
                        {/* Bible nudge — honors the physical Bible, surfaces today's word */}
                        <div className="mt-4 px-1">
                          <p className="text-[13px] text-foreground/50 italic leading-relaxed">
                            {dailyVerse?.reference && dailyVerse.reference !== verse.reference
                              ? `If you have a Bible nearby, turn to ${verse.reference} — and today's word is ${dailyVerse.reference}.`
                              : `If you have a Bible nearby, turn to ${verse.reference}. There's something about holding the page.`}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl bg-primary/8 border border-primary/25 px-6 py-5">
                        <GuidanceVpRetry
                          label="Scripture for your moment is still preparing — tap Try again."
                          onRetry={() => void loadVerseAndPrayer(phase1UserReplySubmitted)}
                          loading={vpLoading}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
                {showPhase2Content && responseComplete && (walkLoading || walkToday) && (
                  <div className="mt-6 rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-50/60 to-amber-100/30 dark:from-amber-900/15 dark:to-amber-800/8 px-5 py-4" data-testid="card-walk-today">
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <p className="text-[10px] font-bold tracking-[0.18em] text-amber-600/80 dark:text-amber-400/70 uppercase">Walk This Today</p>
                      {walkToday && <ListenButton text={walkToday.action} label="Listen" size="sm" />}
                    </div>
                    {walkLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-4 bg-amber-200/50 dark:bg-amber-700/20 rounded w-full" />
                        <div className="h-4 bg-amber-200/50 dark:bg-amber-700/20 rounded w-4/5" />
                        <div className="h-3 rounded w-28 mt-1" style={{ background: "rgba(245,158,11,0.09)" }} />
                      </div>
                    ) : walkToday && (
                      <>
                        <p
                          className="text-[16px] leading-[1.6] text-foreground"
                          style={{ fontFamily: "var(--font-reading)" }}
                          data-testid="text-walk-today-action"
                        >
                          {walkToday.action}
                        </p>
                        {walkToday.scripture && (
                          <p className="text-[11px] text-amber-600/65 dark:text-amber-400/55 mt-2 font-medium" data-testid="text-walk-today-scripture">
                            — {walkToday.scripture}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
                {showPhase2Content && responseComplete && revealStage >= 3 && (prayer || vpLoading || vpError) && (
                  <motion.div
                    key="prayer-card"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    data-testid="card-guidance-prayer"
                    className="relative rounded-2xl overflow-hidden border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-background dark:from-amber-950/20 dark:via-orange-950/10 dark:to-background mt-6"
                  >
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400" />
                    <div className="px-6 pt-5 pb-5">
                      <div className="flex items-center gap-2 mb-4">
                        <BookMarked className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                          A prayer for your moment
                        </p>
                      </div>

                      {!prayer ? (
                        vpLoading ? (
                          <div className="space-y-2 animate-pulse">
                            <div className="h-3.5 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-full" />
                            <div className="h-3.5 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-5/6" />
                            <div className="h-3.5 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-full" />
                            <div className="h-3.5 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-4/5" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-[12px] text-amber-700/70 dark:text-amber-400/60 italic leading-relaxed">
                              This can be your prayer — or a place to start.
                            </p>
                            <p className="text-[15px] leading-[1.8] text-foreground/90 italic">
                              {GUIDANCE_FALLBACK_PRAYER}
                            </p>
                            <GuidanceVpRetry
                              label="Personalized prayer couldn't load — pray this now, or try again."
                              onRetry={() => void loadVerseAndPrayer(phase1UserReplySubmitted)}
                              loading={vpLoading}
                            />
                          </div>
                        )
                      ) : (
                        <>
                          <p className="text-[12px] text-amber-700/70 dark:text-amber-400/60 italic mb-4 leading-relaxed">
                            This can be your prayer — or a place to start.
                          </p>
                          <p className="text-[15px] leading-[1.8] text-foreground/90 italic mb-6">
                            {prayer}
                          </p>

                          <div className="flex items-center gap-3 flex-wrap">
                            {isProVerifiedLocally() ? (
                              <button
                                onClick={() => tts.toggle(prayer!, "nova")}
                                disabled={tts.loading}
                                data-testid="button-pray-aloud"
                                className="flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold px-4 py-2 transition-colors disabled:opacity-60 shadow-sm"
                              >
                                {tts.loading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : tts.playing ? (
                                  <VolumeX className="w-3.5 h-3.5" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                                {tts.playing ? "Stop" : "Pray this"}
                              </button>
                            ) : (
                              <button
                                onClick={() => setShowUpgrade(true)}
                                data-testid="button-pray-aloud-upgrade"
                                className="flex items-center gap-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 text-[13px] font-semibold px-4 py-2 transition-colors border border-amber-400/30"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                Pray this
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Pro</span>
                              </button>
                            )}

                            <button
                              onClick={savePrayerToJournal}
                              disabled={prayerSaved}
                              data-testid="button-save-prayer"
                              className="flex items-center gap-1.5 text-[13px] font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors disabled:opacity-70"
                            >
                              {prayerSaved ? (
                                <>
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  Saved to Journal
                                </>
                              ) : (
                                <>
                                  <BookMarked className="w-3.5 h-3.5" />
                                  Save to Journal
                                </>
                              )}
                            </button>
                          </div>

                          {guidancePastorVideo ? (
                            <PastorVideoCard
                              pastorName={guidancePastorVideo.pastor_name}
                              churchName={guidancePastorVideo.church_name}
                              title={guidancePastorVideo.title}
                              youtubeUrl={guidancePastorVideo.youtube_url}
                              sectionLabel="A PASTOR FOR THIS MOMENT"
                            />
                          ) : null}

                          <PrayerThatStays />

                          {tts.playing && (
                            <div className="mt-3 h-1 rounded-full bg-amber-200/60 dark:bg-amber-800/30 overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${tts.progress}%` }}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
                {showPhase2Content && responseComplete && (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {isProVerifiedLocally() ? (
                      <ListenButton
                        text={cleanResponse(assistantMessages[0]?.content ?? "")}
                        label="Hear this"
                        size="sm"
                        data-testid="button-guidance-listen-text"
                      />
                    ) : (
                      <button
                        onClick={() => setShowUpgrade(true)}
                        data-testid="button-guidance-listen-text-upgrade"
                        className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                      >
                        <Lock className="w-3 h-3" />
                        Hear this
                        <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">Pro</span>
                      </button>
                    )}
                    {verse && verseDisplay && assistantMessages[0]?.content && (
                      <ShareVerseTrigger
                        text={verseDisplay.text}
                        reference={verse.reference}
                        date={easternVerseDateKey()}
                        extraLine={`A word that met me today:\n"${cleanResponse(assistantMessages[0].content).replace(/\n+/g, " ").slice(0, 280)}"`}
                        showFriend={false}
                        label="Share encouragement"
                        testId="button-share-guidance"
                        className="text-[12px]"
                      />
                    )}
                  </div>
                )}
                {showPhase2Content && responseComplete && (
                  <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1.5">
                    <span>✝</span>
                    <span>Grounded in Scripture. Guided by the Holy Spirit.</span>
                  </p>
                )}
                {showPhase2Content && responseComplete && (
                  <Link href="/safety">
                    <p
                      className="text-[11px] text-muted-foreground/70 mt-1 underline underline-offset-4 cursor-pointer hover:text-muted-foreground transition-colors"
                      data-testid="link-guidance-safety-boundaries"
                    >
                      Safety & boundaries
                    </p>
                  </Link>
                )}
                {showPhase2Content && responseComplete && (
                  <p className="text-[12px] text-muted-foreground/80 mt-2 tracking-wide">
                    This meets you—but it won't move you.
                  </p>
                )}
                {showPhase2Content && responseComplete && (
                  <p className="text-[12px] text-muted-foreground/70 mt-1 tracking-wide">
                    Walking it is up to you.
                  </p>
                )}
                {showPhase2Content && responseComplete && verse && (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/6 to-violet-500/4 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${chainSection || ttsChain.loading ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        {ttsChain.loading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Volume2 className="w-4 h-4" />
                        }
                      </div>
                      <div className="min-w-0">
                        {ttsChain.loading ? (
                          <>
                            <p className="text-[12px] font-bold text-primary leading-none">A moment…</p>
                          </>
                        ) : chainSection ? (
                          <>
                            <p className="text-[12px] font-bold text-primary leading-none">Now playing</p>
                            <p className="text-[11px] text-muted-foreground capitalize mt-0.5 leading-none">{chainSection}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[13px] font-semibold text-foreground leading-none">Hear this guidance</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                              {guidanceListenReady
                                ? "Scripture · Guidance · Prayer — one listen"
                                : "Scripture · Guidance · Prayer preparing…"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={startGuidanceListen}
                      disabled={phase2Speaking || followUpSpeaking || phase1Speaking || (!guidanceListenReady && !chainSection && !ttsChain.loading)}
                      data-testid="button-guidance-listen-chain"
                      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold transition-all flex-shrink-0 ${
                        chainSection || ttsChain.loading
                          ? "bg-primary/20 text-primary hover:bg-primary/30"
                          : guidanceListenReady
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                            : "bg-muted text-muted-foreground/70 cursor-not-allowed"
                      }`}
                    >
                      {ttsChain.loading || chainSection
                        ? <><VolumeX className="w-3 h-3" /> Stop</>
                        : !guidanceListenReady
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Preparing</>
                          : <><Volume2 className="w-3 h-3" /> Listen</>
                      }
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* ── Contextual Photo ── */}
          <AnimatePresence>
            {revealStage >= 1 && contextPhoto && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="mb-10"
              >
                <div className="relative rounded-2xl overflow-hidden" style={{ height: "210px" }}>
                  <img
                    src={contextPhoto.url}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: "saturate(0.72) brightness(0.88)" }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(13,8,32,0.52) 100%)" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-right">
                  Photo by{" "}
                  <a
                    href={`${contextPhoto.photographerLink}?utm_source=shepherds_path&utm_medium=referral`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-muted-foreground/70 transition-colors"
                  >
                    {contextPhoto.photographerName}
                  </a>
                  {" on "}
                  <a
                    href="https://unsplash.com?utm_source=shepherds_path&utm_medium=referral"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-muted-foreground/70 transition-colors"
                  >
                    Unsplash
                  </a>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conversation thread (follow-ups) */}
          <AnimatePresence>
            {conversationThread.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 ${msg.role === "user" ? "flex justify-end" : ""}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[80%] bg-primary text-primary-foreground text-sm rounded-2xl rounded-br-md px-4 py-3 leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="text-[17px] leading-[1.85] text-foreground space-y-5 max-w-[68ch]"
                    style={{ fontFamily: "var(--font-reading)" }}
                  >
                    {cleanResponse(msg.content).split("\n\n").map((para, j) =>
                      para.trim() ? <p key={j}>{para}</p> : null
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {/* Streaming follow-up */}
            {isSending && streamingText && !isReflecting && (
              <motion.div key="streaming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6" ref={latestResponseRef}>
                <div
                  className="text-[17px] leading-[1.85] text-foreground space-y-5 max-w-[68ch]"
                  style={{ fontFamily: "var(--font-reading)" }}
                >
                  {cleanResponse(streamingText).split("\n\n").map((para, j) =>
                    para.trim() ? <p key={j}>{para}</p> : null
                  )}
                  <span className="inline-block w-1.5 h-5 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-middle" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Follow-up input — stay path only, after prayer lands */}
          <AnimatePresence>
            {showPhase2Content && responseComplete && completionPath === "stay" && revealStage >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="mb-10"
              >
                {canUseAi() ? (
                  <>
                    {/* After 4+ exchanges — gentle outward nudge. App supports; doesn't replace. */}
                    {messages.filter(m => m.role === "user").length >= 4 && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-[12px] text-muted-foreground/55 text-center mb-4 px-4 leading-relaxed"
                      >
                        This might be worth bringing to someone you trust —
                        a pastor, a close friend.
                      </motion.p>
                    )}
                    {/* Desktop-only inline input — on mobile the floating bar takes over */}
                    <div className="hidden sm:block">
                      <p className="text-[11px] font-semibold text-foreground/60 uppercase tracking-[0.14em] mb-2 ml-1">Keep talking (optional)</p>
                      <div className="bg-background border-2 border-border/70 hover:border-primary/30 focus-within:border-primary/50 rounded-2xl px-4 pt-3 pb-2 flex flex-col gap-2 shadow-md transition-colors">
                        <textarea
                          ref={inputRef}
                          value={followUp}
                          onChange={e => setFollowUp(e.target.value)}
                          spellCheck
                          autoCapitalize="sentences"
                          autoCorrect="on"
                          onKeyDown={handleKeyDown}
                          placeholder="What's still on your heart?"
                          rows={2}
                          disabled={isSending}
                          data-testid="input-guidance-followup"
                          className="w-full resize-none bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground/90 outline-none leading-relaxed disabled:opacity-50"
                        />
                        <div className="flex items-center justify-between">
                          {hasSpeechSupport ? (
                            <button
                              type="button"
                              onClick={toggleFollowUpVoice}
                              data-testid="button-guidance-voice"
                              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all relative"
                              style={{ color: followUpListening ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}
                            >
                              {followUpListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 opacity-60 hover:opacity-90" />}
                              {followUpListening && <span className="absolute inset-0 rounded-lg animate-ping bg-red-400/20" />}
                            </button>
                          ) : <span />}
                          <button
                            onClick={handleSend}
                            disabled={!followUp.trim() || isSending}
                            data-testid="button-guidance-send"
                            className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-400/40"
                          >
                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      {/* After 3rd use — subtle value reinforcement */}
                      {getGlobalAiUsage()?.used === 3 && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-[12px] text-muted-foreground/70 text-center mt-2.5 px-2 leading-relaxed"
                        >
                          You've spent real time with this today.{" "}
                          <span className="text-foreground/60">That's not nothing — that's the work.</span>
                        </motion.p>
                      )}
                    </div>
                  </>
                ) : (
                  /* After 5th use — emotional + supportive send-off */
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-sm"
                    data-testid="card-daily-limit"
                  >
                    <p className="text-base font-semibold text-foreground mb-1">
                      You've brought a lot to this today.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Carry what you've received. Let it settle. Come back tomorrow — I'll be here.
                    </p>
                    <button
                      onClick={() => setShowUpgrade(true)}
                      data-testid="button-upgrade-from-limit"
                      className="text-[13px] text-primary/80 hover:text-primary underline underline-offset-2 transition-colors"
                    >
                      Need longer sessions tonight? Pro is available when you want deeper support.
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completion fork — after prayer, before optional depth */}
          {showPhase2Content && responseComplete && revealStage >= 3 && completionPath === null && (
            <GuidanceCompletionThreshold
              onCarry={() => {
                setCompletionPath("carry");
                fetch("/api/guidance/send-off", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    situation: situation.trim(),
                    userName: getUserName() ?? undefined,
                    sessionId: getSessionId() ?? undefined,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    verseReference: verse?.reference ?? undefined,
                  }),
                })
                  .then(r => r.ok ? r.json() : null)
                  .then(d => { if (d?.sendOff) setSendOffText(d.sendOff); })
                  .catch(() => {});
              }}
              onStay={() => setCompletionPath("stay")}
            />
          )}

          {showPhase2Content && responseComplete && completionPath === "carry" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mb-8 flex flex-col items-center gap-4"
            >
              {/* Send-off */}
              <div
                className="w-full rounded-2xl px-5 py-5 text-center"
                style={{ background: "linear-gradient(145deg, rgba(139,92,246,0.10), rgba(109,40,217,0.05))", border: "1px solid rgba(139,92,246,0.20)" }}
              >
                <p className="text-[17px] leading-relaxed mb-1" style={{ fontFamily: "'Georgia', serif", color: "hsl(var(--foreground) / 0.90)" }}>
                  {sendOffText ?? "You brought something real today."}
                </p>
                <p className="text-[13px] text-muted-foreground/65 leading-relaxed">
                  Come back when you need to — this is always here.
                </p>
              </div>

              {(recapLoading || sessionRecap) && (
                <div
                  className="w-full rounded-2xl px-5 py-4 text-left"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                  data-testid="card-guidance-recap"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">
                    {recapLoading ? "Your recap is on the way…" : "Your recap"}
                  </p>
                  {sessionRecap?.recap && (
                    <p
                      className="text-[15px] leading-relaxed text-foreground/85"
                      style={{ fontFamily: "var(--font-reading)" }}
                    >
                      {sessionRecap.recap}
                    </p>
                  )}
                  {sessionRecap?.detailed && (
                    <p
                      className="mt-3 text-[14px] leading-relaxed text-muted-foreground/75 border-t border-border/40 pt-3"
                      style={{ fontFamily: "var(--font-reading)" }}
                    >
                      {sessionRecap.detailed}
                    </p>
                  )}
                </div>
              )}

              {/* Return seed — tomorrow nudge */}
              <div
                className="w-full rounded-2xl px-5 py-4 flex items-center gap-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                  style={{ background: "rgba(245,158,11,0.15)" }}
                >
                  🌅
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-foreground/90">Tomorrow's door is already open</p>
                  <p className="text-[12px] text-muted-foreground/60 mt-0.5 leading-snug">
                    A new verse and reflection wait for you each morning.
                  </p>
                </div>
                <Link href="/devotional">
                  <span className="text-[12px] font-bold text-primary shrink-0">Today's →</span>
                </Link>
              </div>

              <SessionFeedbackSection
                situation={situation}
                sessionFeedback={sessionFeedback}
                setSessionFeedback={setSessionFeedback}
                completionPath="carry"
              />

              {/* Stillness + escape hatch */}
              <button
                type="button"
                onClick={() => setShowStillness(true)}
                data-testid="btn-guidance-stillness"
                className="w-full max-w-sm py-3.5 rounded-2xl text-[14px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm transition-colors"
              >
                Sit in silence
              </button>
              <button
                type="button"
                data-testid="btn-guidance-switch-to-stay"
                onClick={() => setCompletionPath("stay")}
                className="text-[12px] text-muted-foreground/50 hover:text-primary/80 transition-colors"
              >
                Actually — I have a few more minutes
              </button>
            </motion.div>
          )}

          {/* Witness Letter — offered on deep sessions after completion path is chosen */}
          {showWitnessLetter && completionPath && (
            <WitnessLetterCard
              situation={situation}
              messages={messages}
              phase1Response={phase1Response ?? null}
              onSaveToJournal={async (text) => {
                try {
                  await apiRequest("POST", "/api/journal", {
                    sessionId: getSessionId(),
                    type: "note",
                    title: "Philip's Witness",
                    content: text,
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
                  toast(journalSavedToast(() => navigate("/journal")));
                } catch {
                  toast({ title: "Couldn't save to journal", description: "Please try again.", variant: "destructive" });
                }
              }}
            />
          )}

          {/* Hold This With Me */}
          {showHoldCard && completionPath && (
            <HoldThisWithMeCard onDismiss={() => setShowHoldCard(false)} />
          )}

          {/* Pattern Philip Has Been Holding */}
          {showPatternCard && completionPath && (
            <PatternPhilipCard
              situation={situation}
              onDismiss={() => setShowPatternCard(false)}
            />
          )}

          {/* Bridge text — connects the response to the journey below */}
          {showPhase2Content && responseComplete && completionPath === "stay" && revealStage >= 4 && (
            <p className="text-[13px] text-muted-foreground/75 leading-relaxed mb-6 -mt-2">
              Here&apos;s where I&apos;d walk with you next.
            </p>
          )}

          {/* Journey card */}
          <AnimatePresence>
            {showPhase2Content && responseComplete && completionPath === "stay" && revealStage >= 4 && (journeyLoading || journey || journeyError || !isProVerifiedLocally()) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: responseComplete ? 0.1 : 0.5 }}
              >
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  {isProVerifiedLocally() ? "Your Personalized Journey" : "A pathway for this season"}
                </p>

                {!isProVerifiedLocally() ? (
                  (() => {
                    const suggested = suggestPathwayForSituation(situation);
                    return (
                      <div className="rounded-2xl px-5 py-4" style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.25)" }}>
                        {suggested ? (
                          <>
                            <p className="text-sm text-foreground/85 leading-relaxed mb-2">
                              We have a curated <span className="font-semibold">{suggested.title}</span> pathway — seven days of Scripture for where you are.
                            </p>
                            <p className="text-[12px] text-muted-foreground mb-3">
                              Pro also shapes a journey from your exact words. Core Bible journeys stay free.
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                            Pro includes 7-day Guided Pathways for grief, anxiety, loneliness, and more — plus a journey shaped from your situation.
                          </p>
                        )}
                        <Link href="/understand#pathways">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline">
                            Explore Guided Pathways
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </Link>
                      </div>
                    );
                  })()
                ) : journeyLoading ? (
                  <div className="rounded-2xl px-7 pt-6 pb-5" style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.25)" }}>
                    <p className="text-[16px] leading-relaxed font-medium text-foreground/60 italic mb-2">
                      "Your word is a lamp to my feet and a light to my path."
                    </p>
                    <p className="text-[12px] font-bold text-violet-500/90 mb-3">— Psalm 119:105</p>
                    <div className="flex items-center gap-2 text-muted-foreground/80">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                      <span className="text-[11px]">Shaping your scripture journey…</span>
                    </div>
                  </div>
                ) : journey ? (
                  <button
                    onClick={beginJourney}
                    data-testid="button-begin-journey"
                    className="w-full text-left rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-800/20 dark:to-indigo-800/20 border border-violet-200/60 dark:border-violet-700/30 p-5 hover:from-violet-500/15 hover:to-indigo-500/15 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <BookOpen className="w-4 h-4 text-violet-500" />
                          <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Ready for you</span>
                        </div>
                        <h3 className="font-bold text-lg text-foreground leading-tight">{journey.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{journey.subtitle} · {journey.length} passages</p>
                        {journey.entries?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {journey.entries.slice(0, 5).map(ch => (
                              <span key={ch.id} className="text-[11px] px-2 py-0.5 rounded-full text-violet-700 dark:text-violet-300 font-medium" style={{ background: "rgba(139,92,246,0.09)" }}>
                                {ch.theme}
                              </span>
                            ))}
                          </div>
                        )}
                        {journey.spotlightReason && journey.entries?.[journey.spotlightIndex ?? 0] && (
                          <div className="mt-4 pt-3.5 border-t border-violet-200/50 dark:border-violet-700/30">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Where we'd start you</p>
                              <span className="text-[10px] text-violet-400/80 font-medium italic">· highest relevance</span>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                              <span className="font-semibold text-foreground">{journey.entries[journey.spotlightIndex ?? 0].title}</span>
                              {" — "}{journey.spotlightReason}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 group-hover:from-amber-400 group-hover:to-orange-400 text-white flex items-center justify-center transition-all shadow-sm shadow-amber-500/30 mt-1">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ) : journeyError ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl px-7 pt-6 pb-5"
                    style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.25)" }}
                  >
                    <p className="text-sm text-muted-foreground mb-3">
                      We couldn't shape your journey just yet — worth trying once more.
                    </p>
                    <button
                      type="button"
                      onClick={fetchJourney}
                      className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500"
                    >
                      Try again
                    </button>
                  </motion.div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Release Moment — quiet word of release; appears whether or not journey loaded */}
          <AnimatePresence>
            {showPhase2Content && responseComplete && completionPath === "stay" && revealStage >= 4 && (
              <motion.div
                key="release"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 1.2, ease: "easeIn" }}
                className="mt-10 mb-2 text-center"
              >
                <div className="inline-block w-8 h-px bg-border/40 mb-5" />
                <p className="text-[13px] text-muted-foreground/60 leading-relaxed">
                  You've been honest. That matters.
                </p>
                <p className="text-[13px] text-muted-foreground/45 mt-1">
                  You can carry this with you now.
                </p>
                <div className="mt-8 max-w-md mx-auto">
                  <SessionFeedbackSection
                    situation={situation}
                    sessionFeedback={sessionFeedback}
                    setSessionFeedback={setSessionFeedback}
                    completionPath="stay"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </main>

      <AnimatePresence>
        {showSlowVerse && verse && verseDisplay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-background/95 backdrop-blur-sm flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-xl rounded-2xl border border-border bg-card px-6 py-6"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70 mb-3">
                Read slowly
              </p>
              <p className="text-[15px] leading-relaxed text-foreground/80 italic mb-4" style={{ fontFamily: "var(--font-reading)" }}>
                {verseDisplay.intro}
              </p>
              <p className="text-[24px] leading-[1.9] italic text-foreground" style={{ fontFamily: "var(--font-reading)" }}>
                "{verseDisplay.text}"
              </p>
              <p className="text-[14px] font-semibold text-primary/80 mt-4">— {verse.reference}</p>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSlowVerse(false)}
                  className="rounded-full px-4 py-2 text-[13px] font-semibold border border-border hover:border-primary/30 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating input bar — mobile only, docks above NavBar ── */}
      <AnimatePresence>
        {showPhase2Content && responseComplete && completionPath === "stay" && revealStage >= 3 && canUseAi() && (
          <motion.div
            key="float-bar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 1.8, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="sm:hidden fixed left-0 right-0 z-30 px-3"
            style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="bg-background/96 backdrop-blur-xl border border-border/70 rounded-2xl px-4 pt-3 pb-2.5 shadow-2xl shadow-black/25 flex flex-col gap-1.5">
              <textarea
                ref={floatRef}
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                spellCheck
                autoCapitalize="sentences"
                autoCorrect="on"
                onKeyDown={handleKeyDown}
                placeholder="What's still on your heart?"
                rows={1}
                disabled={isSending}
                data-testid="input-guidance-floating"
                className="w-full resize-none bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground/78 outline-none leading-relaxed disabled:opacity-50"
                style={{ maxHeight: "96px", overflowY: "auto" }}
              />
              <div className="flex items-center justify-between">
                {hasSpeechSupport ? (
                  <button
                    type="button"
                    onClick={toggleFollowUpVoice}
                    data-testid="button-guidance-float-voice"
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all relative"
                    style={{ color: followUpListening ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}
                  >
                    {followUpListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 opacity-60 hover:opacity-90" />}
                    {followUpListening && <span className="absolute inset-0 rounded-lg animate-ping bg-red-400/20" />}
                  </button>
                ) : <span />}
                <button
                  onClick={handleSend}
                  disabled={!followUp.trim() || isSending}
                  data-testid="button-guidance-float-send"
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-white flex items-center justify-center transition-all disabled:opacity-40 shadow-lg shadow-amber-400/30"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      {showListenUpgrade && (
        <UpgradeModal
          onClose={() => setShowListenUpgrade(false)}
          title="Hear this guidance in one flow"
          subtitle={LISTEN_LIMIT_COPY.guidance}
        />
      )}
      {showAiPause && <AiPauseModal onClose={() => setShowAiPause(false)} />}

      <SessionStillness
        open={showStillness}
        verseText={dailyVerse?.text ?? verse?.text ?? "The Lord bless you and keep you."}
        verseRef={dailyVerse?.reference ?? verse?.reference ?? "Numbers 6:24"}
        onDone={() => {
          setShowStillness(false);
          markSacredSessionQuiet();
          markReturningHome();
          navigate("/");
        }}
      />

    </>
  );
}
