import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Compass, BookOpen, Heart, ArrowRight, ShieldCheck, ChevronDown, Check, Share2, MessageCircle, Flame } from "lucide-react";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { useWelcomeOverlay } from "@/hooks/use-welcome-overlay";
import { NamePrompt } from "@/components/NamePrompt";
import { hasBeenPrompted } from "@/lib/userName";
import { WEEK_LABELS, getCurrentWeekDates, getTodayIndex } from "@/components/StreakWidget";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { useDemoMode } from "@/components/DemoProvider";

const logoSmall = "/logo-mark-white.png";
const logoWhite = "/logo-mark-white.png";
const logoLarge = "/logo-mark-white.png";

const sections = [
  {
    href: "/understand",
    icon: Compass,
    pillText: "Choose Your Journey",
    title: "Bible Journeys",
    description: "Guided paths through Scripture — the Psalms, the Life of Jesus, Lent, the Sermon on the Mount, and more. Each one takes you deeper.",
    cta: "Explore Journeys",
    testid: "card-understand",
    imageBg: "bg-gradient-to-br from-indigo-500/10 to-violet-500/5",
    border: "border-indigo-900/10",
    iconColor: "text-indigo-500",
    pillClass: "bg-indigo-500/10 text-indigo-600",
    accentGradient: "bg-gradient-to-b from-indigo-400 to-violet-500",
    iconBg: "bg-gradient-to-br from-indigo-100 to-violet-50",
    iconShadow: "shadow-indigo-200/60",
    photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=700&q=70&auto=format&fit=crop",
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
    photo: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=700&q=70&auto=format&fit=crop",
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

  const weekDates = getCurrentWeekDates();
  const todayIdx = getTodayIndex();
  const visitDates: string[] = data?.visitDates ?? [];
  const streak = data?.currentStreak ?? 0;

  // Build the visit set. If streak > stored dates (data gap from before visitDates was tracked),
  // infer the missing prior days by counting back from today.
  const visitSet = new Set(visitDates);
  if (streak > visitSet.size) {
    for (let i = 0; i < streak; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      visitSet.add(d);
    }
  }
  const visitedToday = visitSet.has(weekDates[todayIdx]);

  return (
    <Link href="/devotional">
      <div
        data-testid="card-devotional"
        className="group relative rounded-2xl border border-teal-900/10 bg-card p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
      >
        <img
          src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=700&q=70&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.32] pointer-events-none select-none"
          style={{ filter: "saturate(0.75) brightness(1.05)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-emerald-500/8 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-transparent to-transparent pointer-events-none" />
        {/* Left accent strip */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-teal-400 to-emerald-500 opacity-70 rounded-l-2xl" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-teal-100 to-emerald-50 shadow-sm shadow-teal-200/60">
            <Sun className="w-5 h-5 text-teal-500" />
          </div>
          <div className="flex-1 min-w-0 py-0.5">
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

        {/* Horizontal week tracker */}
        <div className="relative z-10 mt-4 pt-3 border-t border-teal-900/8">
          <div className="flex items-end justify-center gap-3">
            <div className="flex items-end gap-2.5">
              {WEEK_LABELS.map((label, i) => {
                const date = weekDates[i];
                const visited = visitSet.has(date);
                const isToday = i === todayIdx;
                const isFuture = i > todayIdx;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className={`text-[9px] font-bold uppercase leading-none ${isToday ? "text-teal-600 dark:text-teal-400" : visited ? "text-teal-500/60" : "text-muted-foreground/25"}`}>
                      {label}
                    </span>
                    <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all ${
                      visited && isToday
                        ? "bg-teal-500 shadow-sm shadow-teal-400/50"
                        : visited
                        ? "bg-teal-50 dark:bg-teal-900/30 border border-teal-300/70 dark:border-teal-700/50"
                        : isToday
                        ? "border-2 border-teal-400/60 bg-teal-50/50"
                        : isFuture
                        ? "border border-muted-foreground/10"
                        : "border border-muted-foreground/12 bg-muted/10"
                    }`}>
                      {visited && isToday && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      {visited && !isToday && <Check className="w-2.5 h-2.5 text-teal-400" strokeWidth={3} />}
                      {isToday && !visited && <div className="w-1.5 h-1.5 rounded-full bg-teal-400/50" />}
                    </div>
                  </div>
                );
              })}
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1 pb-0.5">
                {streak >= 7
                  ? <Flame className="w-3.5 h-3.5 text-amber-500" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                }
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">{streak}d</span>
              </div>
            )}
          </div>
        </div>
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
  const demo = useDemoMode();

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

        {/* Brand mark + Share App — top right of hero */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-col items-center gap-2">
          {/* Watermark logo — brand stamp, not a button */}
          <img
            src={logoSmall}
            alt=""
            aria-hidden="true"
            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-contain pointer-events-none select-none"
            style={{ opacity: 0.48, filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.5))" }}
          />
          {/* Share button — clean, no logo */}
          <button
            onClick={handleShareApp}
            data-testid="btn-share-app"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/50 transition-all text-[12px] font-medium"
          >
            {shared
              ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</>
              : <><Share2 className="w-3.5 h-3.5 opacity-80" /> Share App</>
            }
          </button>
        </div>

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
            {demo?.config.isDemo && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                <span className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">For</span>
                <span className="text-white text-[12px] font-bold">{demo.config.churchName}</span>
              </div>
            )}
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
          {sections.map(({ href, icon: Icon, pillText, title, description, cta, testid, imageBg, border, iconColor, pillClass, accentGradient, iconBg, iconShadow, photo }) => (
            <Link key={href} href={href}>
              <div
                data-testid={testid}
                className={`group relative rounded-2xl border ${border} bg-card p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden h-full`}
              >
                {photo && (
                  <img
                    src={photo}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-[0.13] pointer-events-none select-none"
                  />
                )}
                <div className={`absolute inset-0 ${imageBg} pointer-events-none`} />
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentGradient} opacity-70 rounded-l-2xl`} />
                <img
                  src={logoWhite}
                  alt=""
                  aria-hidden="true"
                  className="absolute top-3 right-3 w-11 h-11 object-contain opacity-[0.18] pointer-events-none select-none"
                  
                />
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} shadow-sm ${iconShadow}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5 pr-8 sm:pr-14">
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
                className="group relative rounded-2xl border border-rose-900/10 bg-card p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden h-full flex flex-col"
              >
                <img src="https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=500&q=70&auto=format&fit=crop" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-[0.13] pointer-events-none select-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-pink-500/5 pointer-events-none" />
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-rose-400 to-pink-500 opacity-70 rounded-l-2xl" />
                <img src={logoWhite} alt="" aria-hidden="true" className="absolute top-3 right-3 w-11 h-11 object-contain opacity-[0.18] pointer-events-none select-none"  />
                <div className="relative z-10 flex flex-col flex-1">
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
              </div>
            </Link>

            {/* Text from anywhere */}
            <a
              href="sms:+18339629341&body=Pray"
              data-testid="btn-sms-text-us"
              className="group relative rounded-2xl border border-rose-900/10 bg-card p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden flex flex-col"
            >
              <img src="https://images.unsplash.com/photo-1532452119098-a3650b3c46d3?w=500&q=70&auto=format&fit=crop" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-[0.13] pointer-events-none select-none" onError={e => (e.currentTarget.style.display = "none")} />
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-pink-500/5 pointer-events-none" />
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-rose-400 to-pink-500 opacity-70 rounded-l-2xl" />
              <img src={logoWhite} alt="" aria-hidden="true" className="absolute top-3 right-3 w-11 h-11 object-contain opacity-[0.18] pointer-events-none select-none"  />
              <div className="relative z-10 flex flex-col flex-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-pink-50 shadow-sm shadow-rose-200/60 flex items-center justify-center shrink-0 mb-3">
                  <MessageCircle className="w-4.5 h-4.5 text-rose-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 self-start mb-2">
                  No app needed
                </span>
                <h2 className="text-[15px] font-bold text-foreground mb-1 leading-tight tracking-tight">
                  Text PRAY
                </h2>
                <p className="text-[12px] text-muted-foreground leading-relaxed flex-1">
                  Just your phone. Text anything on your heart to our number — scripture and prayer come straight back.
                </p>
                <div className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-rose-500 group-hover:gap-2 transition-all">
                  Text +1 (833) 962-9341
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </div>
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
          <img src={logoWhite} alt="" aria-hidden="true" className="absolute top-3 right-3 w-11 h-11 object-contain opacity-[0.15] pointer-events-none select-none"  />
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
                <div className="border-t border-primary/10 md:grid md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_280px] md:gap-0">
                  {/* Text content */}
                  <div className="px-5 pb-6 pt-4">
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

                  {/* Bible photo — desktop only */}
                  <div className="hidden md:block relative overflow-hidden rounded-br-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=85"
                      alt="Open Bible"
                      className="w-full h-full object-cover object-center"
                      style={{ minHeight: "220px", filter: "brightness(0.92) saturate(0.85)" }}
                    />
                    {/* Left fade so photo blends into the text side */}
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/30 to-transparent" />
                    {/* Subtle vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
                  </div>
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
