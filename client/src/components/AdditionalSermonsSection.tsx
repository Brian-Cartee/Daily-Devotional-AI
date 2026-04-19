import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Play, Share2, X, Loader2, BookOpen, ArrowRight, Headphones, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

function decodeHtml(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

interface AdditionalSermon {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  pastor: string;
}

interface Props {
  verseId: number;
  verseReference: string;
  reflectionContent: string;
  primaryChannel?: string;
}

function AdditionalSermonCard({ sermon }: { sermon: AdditionalSermon }) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [shared, setShared] = useState(false);

  const videoUrl = `https://www.youtube.com/watch?v=${sermon.videoId}`;

  const handleShare = async () => {
    const shareText = `"${decodeHtml(sermon.title)}" — ${decodeHtml(sermon.channel)}\n\nFound this message after today's devotional on Shepherd's Path.\n\nGet the app: shepherdspath.app`;
    try {
      if (navigator.share) {
        await navigator.share({ title: decodeHtml(sermon.title), text: shareText, url: videoUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${videoUrl}`);
        setShared(true);
        setTimeout(() => setShared(false), 2200);
      }
    } catch {}
  };

  return (
    <>
      <div
        className="flex gap-3 items-start rounded-2xl p-3"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Thumbnail */}
        <button
          data-testid={`btn-additional-sermon-watch-${sermon.videoId}`}
          onClick={() => setShowPlayer(true)}
          className="relative flex-shrink-0 rounded-xl overflow-hidden"
          style={{ width: 96, height: 64 }}
        >
          <img src={sermon.thumbnail} alt={decodeHtml(sermon.title)} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.38)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(245,158,11,0.9)" }}>
              <Play className="w-3.5 h-3.5 text-white" fill="white" />
            </div>
          </div>
          {sermon.duration && (
            <div
              className="absolute bottom-1 right-1 rounded text-[10px] font-semibold px-1"
              style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.85)" }}
            >
              {sermon.duration}
            </div>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug line-clamp-2" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "'Georgia', serif" }}>
            {decodeHtml(sermon.title)}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "rgba(167,139,250,0.65)" }}>
            {decodeHtml(sermon.channel)}
          </p>
        </div>

        {/* Share */}
        <button
          data-testid={`btn-additional-sermon-share-${sermon.videoId}`}
          onClick={handleShare}
          className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 transition-opacity"
          style={{
            background: shared ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
            border: shared ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.09)",
          }}
          title="Share this message"
        >
          {shared ? (
            <span className="text-[11px] font-semibold" style={{ color: "rgba(34,197,94,0.9)" }}>Copied</span>
          ) : (
            <Share2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.45)" }} />
          )}
        </button>
      </div>

      {/* Player overlay */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.94)" }}
            onClick={() => setShowPlayer(false)}
            data-testid="overlay-additional-sermon-player"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#0c0a1e", border: "1px solid rgba(124,58,237,0.25)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(0,0,0,0.5)" }}>
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-semibold text-white line-clamp-1" style={{ fontFamily: "'Georgia', serif" }}>{decodeHtml(sermon.title)}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.7)" }}>{decodeHtml(sermon.channel)}</p>
                </div>
                <button data-testid="btn-close-additional-sermon-player" onClick={() => setShowPlayer(false)} className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${sermon.videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
              </div>
              <div className="px-4 py-3 text-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                <button onClick={handleShare} className="flex items-center gap-1.5 mx-auto text-[11px]" style={{ color: "rgba(245,158,11,0.7)" }} data-testid="btn-share-from-player">
                  <Share2 className="w-3 h-3" />
                  Share this message
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface DeepPromptData {
  prompts: string[];
  scriptures: { reference: string; text: string }[];
}

function DeepStudyPrompts({ verseReference, reflectionContent }: { verseReference: string; reflectionContent: string }) {
  const [, navigate] = useLocation();
  const [data, setData] = useState<DeepPromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customQ, setCustomQ] = useState("");
  const customRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/study/deep-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verseReference, reflectionContent: reflectionContent?.slice(0, 300) }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ prompts: [], scriptures: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [verseReference]);

  const goToGuidance = (question: string) => {
    navigate(`/guidance?situation=${encodeURIComponent(question)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-4 rounded-2xl overflow-hidden"
      style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(167,139,250,0.3)" }}
        >
          <Sparkles className="w-3 h-3" style={{ color: "rgba(167,139,250,0.9)" }} />
        </div>
        <span className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(167,139,250,0.8)" }}>
          Explore Further
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-5">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(167,139,250,0.5)" }} />
        </div>
      ) : (
        <div className="px-3.5 pb-3.5 space-y-4">

          {/* Study prompt chips */}
          {data?.prompts && data.prompts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.50)" }}>Study prompts</p>
              <div className="flex flex-wrap gap-2">
                {data.prompts.map((prompt, i) => (
                  <button
                    key={i}
                    data-testid={`btn-deep-prompt-${i}`}
                    onClick={() => goToGuidance(prompt)}
                    className="text-left px-3 py-2 rounded-xl text-[13px] leading-snug transition-all active:scale-[0.97]"
                    style={{
                      background: "rgba(124,58,237,0.15)",
                      border: "1px solid rgba(167,139,250,0.25)",
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related scriptures */}
          {data?.scriptures && data.scriptures.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.50)" }}>Related scripture</p>
              <div className="space-y-2">
                {data.scriptures.map((s, i) => (
                  <button
                    key={i}
                    data-testid={`btn-deep-scripture-${i}`}
                    onClick={() => goToGuidance(`Help me understand and reflect on ${s.reference}: "${s.text}"`)}
                    className="w-full text-left px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p className="text-[12px] font-bold mb-0.5" style={{ color: "rgba(167,139,250,0.85)" }}>{s.reference}</p>
                    <p className="text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                      "{s.text}"
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom question bar */}
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.50)" }}>Ask your own question</p>
            <div className="flex gap-2">
              <input
                ref={customRef}
                data-testid="input-explore-further"
                value={customQ}
                onChange={e => setCustomQ(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && customQ.trim()) goToGuidance(customQ.trim()); }}
                placeholder={`Something about ${verseReference}…`}
                className="flex-1 bg-transparent outline-none text-[16px] placeholder:text-white/35"
                style={{
                  color: "rgba(255,255,255,0.85)",
                  borderBottom: "1px solid rgba(167,139,250,0.3)",
                  paddingBottom: "4px",
                }}
              />
              <button
                data-testid="btn-explore-further-send"
                onClick={() => { if (customQ.trim()) goToGuidance(customQ.trim()); }}
                disabled={!customQ.trim()}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-opacity disabled:opacity-30"
                style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(167,139,250,0.4)" }}
              >
                <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(167,139,250,0.9)" }} />
              </button>
            </div>
          </div>

        </div>
      )}
    </motion.div>
  );
}

async function fetchSermons(body: object): Promise<AdditionalSermon[]> {
  const res = await apiRequest("POST", "/api/sermon/additional", body);
  const data = await res.json();
  return data.found && data.sermons?.length ? data.sermons : [];
}

export function AdditionalSermonsSection({ verseId, verseReference, reflectionContent, primaryChannel }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Auto-curated clips state
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoSermons, setAutoSermons] = useState<AdditionalSermon[]>([]);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [autoFailed, setAutoFailed] = useState(false);

  // Custom topic search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchSermons, setSearchSermons] = useState<AdditionalSermon[]>([]);
  const [searchFailed, setSearchFailed] = useState(false);
  const [lastSearched, setLastSearched] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExpand = async () => {
    setExpanded(true);
    if (autoLoaded || autoLoading) return;
    setAutoLoading(true);
    try {
      const results = await fetchSermons({
        verseId,
        date: new Date().toISOString().slice(0, 10),
        reflectionContext: reflectionContent?.slice(0, 400),
        primaryPastor: primaryChannel || "",
      });
      if (results.length) setAutoSermons(results);
      else setAutoFailed(true);
    } catch {
      setAutoFailed(true);
    } finally {
      setAutoLoading(false);
      setAutoLoaded(true);
    }
  };

  const handleTopicSearch = async () => {
    const topic = searchQuery.trim();
    if (!topic || searchLoading) return;
    setSearchLoading(true);
    setSearchSermons([]);
    setSearchFailed(false);
    setLastSearched(topic);
    try {
      const results = await fetchSermons({
        verseId,
        date: new Date().toISOString().slice(0, 10),
        customTopic: topic,
      });
      if (results.length) setSearchSermons(results);
      else setSearchFailed(true);
    } catch {
      setSearchFailed(true);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="mt-3">
      {/* Collapsed trigger */}
      {!expanded && (
        <button
          data-testid="btn-go-deeper-expand"
          onClick={handleExpand}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-opacity active:opacity-70"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <BookOpen className="w-3.5 h-3.5" style={{ color: "rgba(245,158,11,0.75)" }} />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.78)" }}>Go Deeper</p>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.50)" }}>More voices · search any topic</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
        </button>
      )}

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            {/* Header + collapse */}
            <button
              data-testid="btn-go-deeper-collapse"
              onClick={() => setExpanded(false)}
              className="w-full flex items-center justify-between px-1 pb-2.5 pt-0.5"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" style={{ color: "rgba(245,158,11,0.85)" }} />
                <span className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Go Deeper
                </span>
              </div>
              <ChevronDown className="w-4 h-4 rotate-180 transition-transform" style={{ color: "rgba(255,255,255,0.50)" }} />
            </button>

            {/* Auto-curated clips */}
            {autoLoading && (
              <div className="flex items-center gap-2.5 py-5 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(245,158,11,0.5)" }} />
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.50)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                  Finding more voices…
                </span>
              </div>
            )}

            {!autoLoading && autoFailed && (
              <p className="text-center text-[13px] py-4" style={{ color: "rgba(255,255,255,0.32)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                Nothing curated for today — use the search below to go your own direction.
              </p>
            )}

            {!autoLoading && autoSermons.length > 0 && (
              <div className="space-y-2.5">
                {autoSermons.map(s => <AdditionalSermonCard key={s.videoId} sermon={s} />)}
                <p className="text-center text-[13px] pt-0.5" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                  Tap the share icon to send a message to someone who needs it today.
                </p>
              </div>
            )}

            {/* ── Explore Further: AI prompts + related scripture ── */}
            {autoLoaded && (
              <DeepStudyPrompts
                verseReference={verseReference}
                reflectionContent={reflectionContent}
              />
            )}

            {/* ── Topic Search ─────────────────────────────────────── */}
            <div
              className="mt-3.5 rounded-2xl px-3.5 py-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <Headphones className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(245,158,11,0.85)" }} />
                <span className="text-[12px] font-bold uppercase tracking-[0.13em]" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Search · Audio &amp; Podcasts
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  data-testid="input-topic-search"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleTopicSearch(); }}
                  placeholder="anxiety, identity, surrender, marriage…"
                  className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/45"
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: "'Georgia', serif",
                    borderBottom: "1px solid rgba(255,255,255,0.2)",
                    paddingBottom: "4px",
                  }}
                />
                <button
                  data-testid="btn-topic-search-submit"
                  onClick={handleTopicSearch}
                  disabled={!searchQuery.trim() || searchLoading}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-opacity disabled:opacity-30"
                  style={{ background: "rgba(245,158,11,0.25)", border: "1px solid rgba(245,158,11,0.5)" }}
                >
                  {searchLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "rgba(245,158,11,0.8)" }} />
                    : <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(245,158,11,0.9)" }} />
                  }
                </button>
              </div>
            </div>

            {/* Search results */}
            <AnimatePresence>
              {(searchSermons.length > 0 || searchFailed) && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 space-y-2.5"
                >
                  {lastSearched && (
                    <p className="text-[11px] px-1" style={{ color: "rgba(255,255,255,0.28)" }}>
                      Results for <span style={{ color: "rgba(245,158,11,0.6)" }}>"{lastSearched}"</span>
                    </p>
                  )}
                  {searchFailed && (
                    <p className="text-center text-[13px] py-3" style={{ color: "rgba(255,255,255,0.32)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                      Nothing found — try a different word or phrase.
                    </p>
                  )}
                  {searchSermons.map(s => <AdditionalSermonCard key={s.videoId} sermon={s} />)}
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
