import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Send, Loader2, BookOpen, Play, Volume2, VolumeX, BookMarked, CheckCheck, Share2 } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { ShepherdCrookMark } from "@/components/ShepherdCrookMark";
import { detectCrisis } from "@/lib/crisis";
import { getUserName } from "@/lib/userName";
import { getSessionId } from "@/lib/session";
import { type Journey } from "@/data/journeys";
import { ShareInviteCard } from "@/components/ShareInviteCard";
import { useTTS } from "@/hooks/use-tts";
import { apiRequest } from "@/lib/queryClient";

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
}

interface VerseResult {
  reference: string;
  text: string;
}

function ShareThisMomentButton({ verse, prayer }: { verse: VerseResult; prayer: string }) {
  const [shared, setShared] = useState(false);

  const shareText = () => {
    const prayerSnippet = prayer.split(". ").slice(0, 3).join(". ") + (prayer.split(". ").length > 3 ? "…" : "");
    return `"${verse.text}"\n— ${verse.reference}\n\n${prayerSnippet}\n\nFrom Shepherd's Path · shepherdspathai.com`;
  };

  const handleShare = async () => {
    const text = shareText();
    if (navigator.share) {
      try { await navigator.share({ title: "A word for my moment", text }); setShared(true); } catch { }
    } else {
      navigator.clipboard.writeText(text).then(() => { setShared(true); setTimeout(() => setShared(false), 2500); }).catch(() => { });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <button
        onClick={handleShare}
        data-testid="button-share-guidance-moment"
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/25 py-3.5 text-[13px] font-semibold text-primary/70 hover:text-primary hover:border-primary/40 hover:bg-primary/4 transition-all"
      >
        {shared ? (
          <><CheckCheck className="w-4 h-4 text-green-500" /><span className="text-green-600">Shared!</span></>
        ) : (
          <><Share2 className="w-4 h-4" />Share this verse &amp; prayer</>
        )}
      </button>
    </motion.div>
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function decodeHtml(html: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

export default function GuidancePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const situation = params.get("situation") ?? "";
  const [, navigate] = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [responseComplete, setResponseComplete] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const userName = getUserName() ?? undefined;

  const [journey, setJourney] = useState<Journey | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(true);

  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosFetched, setVideosFetched] = useState(false);

  const [verse, setVerse] = useState<VerseResult | null>(null);
  const [prayer, setPrayer] = useState<string | null>(null);
  const [vpLoading, setVpLoading] = useState(true);
  const [prayerSaved, setPrayerSaved] = useState(false);

  const tts = useTTS();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const latestResponseRef = useRef<HTMLDivElement>(null);
  const hasScrolledInitial = useRef(false);
  const hasScrolledFollowUp = useRef(0);

  const streamResponse = async (conversationMessages: Message[]) => {
    setStreamingText("");
    setResponseComplete(false);
    try {
      const res = await fetch("/api/guidance/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, messages: conversationMessages, userName, sessionId: getSessionId() }),
      });
      if (res.status === 429) {
        setStreamingText("You've sent a lot of requests recently. Please wait a few minutes and try again.");
        setResponseComplete(true);
        return;
      }
      if (!res.ok || !res.body) {
        setStreamingText("Something went wrong reaching our servers. Please go back and try again, or check your connection.");
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
        setStreamingText("We weren't able to generate a response right now. Please try again in a moment.");
        setResponseComplete(true);
        return;
      }
      setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
      setStreamingText("");
      setResponseComplete(true);
    } catch {
      setStreamingText("Something went wrong. Please check your connection and try again.");
      setResponseComplete(true);
    }
  };

  // Scroll to top immediately when page loads with a situation
  useEffect(() => {
    if (situation.trim()) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, []);

  useEffect(() => {
    if (!situation.trim()) return;

    const initialUserMsg: Message = { role: "user", content: situation };
    setMessages([initialUserMsg]);
    streamResponse([initialUserMsg]);

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

  // Fetch sermon videos once the pastoral response finishes streaming
  useEffect(() => {
    if (!responseComplete || videosFetched || !situation.trim()) return;
    setVideosFetched(true);
    setVideosLoading(true);
    fetch("/api/guidance/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: situation.trim(), sessionId: getSessionId() }),
    })
      .then(r => r.json())
      .then((data: { videos: VideoResult[] }) => {
        setVideos(data.videos ?? []);
        setVideosLoading(false);
      })
      .catch(() => setVideosLoading(false));
  }, [responseComplete]);

  // Scroll initial response into view as soon as it starts streaming
  useEffect(() => {
    if (!streamingText || isSending || hasScrolledInitial.current) return;
    hasScrolledInitial.current = true;
    setTimeout(() => {
      responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [streamingText, isSending]);

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

  const handleSend = async () => {
    const text = followUp.trim();
    if (!text || isSending) return;
    setFollowUp("");
    setIsSending(true);
    const newUserMsg: Message = { role: "user", content: text };
    const updated = [...messages, newUserMsg];
    setMessages(updated);
    await streamResponse(updated);
    setIsSending(false);
    setTimeout(() => inputRef.current?.focus(), 100);
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
      // silently ignore
    }
  };

  const assistantMessages = messages.filter(m => m.role === "assistant");

  // Skip initial user message AND first AI response — only follow-up exchanges go here
  const conversationThread = messages.slice(2);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-background pt-16 pb-32">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Header — pastoral welcome */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <ShepherdCrookMark className="w-6 h-6 opacity-80" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Seek Guidance</span>
            </div>
            <AnimatePresence>
              {!responseComplete && !streamingText && (
                <motion.div
                  key="burden-intro"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <h1 className="text-[1.7rem] font-black text-foreground leading-tight tracking-tight mb-2">
                    Lay Your Burdens Down
                  </h1>
                  <p className="text-[14px] text-muted-foreground leading-relaxed max-w-md">
                    Whatever weighs on your heart — a worry, a fear, a grief you can't quite name — you don't carry it alone. Share it here. A word from Scripture and a prayer written for this moment await.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Scroll anchor — initial response lands here */}
          <div ref={responseRef} className="-mt-2" />

          {/* Their situation — subtle echo */}
          {situation && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-muted-foreground italic mb-8 border-l-2 border-primary/30 pl-3"
            >
              "{situation}"
            </motion.p>
          )}

          {/* ── A Word For This Moment ── */}
          <AnimatePresence>
            {(vpLoading || verse) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-3">
                  A word for this moment
                </p>
                {vpLoading && !verse ? (
                  <div className="rounded-2xl bg-primary/5 border border-primary/15 p-6 animate-pulse">
                    <div className="h-4 bg-primary/10 rounded-full w-3/4 mb-3" />
                    <div className="h-4 bg-primary/10 rounded-full w-full mb-2" />
                    <div className="h-4 bg-primary/10 rounded-full w-5/6" />
                  </div>
                ) : verse ? (
                  <div
                    data-testid="card-guidance-verse"
                    className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/8 via-violet-500/5 to-indigo-500/8 border border-primary/20 px-6 pt-6 pb-5"
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

          {/* First pastoral response — stays here permanently once it arrives */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            {((streamingText && !isSending) || assistantMessages.length > 0) && (
              <>
                <div className="text-[17px] leading-relaxed text-foreground space-y-4" data-testid="text-guidance-response">
                  {(isSending
                    ? (assistantMessages[0]?.content ?? "")
                    : (streamingText || (assistantMessages[0]?.content ?? ""))
                  ).split("\n\n").map((para, i) =>
                    para.trim() ? <p key={i}>{para}</p> : null
                  )}
                  {!responseComplete && !isSending && (
                    <span className="inline-block w-1.5 h-5 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
                {responseComplete && (
                  <p className="text-[11px] text-muted-foreground/60 mt-4 flex items-center gap-1.5">
                    <span>✝</span>
                    <span>Grounded in Scripture. Guided by the Holy Spirit.</span>
                  </p>
                )}
              </>
            )}
          </motion.div>

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
                  <div className="text-[16px] leading-relaxed text-foreground space-y-3">
                    {msg.content.split("\n\n").map((para, j) =>
                      para.trim() ? <p key={j}>{para}</p> : null
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {/* Streaming follow-up */}
            {isSending && streamingText && (
              <motion.div key="streaming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6" ref={latestResponseRef}>
                <div className="text-[16px] leading-relaxed text-foreground space-y-3">
                  {streamingText.split("\n\n").map((para, j) =>
                    para.trim() ? <p key={j}>{para}</p> : null
                  )}
                  <span className="inline-block w-1.5 h-5 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-middle" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Follow-up input */}
          <AnimatePresence>
            {responseComplete && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-10"
              >
                <div className="bg-card border border-border rounded-2xl p-3 flex items-end gap-2 shadow-sm">
                  <textarea
                    ref={inputRef}
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    spellCheck
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    onKeyDown={handleKeyDown}
                    placeholder="Share more, ask a question, or just talk…"
                    rows={2}
                    disabled={isSending}
                    data-testid="input-guidance-followup"
                    className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed py-1 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!followUp.trim() || isSending}
                    data-testid="button-guidance-send"
                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── A Prayer Written For You ── */}
          <AnimatePresence>
            {responseComplete && (prayer || vpLoading) && (
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
                      <p className="text-[15px] leading-relaxed text-foreground/90 italic mb-5">
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
                          {tts.playing ? "Stop" : "Pray This Aloud"}
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

          {/* Bridge text — connects the response to the journey + videos below */}
          {responseComplete && (
            <p className="text-sm text-muted-foreground/75 italic leading-relaxed mb-6 -mt-2">
              The scripture journey below was shaped around everything you've just shared — take your time with it.
              Curated sermons and teachings are also waiting further down as additional support, whenever you feel led to go deeper.
            </p>
          )}

          {/* Journey card */}
          <AnimatePresence>
            {(journeyLoading || journey) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: responseComplete ? 0.1 : 0.5 }}
              >
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Your Personalized Journey
                </p>

                {journeyLoading ? (
                  <div className="rounded-2xl bg-violet-50/80 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-700/30 p-5">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                      <span className="text-sm">Crafting your scripture journey…</span>
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
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-600 group-hover:bg-violet-700 text-white flex items-center justify-center transition-colors mt-1">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Watch & Listen — sermon/video recommendations */}
          <AnimatePresence>
            {responseComplete && (videosLoading || videos.length > 0) && (
              <motion.div
                key="videos-section"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-8"
              >
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                  Teaching for Your Season
                </p>
                <p className="text-[12px] text-muted-foreground/60 mb-3">Curated sermons and teachings matched to what you shared</p>

                {videosLoading ? (
                  <div className="rounded-2xl bg-card border border-border p-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
                      <span className="text-sm">Finding relevant sermons…</span>
                    </div>
                  </div>
                ) : videos.length === 0 ? null : (
                  <div className="space-y-3">
                    {videos.map((video) => (
                      <a
                        key={video.videoId}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-video-${video.videoId}`}
                        className="flex items-start gap-3 rounded-2xl bg-card border border-border p-3 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                      >
                        <div className="relative flex-shrink-0 w-24 rounded-xl overflow-hidden aspect-video bg-muted">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                              <Play className="w-3 h-3 text-primary fill-primary ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {decodeHtml(video.title)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{decodeHtml(video.channelTitle)}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Share This Moment ── */}
          {responseComplete && verse && prayer && (
            <ShareThisMomentButton verse={verse} prayer={prayer} />
          )}

          {/* Share nudge — appears once the response is complete */}
          {responseComplete && <ShareInviteCard />}

          <div ref={bottomRef} />
        </div>
      </main>
    </>
  );
}
