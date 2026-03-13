import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Sun, Compass, BookOpen, Search, NotebookPen, Heart,
  MessageCircle, Flame, Trophy, ShieldCheck, Church,
  Sparkles, ArrowRight, Users, Share2, Check
} from "lucide-react";
import { NavBar } from "@/components/NavBar";

const logoMark = "/logo-mark-white.png";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: "easeOut" },
});

const FEATURES = [
  {
    icon: Sun,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
    title: "Daily Devotional",
    desc: "Each morning brings a fresh scripture, a personal reflection prompt, and a guided meditation tailored to where you are spiritually.",
  },
  {
    icon: Compass,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    title: "Bible Journeys",
    desc: "Choose from guided 30-day paths through the Psalms, the Life of Jesus, Lent, the Sermon on the Mount, and more — each designed to take you deeper.",
  },
  {
    icon: BookOpen,
    color: "text-violet-500",
    bg: "bg-violet-50",
    border: "border-violet-100",
    title: "Read the Bible",
    desc: "The full Bible (KJV, WEB, and ASV) with pastoral insight available on every chapter for context, historical background, and personal reflection.",
  },
  {
    icon: Search,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-100",
    title: "Deep Bible Study",
    desc: "Go deep on any passage with guided study tools that surface meaning, application, and connection across all of Scripture.",
  },
  {
    icon: Heart,
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-100",
    title: "Guided Prayer",
    desc: "Bring what you're carrying and receive a scripture, a reflection, and a prayer shaped specifically for your moment.",
  },
  {
    icon: MessageCircle,
    color: "text-teal-500",
    bg: "bg-teal-50",
    border: "border-teal-100",
    title: "Text PRAY from Anywhere",
    desc: "No app required. Text anything on your heart to +1 (833) 962-9341 and receive scripture and prayer straight to your phone.",
  },
  {
    icon: NotebookPen,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    title: "Prayer & Reflection Journal",
    desc: "Log your prayers, record what God is speaking, and build a personal record of your faith journey over time.",
  },
  {
    icon: Flame,
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-100",
    title: "Daily Streak",
    desc: "A faithfulness tracker that celebrates consistency without shame — each day you show up is marked and remembered.",
  },
  {
    icon: Trophy,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-100",
    title: "Meaningful Achievements",
    desc: "Milestones like your first devotional, 7-day streaks, and deep study moments are marked with meaning, not just badges.",
  },
  {
    icon: Users,
    color: "text-purple-500",
    bg: "bg-purple-50",
    border: "border-purple-100",
    title: "Church & Ministry Ready",
    desc: "Pastors and ministry leaders can generate a customized preview of the app branded to their congregation in minutes.",
  },
];

const COMMITMENTS = [
  "Every AI response is grounded in the actual Bible passage being studied",
  "Nothing is generated outside of God's Word — no AI speculation or reinterpretation",
  "Shaped by the historic, orthodox Christian faith across centuries and traditions",
  "We use AI to help you engage with Scripture — not to replace it",
  "Your word is a lamp to my feet and a light to my path. — Psalm 119:105",
];

export default function AboutPage() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = "https://daily-devotional-ai.replit.app/about";
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
    <div className="min-h-screen bg-[#fdf8f0]">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 pt-20 pb-28">

        {/* Hero */}
        <motion.div {...fadeUp(0)} className="text-center py-10">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <img src={logoMark} alt="Shepherd's Path" className="w-13 h-13 object-contain" style={{ width: 52, height: 52 }} />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight leading-tight mb-3">
            Your Daily Companion in Faith
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto mb-5">
            Shepherd's Path is a daily faith app built to walk alongside you through Scripture, prayer, and reflection — not just deliver content at you.
          </p>
          <button
            data-testid="btn-share-about"
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Link copied!" : "Share this page"}
          </button>
        </motion.div>

        {/* Bible-First Banner */}
        <motion.div {...fadeUp(0.1)} className="relative rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden mb-8 p-5">
          <img
            src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&q=80"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            style={{ opacity: 0.08, filter: "saturate(0.7)" }}
          />
          <div className="relative flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground mb-1">Bible-First by Design</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every AI response is grounded in the actual passage being studied. Nothing is generated outside of God's Word. We use AI to help you engage with Scripture — not to replace it.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div {...fadeUp(0.15)}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-primary">Everything Inside</h2>
          </div>
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.05 }}
                className={`flex items-start gap-4 rounded-2xl border ${f.border} bg-card p-4`}
              >
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center shrink-0`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-foreground leading-tight mb-1">{f.title}</p>
                  <p className="text-[13px] text-muted-foreground leading-snug">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Our Commitment */}
        <motion.div {...fadeUp(0.3)} className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-primary">Our Commitment to Scripture</h2>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-card p-5 space-y-3">
            {COMMITMENTS.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                {i === COMMITMENTS.length - 1 ? (
                  <p className="text-[13px] text-foreground/60 italic border-t border-primary/10 pt-3 w-full leading-relaxed">
                    "{point}"
                  </p>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <p className="text-[13px] text-foreground/75 leading-snug">{point}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* No login / accessible */}
        <motion.div {...fadeUp(0.35)} className="mt-6">
          <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-5 flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">✝️</span>
            <div>
              <p className="text-[14px] font-bold text-foreground mb-1">Free to Begin — No Login Required</p>
              <p className="text-[13px] text-muted-foreground leading-snug">
                Your first experience is immediate. The app meets you before you've committed to anything. Start exploring, then make it yours.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Church section */}
        <motion.div {...fadeUp(0.4)} className="mt-4">
          <div className="rounded-2xl border border-purple-200/60 bg-purple-50/50 p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Church className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground mb-1">Built for Churches Too</p>
              <p className="text-[13px] text-muted-foreground leading-snug">
                Pastors and ministry leaders can generate a customized branded preview in minutes — colors, church name, and a shareable link ready to send to your congregation.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div {...fadeUp(0.45)} className="mt-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">Ready to take your next step in faith?</p>
          <Link href="/">
            <button
              data-testid="btn-about-start"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(to right, #7c3aed, #f59e0b)" }}
            >
              Start Exploring
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <p className="text-[12px] text-muted-foreground mt-3">Free · No account required · Bible-first</p>
        </motion.div>

      </main>
    </div>
  );
}
