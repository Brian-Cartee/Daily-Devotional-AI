import { useState } from "react";
import logoSmall from "@assets/P_(1024_x_1024_px)_(64_x_64_px)_1773256980463.png";
import logoWhite from "@assets/TRANS__(64_x_64_px)_1773259581717.png";
import logoLarge from "@assets/S_P_LOGO_(1024_x_1024_px)_1773100548775.png";

import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Compass, BookOpen, Heart, ArrowRight, ShieldCheck, ChevronDown, Check, MessageCircle, CalendarCheck } from "lucide-react";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { useWelcomeOverlay } from "@/hooks/use-welcome-overlay";
import { NamePrompt } from "@/components/NamePrompt";
import { hasBeenPrompted } from "@/lib/userName";
import { StreakWidget } from "@/components/StreakWidget";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";

const sections = [
  {
    href: "/understand",
    icon: Compass,
    pillText: "4 Journeys — You Choose",
    title: "Bible Journeys",
    description: "Choose from 4 guided paths — a 30-Day Foundation, Lent, the Psalms, or the Life of Jesus. Each one takes you deeper.",
    cta: "Explore Journeys",
    testid: "card-understand",
    imageBg: "bg-gradient-to-br from-indigo-500/10 to-violet-500/5",
    border: "border-indigo-900/10",
    iconColor: "text-indigo-500",
    pillClass: "bg-indigo-500/10 text-indigo-600",
    accentGradient: "bg-gradient-to-b from-indigo-400 to-violet-500",
    iconBg: "bg-gradient-to-br from-indigo-100 to-violet-50",
    iconShadow: "shadow-indigo-200/60",
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
    accentGradient: "bg-gradient-to-b from-amber-400 to-orange-500",
    iconBg: "bg-gradient-to-br from-amber-100 to-orange-50",
    iconShadow: "shadow-amber-200/60",
  },
];

function formatVisitDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = today.toISOString().split("T")[0];
  const yestStr = yesterday.toISOString().split("T")[0];
  if (dateStr === todayStr) return "Today";
  if (dateStr === yestStr) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function DevotionalCard() {
  const sessionId = getSessionId();
  const { data } = useQuery<{ currentStreak: number; longestStreak: number; visitDates: string[] }>({
    queryKey: ["/api/streak", sessionId],
    queryFn: () => fetch(`/api/streak?sessionId=${sessionId}`).then(r => r.json()),
    staleTime: 60_000,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const visitDates: string[] = data?.visitDates ?? [];
  const visitedToday = visitDates.includes(todayStr);
  const streak = data?.currentStreak ?? 0;

  const sortedDates = [...visitDates].sort((a, b) => b.localeCompare(a));
  const recentCompleted = sortedDates.filter(d => d !== todayStr).slice(0, 3);

  return (
    <Link href="/devotional">
      <div
        data-testid="card-devotional"
        className="group relative rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border border-teal-900/10 bg-card p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
      >
        {/* Left accent strip */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-teal-400 to-emerald-500 opacity-70 rounded-l-2xl" />
        <img
          src={logoWhite}
          alt=""
          aria-hidden="true"
          className="absolute top-3 right-3 w-11 h-11 object-contain opacity-[0.18] pointer-events-none select-none"
          style={{ filter: "invert(1)" }}
        />

        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-teal-100 to-emerald-50 shadow-sm shadow-teal-200/60">
            <Sun className="w-5 h-5 text-teal-500" />
          </div>
          <div className="flex-1 min-w-0 py-0.5 pr-14">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600">
                Daily
              </span>
              {visitedToday && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" strokeWidth={3} /> Done today
                </span>
              )}
            </div>
            <h2 className="text-[17px] font-bold text-foreground mb-1 leading-tight tracking-tight">
              Daily Devotional
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each day brings a new scripture, a personal reflection, and an AI-guided moment to hear from God — grounded in the actual passage, shaped for your real life. Open it, sit with it, let it speak.
            </p>
            <div className="flex items-center gap-1.5 mt-3.5 text-sm font-semibold text-teal-500 group-hover:gap-2.5 transition-all">
              {visitedToday ? "Continue today's devotional" : "Open today's devotional"}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {recentCompleted.length > 0 && (
          <div className="border-t border-teal-900/8 pt-3 mt-1">
            <div className="flex items-center gap-1.5 mb-2">
              <CalendarCheck className="w-3.5 h-3.5 text-teal-500/70" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recent completions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentCompleted.map((date) => (
                <div
                  key={date}
                  className="flex items-center gap-1.5 text-[12px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-full"
                  data-testid={`completed-day-${date}`}
                >
                  <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                  {formatVisitDate(date)}
                </div>
              ))}
            </div>
          </div>
        )}

        {streak > 1 && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400" />
            {streak}-day streak · keep going
          </div>
        )}
      </div>
    </Link>
  );
}

const COMMITMENT_POINTS = [
  "AI reflections are always grounded in the actual Bible passage being studied",
  "Nothing in this app is presented as equal to or a replacement for Scripture",
  "Content is shaped by the historic, orthodox Christian faith — not cultural opinion",
  "This commitment applies to every user and every church using this platform",
];

export default function LandingHome() {
  const [expanded, setExpanded] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [shared, setShared] = useState(false);
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeOverlay();

  const handleShareApp = async () => {
    const shareData = {
      title: "Shepherd's Path",
      text: "Your daily walk with Jesus — AI-guided devotionals, Bible journeys, prayer & more.",
      url: "https://www.shepherdspathai.com",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch { }
  };

  const handleDismissWelcome = () => {
    dismissWelcome();
    if (!hasBeenPrompted()) {
      setTimeout(() => setShowNamePrompt(true), 400);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatePresence>
        {showWelcome && <WelcomeOverlay onDismiss={handleDismissWelcome} />}
      </AnimatePresence>
      <AnimatePresence>
        {showNamePrompt && <NamePrompt onDone={() => setShowNamePrompt(false)} />}
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

        {/* Share App button — top right of hero */}
        <button
          onClick={handleShareApp}
          data-testid="btn-share-app"
          className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/50 transition-all text-[12px] font-medium"
        >
          {shared
            ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</>
            : <><span className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ boxShadow: "0 0 0 1.5px #f59e0b, 0 0 6px rgba(245,158,11,0.5)" }}><img src={logoSmall} className="w-6 h-6 object-contain" alt="" /></span> Share App</>
          }
        </button>

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
      <div className="max-w-xl md:max-w-4xl mx-auto px-5 -mt-6 pb-20 relative z-10">

        {/* Side logo watermarks — near inner edge of each margin, aligned with lower card row */}
        <div className="hidden xl:block absolute pointer-events-none select-none" style={{ left: "calc((100% - 100vw) / 4 - 72px)", top: "30%", transform: "translateY(-50%)" }} aria-hidden="true">
          <img src={logoLarge} alt="" className="w-36 h-36 object-contain rounded-3xl" style={{ opacity: 0.06 }} />
        </div>
        <div className="hidden xl:block absolute pointer-events-none select-none" style={{ right: "calc((100% - 100vw) / 4 - 72px)", top: "30%", transform: "translateY(-50%)" }} aria-hidden="true">
          <img src={logoLarge} alt="" className="w-36 h-36 object-contain rounded-3xl" style={{ opacity: 0.06 }} />
        </div>
        <StreakWidget onAddName={() => setShowNamePrompt(true)} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-3"
        >
          {/* Daily Devotional — primary action */}
          <DevotionalCard />

          {/* Bible Journeys + Read — core content, moved up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map(({ href, icon: Icon, pillText, title, description, cta, testid, imageBg, border, iconColor, pillClass, accentGradient, iconBg, iconShadow }) => (
            <Link key={href} href={href}>
              <div
                data-testid={testid}
                className={`group relative rounded-2xl ${imageBg} border ${border} bg-card p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden h-full`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentGradient} opacity-70 rounded-l-2xl`} />
                <img
                  src={logoWhite}
                  alt=""
                  aria-hidden="true"
                  className="absolute top-3 right-3 w-11 h-11 object-contain opacity-[0.18] pointer-events-none select-none"
                  style={{ filter: "invert(1)" }}
                />
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} shadow-sm ${iconShadow}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5 pr-14">
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
          </div>

          {/* Pray + Text — side by side at the bottom of the main cards */}
          <div className="grid grid-cols-2 gap-3">

            {/* Pray in the app */}
            <Link href="/pray">
              <div
                data-testid="card-pray"
                className="group relative rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/5 border border-rose-900/10 bg-card p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden h-full flex flex-col"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-rose-400 to-pink-500 opacity-70 rounded-l-2xl" />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-rose-100 to-pink-50 shadow-sm shadow-rose-200/60 mb-3">
                  <Heart className="w-4.5 h-4.5 text-rose-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 self-start mb-2">
                  In the app
                </span>
                <h2 className="text-[15px] font-bold text-foreground mb-1 leading-tight tracking-tight">
                  Guided Prayer
                </h2>
                <p className="text-[12px] text-muted-foreground leading-relaxed flex-1">
                  Whatever you're carrying — bring it here. Receive scripture, reflection, and a prayer shaped just for you.
                </p>
                <div className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-rose-500 group-hover:gap-2 transition-all">
                  Open Prayer
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Text from anywhere */}
            <a
              href="sms:+18339629341&body=Pray"
              data-testid="btn-sms-text-us"
              className="group relative rounded-2xl overflow-hidden border border-amber-200/60 dark:border-amber-700/40 p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex flex-col"
              style={{ background: "linear-gradient(135deg, hsl(38 96% 97%) 0%, hsl(43 100% 94%) 100%)" }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-amber-400 to-orange-500 opacity-70 rounded-l-2xl" />
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-200 to-orange-100 shadow-sm shadow-amber-200/60 flex items-center justify-center shrink-0 mb-3">
                <MessageCircle className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 self-start mb-2">
                No app needed
              </span>
              <h2 className="text-[15px] font-bold text-amber-900 mb-1 leading-tight tracking-tight">
                Text PRAY
              </h2>
              <p className="text-[12px] text-amber-800/70 leading-relaxed flex-1">
                Just your phone. Text anything on your heart to our number — scripture and prayer come straight back.
              </p>
              <div className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-amber-700 group-hover:gap-2 transition-all">
                Text +1 (833) 962-9341
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </a>

          </div>
        </motion.div>

        {/* Scripture commitment card — trust footer, sits at the very bottom */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="relative mt-5 rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden"
          data-testid="commitment-card"
        >
          <img src={logoWhite} alt="" aria-hidden="true" className="absolute top-3 right-3 w-11 h-11 object-contain opacity-[0.15] pointer-events-none select-none" style={{ filter: "invert(1)" }} />
          <button
            onClick={() => setExpanded(v => !v)}
            data-testid="btn-commitment-toggle"
            className="w-full text-left px-5 py-4 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-bold text-foreground leading-tight">Our Commitment to Scripture</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded px-1.5 py-0.5 leading-none">Read This</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">We mean every word. AI grounded in God's Word — always.</p>
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-8 space-y-2"
        >
          <p className="text-xs text-muted-foreground">
            Faith-rooted · AI-powered · Built for daily life
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground transition-colors underline underline-offset-2" data-testid="link-pricing-footer">
              Plans & Pricing
            </Link>
            <span>·</span>
            <a href="mailto:support@shepherdspathai.com" className="hover:text-foreground transition-colors underline underline-offset-2" data-testid="link-support-footer">
              support@shepherdspathai.com
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
