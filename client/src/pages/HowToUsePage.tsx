import { motion } from "framer-motion";
import { Sun, Sparkles, NotebookPen, BookOpen, Compass, Users, HelpCircle, ChevronRight, Heart } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Link } from "wouter";

const steps = [
  {
    number: "1",
    icon: Sun,
    color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "Start with your Daily Devotional",
    where: 'Tap "Devotional" in the menu',
    description:
      "This is the best place to begin every day. You will see a Bible verse chosen just for today. Read it slowly — there is no rush. Then tap the button to receive a short reflection written just for you. After that, you can listen to a prayer, and finally close with a moment of gratitude. The whole thing takes about five minutes.",
    tip: "Come back to the same Devotional page every morning. It changes each day.",
  },
  {
    number: "2",
    icon: Sparkles,
    color: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/50",
    iconColor: "text-violet-600 dark:text-violet-400",
    title: "Ask for Guidance when you need it",
    where: 'Tap "Seek Guidance" on the home screen',
    description:
      'If you are going through something difficult — grief, fear, loneliness, a hard decision — this is where you go. Type what is on your heart in your own words. There is no wrong way to say it. You will receive a thoughtful, Scripture-rooted response that speaks to exactly what you shared. Think of it as a pastoral conversation available any time of day or night.',
    tip: 'You can find "Seek Guidance" right on the home screen, or tap the compass icon.',
  },
  {
    number: "3",
    icon: NotebookPen,
    color: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/50",
    iconColor: "text-sky-600 dark:text-sky-400",
    title: "Write in your Journal",
    where: 'Tap "Journal" in the menu',
    description:
      "The Journal is your private space. You can write your prayers, your thoughts, what God showed you today, or anything you want to remember. No one else can see it — it is just between you and God. Writing even one or two sentences a day is a powerful spiritual habit.",
    tip: "There are no rules here. Write as much or as little as you like.",
  },
  {
    number: "4",
    icon: BookOpen,
    color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    title: "Read the Bible",
    where: 'Tap "Bible" in the menu',
    description:
      "The full Bible is right here in the app. You can read any book or chapter you like. If you are not sure where to start, the Psalms are a wonderful place — they are prayers and poems written by people who felt exactly what you feel. Proverbs is another great starting point for practical wisdom.",
    tip: "Tap any verse to highlight it or save it.",
  },
  {
    number: "5",
    icon: Compass,
    color: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50",
    iconColor: "text-rose-600 dark:text-rose-400",
    title: "Track your Journey",
    where: 'Tap "Journey" in the menu',
    description:
      "The Journey page shows your streak — how many days in a row you have shown up. Every three days or so, you will earn a badge named after a verse from Psalm 23. Starting at Green Pastures, then Still Waters, then Restored, and so on. These are not just rewards — they are a map of how far you have walked.",
    tip: "Your streak grows when you open the Devotional page each day.",
  },
  {
    number: "6",
    icon: Users,
    color: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/50",
    iconColor: "text-orange-600 dark:text-orange-400",
    title: "Pray for Others on the Prayer Wall",
    where: 'Tap "Stories" then scroll to Prayer Wall',
    description:
      'The Prayer Wall is where people share what they are carrying and ask for prayer. You can post your own request, or simply tap the "Praying" button next to someone else\'s. That one tap sends them a notification that someone is standing with them. It is a small act of kindness that can mean everything to someone in a hard moment.',
    tip: "You do not need to write a long prayer — just letting someone know you are praying is enough.",
  },
];

const faqs = [
  {
    q: "Do I need to create an account?",
    a: "No. Shepherd's Path works without an account. Your progress is saved on your device automatically.",
  },
  {
    q: "Is it free?",
    a: "Yes — the Daily Devotional, Bible, Journal, and most features are completely free. There is an optional Pro upgrade that unlocks unlimited guided conversations and a few extras, but you never have to pay to use this app.",
  },
  {
    q: "What if I miss a day?",
    a: "That is okay. Your streak will reset, but your journal and everything else is still here. The door is always open. Just come back.",
  },
  {
    q: "Can I use this on my phone?",
    a: 'Yes. You can add Shepherd\'s Path to your phone\'s home screen so it opens like any other app. On iPhone, tap the Share button in Safari and choose "Add to Home Screen." On Android, tap the three dots in Chrome and choose "Add to Home Screen."',
  },
  {
    q: "Is my journal private?",
    a: "Yes. Your journal entries are stored privately and are only visible to you.",
  },
];

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-32">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center pt-8 pb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/20 mb-5">
            <HelpCircle className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70">How to Use</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-3">
            Welcome to Shepherd's Path
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
            This guide walks you through everything, one step at a time. There is no rush. 
            Start wherever feels right.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className={`rounded-2xl border p-5 ${step.color}`}
                data-testid={`how-to-step-${step.number}`}
              >
                {/* Step header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/70 dark:bg-black/20 border border-white/60 dark:border-white/10`}>
                    <Icon className={`w-5 h-5 ${step.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${step.iconColor} opacity-70`}>Step {step.number}</span>
                    </div>
                    <h2 className="text-[17px] font-bold text-foreground leading-snug mt-0.5">
                      {step.title}
                    </h2>
                    <div className="flex items-center gap-1 mt-1">
                      <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                      <span className="text-[12px] text-muted-foreground font-medium">{step.where}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[15px] text-foreground/80 leading-relaxed mb-3">
                  {step.description}
                </p>

                {/* Tip */}
                <div className="flex items-start gap-2 bg-white/50 dark:bg-black/10 rounded-xl px-3.5 py-2.5 border border-white/60 dark:border-white/5">
                  <span className="text-[13px] font-bold text-muted-foreground/60 shrink-0 mt-px">TIP</span>
                  <p className="text-[13px] text-muted-foreground leading-snug">{step.tip}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12"
        >
          <h2 className="text-xl font-bold text-foreground mb-5 text-center">Common Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/60 bg-muted/30 px-5 py-4"
                data-testid={`faq-item-${i}`}
              >
                <p className="text-[15px] font-bold text-foreground mb-1.5">{faq.q}</p>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Closing + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 text-center space-y-4"
        >
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6">
            <Heart className="w-6 h-6 text-primary/60 mx-auto mb-3" />
            <p className="text-[15px] text-foreground/80 leading-relaxed max-w-sm mx-auto">
              You do not need to figure this out all at once. Start with the Daily Devotional 
              tomorrow morning. That one step is enough.
            </p>
          </div>

          <Link
            href="/devotional"
            data-testid="how-to-cta-devotional"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 transition-opacity"
          >
            <Sun className="w-4 h-4" />
            Open Today's Devotional
          </Link>

          <div className="pt-2">
            <Link
              href="/support"
              data-testid="how-to-link-support"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Still have questions? Reach out for support
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
