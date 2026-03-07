import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sun, Compass, BookOpen, ArrowRight } from "lucide-react";

const sections = [
  {
    href: "/devotional",
    icon: Sun,
    pillText: "Daily",
    title: "Daily Devotional",
    description: "Today's scripture, an encouragement, and a moment of AI-guided reflection — made for how you actually live.",
    cta: "Open Today's Verse",
    testid: "card-devotional",
    imageBg: "bg-gradient-to-br from-amber-500/10 to-orange-500/5",
    border: "border-amber-900/10",
    iconColor: "text-amber-500",
    pillClass: "bg-amber-500/10 text-amber-600",
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
    description: "Chapter-by-chapter from Genesis to Revelation, with AI available for context, explanation, and reflection.",
    cta: "Start Reading",
    testid: "card-read",
    imageBg: "bg-gradient-to-br from-teal-500/10 to-emerald-500/5",
    border: "border-teal-900/10",
    iconColor: "text-teal-500",
    pillClass: "bg-teal-500/10 text-teal-600",
  },
];

export default function LandingHome() {
  return (
    <div className="min-h-screen bg-background">
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
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/12 backdrop-blur-sm border border-white/20 text-white/85 text-[21px] font-semibold uppercase tracking-widest mb-4">
              Shepherd's Path
            </div>
            <p className="text-white/90 text-xl sm:text-2xl max-w-sm mx-auto drop-shadow font-semibold tracking-wide">
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

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-muted-foreground mt-10"
        >
          Faith-rooted · AI-powered · Built for daily life
        </motion.p>
      </div>
    </div>
  );
}
