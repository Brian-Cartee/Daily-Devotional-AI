import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, Zap, Loader2, ArrowLeft, ShieldCheck, Mail, Sparkles, BookOpen, Sun, Compass, ScrollText, Flame, FileText, History, BookMarked, Lock, Building2, Users, Globe, Phone, Paintbrush, MessageSquare, TrendingUp, Download, CalendarClock, Star, Quote, Church, Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AI_FREE_LIMIT } from "@/lib/aiUsage";
import { isIOS } from "@/lib/platform";

const FREE_FEATURES = [
  { icon: Sun, text: `${AI_FREE_LIMIT} AI responses per day` },
  { icon: BookOpen, text: "Full Bible reading (KJV, WEB, ASV)" },
  { icon: Sun, text: "Daily devotional with scripture & prayer" },
  { icon: Compass, text: "All 4 guided Bible journeys" },
  { icon: ScrollText, text: "Prayer journal (1 journal)" },
  { icon: Flame, text: "Daily streak tracking" },
  { icon: BookMarked, text: "1 free sermon note per month" },
];

const PRO_FEATURES = [
  { icon: Zap, text: "Unlimited AI responses — every day" },
  { icon: BookOpen, text: "Full Bible reading (KJV, WEB, ASV)" },
  { icon: Sun, text: "Daily devotional with scripture & prayer" },
  { icon: Compass, text: "All 4 guided Bible journeys" },
  { icon: ScrollText, text: "Multiple named prayer journals" },
  { icon: Flame, text: "Streak protection — never lose your streak" },
  { icon: History, text: "Full devotional history archive" },
  { icon: FileText, text: "PDF export with beautiful formatting" },
  { icon: BookMarked, text: "Unlimited sermon notes" },
  { icon: Mail, text: "Weekly AI-powered spiritual summary email" },
];

const PRO_SCENARIOS = [
  {
    icon: Zap,
    title: "Never cut off mid-reflection",
    body: "Free users hit a daily limit. Pro means every question, prayer, and reflection goes as deep as God takes you — no interruptions.",
  },
  {
    icon: Download,
    title: "Take your notes with you",
    body: "Export your journal, devotional notes, and prayers as a beautifully formatted PDF — to print, share, or keep forever.",
  },
  {
    icon: Flame,
    title: "Streak protection built in",
    body: "Miss a day of life, not a day of faith. Pro protects your streak so one busy day doesn't wipe out weeks of consistency.",
  },
];

const WHITE_LABEL_TIERS = [
  {
    name: "Starter Church",
    size: "Up to 200 members",
    setup: "$750",
    monthly: "$99",
    color: "from-teal-400 to-emerald-500",
    iconBg: "bg-gradient-to-br from-teal-100 to-emerald-50",
    iconColor: "text-teal-600",
    border: "border-teal-200/60",
    features: [
      "Your logo, name & brand colors",
      "Custom domain (yourchurch.com)",
      "Custom devotional paths & branding",
      "All devotional & Bible features",
      "Up to 200 active users",
      "Email support",
    ],
  },
  {
    name: "Growing Church",
    size: "200–1,000 members",
    setup: "$1,200",
    monthly: "$249",
    color: "from-primary to-violet-500",
    iconBg: "bg-gradient-to-br from-primary/20 to-violet-100",
    iconColor: "text-primary",
    border: "border-primary/30",
    badge: "Most Popular",
    features: [
      "Everything in Starter, plus:",
      "Custom sermon series journeys",
      "Church calendar integration",
      "Member activity reporting for leadership",
      "Up to 1,000 active users",
      "Priority support",
    ],
  },
  {
    name: "Large / Multi-Campus",
    size: "1,000+ members",
    setup: "Custom",
    monthly: "From $499",
    color: "from-amber-400 to-orange-500",
    iconBg: "bg-gradient-to-br from-amber-100 to-orange-50",
    iconColor: "text-amber-600",
    border: "border-amber-200/60",
    features: [
      "Everything in Growing, plus:",
      "Dedicated deployment & infrastructure",
      "Custom AI voice & tone guidelines",
      "Multi-campus or multi-brand support",
      "Unlimited users",
      "Dedicated account manager",
    ],
  },
];

const WHITE_LABEL_WHAT_YOU_GET = [
  { icon: Paintbrush, text: "Your logo, colors & app name — completely unbranded" },
  { icon: Globe, text: "Deployed to your own domain in days, not months" },
  { icon: Phone, text: "Member activity reporting for your leadership team" },
  { icon: MessageSquare, text: "Custom devotional paths tied to your sermon series" },
  { icon: Users, text: "All features: devotionals, journeys, Bible, journaling, prayer" },
  { icon: ShieldCheck, text: "Isolated deployment — your congregation's data stays yours" },
];

const FAQ_ITEMS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The free plan is completely free — no card required. You only need payment info when upgrading to Pro."
  },
  {
    q: "What counts as an AI response?",
    a: `Each AI-generated reflection, prayer, explanation, or study response counts as one. Free users get ${AI_FREE_LIMIT} per day, resetting at midnight. Listening to audio and reading the Bible never count.`
  },
  {
    q: "Is the AI content biblically sound?",
    a: "Yes — every AI response is grounded in the actual Bible passage being studied and shaped by the historic, orthodox Christian faith. We do not use AI to reinterpret or replace Scripture. The Word is our only source and standard. You can read our full commitment on the home screen."
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes — you can cancel at any time from your Stripe account. Your Pro access continues until the end of the paid period."
  },
  {
    q: "What is the 30-day guarantee?",
    a: "If you're not satisfied within 30 days of your purchase, just reach out and we'll refund you — no questions asked."
  },
  {
    q: "I already subscribed — how do I activate Pro?",
    a: "On any AI limit screen, tap 'Already subscribed?' and enter your purchase email to restore access on this device."
  },
];

export default function PricingPage() {
  const [plan, setPlan] = useState<"annual" | "monthly">("annual");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: data.message || "Could not start checkout.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Back nav */}
      <div className="px-5 pt-5">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="btn-pricing-back">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </Link>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-5 pt-8 pb-6 text-center max-w-xl mx-auto"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-widest mb-4">
          <Sparkles className="w-3 h-3" />
          Plans & Pricing
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight leading-tight mb-3">
          Start free.<br />Go deeper with Pro.
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed">
          Shepherd's Path is free to use every day. Pro removes the limits and adds tools that help you go further in your faith.
        </p>
      </motion.div>

      {/* Plan toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex justify-center mb-6 px-5"
      >
        <div className="flex rounded-2xl border border-border overflow-hidden text-sm font-semibold bg-muted/30">
          <button
            data-testid="btn-pricing-annual"
            onClick={() => setPlan("annual")}
            className={`flex items-center gap-2 px-5 py-2.5 transition-colors ${plan === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            Annual
            <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 leading-none ${plan === "annual" ? "bg-amber-400 text-amber-900" : "bg-muted text-muted-foreground"}`}>
              SAVE 37%
            </span>
          </button>
          <button
            data-testid="btn-pricing-monthly"
            onClick={() => setPlan("monthly")}
            className={`px-5 py-2.5 transition-colors ${plan === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            Monthly
          </button>
        </div>
      </motion.div>

      {/* Cards */}
      <div className="max-w-2xl mx-auto px-5 grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">

        {/* Free card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-background border border-border rounded-3xl overflow-hidden flex flex-col"
        >
          <div className="px-6 pt-6 pb-5 border-b border-border">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Free</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-extrabold text-foreground">$0</span>
              <span className="text-sm text-muted-foreground">forever</span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-snug">
              A full daily walk with Jesus — always free.
            </p>
          </div>

          <div className="px-6 py-5 flex-1 space-y-3">
            {FREE_FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground/80 leading-snug">{text}</span>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6">
            <Link href="/devotional">
              <Button
                data-testid="btn-pricing-free-cta"
                variant="outline"
                className="w-full rounded-2xl font-bold py-5 text-sm"
              >
                Start for Free
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Pro card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="bg-background border-2 border-primary/60 rounded-3xl overflow-hidden flex flex-col shadow-lg shadow-primary/10 relative"
        >
          {/* Popular badge */}
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground rounded-full px-2.5 py-1">
              Most Popular
            </span>
          </div>

          <div className="px-6 pt-6 pb-5 border-b border-primary/20 bg-gradient-to-br from-primary/5 to-amber-500/5">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Pro</p>
            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
              {plan === "annual" ? (
                <>
                  <span className="text-3xl font-extrabold text-foreground">$44.99</span>
                  <span className="text-sm text-muted-foreground">/year</span>
                  <span className="text-xs text-muted-foreground/60 line-through">$71.88</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-400/15 rounded px-1.5 py-0.5">Save $26.89</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-foreground">$5.99</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground leading-snug">
              No limits. Go as deep as you want, every day.
            </p>
          </div>

          <div className="px-6 py-5 flex-1 space-y-3">
            {PRO_FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-foreground/80 leading-snug">{text}</span>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6 space-y-2">
            {isIOS() ? (
              <>
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-3 mb-1">
                  <Smartphone className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    To subscribe, visit{" "}
                    <a
                      href="https://shepherdspathai.com/pricing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 dark:text-blue-400 underline"
                    >
                      shepherdspathai.com/pricing
                    </a>
                    {" "}in Safari, then sign back in here to unlock Pro.
                  </p>
                </div>
                <Button
                  data-testid="btn-pricing-pro-cta-ios"
                  className="w-full rounded-2xl font-bold py-5 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0"
                  onClick={() => window.open("https://shepherdspathai.com/pricing", "_blank")}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Subscribe on the Web
                </Button>
                <Button
                  data-testid="btn-pricing-restore-ios"
                  variant="ghost"
                  className="w-full rounded-2xl text-sm text-muted-foreground"
                  onClick={() => window.location.href = "/restore"}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  Restore Purchase
                </Button>
              </>
            ) : (
              <>
                <Button
                  data-testid="btn-pricing-pro-cta"
                  className="w-full rounded-2xl font-bold py-5 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0"
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  {loading ? "Redirecting…" : plan === "annual" ? "Get Pro — $44.99/yr" : "Get Pro — $5.99/mo"}
                </Button>

                {/* Trust anchor */}
                <p className="text-[11px] text-muted-foreground text-center">
                  {plan === "annual"
                    ? "Just $3.75/mo — less than a cup of coffee a month"
                    : "Less than $0.20/day — cancel anytime, no questions asked"}
                </p>

                {/* Monthly reassurance — shown when annual is selected */}
                {plan === "annual" && (
                  <p className="text-[11px] text-muted-foreground/55 text-center -mt-1">
                    Prefer month-to-month?{" "}
                    <button
                      type="button"
                      onClick={() => setPlan("monthly")}
                      className="underline hover:text-muted-foreground transition-colors"
                    >
                      Switch to $5.99/month
                    </button>{" "}
                    — cancel anytime.
                  </p>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span>
                    30-day money-back guarantee ·{" "}
                    <button
                      type="button"
                      onClick={() => setLocation("/refund")}
                      className="underline hover:text-foreground transition-colors"
                    >
                      request a refund
                    </button>
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* "What changes with Pro?" scenarios */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="max-w-2xl mx-auto px-5 pb-10"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center mb-4">
          What actually changes with Pro
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRO_SCENARIOS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-muted/30 border border-border rounded-2xl px-5 py-4 flex flex-col gap-2"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[13px] font-bold text-foreground leading-snug">{title}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {!isIOS() && (<>
      {/* ── Divider: Individual → Ministry ── */}
      <div className="max-w-2xl mx-auto px-5 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border">
            <Building2 className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">For Churches & Ministries</span>
          </div>
          <div className="flex-1 h-px bg-border" />
        </div>
      </div>

      {/* White Label Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="max-w-2xl mx-auto px-5 pb-8"
      >
        {/* Section header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">
            Ministry Edition
          </h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed max-w-md mx-auto mb-3">
            Launch a fully branded faith app for your congregation — your name, your logo, your domain. Powered by the same technology, delivered in days.
          </p>
          {/* Available badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-[11px] font-semibold">
            <Church className="w-3 h-3" />
            Built for congregations of every size
          </div>
        </div>

        {/* What you get */}
        <div className="bg-muted/30 border border-border rounded-3xl px-6 py-5 mb-5">
          <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-4">What your church gets</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WHITE_LABEL_WHAT_YOU_GET.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[13px] text-foreground/80 leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {WHITE_LABEL_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-background border ${tier.border} rounded-3xl overflow-hidden flex flex-col`}
            >
              {/* Left accent */}
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${tier.color} opacity-70 rounded-l-3xl`} />
              {tier.badge && (
                <div className="absolute top-3 right-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                    {tier.badge}
                  </span>
                </div>
              )}
              <div className="px-5 pt-5 pb-4 border-b border-border/50">
                <div className={`w-8 h-8 rounded-xl ${tier.iconBg} flex items-center justify-center mb-3 shadow-sm`}>
                  <Building2 className={`w-4 h-4 ${tier.iconColor}`} />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{tier.name}</p>
                <p className="text-[11px] text-muted-foreground mb-3">{tier.size}</p>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-2xl font-extrabold text-foreground">{tier.monthly}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{tier.setup} one-time setup</p>
              </div>
              <div className="px-5 py-4 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-[12px] text-foreground/75 leading-snug">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA — Schedule a call */}
        <div className="bg-gradient-to-br from-primary/8 to-primary/4 border border-primary/20 rounded-3xl px-6 py-6 text-center">
          <CalendarClock className="w-7 h-7 text-primary mx-auto mb-3" />
          <h3 className="text-[15px] font-bold text-foreground mb-1.5">Ready to bring this to your church?</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 max-w-sm mx-auto">
            Book a free 15-minute call — we'll walk through your needs, show you a live demo, and answer every question. No commitment, no pressure.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:partnerships@shepherdspathai.com?subject=Ministry%20Edition%20—%20Schedule%20a%20Demo"
              data-testid="link-whitelabel-contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-90 transition-opacity"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Book a 15-min demo call
            </a>
            <a
              href="mailto:partnerships@shepherdspathai.com?subject=Ministry%20Edition%20Inquiry"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border bg-background text-[13px] font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Send an email instead
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">partnerships@shepherdspathai.com · Most churches are live within a week</p>
        </div>
      </motion.div>
      </>)}

      {/* FAQ section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="max-w-xl mx-auto px-5 pb-8"
      >
        <h2 className="text-lg font-bold text-foreground mb-4 text-center">Common Questions</h2>

        <div className="space-y-3">
          {FAQ_ITEMS.map(({ q, a }) => (
            <div key={q} className="bg-muted/30 border border-border rounded-2xl px-5 py-4">
              <p className="text-[13px] font-bold text-foreground mb-1.5">{q}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Support */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="max-w-xl mx-auto px-5 pb-16"
      >
        <div className="bg-primary/5 border border-primary/20 rounded-3xl px-6 py-6 text-center">
          <Mail className="w-6 h-6 text-primary mx-auto mb-3" />
          <h3 className="text-[15px] font-bold text-foreground mb-1.5">Need help?</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
            We're real people and we read every email. Whether it's a question, a billing issue, or just a kind word — reach out.
          </p>
          <a
            href="mailto:support@shepherdspathai.com"
            data-testid="link-support-email"
            className="text-[13px] font-semibold text-primary hover:text-primary/70 transition-colors underline"
          >
            support@shepherdspathai.com
          </a>
        </div>
      </motion.div>

    </div>
  );
}
