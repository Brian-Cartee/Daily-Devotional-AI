import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Loader2, BookOpen, ChevronDown, Check } from "lucide-react";
import { useLocation } from "wouter";
import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";

interface Sermon {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  theme: string;
  framing: string;
}

interface DailySermonCardProps {
  verseId: number;
  verseReference: string;
  reflectionContent: string;
}

// ── Sermon usage tracking — counts unique verse IDs with sermon shown ─────────
const SERMON_LIMIT = 3;
const SERMON_REFS_KEY = "sp_sermon_verse_ids";

function getSermonVerseIds(): number[] {
  try { return JSON.parse(localStorage.getItem(SERMON_REFS_KEY) || "[]"); } catch { return []; }
}

function recordSermonVerseId(verseId: number): void {
  try {
    const ids = getSermonVerseIds();
    if (!ids.includes(verseId)) {
      ids.push(verseId);
      localStorage.setItem(SERMON_REFS_KEY, JSON.stringify(ids));
    }
  } catch {}
}

function isSermonGated(verseId: number): boolean {
  if (isProVerifiedLocally()) return false;
  const ids = getSermonVerseIds();
  return ids.length >= SERMON_LIMIT && !ids.includes(verseId);
}

// ── Closing prayer template ──────────────────────────────────────────────────
const closingPrayer = (theme: string) =>
  `Lord, take what was shared today about ${theme}.\n\nLet it be more than something I heard — let it find the place in me that needs it most. I don't want to just receive good words. I want to live them.\n\nAmen.`;

// ── Sermon bridge card — shown inside the card when limit is reached ─────────
function SermonBridgeCard({ sermon }: { sermon: Sermon }) {
  const [, setLocation] = useLocation();
  return (
    <div className="space-y-4">
      {/* Preview: thumbnail visible but softened — creates desire, no pressure */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.06)", aspectRatio: "16/9" }}
      >
        <img
          src={sermon.thumbnail}
          alt={sermon.title}
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.25) blur(2px)", transform: "scale(1.05)" }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/40">
            {sermon.channel}
          </p>
          <p
            className="text-[15px] font-semibold leading-snug line-clamp-3"
            style={{ color: "rgba(255,255,255,0.70)", fontFamily: "'Georgia', serif" }}
          >
            {sermon.title}
          </p>
        </div>
      </div>

      {/* Bridge moment */}
      <div className="space-y-3 pt-1">
        <p
          className="text-[14px] leading-[1.85]"
          style={{ color: "rgba(255,255,255,0.72)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}
        >
          These messages are chosen to meet you where you are — after your reflection,
          after your prayer, at the moment when something might actually land.
        </p>
        <p
          className="text-[14px] leading-[1.85]"
          style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Georgia', serif" }}
        >
          If you want to keep receiving one — just like this — that's what Pro is for.
        </p>
      </div>

      {/* CTA */}
      <div className="space-y-2 pt-1">
        <button
          data-testid="button-sermon-go-deeper"
          onClick={() => setLocation("/pricing")}
          className="w-full py-3.5 rounded-2xl font-bold text-[15px] text-white transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}
        >
          Continue deeper →
        </button>
        <p
          className="text-center text-[11px] pt-1"
          style={{ color: "rgba(167,139,250,0.35)" }}
        >
          Your reflection, prayer, and study continue as before
        </p>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function DailySermonCard({ verseId, verseReference, reflectionContent }: DailySermonCardProps) {
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [stage, setStage] = useState<"idle" | "watched" | "journaled">("idle");
  const [journalText, setJournalText] = useState("");
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [gated, setGated] = useState(false);
  const fetchedRef = useRef(false);
  const cacheKey = `sermon_daily_${new Date().toISOString().slice(0, 10)}_${verseId}`;

  useEffect(() => {
    if (fetchedRef.current || !reflectionContent || !verseId) return;

    const limited = isSermonGated(verseId);
    setGated(limited);

    // Try sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setSermon(JSON.parse(cached));
        if (!limited) recordSermonVerseId(verseId);
        return;
      }
    } catch {}

    fetchedRef.current = true;
    setLoading(true);

    fetch("/api/sermon/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verseId,
        date: new Date().toISOString().slice(0, 10),
        reflectionContext: reflectionContent,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.found && data.sermon) {
          setSermon(data.sermon);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(data.sermon)); } catch {}
          if (!limited) recordSermonVerseId(verseId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [verseId, reflectionContent]);

  const saveJournal = async () => {
    if (!journalText.trim() || journalSaving) return;
    setJournalSaving(true);
    try {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          type: "note",
          title: `Message Reflection — ${verseReference}`,
          content: journalText.trim(),
          reference: verseReference,
        }),
      });
      setJournalSaved(true);
      setStage("journaled");
    } catch {}
    setJournalSaving(false);
  };

  if (!loading && !sermon) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl overflow-hidden mt-2"
        style={{
          background: "linear-gradient(160deg, #0c0a1e 0%, #15102e 60%, #0c0a1e 100%)",
          border: "1px solid rgba(139, 92, 246, 0.18)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        }}
        data-testid="card-daily-sermon"
      >
        {/* Accent bar */}
        <div className="h-0.5" style={{ background: "linear-gradient(90deg, #7c3aed, #a78bfa40, transparent)" }} />

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(124,58,237,0.2)" }}>
              <BookOpen className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(167,139,250,0.75)" }}>
              A Message Found For You
            </span>
          </div>
          <button
            data-testid="btn-collapse-sermon"
            onClick={() => setCollapsed(c => !c)}
            className="text-white/25 hover:text-white/50 transition-colors"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Loading skeleton */}
              {loading && !sermon && (
                <div className="px-5 pb-5 pt-3 space-y-3">
                  <div className="h-4 rounded-full bg-white/5 animate-pulse w-3/4" />
                  <div className="h-4 rounded-full bg-white/5 animate-pulse w-1/2" />
                  <div className="rounded-2xl bg-white/5 animate-pulse" style={{ aspectRatio: "16/9" }} />
                </div>
              )}

              {sermon && (
                <div className="px-5 pb-5 pt-3 space-y-4">

                  {/* ── GATED: preview with bridge card ── */}
                  {gated ? (
                    <SermonBridgeCard sermon={sermon} />
                  ) : (
                    <>
                      {/* Framing text */}
                      {sermon.framing && (
                        <p
                          className="text-[14px] leading-relaxed"
                          style={{ color: "rgba(255,255,255,0.78)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}
                        >
                          {sermon.framing}
                        </p>
                      )}

                      {/* Thumbnail / Player trigger */}
                      <div
                        className="relative rounded-2xl overflow-hidden cursor-pointer group"
                        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                        onClick={() => setShowPlayer(true)}
                        data-testid="btn-play-sermon"
                      >
                        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                          <img
                            src={sermon.thumbnail}
                            alt={sermon.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            style={{ filter: "brightness(0.55)" }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{ background: "linear-gradient(to top, rgba(12,10,30,0.95) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)" }}
                          />
                          {/* Play button */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                              className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl"
                              style={{ background: "rgba(124,58,237,0.85)", boxShadow: "0 6px 30px rgba(124,58,237,0.5)" }}
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Play className="w-7 h-7 text-white fill-white ml-1" />
                            </motion.div>
                          </div>
                          {sermon.duration && (
                            <span
                              className="absolute bottom-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ background: "rgba(0,0,0,0.8)", color: "rgba(255,255,255,0.9)" }}
                            >
                              {sermon.duration}
                            </span>
                          )}
                        </div>
                        <div className="px-3.5 py-3" style={{ background: "rgba(0,0,0,0.5)" }}>
                          <p className="text-[13px] font-semibold leading-snug line-clamp-2" style={{ color: "rgba(255,255,255,0.88)", fontFamily: "'Georgia', serif" }}>
                            {sermon.title}
                          </p>
                          <p className="text-[11px] mt-1" style={{ color: "rgba(167,139,250,0.7)" }}>
                            {sermon.channel}
                          </p>
                        </div>
                      </div>

                      {/* "I've finished watching" */}
                      {stage === "idle" && (
                        <button
                          data-testid="btn-finished-watching"
                          onClick={() => setStage("watched")}
                          className="w-full text-center text-[12px] py-2 rounded-xl transition-colors"
                          style={{ color: "rgba(167,139,250,0.5)", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.12)" }}
                        >
                          I've finished watching
                        </button>
                      )}

                      {/* Post-watch: journal prompt */}
                      <AnimatePresence>
                        {stage === "watched" && !journalSaved && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-3"
                          >
                            <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                              What stayed with you?
                            </p>
                            <div
                              className="rounded-xl border px-3.5 py-3 transition-colors focus-within:border-purple-500/50"
                              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(124,58,237,0.2)" }}
                            >
                              <textarea
                                data-testid="textarea-sermon-reflection"
                                value={journalText}
                                onChange={e => setJournalText(e.target.value)}
                                placeholder="A moment that landed, a question it raised, something you want to hold onto…"
                                rows={3}
                                className="w-full resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-white/20"
                                style={{ color: "rgba(255,255,255,0.78)" }}
                              />
                            </div>
                            <button
                              data-testid="btn-save-sermon-reflection"
                              onClick={saveJournal}
                              disabled={!journalText.trim() || journalSaving}
                              className="w-full py-3 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                              style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)", color: "white", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}
                            >
                              {journalSaving
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                                : <>Save to journal</>
                              }
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Closing prayer */}
                      <AnimatePresence>
                        {stage === "journaled" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="rounded-2xl px-4 py-4 space-y-2"
                            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Check className="w-3.5 h-3.5" style={{ color: "rgba(167,139,250,0.7)" }} />
                              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.6)" }}>Saved to journal</span>
                            </div>
                            {closingPrayer(sermon.theme).split("\n").map((line, i) =>
                              line.trim() ? (
                                <p key={i} className="text-[14px] leading-[1.9]" style={{ color: "rgba(255,255,255,0.68)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                                  {line}
                                </p>
                              ) : null
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Full-screen YouTube player */}
      <AnimatePresence>
        {showPlayer && sermon && !gated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.94)" }}
            onClick={() => setShowPlayer(false)}
            data-testid="overlay-sermon-player"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#0c0a1e", border: "1px solid rgba(124,58,237,0.25)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(0,0,0,0.5)" }}>
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-semibold text-white line-clamp-1" style={{ fontFamily: "'Georgia', serif" }}>{sermon.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.7)" }}>{sermon.channel}</p>
                </div>
                <button
                  data-testid="btn-close-sermon-player"
                  onClick={() => setShowPlayer(false)}
                  className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                >
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
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  When you're done — close and tell us what stayed with you
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
