import { useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  Sun, Compass, BookOpen, Search, NotebookPen, Heart,
  Flame, Trophy, ShieldCheck, Church,
  Sparkles, ArrowRight, Users, Share2, Check, Play, HandHeart, Loader2
} from "lucide-react";
import { NavBar } from "@/components/NavBar";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: "easeOut" },
});

const FEATURES = [
  { icon: Sun,         color: "#f59e0b", title: "Daily Devotional",          desc: "Each morning brings a fresh scripture, a personal reflection prompt, and a guided meditation tailored to where you are spiritually." },
  { icon: Compass,     color: "#818cf8", title: "Bible Journeys",            desc: "Guided 30-day paths through the Psalms, the Life of Jesus, Lent, the Sermon on the Mount, and more — each designed to take you deeper." },
  { icon: BookOpen,    color: "#a78bfa", title: "Read the Bible",            desc: "The full Bible (KJV, WEB, and ASV) with pastoral insight available on every chapter for context, historical background, and personal reflection." },
  { icon: Search,      color: "#60a5fa", title: "Deep Bible Study",          desc: "Go deep on any passage with guided study tools that surface meaning, application, and connection across all of Scripture." },
  { icon: Heart,       color: "#f87171", title: "Guided Prayer",             desc: "Bring what you're carrying and receive a scripture, a reflection, and a prayer shaped specifically for your moment." },
  { icon: NotebookPen, color: "#34d399", title: "Prayer & Reflection Journal",desc: "Log your prayers, record what God is speaking, and build a personal record of your faith journey over time." },
  { icon: Flame,       color: "#fb923c", title: "Daily Streak",              desc: "A faithfulness tracker that celebrates consistency without shame — each day you show up is marked and remembered." },
  { icon: Trophy,      color: "#fbbf24", title: "Meaningful Achievements",   desc: "Milestones like your first devotional, 7-day streaks, and deep study moments are marked with meaning, not just badges." },
  { icon: Users,       color: "#c084fc", title: "Church & Ministry Ready",   desc: "Pastors and ministry leaders can generate a customized preview of the app branded to their congregation in minutes." },
];

const COMMITMENTS = [
  "Rooted in the Trinitarian faith — Father, Son, and Holy Spirit",
  "Built to lead people to Christ using available technology — making it easier to immerse yourself in Scripture",
  "Every AI response is grounded in the actual Bible passage being studied — nothing outside God's Word",
  "Shaped by the historic, orthodox Christian faith — not cultural opinion",
  "An honest, open place to encounter God — in a way that fits where you actually are",
];

const DONATION_AMOUNTS = [
  { label: "$10", cents: 1000 },
  { label: "$25", cents: 2500 },
  { label: "$50", cents: 5000 },
];

export default function AboutPage() {
  const [copied, setCopied] = useState(false);
  const [donating, setDonating] = useState<number | null>(null);
  const search = useSearch();
  const giftReceived = new URLSearchParams(search).get("gift") === "thank-you";

  const handleDonate = async (cents: number) => {
    setDonating(cents);
    try {
      const res = await fetch("/api/stripe/create-tip-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cents }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setDonating(null);
    }
  };

  const handleShare = async () => {
    const url = "https://shepherdspath.app/about";
    const shareData = {
      title: "Shepherd's Path — Your Daily Companion in Faith",
      text: "A daily faith app for Scripture, prayer, and reflection. Bible-first. Free to start.",
      url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #130636 0%, #0d0a1a 100%)" }}>
      <NavBar />

      {/* HERO — cinematic, purple gradient */}
      <div className="relative pt-14 pb-16 px-5 text-center overflow-hidden">
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(122,1,141,0.35) 0%, rgba(80,20,180,0.1) 60%, transparent 80%)"
        }} />

        <motion.div {...fadeUp(0)} className="relative z-10 flex flex-col items-center">
          {/* App icon */}
          <div className="mb-6" style={{ filter: "drop-shadow(0 8px 24px rgba(122,1,141,0.5))" }}>
            <img src="/app-icon.png" alt="Shepherd's Path" className="w-24 h-24 rounded-[22px]" />
          </div>

          <p className="text-white/40 text-[11px] tracking-[0.22em] uppercase mb-3">Shepherd's Path</p>
          <h1 className="text-white font-light leading-tight mb-4" style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(1.9rem, 6vw, 2.6rem)" }}>
            Your Daily Companion<br />in Faith
          </h1>
          <p className="text-white/60 text-[15px] leading-relaxed max-w-sm mx-auto mb-5" style={{ fontFamily: "'Georgia', serif" }}>
            Scripture, prayer, and reflection — all working together to help you grow in your walk with God.
          </p>
          <p className="text-white/35 text-[13px] italic mb-7" style={{ fontFamily: "'Georgia', serif" }}>
            "Open your Bible. We'll open the conversation."
          </p>

          <button
            data-testid="btn-share-about"
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.8)" }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Link copied!" : "Share this page"}
          </button>
        </motion.div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-28">

        {/* Mission Statement */}
        <motion.div {...fadeUp(0.08)} className="mb-8 text-center px-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-4" style={{ color: "rgba(192,132,252,0.6)" }}>Our Mission</p>
          <p className="text-white leading-relaxed mb-5" style={{ fontFamily: "'Georgia', serif", fontSize: "1.2rem" }}>
            "A quiet, consistent presence that meets you where you are — and walks with you forward."
          </p>
          <div className="rounded-2xl p-5 text-left" style={{ background: "rgba(122,1,141,0.14)", border: "1px solid rgba(160,80,200,0.22)" }}>
            <p className="text-white/65 text-[14px] leading-relaxed mb-3">
              Our mission is simple: to bring as many people as possible into a real, personal relationship with Jesus Christ — through the Word of God, honest prayer, and the quiet work of the Spirit.
            </p>
            <p className="text-white/65 text-[14px] leading-relaxed">
              We use technology not to replace that encounter, but to remove every obstacle in the way. Wherever you are — doubting, grieving, returning, or just curious — there is a path from here.
            </p>
          </div>
          <div className="w-8 h-px mx-auto mt-6" style={{ background: "rgba(255,255,255,0.1)" }} />
        </motion.div>

        {/* Seek Guidance CTA */}
        <motion.div {...fadeUp(0.1)} className="mb-6">
          <Link href="/guidance">
            <div className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all"
              style={{ background: "linear-gradient(135deg, rgba(122,1,141,0.5) 0%, rgba(67,20,120,0.4) 100%)", border: "1px solid rgba(160,80,200,0.3)" }}>
              <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "linear-gradient(to right, #7A018D, #a855f7, #f59e0b)" }} />
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300/60 mb-2">Our Signature Feature</p>
                <p className="text-white font-semibold text-[18px] leading-snug mb-2">What are you facing today?</p>
                <p className="text-white/55 text-[13px] leading-relaxed mb-4">Bring what's on your heart — a fear, a question, a struggle, or a praise — and receive scripture, reflection, and prayer shaped for your moment.</p>
                <div className="inline-flex items-center gap-2 text-[13px] font-bold text-amber-400">
                  Seek guidance <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Bible-First */}
        <motion.div {...fadeUp(0.15)} className="mb-6">
          <div className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(122,1,141,0.25)" }}>
              <ShieldCheck className="w-5 h-5" style={{ color: "#c084fc" }} />
            </div>
            <div>
              <p className="text-white font-semibold text-[14px] mb-1">Bible-First by Design</p>
              <p className="text-white/50 text-[13px] leading-relaxed">Every AI response is grounded in the actual passage being studied. We use AI to help you engage with Scripture — not to replace it.</p>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div {...fadeUp(0.18)} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-400/70" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Everything Inside</p>
          </div>
          <div className="space-y-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 + i * 0.04 }}
                className="flex items-start gap-3 rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${f.color}18` }}>
                  <f.icon className="w-4.5 h-4.5" style={{ color: f.color, width: 18, height: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-[14px] font-semibold leading-tight mb-0.5">{f.title}</p>
                  <p className="text-white/45 text-[13px] leading-snug">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Our Commitment */}
        <motion.div {...fadeUp(0.3)} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400/70" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Our Commitment</p>
          </div>
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {COMMITMENTS.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "#a855f7" }} />
                <p className="text-white/60 text-[13px] leading-snug">{point}</p>
              </div>
            ))}
            <p className="text-white/30 text-[13px] italic pt-3 leading-relaxed" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              "Your word is a lamp to my feet and a light to my path." — Psalm 119:105
            </p>
          </div>
        </motion.div>

        {/* Free to begin */}
        <motion.div {...fadeUp(0.32)} className="mb-4">
          <div className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <span className="text-xl leading-none mt-0.5">✝</span>
            <div>
              <p className="text-white/85 font-semibold text-[14px] mb-1">Free to Begin — No Login Required</p>
              <p className="text-white/45 text-[13px] leading-snug">The app meets you before you've committed to anything. Start exploring, then make it yours.</p>
            </div>
          </div>
        </motion.div>

        {/* Church */}
        <motion.div {...fadeUp(0.34)} className="mb-6">
          <div className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.2)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(192,132,252,0.15)" }}>
              <Church className="w-5 h-5" style={{ color: "#c084fc" }} />
            </div>
            <div>
              <p className="text-white/85 font-semibold text-[14px] mb-1">Built for Churches Too</p>
              <p className="text-white/45 text-[13px] leading-snug">Pastors and ministry leaders can generate a customized branded preview in minutes — ready to share with your congregation.</p>
            </div>
          </div>
        </motion.div>

        {/* Support the Mission */}
        <motion.div {...fadeUp(0.4)} className="mb-8">
          <div className="relative rounded-2xl overflow-hidden p-6"
            style={{ background: "linear-gradient(135deg, #1e1040 0%, #0f0a2e 100%)", border: "1px solid rgba(99,102,241,0.25)" }}>
            {giftReceived ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <Heart className="w-6 h-6 fill-rose-300" style={{ color: "#fca5a5" }} />
                </div>
                <p className="text-white font-bold text-lg mb-1">Thank you — truly.</p>
                <p className="text-white/60 text-[13px] leading-relaxed max-w-xs mx-auto">Your gift helps keep Shepherd's Path free for someone who needs it most. God knows your name.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <HandHeart className="w-4 h-4 text-white/70" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Support the Mission</p>
                </div>
                <h3 className="text-white font-bold text-[20px] leading-snug mb-3">A movement, not just an app.</h3>
                <p className="text-white/55 text-[13px] leading-relaxed mb-3">
                  Shepherd's Path exists for the person at 3am who has no pastor, no church, and nowhere to turn — a faithful, Bible-grounded guide in their pocket.
                </p>
                <p className="text-white/55 text-[13px] leading-relaxed mb-5">
                  Every subscription helps keep the app free for someone who can't afford it. If this has meant something to you — consider being part of what makes it possible for someone else.
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30 mb-3">Give a one-time gift</p>
                <div className="flex gap-3 mb-4">
                  {DONATION_AMOUNTS.map(({ label, cents }) => (
                    <button
                      key={cents}
                      data-testid={`btn-donate-${label}`}
                      onClick={() => handleDonate(cents)}
                      disabled={donating !== null}
                      className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] transition-all disabled:opacity-50 flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}
                    >
                      {donating === cents ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/25 text-center">Secure checkout via Stripe · One-time · No account required</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div {...fadeUp(0.45)} className="text-center">
          <p className="text-white/35 text-[14px] mb-5" style={{ fontFamily: "'Georgia', serif" }}>Ready to take your next step in faith?</p>
          <Link href="/">
            <button
              data-testid="btn-about-start"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-[15px] transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #7A018D, #f59e0b)", boxShadow: "0 8px 28px rgba(122,1,141,0.35)" }}
            >
              Start Exploring
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <p className="text-white/25 text-[12px] mt-3">Free · No account required · Bible-first</p>

          <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-white/25 text-[12px] mb-3">Want to hear the welcome message again?</p>
            <a
              href="/?intro"
              data-testid="btn-replay-intro"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
            >
              <Play className="w-3.5 h-3.5" style={{ color: "#a855f7" }} />
              Replay the intro
            </a>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
