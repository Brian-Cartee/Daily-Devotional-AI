import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Share2, ArrowLeft, Heart, BookOpen, Loader2, Palette, Sparkles, Wand2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createShareImage, createPurpleShareImage } from "@/lib/shareImage";

const FALLBACK_IMG = "/daily-art/natural-sunset.jpg";

const CALLING_CARDS = [
  {
    id: 1,
    message: "Sharing is caring… but more than that — it's our calling.",
    verseText: "Go and make disciples of all nations.",
    scripture: "Matthew 28:19",
    meaning: "We are called to go, to share truth and hope with the world.",
    shareText: "Sharing is caring… but more than that — it's our calling.\n\n\"Go and make disciples of all nations.\"\n— Matthew 28:19\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 2,
    message: "Care enough to share. Called enough to act.",
    verseText: "Faith by itself, if it is not accompanied by action, is dead.",
    scripture: "James 2:17",
    meaning: "Faith without action is empty. Our care for others shows in what we do.",
    shareText: "Care enough to share. Called enough to act.\n\n\"Faith by itself, if it is not accompanied by action, is dead.\"\n— James 2:17\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 3,
    message: "Sharing hope isn't optional — it's part of the calling.",
    verseText: "Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you have.",
    scripture: "1 Peter 3:15",
    meaning: "Hope is meant to be shared. Always be ready to give a reason for the hope you carry.",
    shareText: "Sharing hope isn't optional — it's part of the calling.\n\n\"Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you have.\"\n— 1 Peter 3:15\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 4,
    message: "We don't just share… we serve, we care, we answer the call.",
    verseText: "Serve one another humbly in love.",
    scripture: "Galatians 5:13",
    meaning: "Sharing is an act of service. Use your freedom to serve one another in love.",
    shareText: "We don't just share… we serve, we care, we answer the call.\n\n\"Serve one another humbly in love.\"\n— Galatians 5:13\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 5,
    message: "Share the Word. Answer the Call.",
    verseText: "How can they believe in the one of whom they have not heard?",
    scripture: "Romans 10:14",
    meaning: "People need to hear. How can they believe if no one tells them?",
    shareText: "Share the Word. Answer the Call.\n\n\"How can they believe in the one of whom they have not heard?\"\n— Romans 10:14\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 6,
    message: "What you share could change a life.",
    verseText: "A generous person will prosper; whoever refreshes others will be refreshed.",
    scripture: "Proverbs 11:25",
    meaning: "A generous person prospers. Whoever refreshes others will themselves be refreshed.",
    shareText: "What you share could change a life.\n\n\"A generous person will prosper; whoever refreshes others will be refreshed.\"\n— Proverbs 11:25\n\nShepherd's Path · shepherdspath.app",
  },
  {
    id: 7,
    message: "Carry one another. Share what matters.",
    verseText: "Carry each other's burdens, and in this way you will fulfill the law of Christ.",
    scripture: "Galatians 6:2",
    meaning: "We were never meant to walk this alone. Carry each other's burdens.",
    shareText: "Carry one another. Share what matters.\n\n\"Carry each other's burdens, and in this way you will fulfill the law of Christ.\"\n— Galatians 6:2\n\nShepherd's Path · shepherdspath.app",
  },
];

interface GeneratedCard {
  message: string;
  verseText: string;
  scripture: string;
  meaning: string;
  shareText: string;
}

type LoadingKey = `${number}-${"purple" | "art"}` | `gen-${"purple" | "art"}`;

async function doImageShare(blob: Blob, title: string, fallbackText: string) {
  const file = new File([blob], "shepherds-path.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return;
  }
  if (navigator.share) {
    await navigator.share({ text: fallbackText });
  } else {
    navigator.clipboard?.writeText(fallbackText).catch(() => {});
  }
}

export default function CallingPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState<LoadingKey | null>(null);
  const [sharingScripture, setSharingScripture] = useState(false);
  const [artUrl, setArtUrl] = useState<string>(FALLBACK_IMG);
  const [artLoaded, setArtLoaded] = useState(false);

  // Generate-your-own state
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedCard | null>(null);
  const [genError, setGenError] = useState("");
  const generatedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/daily-art")
      .then(r => r.json())
      .then(data => {
        if (data.imageUrl) { setArtUrl(data.imageUrl); setArtLoaded(true); }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setGenError("");
    setGenerated(null);
    try {
      const res = await fetch("/api/calling/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setGenError(data.error || "Something went wrong. Please try again.");
      } else {
        setGenerated(data);
        setTimeout(() => generatedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    } catch {
      setGenError("Something went wrong. Please try again.");
    }
    setGenerating(false);
  };

  const handlePurpleShare = async (card: typeof CALLING_CARDS[0] | GeneratedCard, keyPrefix: string) => {
    const key = `${keyPrefix}-purple` as LoadingKey;
    if (loading) return;
    setLoading(key);
    try {
      const blob = await createPurpleShareImage(card.verseText, card.scripture);
      await doImageShare(blob, `${card.scripture} — Shepherd's Path`, card.shareText);
    } catch {
      navigator.share?.({ text: card.shareText }).catch(() => {});
    }
    setLoading(null);
  };

  const handleArtShare = async (card: typeof CALLING_CARDS[0] | GeneratedCard, keyPrefix: string) => {
    const key = `${keyPrefix}-art` as LoadingKey;
    if (loading) return;
    setLoading(key);
    try {
      const blob = await createShareImage(card.verseText, card.scripture, artUrl);
      await doImageShare(blob, `${card.scripture} — Shepherd's Path`, card.shareText);
    } catch {
      navigator.share?.({ text: card.shareText }).catch(() => {});
    }
    setLoading(null);
  };

  const handleSendPrayer = () => {
    const text = "I prayed for you today. 🙏\n\nShepherd's Path · shepherdspath.app";
    navigator.share?.({ text }).catch(() => {});
  };

  const handleShareScripture = async () => {
    if (sharingScripture) return;
    setSharingScripture(true);
    try {
      const blob = await createPurpleShareImage(
        "Go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.",
        "Matthew 28:19"
      );
      await doImageShare(blob, "Matthew 28:19 — Shepherd's Path", "\"Go and make disciples of all nations.\"\n— Matthew 28:19\n\nShepherd's Path · shepherdspath.app");
    } catch {
      navigator.share?.({ text: "\"Go and make disciples of all nations.\"\n— Matthew 28:19\n\nShepherd's Path · shepherdspath.app" }).catch(() => {});
    }
    setSharingScripture(false);
  };

  const handleShareApp = () => {
    const text = "This app has been meaningful to me and I thought of you.\n\nShepherd's Path — daily scripture, prayer, and guidance.\n\nshepherdspath.app";
    navigator.share?.({ text }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#0d0a1a]" style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>

      {/* Back button */}
      <button
        onClick={() => { sessionStorage.setItem('scrollToExplore', '1'); setLocation("/"); }}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white text-[13px] font-semibold hover:bg-black/55 active:scale-95 transition-all"
        data-testid="button-calling-back"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      {/* HERO */}
      <div className="relative w-full" style={{ height: "92svh", minHeight: 520 }}>
        <img
          src={artUrl}
          alt="Daily art"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.75)" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 30%, rgba(13,10,26,0.72) 72%, rgba(13,10,26,1) 100%)" }} />

        <div className="absolute bottom-0 left-0 right-0 px-7 pb-14 text-center">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-white/45 text-[11px] tracking-[0.22em] uppercase mb-4">
            Shepherd's Path
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="text-white font-light leading-tight mb-3"
            style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(1.75rem, 6vw, 2.5rem)" }}>
            This Is More<br />Than an App
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="text-white/55 text-[15px] leading-relaxed"
            style={{ fontFamily: "'Georgia', serif" }}>
            You carry something someone needs.<br />Sharing it is the calling.
          </motion.p>
        </div>
      </div>

      {/* INTRO VERSE */}
      <div className="px-7 pt-10 pb-8 text-center">
        <p className="text-white/30 text-[11px] tracking-[0.2em] uppercase mb-5">The Calling</p>
        <p className="text-white leading-relaxed mb-3" style={{ fontFamily: "'Georgia', serif", fontSize: "1.1rem" }}>
          "Go and make disciples of all nations."
        </p>
        <p className="text-white/40 text-sm" style={{ fontFamily: "'Georgia', serif" }}>— Matthew 28:19</p>
        <div className="w-8 h-px mx-auto mt-8 bg-white/10" />
      </div>

      {/* ── CREATE YOUR OWN MOMENT ── */}
      <div className="px-5 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(122,1,141,0.18) 0%, rgba(68,47,116,0.22) 60%, rgba(13,10,26,0.8) 100%)",
            border: "1px solid rgba(180,80,220,0.22)",
          }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(122,1,141,0.4)" }}>
                <Wand2 className="w-3.5 h-3.5" style={{ color: "rgba(220,170,255,0.9)" }} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(180,120,255,0.8)" }}>
                Create Your Moment
              </p>
            </div>
            <p className="text-white/45 text-[13px] leading-relaxed mt-2">
              What's on your heart to share? Describe a topic, a person, a struggle — the AI finds the verse made for this moment.
            </p>
          </div>

          {/* Input */}
          <div className="px-5 pb-5">
            <div
              className="flex items-end gap-2 rounded-xl px-4 py-3"
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                placeholder="e.g. a friend going through grief, someone losing hope, anxiety about the future…"
                rows={2}
                maxLength={300}
                data-testid="input-calling-topic"
                className="flex-1 bg-transparent text-white placeholder:text-white/25 text-[14px] leading-relaxed resize-none outline-none"
              />
              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || generating}
                data-testid="button-calling-generate"
                className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-35"
                style={{ background: topic.trim() && !generating ? "rgba(122,1,141,0.7)" : "rgba(255,255,255,0.08)" }}
              >
                {generating
                  ? <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                  : <Send className="w-4 h-4" style={{ color: topic.trim() ? "rgba(220,170,255,0.95)" : "rgba(255,255,255,0.3)" }} />
                }
              </button>
            </div>

            {genError && (
              <p className="text-red-400/80 text-[12px] mt-2 px-1">{genError}</p>
            )}
          </div>

          {/* Generated result */}
          <AnimatePresence>
            {generated && (
              <motion.div
                ref={generatedRef}
                key="generated-card"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mx-5 mb-5 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(180,80,220,0.25)", background: "rgba(0,0,0,0.3)" }}>
                  {/* Accent bar */}
                  <div className="h-px w-full" style={{ background: "linear-gradient(90deg, rgba(122,1,141,0.9), rgba(68,47,116,0.6), transparent)" }} />

                  <div className="px-4 pt-4 pb-3">
                    {generated.message && (
                      <p className="text-white leading-snug mb-2.5" style={{ fontFamily: "'Georgia', serif", fontSize: "0.95rem" }}>
                        {generated.message}
                      </p>
                    )}
                    <p className="text-white/75 leading-relaxed text-[14px] mb-1" style={{ fontFamily: "'Georgia', serif" }}>
                      "{generated.verseText}"
                    </p>
                    <p className="text-white/35 text-[12px] tracking-wide mb-3">— {generated.scripture}</p>
                    {generated.meaning && (
                      <p className="text-white/50 text-[13px] leading-relaxed">{generated.meaning}</p>
                    )}
                  </div>

                  {/* Share buttons */}
                  <div className="grid grid-cols-2 gap-2 mx-4 mb-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <button
                      onClick={() => handlePurpleShare(generated, "gen")}
                      disabled={loading !== null}
                      data-testid="button-calling-gen-share-purple"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
                      style={{ background: "rgba(122,1,141,0.28)", border: "1px solid rgba(180,80,220,0.35)", color: "rgba(220,170,255,0.95)" }}
                    >
                      {loading === "gen-purple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                      Brand Card
                    </button>
                    <button
                      onClick={() => handleArtShare(generated, "gen")}
                      disabled={loading !== null}
                      data-testid="button-calling-gen-share-art"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
                      style={{
                        background: artLoaded ? "rgba(251,191,36,0.16)" : "rgba(255,255,255,0.07)",
                        border: artLoaded ? "1px solid rgba(251,191,36,0.38)" : "1px solid rgba(255,255,255,0.12)",
                        color: artLoaded ? "rgba(255,210,80,0.95)" : "rgba(255,255,255,0.60)",
                      }}
                    >
                      {loading === "gen-art" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      AI Art
                    </button>
                  </div>

                  {/* Try again */}
                  <div className="text-center pb-4">
                    <button
                      onClick={() => { setGenerated(null); setTopic(""); }}
                      className="text-[12px] text-white/30 hover:text-white/55 transition-colors"
                      data-testid="button-calling-gen-reset"
                    >
                      Try a different topic
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* SECTION DIVIDER */}
      <div className="px-7 pb-6 text-center">
        <p className="text-white/20 text-[11px] tracking-[0.2em] uppercase">Or share one of these</p>
      </div>

      {/* SHARE CARDS */}
      <div className="px-5 pb-6 space-y-3">
        {CALLING_CARDS.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.45, delay: i * 0.04 }}
            className="rounded-2xl px-5 py-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            data-testid={`card-calling-${card.id}`}
          >
            <p className="text-white leading-snug mb-2" style={{ fontFamily: "'Georgia', serif", fontSize: "1rem" }}>
              {card.message}
            </p>
            <p className="text-white/35 text-[11px] tracking-wide mb-3">— {card.scripture}</p>
            <p className="text-white/50 text-[13px] leading-relaxed">{card.meaning}</p>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => handlePurpleShare(card, String(card.id))}
                disabled={loading !== null}
                data-testid={`button-calling-share-purple-${card.id}`}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
                style={{ background: "rgba(122,1,141,0.28)", border: "1px solid rgba(180,80,220,0.35)", color: "rgba(220,170,255,0.95)" }}
              >
                {loading === `${card.id}-purple` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                Brand Card
              </button>
              <button
                onClick={() => handleArtShare(card, String(card.id))}
                disabled={loading !== null}
                data-testid={`button-calling-share-art-${card.id}`}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
                style={{
                  background: artLoaded ? "rgba(251,191,36,0.16)" : "rgba(255,255,255,0.07)",
                  border: artLoaded ? "1px solid rgba(251,191,36,0.38)" : "1px solid rgba(255,255,255,0.12)",
                  color: artLoaded ? "rgba(255,210,80,0.95)" : "rgba(255,255,255,0.60)",
                }}
              >
                {loading === `${card.id}-art` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI Art
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MID QUOTE */}
      <div className="px-7 py-10 text-center">
        <div className="w-8 h-px mx-auto mb-8 bg-white/10" />
        <p className="text-white/55 leading-relaxed" style={{ fontFamily: "'Georgia', serif", fontSize: "1.05rem" }}>
          Someone needs what you're about to share.
        </p>
        <p className="text-white/25 text-sm mt-2">You never know who's waiting for it.</p>
        <div className="w-8 h-px mx-auto mt-8 bg-white/10" />
      </div>

      {/* BOTTOM CTAs */}
      <div className="px-5 pb-14 space-y-3">
        <p className="text-center text-white/30 text-[11px] tracking-[0.2em] uppercase mb-5">One Action. One Person.</p>

        <button
          onClick={handleShareApp}
          data-testid="button-calling-share-app"
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-semibold text-[15px] active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, #7A018D, #442f74)", boxShadow: "0 8px 28px rgba(122,1,141,0.28)" }}
        >
          <Share2 className="w-5 h-5" />
          Share Shepherd's Path
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSendPrayer}
            data-testid="button-calling-send-prayer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-medium active:scale-[0.97] transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)" }}
          >
            <Heart className="w-4 h-4" />
            Send a Prayer
          </button>
          <button
            onClick={handleShareScripture}
            disabled={sharingScripture}
            data-testid="button-calling-share-scripture"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-medium disabled:opacity-50 active:scale-[0.97] transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)" }}
          >
            {sharingScripture ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            Share Scripture
          </button>
        </div>
      </div>

    </div>
  );
}
