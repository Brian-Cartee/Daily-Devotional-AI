import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Compass, BookOpen, ArrowRight, ShieldCheck, ChevronDown } from "lucide-react";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { useWelcomeOverlay } from "@/hooks/use-welcome-overlay";

const sections = [
  {
    href: "/devotional",
    icon: Sun,
    pillText: "Daily",
    title: "Daily Devotional",
    description: "Today's scripture, an encouragement, and a moment of AI-guided reflection — made for how you actually live.",
    cta: "Open Today's Verse",
    testid: "card-devotional",
    imageBg: "bg-gradient-to-br from-teal-500/10 to-emerald-500/5",
    border: "border-teal-900/10",
    iconColor: "text-teal-500",
    pillClass: "bg-teal-500/10 text-teal-600",
  },
  {
    href: "/understand",
    icon: Compass,
    pillText: "Guided",
    title: "Bible Journey",
    description: "A guided path through the most important passages of Scripture — from Creation to Revelation.",
    cta: "Start the Journey",
    testid: "card-understand",
    imageBg: "bg-gradient-to-br from-indigo-500/10 to-violet-500/5",
    border: "border-indigo-900/10",
    iconColor: "text-indigo-500",
    pillClass: "bg-indigo-500/10 text-indigo-600",
  },
  {
    href: "/read",
    icon: BookOpen,
    pillText: "Full Bible",
    title: "Read the Bible",
    description: "Read Genesis to Revelation in KJV, WEB, or ASV — with AI available for context, explanation, and reflection.",
    cta: "Start Reading",
    testid: "card-read",
    imageBg: "bg-gradient-to-br from-amber-500/10 to-orange-500/5",
    border: "border-amber-900/10",
    iconColor: "text-amber-500",
    pillClass: "bg-amber-500/10 text-amber-600",
  },
];

const COMMITMENT_POINTS = [
  "AI reflections are always grounded in the actual Bible passage being studied",
  "Nothing in this app is presented as equal to or a replacement for Scripture",
  "Content is shaped by the historic, orthodox Christian faith — not cultural opinion",
  "This commitment applies to every user and every church using this platform",
];

export default function LandingHome() {
  const [expanded, setExpanded] = useState(false);
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeOverlay();

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} />}
      </AnimatePresence>
      {/* Hero section */}
      <div className="relative h-[56vh] min-h-[360px] max-h-[560px] overflow-hidden">
        <img
          src="/hero-landing.png"
          alt="A road cresting a green hill toward golden light"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center center" }}
        />
        <div className="absolute inset-0" style={{background: "linear-gradient(to bottom, rgba(10,8,24,0.22) 0%, rgba(10,8,24,0.08) 38%, rgba(10,8,24,0.52) 100%)"}} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        {/* Hero text */}
        <div className="relative z-10 flex flex-col items-start justify-center h-full text-left px-5 pl-8 sm:pl-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col items-start leading-none mb-3 select-none">
              <span className="text-white/80 mb-1" style={{ fontFamily: "var(--font-decorative)", fontWeight: 300, fontSize: "clamp(1.1rem, 4vw, 1.5rem)", letterSpacing: "0.28em", textTransform: "uppercase", textShadow: "0 1px 12px rgba(0,0,0,0.55)" }}>Shepherd's</span>
              <span className="text-white font-black leading-none drop-shadow-lg" style={{ fontSize: "clamp(2.8rem, 11vw, 4.5rem)", letterSpacing: "-0.02em", fontStyle: "italic", textShadow: "0 2px 24px rgba(0,0,0,0.4)" }}>PATH</span>
            </div>
            <div className="flex items-center justify-start gap-3 mb-3">
              <div className="h-px w-10 bg-white/40" />
              <span className="text-white/60 text-[11px]">✦</span>
              <div className="h-px w-10 bg-white/40" />
            </div>
            <p className="text-white/90 max-w-xs drop-shadow" style={{ fontFamily: "var(--font-decorative)", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1.4rem, 5vw, 1.8rem)", letterSpacing: "0.01em" }}>
              Your daily walk with Jesus.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Section cards */}
      <div className="max-w-xl mx-auto px-5 -mt-6 pb-20 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          {sections.map(({ href, icon: Icon, pillText, title, description, cta, testid, imageBg, border, iconColor, pillClass }) => (
            <Link key={href} href={href}>
              <div
                data-testid={testid}
                className={`group relative rounded-2xl ${imageBg} border ${border} bg-card p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white shadow-sm`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pillClass}`}>
                        {pillText}
                      </span>
                    </div>
                    <h2 className="text-[17px] font-bold text-foreground mb-1 leading-tight tracking-tight">
                      {title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {description}
                    </p>

                    <div className={`flex items-center gap-1.5 mt-3.5 text-sm font-semibold ${iconColor} group-hover:gap-2.5 transition-all`}>
                      {cta}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Scripture commitment card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden"
          data-testid="commitment-card"
        >
          <button
            onClick={() => setExpanded(v => !v)}
            data-testid="btn-commitment-toggle"
            className="w-full text-left px-5 py-4 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground leading-tight">Our Commitment to Scripture</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">AI grounded in God's Word — always</p>
            </div>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="commitment-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-6 pt-1 border-t border-primary/10">
                  <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                    Shepherd's Path uses AI to help you engage with the Word of God — not to reinterpret it. The Bible is our only source and standard. Every reflection, prayer, and explanation generated by our AI is grounded in the passage being studied and shaped by the historic, orthodox Christian faith.
                  </p>

                  <div className="space-y-2.5 mb-5">
                    {COMMITMENT_POINTS.map((point) => (
                      <div key={point} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <p className="text-sm text-foreground/75 leading-snug">{point}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[13px] text-foreground/60 italic border-t border-primary/10 pt-4 leading-relaxed">
                    "Your word is a lamp to my feet and a light to my path." — Psalm 119:105
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Faith-rooted · AI-powered · Built for daily life
        </motion.p>
      </div>
    </div>
  );
}
