import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Share2, ArrowLeft, Heart, BookOpen, Loader2, Palette, Sparkles } from "lucide-react";
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

type LoadingKey = `${number}-${"purple" | "art"}`;

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

  useEffect(() => {
    fetch("/api/daily-art")
      .then(r => r.json())
      .then(data => {
        if (data.imageUrl) { setArtUrl(data.imageUrl); setArtLoaded(true); }
      })
      .catch(() => {});
  }, []);

  const handlePurpleShare = async (card: typeof CALLING_CARDS[0]) => {
    const key: LoadingKey = `${card.id}-purple`;
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

  const handleArtShare = async (card: typeof CALLING_CARDS[0]) => {
    const key: LoadingKey = `${card.id}-art`;
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

      {/* Back button — pill style consistent with all pages */}
      <button
        onClick={() => { sessionStorage.setItem('scrollToExplore', '1'); setLocation("/"); }}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white text-[13px] font-semibold hover:bg-black/55 active:scale-95 transition-all"
        data-testid="button-calling-back"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      {/* HERO — cinematic full-screen */}
      <div className="relative w-full" style={{ height: "92svh", minHeight: 520 }}>
        <img
          src={artUrl}
          alt="Daily art"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.75)" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
        />
        {/* Gradient — dark at bottom for text legibility */}
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

      {/* SHARE CARDS — editorial, minimal */}
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
            {/* Message */}
            <p className="text-white leading-snug mb-2" style={{ fontFamily: "'Georgia', serif", fontSize: "1rem" }}>
              {card.message}
            </p>
            <p className="text-white/35 text-[11px] tracking-wide mb-3">— {card.scripture}</p>
            <p className="text-white/50 text-[13px] leading-relaxed">{card.meaning}</p>

            {/* Share options — slim pill row */}
            <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => handlePurpleShare(card)}
                disabled={loading !== null}
                data-testid={`button-calling-share-purple-${card.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "rgba(122,1,141,0.18)", border: "1px solid rgba(122,1,141,0.3)", color: "rgba(210,160,230,0.85)" }}
              >
                {loading === `${card.id}-purple` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Palette className="w-3 h-3" />}
                Purple
              </button>
              <button
                onClick={() => handleArtShare(card)}
                disabled={loading !== null}
                data-testid={`button-calling-share-art-${card.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: artLoaded ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.06)",
                  border: artLoaded ? "1px solid rgba(251,191,36,0.28)" : "1px solid rgba(255,255,255,0.1)",
                  color: artLoaded ? "rgba(251,191,36,0.85)" : "rgba(255,255,255,0.55)",
                }}
              >
                {loading === `${card.id}-art` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
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
