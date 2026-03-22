import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Send, Loader2, BookOpen, Play } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { detectCrisis } from "@/lib/crisis";
import { getUserName } from "@/lib/userName";
import { type Journey } from "@/data/journeys";
import { ShareInviteCard } from "@/components/ShareInviteCard";

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const streamResponse = async (conversationMessages: Message[]) => {
    setStreamingText("");
    setResponseComplete(false);
    try {
      const res = await fetch("/api/guidance/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, messages: conversationMessages, userName }),
      });
      if (!res.ok || !res.body) return;
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
      setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
      setStreamingText("");
      setResponseComplete(true);
    } catch {
      setStreamingText("Something went wrong. Please try again.");
      setResponseComplete(true);
    }
  };

  useEffect(() => {
    if (!situation.trim()) return;

    const initialUserMsg: Message = { role: "user", content: situation };
    setMessages([initialUserMsg]);
    streamResponse([initialUserMsg]);

    // Pre-generate journey in the background
    fetch("/api/journey/life-season", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: situation.trim() }),
    })
      .then(r => r.json())
      .then((j: Journey) => {
        sessionStorage.setItem("sp-guidance-journey", JSON.stringify(j));
        setJourney(j);
        setJourneyLoading(false);
      })
      .catch(() => setJourneyLoading(false));

  }, []);

  // Fetch sermon videos once the pastoral response finishes streaming
  useEffect(() => {
    if (!responseComplete || videosFetched || !situation.trim()) return;
    setVideosFetched(true);
    setVideosLoading(true);
    fetch("/api/guidance/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: situation.trim() }),
    })
      .then(r => r.json())
      .then((data: { videos: VideoResult[] }) => {
        setVideos(data.videos ?? []);
        setVideosLoading(false);
      })
      .catch(() => setVideosLoading(false));
  }, [responseComplete]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingText, messages, responseComplete]);

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

  const assistantMessages = messages.filter(m => m.role === "assistant");
  const userFollowUps = messages.filter((m, i) => m.role === "user" && i > 0);

  // Interlace the conversation after the first assistant message
  const conversationThread = messages.slice(1); // skip the initial user message

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-background pt-16 pb-32">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Header — SP branding */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-6"
          >
            <img src="/sp-logo-mark.png" alt="Shepherd's Path" className="w-6 h-6 opacity-80" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Shepherd's Path</span>
          </motion.div>

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

          {/* First pastoral response */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            {(streamingText || (assistantMessages.length > 0 && !conversationThread.length)) && (
              <div className="text-[17px] leading-relaxed text-foreground space-y-4" data-testid="text-guidance-response">
                {(streamingText || (assistantMessages[0]?.content ?? "")).split("\n\n").map((para, i) =>
                  para.trim() ? <p key={i}>{para}</p> : null
                )}
                {!responseComplete && (
                  <span className="inline-block w-1.5 h-5 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-middle" />
                )}
              </div>
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
              <motion.div key="streaming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
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
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Watch &amp; Listen
                </p>

                {videosLoading ? (
                  <div className="rounded-2xl bg-card border border-border p-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
                      <span className="text-sm">Finding relevant sermons…</span>
                    </div>
                  </div>
                ) : (
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
                            {video.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{video.channelTitle}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Share nudge — appears once the response is complete */}
          {responseComplete && <ShareInviteCard />}

          <div ref={bottomRef} />
        </div>
      </main>
    </>
  );
}
