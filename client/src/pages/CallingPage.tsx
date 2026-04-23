import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Share2, Heart, BookOpen, Loader2, Palette, Sparkles, Wand2, Send, X, Download } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import { createShareImage, createPurpleShareImage, createStoryShareImage, createPurpleStoryImage } from "@/lib/shareImage";
import { SiX, SiFacebook, SiWhatsapp, SiTelegram, SiInstagram, SiPinterest } from "react-icons/si";

const APP_URL = "https://www.shepherdspathai.com";
const FALLBACK_IMG = "/daily-art/natural-sunset.jpg";

const CALLING_CARDS = [
  {
    id: 1,
    message: "Sharing is caring… but more than that — it's our calling.",
    verseText: "Go and make disciples of all nations.",
    scripture: "Matthew 28:19",
    meaning: "We are called to go, to share truth and hope with the world.",
    shareText: `Sharing is caring… but more than that — it's our calling.\n\n"Go and make disciples of all nations."\n— Matthew 28:19\n\nShepherd's Path · ${APP_URL}`,
  },
  {
    id: 2,
    message: "Care enough to share. Called enough to act.",
    verseText: "Faith by itself, if it is not accompanied by action, is dead.",
    scripture: "James 2:17",
    meaning: "Faith without action is empty. Our care for others shows in what we do.",
    shareText: `Care enough to share. Called enough to act.\n\n"Faith by itself, if it is not accompanied by action, is dead."\n— James 2:17\n\nShepherd's Path · ${APP_URL}`,
  },
  {
    id: 3,
    message: "Sharing hope isn't optional — it's part of the calling.",
    verseText: "Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you have.",
    scripture: "1 Peter 3:15",
    meaning: "Hope is meant to be shared. Always be ready to give a reason for the hope you carry.",
    shareText: `Sharing hope isn't optional — it's part of the calling.\n\n"Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you have."\n— 1 Peter 3:15\n\nShepherd's Path · ${APP_URL}`,
  },
  {
    id: 4,
    message: "We don't just share… we serve, we care, we answer the call.",
    verseText: "Serve one another humbly in love.",
    scripture: "Galatians 5:13",
    meaning: "Sharing is an act of service. Use your freedom to serve one another in love.",
    shareText: `We don't just share… we serve, we care, we answer the call.\n\n"Serve one another humbly in love."\n— Galatians 5:13\n\nShepherd's Path · ${APP_URL}`,
  },
  {
    id: 5,
    message: "Share the Word. Answer the Call.",
    verseText: "How can they believe in the one of whom they have not heard?",
    scripture: "Romans 10:14",
    meaning: "People need to hear. How can they believe if no one tells them?",
    shareText: `Share the Word. Answer the Call.\n\n"How can they believe in the one of whom they have not heard?"\n— Romans 10:14\n\nShepherd's Path · ${APP_URL}`,
  },
  {
    id: 6,
    message: "What you share could change a life.",
    verseText: "A generous person will prosper; whoever refreshes others will be refreshed.",
    scripture: "Proverbs 11:25",
    meaning: "A generous person prospers. Whoever refreshes others will themselves be refreshed.",
    shareText: `What you share could change a life.\n\n"A generous person will prosper; whoever refreshes others will be refreshed."\n— Proverbs 11:25\n\nShepherd's Path · ${APP_URL}`,
  },
  {
    id: 7,
    message: "Carry one another. Share what matters.",
    verseText: "Carry each other's burdens, and in this way you will fulfill the law of Christ.",
    scripture: "Galatians 6:2",
    meaning: "We were never meant to walk this alone. Carry each other's burdens.",
    shareText: `Carry one another. Share what matters.\n\n"Carry each other's burdens, and in this way you will fulfill the law of Christ."\n— Galatians 6:2\n\nShepherd's Path · ${APP_URL}`,
  },
];

interface GeneratedCard {
  message: string;
  verseText: string;
  scripture: string;
  meaning: string;
  shareText: string;
}

type LoadingKey = `${number}-${"purple" | "art"}` | `gen-${"purple" | "art"}` | "today";

interface PreviewState {
  url: string;
  blob: Blob;
  shareText: string;
  title: string;
  verseText: string;
  reference: string;
  cardType: "purple" | "landscape";
}

export default function CallingPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState<LoadingKey | null>(null);
  const [sharingScripture, setSharingScripture] = useState(false);
  const [artUrl, setArtUrl] = useState<string>(FALLBACK_IMG);
  const [artLoaded, setArtLoaded] = useState(false);
  const [todayVerse, setTodayVerse] = useState<{ text: string; reference: string } | null>(null);

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewFormat, setPreviewFormat] = useState<"square" | "story">("square");
  const [regenerating, setRegenerating] = useState(false);

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

    const localDate = new Intl.DateTimeFormat("en-CA").format(new Date());
    fetch(`/api/verses/daily?date=${localDate}`)
      .then(r => r.json())
      .then(data => {
        if (data?.text && data?.reference) setTodayVerse({ text: data.text, reference: data.reference });
      })
      .catch(() => {});
  }, []);

  const showPreview = (blob: Blob, title: string, shareText: string, verseText: string, reference: string, cardType: "purple" | "landscape") => {
    const url = URL.createObjectURL(blob);
    if (preview) URL.revokeObjectURL(preview.url);
    setPreviewFormat("square");
    setPreview({ url, blob, title, shareText, verseText, reference, cardType });
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const handleSwitchFormat = async (fmt: "square" | "story") => {
    if (!preview || fmt === previewFormat || regenerating) return;
    setRegenerating(true);
    try {
      let blob: Blob;
      if (preview.cardType === "purple") {
        blob = fmt === "story"
          ? await createPurpleStoryImage(preview.verseText, preview.reference)
          : await createPurpleShareImage(preview.verseText, preview.reference);
      } else {
        blob = fmt === "story"
          ? await createStoryShareImage(preview.verseText, preview.reference, artUrl)
          : await createShareImage(preview.verseText, preview.reference, artUrl);
      }
      const url = URL.createObjectURL(blob);
      URL.revokeObjectURL(preview.url);
      setPreview(prev => prev ? { ...prev, url, blob } : null);
      setPreviewFormat(fmt);
    } catch { }
    setRegenerating(false);
  };

  const handleNativeShare = async () => {
    if (!preview) return;
    try {
      const file = new File([preview.blob], "shepherds-path.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: preview.title });
      } else {
        handleDownload();
      }
    } catch { }
  };

  const handleDownload = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = "shepherds-path.png";
    a.click();
  };

  const shareTextOnPlatform = (platform: "x" | "facebook" | "whatsapp" | "instagram" | "telegram" | "pinterest") => {
    if (!preview) return;
    const text = preview.shareText;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(APP_URL);
    switch (platform) {
      case "x":
        window.open(`https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, "_blank", "noopener,width=600,height=450");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, "_blank", "noopener,width=600,height=450");
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodedText}`, "_blank", "noopener");
        break;
      case "instagram":
        navigator.clipboard?.writeText(text).catch(() => {});
        break;
      case "telegram":
        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank", "noopener");
        break;
      case "pinterest":
        window.open(`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`, "_blank", "noopener");
        break;
    }
    closePreview();
  };

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
      showPreview(blob, `${card.scripture} — Shepherd's Path`, card.shareText, card.verseText, card.scripture, "purple");
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
      showPreview(blob, `${card.scripture} — Shepherd's Path`, card.shareText, card.verseText, card.scripture, "landscape");
    } catch {
      navigator.share?.({ text: card.shareText }).catch(() => {});
    }
    setLoading(null);
  };

  const handleShareTodayVerse = async () => {
    if (!todayVerse || loading === "today") return;
    setLoading("today");
    const shareText = `"${todayVerse.text}"\n— ${todayVerse.reference}\n\nReflect & pray with me at Shepherd's Path 🙏\n${APP_URL}`;
    try {
      const blob = await createShareImage(todayVerse.text, todayVerse.reference, artUrl);
      showPreview(blob, `${todayVerse.reference} — Shepherd's Path`, shareText, todayVerse.text, todayVerse.reference, "landscape");
    } catch {
      navigator.share?.({ text: shareText }).catch(() => {});
    }
    setLoading(null);
  };

  const handleSendPrayer = () => {
    const text = `I prayed for you today. 🙏\n\nWhatever you're carrying right now — you're not carrying it alone. I thought of you and brought you before God.\n\nShepherd's Path · ${APP_URL}`;
    navigator.share?.({ text }).catch(() => {});
  };

  const handleShareScripture = async () => {
    if (sharingScripture) return;
    setSharingScripture(true);
    const scriptureVerse = "Go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.";
    const scriptureRef = "Matthew 28:19";
    try {
      const blob = await createPurpleShareImage(scriptureVerse, scriptureRef);
      const shareText = `"Go and make disciples of all nations."\n— Matthew 28:19\n\nShepherd's Path · ${APP_URL}`;
      showPreview(blob, "Matthew 28:19 — Shepherd's Path", shareText, scriptureVerse, scriptureRef, "purple");
    } catch {
      navigator.share?.({ text: `"Go and make disciples of all nations."\n— Matthew 28:19\n\nShepherd's Path · ${APP_URL}` }).catch(() => {});
    }
    setSharingScripture(false);
  };

  const handleShareApp = () => {
    const text = `This has been meaningful to me and I thought of you.\n\nShepherd's Path — daily scripture, prayer, and guidance. Come as you are.\n\n${APP_URL}`;
    navigator.share?.({ text }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#0d0a1a]" style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>

      <BackButton
        onClick={() => { sessionStorage.setItem('scrollToExplore', '1'); setLocation("/"); }}
        testId="button-calling-back"
        className="fixed top-4 left-4 z-50"
      />

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

                  <div className="grid grid-cols-2 gap-2 mx-4 mb-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <button
                      onClick={() => handlePurpleShare(generated, "gen")}
                      disabled={loading !== null}
                      data-testid="button-calling-gen-share-purple"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
                      style={{ background: "rgba(122,1,141,0.28)", border: "1px solid rgba(180,80,220,0.35)", color: "rgba(220,170,255,0.95)" }}
                    >
                      {loading === "gen-purple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                      Purple Card
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
                      Landscape
                    </button>
                  </div>

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

      {/* TODAY'S VERSE */}
      {todayVerse && (
        <div className="px-5 pb-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(251,191,36,0.22)" }}
          >
            <div className="relative overflow-hidden" style={{ height: 120 }}>
              <img
                src={artUrl}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.55)" }}
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 15%, rgba(0,0,0,0.6) 100%)" }} />
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                <p
                  className="text-white/90 leading-snug line-clamp-2"
                  style={{ fontFamily: "'Georgia', serif", fontSize: "0.88rem" }}
                >
                  &ldquo;{todayVerse.text}&rdquo;
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: "rgba(251,191,36,0.08)", borderTop: "1px solid rgba(251,191,36,0.18)" }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "rgba(251,191,36,0.55)" }}>
                  Today's Verse
                </p>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>— {todayVerse.reference}</p>
              </div>
              <button
                onClick={handleShareTodayVerse}
                disabled={loading === "today"}
                data-testid="button-calling-share-today-verse"
                className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.35)", color: "rgba(255,210,80,0.95)" }}
              >
                {loading === "today"
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Share2 className="w-4 h-4" />}
                Preview & Share
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                Purple Card
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
                Landscape
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

      {/* ── SHARE PREVIEW SHEET ─────────────────────────────────── */}
      <AnimatePresence>
        {preview && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/75"
              onClick={closePreview}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0a1a] rounded-t-2xl shadow-2xl overflow-hidden"
              style={{ maxWidth: 480, margin: "0 auto" }}
            >
              {/* Handle + header */}
              <div className="relative flex items-center justify-between px-5 pt-4 pb-3">
                <div className="w-10 h-1 rounded-full bg-white/15 absolute left-1/2 -translate-x-1/2 top-2.5" />
                <p className="text-[12px] font-semibold uppercase tracking-widest text-white/35 mt-1">Preview</p>
                <button
                  onClick={closePreview}
                  data-testid="button-close-calling-preview"
                  className="ml-auto p-1.5 rounded-full text-white/30 hover:text-white/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Format toggle */}
              <div className="px-4 pb-3 flex gap-2">
                <button
                  onClick={() => handleSwitchFormat("square")}
                  disabled={regenerating}
                  data-testid="button-calling-format-square"
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: previewFormat === "square" ? "rgba(122,1,141,0.55)" : "rgba(255,255,255,0.07)",
                    border: previewFormat === "square" ? "1px solid rgba(180,80,220,0.50)" : "1px solid rgba(255,255,255,0.10)",
                    color: previewFormat === "square" ? "rgba(220,170,255,0.95)" : "rgba(255,255,255,0.45)",
                  }}
                >
                  □ Square
                </button>
                <button
                  onClick={() => handleSwitchFormat("story")}
                  disabled={regenerating}
                  data-testid="button-calling-format-story"
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: previewFormat === "story" ? "rgba(122,1,141,0.55)" : "rgba(255,255,255,0.07)",
                    border: previewFormat === "story" ? "1px solid rgba(180,80,220,0.50)" : "1px solid rgba(255,255,255,0.10)",
                    color: previewFormat === "story" ? "rgba(220,170,255,0.95)" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                  ↕ Story
                </button>
              </div>

              {/* Image */}
              <div className="px-4 pb-3">
                <img
                  src={preview.url}
                  alt="Share preview"
                  className="w-full rounded-xl shadow-lg mx-auto"
                  style={{
                    aspectRatio: previewFormat === "story" ? "9/16" : "1/1",
                    objectFit: "cover",
                    maxHeight: previewFormat === "story" ? 360 : undefined,
                  }}
                />
              </div>

              {/* Primary actions */}
              <div className="px-4 pb-3 flex gap-3">
                <button
                  onClick={handleNativeShare}
                  data-testid="button-calling-share-native"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] active:scale-95 transition-transform"
                  style={{ background: "linear-gradient(135deg, #7A018D, #442f74)", color: "#ffffff" }}
                >
                  <Share2 className="w-4 h-4" />
                  Share image
                </button>
                <button
                  onClick={handleDownload}
                  data-testid="button-calling-download"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold active:scale-95 transition-transform"
                  style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}
                >
                  <Download className="w-4 h-4" />
                  Save
                </button>
              </div>

              {/* Social row */}
              <div className="px-4 pb-6 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[11px] text-white/30 font-medium tracking-wide uppercase text-center mb-3 mt-3">Or share to</p>
                <div className="flex items-center justify-center gap-2.5">
                  <button data-testid="share-calling-x" onClick={() => shareTextOnPlatform("x")} title="Share on X"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-black text-white active:scale-95 transition-transform shadow-md">
                    <SiX className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-calling-facebook" onClick={() => shareTextOnPlatform("facebook")} title="Share on Facebook"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1877F2] text-white active:scale-95 transition-transform shadow-md">
                    <SiFacebook className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-calling-whatsapp" onClick={() => shareTextOnPlatform("whatsapp")} title="Share on WhatsApp"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#25D366] text-white active:scale-95 transition-transform shadow-md">
                    <SiWhatsapp className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-calling-instagram" onClick={() => shareTextOnPlatform("instagram")} title="Copy for Instagram"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform shadow-md"
                    style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}>
                    <SiInstagram className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-calling-telegram" onClick={() => shareTextOnPlatform("telegram")} title="Share on Telegram"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2AABEE] text-white active:scale-95 transition-transform shadow-md">
                    <SiTelegram className="w-[16px] h-[16px]" />
                  </button>
                  <button data-testid="share-calling-pinterest" onClick={() => shareTextOnPlatform("pinterest")} title="Pin to Pinterest"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#E60023] text-white active:scale-95 transition-transform shadow-md">
                    <SiPinterest className="w-[16px] h-[16px]" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
