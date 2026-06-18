import { Link } from "wouter";
import { Shield, BookOpen, Phone } from "lucide-react";
import {
  CRISIS_LIFELINE_DISPLAY,
  CRISIS_LIFELINE_TEL,
  CRISIS_TEXT_DISPLAY,
} from "@/lib/crisisResources";
import { AI_FREE_LIMIT, AI_HONEYMOON_DAYS, AI_LIMIT_HONEYMOON_DISPLAY } from "@/lib/aiLimits";

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
<h1 className="text-[17px] font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" aria-hidden />
            Safety & boundaries
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Shepherd&apos;s Path is a companion for prayer and Scripture — not a church, not a pastor, and not
          emergency care. We built these boundaries so you can trust what this is and what it isn&apos;t.
        </p>

        <section className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-primary/80">What this is</h2>
          <ul className="space-y-2 text-[14px] leading-relaxed text-foreground/85 list-disc pl-5">
            <li>A quiet place to read Scripture, pray, journal, and talk through what you&apos;re carrying.</li>
            <li>AI-assisted reflections grounded in the Bible — shaped with humility, not authority over the Word.</li>
            <li>Space to breathe, grieve, and return without performing your faith.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-primary/80">What this is not</h2>
          <ul className="space-y-2 text-[14px] leading-relaxed text-foreground/85 list-disc pl-5">
            <li>A substitute for your local church, pastor, counselor, or doctor.</li>
            <li>Medical, legal, or psychological advice.</li>
            <li>An infallible voice — always weigh what you read against Scripture and trusted people.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-4 space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Phone className="w-4 h-4" aria-hidden />
            If you are in crisis
          </h2>
          <p className="text-[14px] leading-relaxed text-foreground/85">
            If you or someone else may be in danger, please contact emergency services or a crisis line now.
            This app cannot respond in real time to emergencies.
          </p>
          <ul className="space-y-2 text-[14px] font-semibold text-foreground">
            <li>
              <a href={CRISIS_LIFELINE_TEL} className="text-primary hover:underline">
                {CRISIS_LIFELINE_DISPLAY}
              </a>
            </li>
            <li className="text-[13px] font-normal text-muted-foreground">{CRISIS_TEXT_DISPLAY}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-primary/80">Daily conversation limits</h2>
          <p className="text-[14px] leading-relaxed text-foreground/85">
            Free accounts include a generous daily allowance for AI reflections and prayers —{" "}
            {AI_LIMIT_HONEYMOON_DISPLAY} per day for your first {AI_HONEYMOON_DAYS} days, then {AI_FREE_LIMIT} per
            day, with a small grace buffer for deep conversations.
          </p>
          <p className="text-[14px] leading-relaxed text-foreground/85">
            When you reach that pause, it isn&apos;t punishment. Sit with what God already gave you in Scripture
            today. You can always read the Bible, pray in your closet, or return tomorrow. Listening to
            today&apos;s verse is never limited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-primary/80 flex items-center gap-2">
            <BookOpen className="w-4 h-4" aria-hidden />
            Privacy
          </h2>
          <p className="text-[14px] leading-relaxed text-foreground/85">
            Your journal and closet notes stay on your account. Prayer Wall posts are only what you choose to
            share. You can leave at any time.
          </p>
          <Link href="/privacy" className="text-[14px] font-semibold text-primary hover:underline">
            Read our Privacy Policy →
          </Link>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-primary/80">More help</h2>
          <div className="flex flex-col gap-2 text-[14px]">
            <Link href="/how-to-use" className="text-primary font-semibold hover:underline">
              How to use Shepherd&apos;s Path
            </Link>
            <Link href="/terms" className="text-primary font-semibold hover:underline">
              Terms of use
            </Link>
            <Link href="/support" className="text-primary font-semibold hover:underline">
              Contact support
            </Link>
          </div>
        </section>
      </div>

    </div>
  );
}
