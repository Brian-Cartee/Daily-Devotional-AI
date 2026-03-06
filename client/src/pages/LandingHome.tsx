import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sun, Compass, BookOpen, ArrowRight } from "lucide-react";

const sections = [
  {
    href: "/devotional",
    icon: Sun,
    color: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "border-amber-200/60 dark:border-amber-700/30",
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    pillText: "Daily",
    title: "Daily Devotional",
    description: "Start your day with today's scripture, a short encouragement, and a moment of reflection — with optional AI guidance and prayer.",
    cta: "Open Today's Verse",
    testid: "card-devotional",
  },
  {
    href: "/understand",
    icon: Compass,
    color: "from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/20",
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    iconColor: "text-sky-600 dark:text-sky-400",
    accent: "border-sky-200/60 dark:border-sky-700/30",
    pill: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    pillText: "Guided",
    title: "Understand the Bible",
    description: "A curated path through the 18 most important passages in the Bible — from Creation to Revelation — with summaries and AI reflection.",
    cta: "Start the Journey",
    testid: "card-understand",
  },
  {
    href: "/read",
    icon: BookOpen,
    color: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "border-emerald-200/60 dark:border-emerald-700/30",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    pillText: "Full Bible",
    title: "Read the Bible",
    description: "Read any book and chapter from Genesis to Revelation, with optional AI help for explanation, context, and practical application.",
    cta: "Start Reading",
    testid: "card-read",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function LandingHome() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background to-accent/10">

      <div className="max-w-xl mx-auto px-5 pt-20 pb-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header */}
          <motion.header variants={itemVariants} className="text-center mb-14 pt-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-primary text-xl font-bold tracking-tight">DB</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-foreground mb-3 tracking-tight">
              Daily Bread
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
              An interactive Bible study and spiritual growth companion.
            </p>
          </motion.header>

          {/* Section Cards */}
          <div className="space-y-4">
            {sections.map(({ href, icon: Icon, color, iconBg, iconColor, accent, pill, pillText, title, description, cta, testid }) => (
              <motion.div key={href} variants={itemVariants}>
                <Link href={href}>
                  <div
                    data-testid={testid}
                    className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} border ${accent} p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pill}`}>
                            {pillText}
                          </span>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1.5 leading-tight">
                          {title}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          {description}
                        </p>

                        <div className={`flex items-center gap-1.5 mt-4 text-sm font-medium ${iconColor} group-hover:gap-2.5 transition-all`}>
                          {cta}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Footer note */}
          <motion.p variants={itemVariants} className="text-center text-xs text-muted-foreground mt-12 px-4">
            Faith-based · AI-powered · Built for daily habit
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
