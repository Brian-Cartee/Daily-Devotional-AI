import { Link } from "wouter";
import { motion } from "framer-motion";
import { BackButton } from "@/components/BackButton";
import { ShareInviteCard } from "@/components/ShareInviteCard";
import { Gift, Heart, Sparkles } from "lucide-react";
import { REFERRAL_DAYS_PER_FRIEND, REFERRAL_WELCOME_DAYS } from "@/lib/referralConfig";

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-5 pt-6 pb-16">
        <BackButton fallback="/" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 mb-8"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Gift className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight" data-testid="invite-page-title">
            Share the walk
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md">
            When someone you love starts Shepherd&apos;s Path through your link, they get{" "}
            <strong>{REFERRAL_WELCOME_DAYS} days of Pro</strong> to explore — and you earn{" "}
            <strong>{REFERRAL_DAYS_PER_FRIEND} bonus Pro days</strong> for each friend who joins.
          </p>
        </motion.div>

        <ShareInviteCard variant="full" className="mt-0" />

        <div className="mt-8 space-y-4">
          {[
            {
              icon: Heart,
              title: "They get a real trial",
              body: `Friends land with ${REFERRAL_WELCOME_DAYS} days of Pro — unlimited listen, full archive search, and guided pathways — not just a bookmark.`,
            },
            {
              icon: Sparkles,
              title: "You keep growing together",
              body: `Each signup stacks ${REFERRAL_DAYS_PER_FRIEND} bonus Pro days on your account. Share after a devotional, a breakthrough in Talk It Through, or when someone asks what you're using.`,
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5 flex gap-3"
            >
              <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          <Link href="/devotional" className="text-primary font-semibold hover:underline">
            Return to today&apos;s devotional
          </Link>
        </p>
      </div>
    </div>
  );
}
