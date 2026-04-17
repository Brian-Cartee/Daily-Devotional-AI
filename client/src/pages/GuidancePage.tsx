import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Send, Loader2, BookOpen, Volume2, VolumeX, BookMarked, CheckCheck, Sparkles, Heart, Shield, Mic, MicOff } from "lucide-react";
import { getGuidanceMode, saveGuidanceMode, type GuidanceMode } from "@/lib/guidanceMode";
import { saveLastGuidanceSession } from "@/lib/engagementCards";
import { getTodayFramework } from "@/lib/faithFramework";
import { NavBar } from "@/components/NavBar";
import { getUserName, getUserVoice } from "@/lib/userName";
import { getSessionId } from "@/lib/session";
import { type Journey } from "@/data/journeys";
import { useTTS, prewarmTTS } from "@/hooks/use-tts";
import { apiRequest } from "@/lib/queryClient";
import { canUseAi, recordAiUsage, getAiUsage, getRemainingAi } from "@/lib/aiUsage";
import { AiPauseModal } from "@/components/AiPauseModal";
import { isLateNight } from "@/lib/nightMode";
import { getRelationshipAge } from "@/lib/relationship";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ResourceSuggestionCard } from "@/components/ResourceSuggestionCard";

import { isProVerifiedLocally } from "@/lib/proStatus";
import { useToast } from "@/hooks/use-toast";

interface VerseResult {
  reference: string;
  text: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

/** Strip any AI-generated markdown bold/italic so the response reads as a single voice */
function cleanResponse(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.+?)\*/g, "$1")        // *italic*
    .replace(/__(.+?)__/g, "$1")        // __bold__
    .replace(/_(.+?)_/g, "$1");         // _italic_
}

function getEmpathyReflection(situation: string): string {
  const s = situation.toLowerCase();
  if (/marriage|spouse|husband|wife|partner|relationship/.test(s)) return "You're carrying something tender right now…";
  if (/anxiet|fear|worry|worri|scared|panic|overwhelm/.test(s)) return "That weight you're feeling is real…";
  if (/grief|loss|died|death|passed|mourn|missing/.test(s)) return "Grief has a way of silencing everything else…";
  if (/alone|lonely|isolat|no one|nobody/.test(s)) return "That loneliness is one of the hardest things to carry…";
  if (/depress|hopeless|meaningless|purpose|lost/.test(s)) return "You don't have to find the words for all of this…";
  if (/job|work|career|money|financial|debt|provision/.test(s)) return "That kind of pressure touches everything…";
  if (/child|kid|parent|family|son|daughter/.test(s)) return "Family carries a weight unlike anything else…";
  if (/faith|doubt|believe|god|church|spiritual/.test(s)) return "Questions like these take real courage to bring…";
  if (/angry|anger|rage|resentment|bitterness/.test(s)) return "Something in you is crying out to be heard…";
  if (/sick|health|diagnos|illness|pain|medical/.test(s)) return "This is a hard season to be walking through…";
  return "You're carrying a lot right now…";
}

export default function GuidancePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const situation = params.get("situation") ?? "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [responseComplete, setResponseComplete] = useState(false);
  const [heartInput, setHeartInput] = useState("");
  const [heartListening, setHeartListening] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAiPause, setShowAiPause] = useState(false);
  const [isReflecting, setIsReflecting] = useState(() => !!situation.trim());
  const [isListening, setIsListening] = useState(false);
  const hasSpeechSupport = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const userName = getUserName() ?? undefined;
  const framework = getTodayFramework();

  const [isFirstVisit] = useState(() => !localStorage.getItem("sp_guidance_visited"));
  useEffect(() => { localStorage.setItem("sp_guidance_visited", "1"); }, []);

  const [guidanceMode, setGuidanceModeState] = useState<GuidanceMode>(() => getGuidanceMode());

  const handleModeChange = (mode: GuidanceMode) => {
    if (mode === guidanceMode) return;
    setGuidanceModeState(mode);
    saveGuidanceMode(mode);

    // If a response is already showing and there's no follow-up thread yet,
    // re-generate the initial response in the new tone immediately
    const userMessages = messages.filter(m => m.role === "user");
    if (responseComplete && situation.trim() && userMessages.length <= 1) {
      const initialUserMsg: Message = { role: "user", content: situation };
      setMessages([initialUserMsg]);
      streamResponse([initialUserMsg], mode);
    }
  };

  const [journey, setJourney] = useState<Journey | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(() => !!situation.trim());

  const [verse, setVerse] = useState<VerseResult | null>(null);
  const [prayer, setPrayer] = useState<string | null>(null);
  const [vpLoading, setVpLoading] = useState(() => !!situation.trim());
  const [prayerSaved, setPrayerSaved] = useState(false);

  const [guidanceExpanded, setGuidanceExpanded] = useState(false);

  const tts = useTTS();
  const ttsChain = useTTS();
  const [chainSection, setChainSection] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const floatRef = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const [revealStage, setRevealStage] = useState(0);
  const latestResponseRef = useRef<HTMLDivElement>(null);
  const hasScrolledInitial = useRef(false);
  const hasScrolledFollowUp = useRef(0);

  const streamResponse = async (conversationMessages: Message[], explicitMode?: GuidanceMode) => {
    setStreamingText("");
    setResponseComplete(false);
    try {
      const res = await fetch("/api/guidance/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, messages: conversationMessages, userName, sessionId: getSessionId(), guidanceMode: explicitMode ?? guidanceMode, isLateNight: isLateNight(), daysWithApp: getRelationshipAge() }),
      });
      if (res.status === 429) {
        setStreamingText("You've sent a lot of requests recently. Please wait a few minutes and try again.");
        setResponseComplete(true);
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
      setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
      setStreamingText("");
      setResponseComplete(true);
    } catch {
      setStreamingText("Trouble connecting — check your signal and we can try again.");
      setResponseComplete(true);
    }
  };

  // Always scroll to top on mount — covers iOS Safari scroll restoration and
  // both the empty (/guidance) and pre-filled (/guidance?situation=…) entry paths
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    if (!situation.trim()) return;

    if (!canUseAi()) { setShowAiPause(true); return; }
    recordAiUsage();

    const initialUserMsg: Message = { role: "user", content: situation };
    setMessages([initialUserMsg]);
    streamResponse([initialUserMsg]);
    // Sacred restraint — hold the breath for 2.5s before the stream appears
    setTimeout(() => setIsReflecting(false), 2500);

    // Pre-generate journey in the background
    fetch("/api/journey/life-season", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: situation.trim(), sessionId: getSessionId() }),
    })
      .then(r => r.json())
      .then((j: Journey) => {
        sessionStorage.setItem("sp-guidance-journey", JSON.stringify(j));
        setJourney(j);
        setJourneyLoading(false);
      })
      .catch(() => setJourneyLoading(false));

    // Fetch verse + personal prayer in parallel
    fetch("/api/guidance/verse-and-prayer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: situation.trim(), sessionId: getSessionId(), userName }),
    })
      .then(r => r.json())
      .then((data: { verse?: VerseResult; prayer?: string }) => {
        if (data.verse) setVerse(data.verse);
        if (data.prayer) setPrayer(data.prayer);
        setVpLoading(false);
      })
      .catch(() => setVpLoading(false));

  }, []);

  // Save guidance memory silently when first response completes
  useEffect(() => {
    if (!responseComplete || !situation.trim() || situation.trim().length < 30) return;
    const assistantMessages = messages.filter(m => m.role === "assistant");
    const firstResponse = assistantMessages[0]?.content;
    if (!firstResponse) return;
    fetch("/api/guidance/save-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation: situation.trim(),
        response: firstResponse,
        sessionId: getSessionId(),
      }),
    }).catch(() => {});
  }, [responseComplete]);


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

  // Progressive reveal — stage the content in after guidance lands
  useEffect(() => {
    if (!responseComplete) return;
    setRevealStage(1);
    const t1 = setTimeout(() => setRevealStage(s => Math.max(s, 2)), 3000);
    const t2 = setTimeout(() => setRevealStage(s => Math.max(s, 3)), 6000);
    const t3 = setTimeout(() => setRevealStage(s => Math.max(s, 4)), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [responseComplete]);

  const startGuidanceListen = async () => {
    if (ttsChain.playing || ttsChain.loading) {
      ttsChain.stop();
      setChainSection(null);
      return;
    }
    if (!verse) return;
    const firstResponse = messages.find(m => m.role === "assistant")?.content ?? streamingText;
    if (!firstResponse) return;

    const sections: Array<{ key: string; text: string; voice?: string }> = [
      { key: "scripture", text: `${verse.text}. ${verse.reference}.` },
      { key: "guidance", text: firstResponse },
    ];
    if (prayer) sections.push({ key: "prayer", text: prayer, voice: "nova" });

    await ttsChain.playChain(
      sections,
      (_, key) => setChainSection(key ?? null),
      () => setChainSection(null),
    );
    setChainSection(null);
  };

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

  const toggleFollowUpVoice = () => {
    if (isListening) { setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setFollowUp(prev => (prev ? prev + " " + transcript : transcript));
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    setIsListening(true);
    rec.start();
  };

  const toggleHeartVoice = () => {
    if (heartListening) { setHeartListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setHeartInput(prev => (prev ? prev + " " + transcript : transcript));
    };
    rec.onend = () => setHeartListening(false);
    rec.onerror = () => setHeartListening(false);
    setHeartListening(true);
    rec.start();
  };

  const handleHeartSubmit = () => {
    const text = heartInput.trim();
    if (!text) return;
    saveLastGuidanceSession();
    window.location.href = `/guidance?situation=${encodeURIComponent(text)}`;
  };

  const handleHeartKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleHeartSubmit();
    }
  };

  const handleSend = async () => {
    const text = followUp.trim();
    if (!text || isSending) return;
    if (!canUseAi()) { setShowAiPause(true); return; }
    recordAiUsage();
    setFollowUp("");
    setIsSending(true);
    setIsReflecting(true);
    setRevealStage(s => Math.max(s, 4));
    setTimeout(() => setIsReflecting(false), 700);
    const newUserMsg: Message = { role: "user", content: text };
    const updated = [...messages, newUserMsg];
    setMessages(updated);
    await streamResponse(updated);
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
    } catch {
      toast({ title: "Couldn't save to journal", description: "Please try again.", variant: "destructive" });
    }
  };

  const assistantMessages = messages.filter(m => m.role === "assistant");

  // Skip initial user message AND first AI response — only follow-up exchanges go here
  const conversationThread = messages.slice(2);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-background pb-32">
        {/* Cinematic hero — full atmospheric image when empty, compact strip once conversation begins */}
        <div className={`relative pt-14 overflow-hidden transition-all duration-700 ease-in-out ${!situation && !streamingText ? "min-h-[330px]" : ""}`}>

          {/* Background image — fades out once conversation is active */}
          <img
            src="/hero-guidance.jpg"
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${!situation && !streamingText ? "opacity-100" : "opacity-0"}`}
            style={{ filter: "brightness(0.70) saturate(1.65)", transform: "scale(1.12)", transformOrigin: "65% top" }}
          />

          {/* Depth gradient — bleeds photo into app background at bottom */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${!situation && !streamingText ? "opacity-100" : "opacity-0"}`}
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(13,8,32,0.55) 55%, hsl(var(--background)) 100%)" }}
          />

          {/* Purple soul glow — matches welcome overlay interior */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${!situation && !streamingText ? "opacity-100" : "opacity-0"}`}
            style={{ background: "radial-gradient(ellipse 85% 65% at 50% 45%, rgba(120,60,220,0.42) 0%, transparent 70%)" }}
          />


          <AnimatePresence mode="wait">
            {!situation && !streamingText ? (
              /* ── EXPANDED: full invitation ── */
              <motion.div
                key="hero-expanded"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 flex flex-col items-center justify-center min-h-[278px] text-center px-6 pb-8"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/65 mb-5 select-none">
                  Seek Guidance
                </p>
                <h1
                  className="text-[2.5rem] leading-[1.18] text-white text-balance mb-3"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    textShadow: "0 2px 24px rgba(0,0,0,0.65)",
                  }}
                >
                  {isFirstVisit ? "What's on\nyour heart?" : "You don't have\nto carry this alone"}
                </h1>
                <p
                  className="text-[11px] text-white/40 italic tracking-wide mt-4"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}
                >
                  The path is already here.
                </p>
              </motion.div>
            ) : (
              /* ── COMPACT: icon + heading strip ── */
              <motion.div
                key="hero-compact"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 max-w-2xl mx-auto px-5 pt-8 pb-7"
                style={{ background: "linear-gradient(160deg, hsl(265 60% 8% / 0.9) 0%, transparent 100%)" }}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/70 leading-none mb-1">Seek Guidance</p>
                <h1 className="text-[22px] font-extrabold text-foreground leading-tight tracking-tight">
                  {isFirstVisit ? "What's on your heart?" : "You don't have to carry this alone"}
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-5 pb-8">

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
                  <p className="text-[15px] text-muted-foreground leading-relaxed max-w-md mb-6">
                    {isFirstVisit
                      ? "The real answer — not the cleaned-up version. Whatever is weighing on you, bring it here exactly as it is."
                      : "Whatever weighs on your heart — a worry, a fear, a grief you can't quite name — bring it here. You are more seen and more loved than you may feel right now."}
                  </p>

                  {/* PRIMARY INPUT — type what's on your heart */}
                  <div
                    className="rounded-2xl px-4 pt-4 pb-3 flex flex-col gap-3 transition-all mb-6 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.18)]"
                    style={{ background: "rgba(255,255,255,0.055)", border: "2px solid rgba(139,92,246,0.45)", boxShadow: "0 2px 16px rgba(0,0,0,0.25)" }}
                  >
                    <p className="text-[11px] text-foreground/35 italic tracking-wide -mb-1">
                      Start where you are.
                    </p>
                    <textarea
                      value={heartInput}
                      onChange={e => setHeartInput(e.target.value)}
                      onKeyDown={handleHeartKeyDown}
                      spellCheck
                      autoCapitalize="sentences"
                      autoCorrect="on"
                      placeholder="What are you carrying that you haven't said out loud yet?"
                      rows={4}
                      data-testid="input-guidance-heart"
                      className="w-full resize-none bg-transparent text-[17px] text-foreground placeholder:text-foreground/60 outline-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      {hasSpeechSupport ? (
                        <button
                          type="button"
                          onClick={toggleHeartVoice}
                          data-testid="button-guidance-heart-voice"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all relative"
                          style={{
                            color: heartListening ? "rgb(248,113,113)" : "rgba(255,255,255,0.65)",
                            background: heartListening ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.07)",
                            border: heartListening ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          {heartListening ? (
                            <>
                              <MicOff className="w-5 h-5" />
                              <span>Stop listening</span>
                              <span className="absolute inset-0 rounded-xl animate-ping bg-red-400/10" />
                            </>
                          ) : (
                            <>
                              <Mic className="w-5 h-5" />
                              <span>Speak instead</span>
                            </>
                          )}
                        </button>
                      ) : <span />}
                      <button
                        onClick={handleHeartSubmit}
                        disabled={!heartInput.trim()}
                        data-testid="button-guidance-heart-submit"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.97]"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: heartInput.trim() ? "0 4px 18px rgba(245,158,11,0.45)" : "none" }}
                      >
                        Seek Guidance
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[12px] text-muted-foreground/80 italic text-center mb-5 -mt-1">
                    You can be honest here.
                  </p>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-border/55" />
                    <span className="text-[10px] font-semibold text-muted-foreground/65 uppercase tracking-[0.2em]">or begin with today</span>
                    <div className="flex-1 h-px bg-border/55" />
                  </div>

                  {/* Today's framework — secondary option, styled as a real card-button */}
                  <button
                    onClick={() => { window.location.href = `/guidance?situation=${encodeURIComponent(framework.guidanceHint)}`; }}
                    data-testid="button-framework-guidance-hint"
                    className="group text-left w-full rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/9 hover:border-primary/45 px-5 py-4 transition-all"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/70 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      {framework.name}
                    </p>
                    <p className="text-[14px] text-foreground/75 leading-relaxed group-hover:text-foreground transition-colors italic mb-3">
                      "{framework.guidanceHint}"
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary bg-primary/10 group-hover:bg-primary/18 px-3 py-1.5 rounded-lg transition-all">
                      Begin with this today
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Scroll anchor — initial response lands here */}
          <div ref={responseRef} className="-mt-2" />

          {/* Empathetic echo — shown once response is underway, never repeats user's words */}
          {situation && (streamingText || responseComplete) && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-[15px] text-foreground/85 italic mb-7 border-l-2 border-primary/60 pl-4 leading-relaxed"
            >
              {getEmpathyReflection(situation)}
            </motion.p>
          )}

          {/* Sacred Restraint — a breath of quiet before the response begins */}
          <AnimatePresence>
            {isReflecting && situation && (
              <motion.div
                key="presence"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.6 } }}
                transition={{ duration: 0.5 }}
                className="py-6 mb-2"
              >
                <p className="text-[15px] text-foreground/65 italic leading-relaxed">
                  Reading this carefully…
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* First pastoral response — stays here permanently once it arrives */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            {((streamingText && !isSending && !isReflecting) || assistantMessages.length > 0) && (
              <>
                {(() => {
                  const rawText = cleanResponse(isSending
                    ? (assistantMessages[0]?.content ?? "")
                    : (streamingText || (assistantMessages[0]?.content ?? ""))
                  );
                  const paras = rawText.split("\n\n").filter(p => p.trim());
                  const PREVIEW = 3;
                  const showAll = guidanceExpanded || !responseComplete || paras.length <= PREVIEW;
                  const visible = showAll ? paras : paras.slice(0, PREVIEW);
                  return (
                    <div
                      className="text-[17px] leading-[1.85] text-foreground space-y-5 max-w-[68ch]"
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
                {responseComplete && (
                  <p className="text-[11px] text-muted-foreground/75 mt-4 flex items-center gap-1.5">
                    <span>✝</span>
                    <span>Grounded in Scripture. Guided by the Holy Spirit.</span>
                  </p>
                )}
                {responseComplete && (
                  <p className="text-[12px] text-muted-foreground/45 mt-2 italic tracking-wide">
                    This meets you—but it won't move you.
                  </p>
                )}
                {responseComplete && (
                  <p className="text-[12px] text-muted-foreground/35 mt-1 italic tracking-wide">
                    Walking it is up to you.
                  </p>
                )}
                {responseComplete && verse && (
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
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">Scripture · Guidance{prayer ? " · Prayer" : ""}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={startGuidanceListen}
                      data-testid="button-guidance-listen-chain"
                      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold transition-all flex-shrink-0 ${
                        chainSection || ttsChain.loading
                          ? "bg-primary/20 text-primary hover:bg-primary/30"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      }`}
                    >
                      {ttsChain.loading || chainSection
                        ? <><VolumeX className="w-3 h-3" /> Stop</>
                        : <><Volume2 className="w-3 h-3" /> Listen instead</>
                      }
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* ── A Word For This Moment ── */}
          <AnimatePresence>
            {revealStage >= 2 && (vpLoading || verse) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10"
              >
                <p className="text-[12px] font-bold uppercase tracking-widest text-primary/90 mb-3">
                  A word for this moment
                </p>
                {vpLoading && !verse ? (
                  <div className="rounded-2xl bg-primary/8 border border-primary/25 px-6 pt-6 pb-5">
                    <p className="text-[19px] leading-relaxed font-medium text-foreground/65 italic mb-4">
                      "Be still, and know that I am God."
                    </p>
                    <p className="text-[13px] font-bold text-primary/65 tracking-wide">— Psalm 46:10</p>
                  </div>
                ) : verse ? (
                  <div
                    data-testid="card-guidance-verse"
                    className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/12 via-violet-500/8 to-indigo-500/10 border border-primary/35 px-6 pt-6 pb-5"
                  >
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-indigo-400" />
                    <p className="text-[19px] leading-relaxed font-medium text-foreground italic mb-4">
                      "{verse.text}"
                    </p>
                    <p className="text-[13px] font-bold text-primary/70 tracking-wide">
                      — {verse.reference}
                    </p>
                  </div>
                ) : null}
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

          {/* Curated resource — surfaces after deep back-and-forth */}
          {responseComplete && !isSending && (
            <ResourceSuggestionCard messages={messages} topic={situation} />
          )}

          {/* Follow-up input */}
          <AnimatePresence>
            {responseComplete && (
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
                      <p className="text-[11px] font-semibold text-foreground/60 uppercase tracking-[0.14em] mb-2 ml-1">Continue</p>
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
                          className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/90 outline-none leading-relaxed disabled:opacity-50"
                        />
                        <div className="flex items-center justify-between">
                          {hasSpeechSupport ? (
                            <button
                              type="button"
                              onClick={toggleFollowUpVoice}
                              data-testid="button-guidance-voice"
                              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all relative"
                              style={{ color: isListening ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}
                            >
                              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 opacity-60 hover:opacity-90" />}
                              {isListening && <span className="absolute inset-0 rounded-lg animate-ping bg-red-400/20" />}
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
                      {getAiUsage().count === 3 && (
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
                      Or go unlimited with Pro — anytime, as much as you need.
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── A Prayer Written For You ── */}
          <AnimatePresence>
            {responseComplete && revealStage >= 3 && (prayer || vpLoading) && (
              <motion.div
                key="prayer-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                data-testid="card-guidance-prayer"
                className="relative rounded-2xl overflow-hidden border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-background dark:from-amber-950/20 dark:via-orange-950/10 dark:to-background mb-8"
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
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3.5 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-full" />
                      <div className="h-3.5 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-5/6" />
                      <div className="h-3.5 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-full" />
                      <div className="h-3.5 bg-amber-200/60 dark:bg-amber-800/30 rounded-full w-4/5" />
                    </div>
                  ) : (
                    <>
                      <p className="text-[12px] text-amber-700/70 dark:text-amber-400/60 italic mb-4 leading-relaxed">
                        This can be your prayer — or a place to start.
                      </p>
                      <p className="text-[15px] leading-[1.8] text-foreground/90 italic mb-6">
                        {prayer}
                      </p>

                      <div className="flex items-center gap-3 flex-wrap">
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

                      <p className="text-[12px] text-amber-700/55 dark:text-amber-400/45 italic mt-4">
                        Take a moment here.
                      </p>

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
          </AnimatePresence>

          {/* Bridge text — connects the response to the journey below */}
          {responseComplete && revealStage >= 4 && (
            <p className="text-[13px] text-muted-foreground/75 leading-relaxed mb-6 -mt-2">
              Here's where I'd walk with you next.
            </p>
          )}

          {/* Journey card */}
          <AnimatePresence>
            {responseComplete && revealStage >= 4 && (journeyLoading || journey) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: responseComplete ? 0.1 : 0.5 }}
              >
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Your Personalized Journey
                </p>

                {journeyLoading ? (
                  <div className="rounded-2xl bg-violet-50/80 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-700/30 px-5 pt-5 pb-4">
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
                              <span key={ch.id} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium">
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
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Release Moment — a quiet word of release after everything has arrived */}
          <AnimatePresence>
            {responseComplete && revealStage >= 4 && journey && (
              <motion.div
                key="release"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4, duration: 1.2, ease: "easeIn" }}
                className="mt-10 mb-2 text-center"
              >
                <div className="inline-block w-8 h-px bg-border/40 mb-5" />
                <p className="text-[13px] text-muted-foreground/60 leading-relaxed">
                  You've been honest. That matters.
                </p>
                <p className="text-[13px] text-muted-foreground/45 mt-1">
                  You can carry this with you now.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Floating input bar — mobile only, docks above NavBar ── */}
      <AnimatePresence>
        {responseComplete && canUseAi() && (
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
                className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/78 outline-none leading-relaxed disabled:opacity-50"
                style={{ maxHeight: "96px", overflowY: "auto" }}
              />
              <div className="flex items-center justify-between">
                {hasSpeechSupport ? (
                  <button
                    type="button"
                    onClick={toggleFollowUpVoice}
                    data-testid="button-guidance-float-voice"
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all relative"
                    style={{ color: isListening ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 opacity-60 hover:opacity-90" />}
                    {isListening && <span className="absolute inset-0 rounded-lg animate-ping bg-red-400/20" />}
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
      {showAiPause && <AiPauseModal onClose={() => setShowAiPause(false)} />}
    </>
  );
}
