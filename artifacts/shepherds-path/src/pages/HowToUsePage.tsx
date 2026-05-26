import { motion } from "framer-motion";
import {
  Sun,
  Sparkles,
  NotebookPen,
  BookOpen,
  Compass,
  Users,
  HelpCircle,
  ChevronRight,
  DoorOpen,
  MessageCircle,
  Bell,
  LayoutGrid,
  Smartphone,
  ArrowRight,
  Wind,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { MinistrySupportSection } from "@/components/MinistrySupportSection";
import { Link } from "wouter";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const quickStarts = [
  {
    href: "/",
    icon: LayoutGrid,
    title: "For You home",
    desc: "Choose Talk, Scripture, or Breathe — then today's devotional right below.",
    testId: "how-to-quick-home",
    accent: "border-primary/25 bg-primary/8",
    iconColor: "text-primary",
  },
  {
    href: "/devotional",
    icon: Sun,
    title: "Morning with God",
    desc: "Today's verse, reflection, prayer, and gratitude — about five minutes.",
    testId: "how-to-quick-devotional",
    accent: "border-amber-500/25 bg-amber-500/8",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    href: "/guidance",
    icon: MessageCircle,
    title: "Something heavy today",
    desc: "Talk it through — Scripture and prayer shaped for what you typed.",
    testId: "how-to-quick-guidance",
    accent: "border-violet-500/25 bg-violet-500/8",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    href: "/prayer-closet",
    icon: DoorOpen,
    title: "Quiet before God",
    desc: "Your prayer closet — worship, stillness, and a private journal.",
    testId: "how-to-quick-closet",
    accent: "border-indigo-500/25 bg-indigo-500/8",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    href: "/sigh",
    icon: Wind,
    title: "Just breathe",
    desc: "A quieter room when you need stillness — no performance.",
    testId: "how-to-quick-breathe",
    accent: "border-sky-500/25 bg-sky-500/8",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
];

const bottomNav = [
  { label: "For You", desc: "Home — three ways to begin, devotional, closet, shortcuts" },
  { label: "Guidance", desc: "Talk it through (full pastoral conversation)" },
  { label: "Journey", desc: "Bible journeys and guided pathways" },
  { label: "Journal", desc: "Prayers and reflections you save" },
];

const steps = [
  {
    number: "1",
    icon: LayoutGrid,
    color: "bg-primary/5 border-primary/20",
    iconColor: "text-primary",
    title: "For You — choose your step",
    where: "Home (For You tab) — \"How do you want to begin?\"",
    description:
      "Three tabs: Talk it through, Sit in Scripture, and Just breathe. Talk is selected first most of the day — your full devotional card with today's Scripture is always right below. Switch anytime; nothing is posted publicly unless you share it.",
    tip: "Late night (about 10pm–5am Eastern) may default to Just breathe instead.",
  },
  {
    number: "2",
    icon: Sun,
    color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "Daily devotional",
    where: "Devotional card on For You, or Devotional in the menu",
    description:
      "Each day opens with a Bible verse chosen for today. Read or listen without rushing, receive reflection and prayer, and close with gratitude. Tap Share to send the verse or an image to someone on your heart.",
    tip: "Listen-first works well in the car or with coffee — look for play buttons throughout.",
  },
  {
    number: "3",
    icon: Sparkles,
    color: "bg-fuchsia-50 dark:bg-fuchsia-950/30 border-fuchsia-200 dark:border-fuchsia-800/50",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
    title: "Path AI (quick help)",
    where: "Purple Path AI button — bottom-right on most screens",
    description:
      "Path AI gives a faithful, Scripture-grounded answer in one exchange — great for a verse question, a short prayer, or when you need clarity fast. Tap a suggested starter or type your own. You can save the answer to your journal or go deeper in Talk it through.",
    tip: "Tap \"How does this app work?\" in Path AI anytime to return to this guide.",
  },
  {
    number: "4",
    icon: MessageCircle,
    color: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/50",
    iconColor: "text-violet-600 dark:text-violet-400",
    title: "Talk it through",
    where: "For You tab, bottom tab Guidance, or More paths",
    description:
      "When life is heavy — grief, fear, a hard decision, loneliness — bring it in your own words. You receive Scripture, reflection, and prayer for your moment. After a response, you can share encouragement (not your private situation).",
    tip: "Path AI (floating button) is one quick answer; Talk it through is the full conversation.",
  },
  {
    number: "5",
    icon: DoorOpen,
    color: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    title: "Prayer closet",
    where: "Prayer closet card on For You, or More paths → Prayer closet",
    description:
      "A quiet room on the screen: soft light, optional worship music, today's verse, and a private journal just for this space. It is not performance — it is a place to be still, listen, and write what you do not want to lose.",
    tip: "On iPhone, YouTube worship volume uses the side buttons; that is normal in the app and in Safari.",
  },
  {
    number: "6",
    icon: NotebookPen,
    color: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/50",
    iconColor: "text-sky-600 dark:text-sky-400",
    title: "Journal",
    where: "Bottom tab Journal",
    description:
      "Your private space for prayers, reflections, and what God showed you. No one else sees it. Even one honest sentence is worth keeping — especially on days when showing up felt hard.",
    tip: "Path AI can save a conversation into your journal with one tap after an answer.",
  },
  {
    number: "7",
    icon: Compass,
    color: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50",
    iconColor: "text-rose-600 dark:text-rose-400",
    title: "Journey & guided pathways",
    where: "Bottom tab Journey",
    description:
      "Multi-day walks through Scripture for seasons like grief, anxiety, or returning to faith. Milestones along the way (Green Pastures, Still Waters, and so on) are a quiet record of showing up — not a scoreboard.",
    tip: "On For You, open More paths → Guided Pathways for focused 7-day topics.",
  },
  {
    number: "8",
    icon: BookOpen,
    color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    title: "Bible & study",
    where: "Top menu: Bible and Study, or More paths on For You",
    description:
      "Read the full Bible (KJV, WEB, ASV) or explore a passage with study tools. The Psalms are a gentle starting place — prayers from people who felt what you feel.",
    tip: "Tap a verse to highlight or bookmark it for later.",
  },
  {
    number: "9",
    icon: Users,
    color: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/50",
    iconColor: "text-orange-600 dark:text-orange-400",
    title: "Prayer Wall & community",
    where: "For You → More paths → Prayer Wall",
    description:
      "Share what you are carrying or tap Praying beside someone else's request. One tap can tell them they are not alone. Stories and other paths live under the same More paths section.",
    tip: "You do not need a long comment — \"I'm praying\" is enough.",
  },
];

const faqs = [
  {
    q: "Do I need an account?",
    a: "No login required. Your progress is tied to this device automatically so you can start immediately.",
  },
  {
    q: "Is it free?",
    a: "Yes — devotional, Bible, journal, prayer closet, Talk it through, and most journeys are free. Pro is optional (unlimited AI, full journal history, and a few extras). You never have to pay to meet God in this app.",
  },
  {
    q: "What's the difference between Path AI and Talk it through?",
    a: "Path AI is a quick, faithful answer from the floating button — one exchange, starters, save to journal. Talk it through (Guidance tab) is the full conversation when you want Scripture and prayer to unfold over several back-and-forths.",
  },
  {
    q: "App Store app vs Safari?",
    a: "Both use the same website. The App Store app is a simple shell around shepherdspathai.com — pull down to refresh after updates. In Safari you can also add to Home Screen; the app skips install banners.",
  },
  {
    q: "Reminders?",
    a: "Tap the bell at the top for push or email reminders (morning devotional, evening reflection, and more). Allow notifications when your phone asks — you can change times anytime in that panel.",
  },
  {
    q: "What if I miss a day?",
    a: "Your streak may reset, but your journal and paths remain. The door stays open — come back when you can.",
  },
  {
    q: "Why do you ask for support or gifts?",
    a: "Servers, audio, and Bible-grounded AI cost real money. The core app stays free; Pro and one-time gifts are optional ways to keep it open for someone who cannot pay. No pressure.",
  },
  {
    q: "Is my journal private?",
    a: "Yes. Your entries are private to you on this device.",
  },
];

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-32">
        <motion.div {...fade(0)} className="text-center pt-8 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/20 mb-5">
            <HelpCircle className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
              How to Use
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-3">
            Your map of Shepherd&apos;s Path
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
            Start on For You — choose Talk, Scripture, or Breathe — then explore one step below.
            You do not need to learn everything today.
          </p>
        </motion.div>

        {/* Quick start */}
        <motion.div {...fade(0.06)} className="mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3 px-0.5">
            Start here
          </p>
          <div className="grid gap-2.5">
            {quickStarts.map(({ href, icon: Icon, title, desc, testId, accent, iconColor }) => (
              <Link key={href} href={href}>
                <div
                  data-testid={testId}
                  className={`flex items-center gap-3 rounded-2xl border p-4 active:scale-[0.99] transition-transform ${accent}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center shrink-0 border border-border/40">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-foreground leading-tight">{title}</p>
                    <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">{desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          {...fade(0.12)}
          className="mb-10 rounded-2xl border border-border/60 bg-muted/25 p-5"
          data-testid="how-to-navigation"
        >
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-4 h-4 text-primary/70" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Find your way around
            </p>
          </div>
          <p className="text-[14px] text-foreground/85 leading-relaxed mb-4">
            On your phone, the <strong className="font-semibold">bottom bar</strong> is home base.
            The <strong className="font-semibold">⋯ menu</strong> (top right) has Bible, Study,
            How to use, and more. The <strong className="font-semibold">bell</strong> sets
            reminders.
          </p>
          <ul className="space-y-2.5 mb-4">
            {bottomNav.map((item) => (
              <li key={item.label} className="flex gap-2 text-[13px]">
                <span className="font-bold text-foreground shrink-0 w-[4.5rem]">{item.label}</span>
                <span className="text-muted-foreground leading-snug">{item.desc}</span>
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-muted-foreground leading-relaxed flex items-start gap-2">
            <Bell className="w-4 h-4 shrink-0 mt-0.5 text-primary/60" />
            <span>
              Scroll For You to <strong className="font-medium text-foreground/80">More paths</strong>{" "}
              for Prayer Wall, reading plans, salvation, and dozens of other doors.
            </span>
          </p>
        </motion.div>

        {/* Path AI vs Talk */}
        <motion.div
          {...fade(0.16)}
          className="mb-10 rounded-2xl border border-primary/20 bg-primary/[0.05] p-5"
          data-testid="how-to-path-ai-vs-guidance"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80">
              Two kinds of help
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-[13px] leading-relaxed">
            <div className="rounded-xl border border-border/50 bg-background/70 p-3.5">
              <p className="font-bold text-foreground mb-1">Path AI</p>
              <p className="text-muted-foreground">
                Fast answer, suggested starters, one screen. Floating button almost everywhere.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/70 p-3.5">
              <p className="font-bold text-foreground mb-1">Talk it through</p>
              <p className="text-muted-foreground">
                Longer conversation, prayer chains, your words carried forward. Guidance tab.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Walkthrough steps */}
        <motion.div {...fade(0.2)}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3 px-0.5">
            Everything else, step by step
          </p>
        </motion.div>
        <div className="space-y-5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={`rounded-2xl border p-5 ${step.color}`}
                data-testid={`how-to-step-${step.number}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/70 dark:bg-black/20 border border-white/60 dark:border-white/10">
                    <Icon className={`w-5 h-5 ${step.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-widest ${step.iconColor} opacity-70`}
                    >
                      Step {step.number}
                    </span>
                    <h2 className="text-[17px] font-bold text-foreground leading-snug mt-0.5">
                      {step.title}
                    </h2>
                    <div className="flex items-start gap-1 mt-1">
                      <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0 mt-0.5" />
                      <span className="text-[12px] text-muted-foreground font-medium leading-snug">
                        {step.where}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[15px] text-foreground/80 leading-relaxed mb-3">
                  {step.description}
                </p>
                <div className="flex items-start gap-2 bg-white/50 dark:bg-black/10 rounded-xl px-3.5 py-2.5 border border-white/60 dark:border-white/5">
                  <span className="text-[13px] font-bold text-muted-foreground/60 shrink-0 mt-px">
                    TIP
                  </span>
                  <p className="text-[13px] text-muted-foreground leading-snug">{step.tip}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div {...fade(0.55)} className="mt-12" id="ministry-support-heading">
          <MinistrySupportSection theme="light" />
        </motion.div>

        <motion.div {...fade(0.6)} className="mt-12">
          <h2 className="text-xl font-bold text-foreground mb-5 text-center">Common questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-border/60 bg-muted/30 px-5 py-4"
                data-testid={`faq-item-${i}`}
              >
                <p className="text-[15px] font-bold text-foreground mb-1.5">{faq.q}</p>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div {...fade(0.7)} className="mt-12 text-center space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6">
            <Smartphone className="w-6 h-6 text-primary/60 mx-auto mb-3" />
            <p className="text-[15px] text-foreground/80 leading-relaxed max-w-sm mx-auto">
              Open Path AI on For You and tap{" "}
              <span className="font-semibold text-foreground">How does this app work?</span> anytime
              you want this guide again.
            </p>
          </div>

          <Link
            href="/devotional"
            data-testid="how-to-cta-devotional"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 transition-opacity"
          >
            <Sun className="w-4 h-4" />
            Open today&apos;s devotional
          </Link>

          <div className="pt-2">
            <Link
              href="/support"
              data-testid="how-to-link-support"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Still stuck? Contact support
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
