import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { Link } from "wouter";
import { Heart, ChevronDown, ArrowRight, BookOpen, Compass, Sun, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const SALVATION_MOMENT_KEY = "sp_salvation_moment";

const VERSES = [
  { ref: "John 3:16", text: "For God so loved the world that He gave His one and only Son, that whoever believes in Him shall not perish but have eternal life." },
  { ref: "Romans 3:23", text: "For all have sinned and fall short of the glory of God." },
  { ref: "Romans 6:23", text: "For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord." },
  { ref: "Romans 5:8", text: "But God demonstrates His own love for us in this: While we were still sinners, Christ died for us." },
  { ref: "Romans 10:9", text: "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart that God raised Him from the dead, you will be saved." },
  { ref: "John 1:12", text: "Yet to all who did receive Him, to those who believed in His name, He gave the right to become children of God." },
  { ref: "Revelation 3:20", text: "Here I am! I stand at the door and knock. If anyone hears My voice and opens the door, I will come in and eat with that person, and they with Me." },
];

const STEPS = [
  {
    number: "01",
    title: "God loves you — completely",
    body: "Before anything else, this is true: God made you. He knows every detail of your life — every mistake, every private fear, every thing you've never said aloud — and He loves you still. Not a cleaned-up version of you. You, exactly as you are right now.",
    verse: VERSES[0],
  },
  {
    number: "02",
    title: "Something has separated us",
    body: "There's a word the Bible uses for the distance we feel from God: sin. It isn't just the big things. It's every time we've chosen our own way over His, every time we've treated someone as less than they are, every time we've tried to fill with something else what only God can fill. We've all done it. None of us come clean.",
    verse: VERSES[1],
  },
  {
    number: "03",
    title: "God didn't leave us there",
    body: "Here's the part that changes everything. God didn't stand at a distance and judge. He came. He sent His Son, Jesus, into the world — born as a person, living a real human life — and then bearing the full weight of that separation on the cross. The distance we created, He crossed. Not because we earned it. Because He is love.",
    verse: VERSES[3],
  },
  {
    number: "04",
    title: "Jesus rose — and that changes everything",
    body: "Three days after the cross, Jesus rose from the dead. This isn't a metaphor. It's history. It means sin and death do not have the final word. It means the same power that raised Jesus is available to you — right now, today — for the life you're actually living.",
    verse: VERSES[4],
  },
  {
    number: "05",
    title: "He's asking you to open the door",
    body: "Jesus doesn't force His way in. He stands and knocks. Accepting Him isn't a religious ceremony — it's a conversation. It's turning toward Him and saying: I believe You are who You say You are. I can't fix myself. I want You in my life. That's the whole thing. Simple. And it changes everything.",
    verse: VERSES[6],
  },
];

const PRAYER = `Lord Jesus,

I come to You exactly as I am — and I don't want to pretend otherwise. I know I've lived apart from You. I know I've fallen short in ways I can name and ways I can't.

But I believe You are who You say You are. I believe You died in my place and rose again. I believe the distance between me and God was crossed at the cross, and I don't have to earn what You've already given.

I open the door. Come into my life. Be my Lord and my Savior. Change what needs to change. Lead me where I need to go.

I am Yours.

Amen.`;

const NEXT_STEPS = [
  {
    icon: BookOpen,
    title: "Start with the Gospel of John",
    desc: "Begin reading Jesus' own story. John is the best first book — personal, direct, and full of moments where Jesus says exactly who He is.",
    href: "/read",
    linkText: "Open the Bible",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
  {
    icon: Compass,
    title: "Begin a personal Bible journey",
    desc: "Tell us where you are right now — what you're carrying, what you're hoping for — and we'll build a journey through Scripture just for you.",
    href: "/understand",
    linkText: "Start your journey",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200/60 dark:border-violet-800/40",
  },
  {
    icon: Sun,
    title: "Open today's devotional",
    desc: "A new scripture and personal reflection every morning. Five minutes that can quietly become the most important part of your day.",
    href: "/devotional",
    linkText: "Today's devotional",
    color: "text-amber-600 dark:text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
];

function VerseCard({ verse }: { verse: typeof VERSES[0] }) {
  return (
    <div className="mt-4 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3.5">
      <p className="text-[14px] text-foreground/80 leading-relaxed italic">"{verse.text}"</p>
      <p className="text-[12px] font-bold text-primary mt-2">— {verse.ref}</p>
    </div>
  );
}

export default function SalvationPage() {
  const [prayerMoment, setPrayerMoment] = useState<string | null>(() =>
    localStorage.getItem(SALVATION_MOMENT_KEY)
  );
  const [showPrayer, setShowPrayer] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleStepClick = (i: number) => {
    const opening = expandedStep !== i;
    setExpandedStep(opening ? i : null);
    if (opening) {
      setTimeout(() => {
        stepRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  const handlePrayed = () => {
    const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    localStorage.setItem(SALVATION_MOMENT_KEY, now);
    setPrayerMoment(now);
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 4000);
  };

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay },
  });

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-20 pb-24">

        {/* Hero */}
        <motion.div {...fadeUp(0)} className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-500/20">
            <Heart className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-[28px] font-bold text-foreground leading-tight mb-3">
            Beginning with Jesus
          </h1>
          <p className="text-[16px] text-muted-foreground leading-relaxed">
            If something brought you here — curiosity, a hard season, a quiet longing for more — that's not an accident. This page is for you.
          </p>
        </motion.div>

        {/* Intro */}
        <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-border bg-card p-5 mb-8">
          <p className="text-[15px] text-foreground/80 leading-relaxed">
            Accepting Jesus isn't about joining a religion. It isn't about getting your life together first, or knowing the right words, or having it all figured out. It's about a relationship — with a God who already knows everything about you and has never stopped pursuing you.
          </p>
          <p className="text-[15px] text-foreground/80 leading-relaxed mt-3">
            This is the most important thing we know how to say. Take your time with it.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div {...fadeUp(0.15)} className="mb-8">
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div
                key={i}
                ref={el => { stepRefs.current[i] = el; }}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <button
                  data-testid={`btn-salvation-step-${i}`}
                  onClick={() => handleStepClick(i)}
                  className="w-full text-left px-5 py-4 flex items-start gap-4"
                >
                  <span className="text-[11px] font-bold text-primary/60 mt-0.5 w-6 shrink-0">{step.number}</span>
                  <p className="flex-1 text-[15px] font-semibold text-foreground leading-snug">{step.title}</p>
                  <motion.div animate={{ rotate: expandedStep === i ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 mt-0.5">
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {expandedStep === i && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-border/50 pt-3">
                        <p className="text-[14px] text-foreground/75 leading-relaxed">{step.body}</p>
                        <VerseCard verse={step.verse} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Prayer section */}
        <motion.div {...fadeUp(0.2)} className="mb-8">
          <div className="relative rounded-2xl border border-rose-200/60 dark:border-rose-800/40 bg-rose-50/60 dark:bg-rose-950/20 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400" />
            <div className="p-5">
              <h2 className="text-[18px] font-bold text-foreground mb-2">A prayer of faith</h2>
              <p className="text-[14px] text-foreground/70 leading-relaxed mb-4">
                If these words reflect what's in your heart, make them your own. You don't need to say them perfectly. God hears what you mean, not just what you say.
              </p>

              <AnimatePresence>
                {!showPrayer && (
                  <motion.button
                    data-testid="btn-show-prayer"
                    onClick={() => setShowPrayer(true)}
                    className="w-full py-3 rounded-xl border border-rose-300/60 dark:border-rose-700/50 text-[14px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 transition-colors"
                    exit={{ opacity: 0 }}
                  >
                    Read the prayer
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showPrayer && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="rounded-xl bg-background/80 border border-rose-200/40 dark:border-rose-800/30 px-5 py-4 mb-4">
                      {PRAYER.split("\n\n").map((block, i) => (
                        block.trim() ? (
                          <p key={i} className="text-[15px] text-foreground/85 leading-loose mb-3 last:mb-0">
                            {block}
                          </p>
                        ) : null
                      ))}
                    </div>

                    {prayerMoment ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-xl bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/20 border border-amber-200/60 dark:border-amber-700/40 px-5 py-4 text-center"
                      >
                        <p className="text-[22px] mb-1">🎉</p>
                        <p className="text-[15px] font-black text-amber-800 dark:text-amber-300 leading-tight mb-1">
                          Hallelujah! You're part of God's eternal family!
                        </p>
                        <p className="text-[12px] text-amber-700/70 dark:text-amber-400/70 leading-relaxed mb-2">
                          Your name is written in the Book of Life. You have eternal life — nothing and no one can take that from you.
                        </p>
                        <p className="text-[11px] text-muted-foreground/50 font-medium">
                          Prayed on {prayerMoment}
                        </p>
                      </motion.div>
                    ) : (
                      <Button
                        data-testid="btn-i-prayed-this"
                        onClick={handlePrayed}
                        className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-90 border-0 font-bold py-5 text-[15px] text-white shadow-md shadow-rose-500/20"
                      >
                        I prayed this prayer
                        <Heart className="w-4 h-4 ml-2 fill-white" />
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Celebration */}
        <AnimatePresence>
          {celebrating && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="fixed top-20 left-4 right-4 max-w-sm mx-auto z-50 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white px-5 py-4 shadow-xl text-center"
            >
              <p className="text-[22px] mb-1">🎉</p>
              <p className="text-[17px] font-black leading-tight">You just got saved!</p>
              <p className="text-[13px] mt-1 opacity-90 leading-snug">Heaven is celebrating right now.<br/>Welcome to the eternal family of God!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* What's next */}
        <motion.div {...fadeUp(0.25)}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 shrink-0">What's next</p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border/60 to-transparent" />
          </div>

          <p className="text-[14px] text-muted-foreground leading-relaxed mb-5 text-center">
            Your faith is brand new — or freshly renewed. Here's where to go from here.
          </p>

          <div className="space-y-3">
            {NEXT_STEPS.map((step, i) => (
              <Link key={i} href={step.href}>
                <div
                  data-testid={`card-next-step-${i}`}
                  className={`rounded-2xl border p-4 flex items-start gap-4 cursor-pointer active:scale-[0.99] transition-transform ${step.bg} ${step.border}`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0`}>
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-foreground leading-snug">{step.title}</p>
                    <p className="text-[12px] text-foreground/65 leading-snug mt-1">{step.desc}</p>
                  </div>
                  <ArrowRight className={`w-4 h-4 ${step.color} shrink-0 mt-0.5`} />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Church encouragement */}
        <motion.div {...fadeUp(0.3)} className="mt-8 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-[15px] font-bold text-foreground mb-2">Find a church near you</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            Faith grows in community. This app will walk with you every day — but a local church, with real people who know your name, is irreplaceable. If you don't have one, it's worth looking.
          </p>
          <a
            href="https://www.google.com/search?q=Christian+church+near+me"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-find-church"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Search for a church near you
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </motion.div>

        {/* Closing verse */}
        <motion.div {...fadeUp(0.35)} className="mt-8 text-center">
          <p className="text-[14px] text-foreground/60 italic leading-relaxed">
            "Therefore, if anyone is in Christ, the new creation has come: the old has gone, the new is here!"
          </p>
          <p className="text-[12px] font-bold text-primary/70 mt-2">— 2 Corinthians 5:17</p>
        </motion.div>

      </div>
    </div>
  );
}
