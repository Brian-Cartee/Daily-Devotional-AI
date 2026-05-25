import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { ShortcutPathIcon } from "@/components/ShortcutPathIcon";
import {
  dismissYourPathCard,
  getPathProgress,
  type HomePathProgress,
} from "@/lib/homePathProgress";

type Step = {
  id: keyof HomePathProgress | "quiet";
  done: boolean;
  label: string;
  detail: string;
  href: string;
  testId: string;
  variant: "devotional" | "closet" | "guidance" | "journal";
};

type Props = {
  daysWithApp: number;
  devotionalVisitCount: number;
};

export function HomeYourPathCard({ daysWithApp, devotionalVisitCount }: Props) {
  const progress = getPathProgress(devotionalVisitCount);

  const steps: Step[] = [
    {
      id: "devotional",
      done: progress.devotional,
      label: "Today's devotional",
      detail: "A gentle daily word — most people start here",
      href: "/devotional",
      testId: "path-step-devotional",
      variant: "devotional",
    },
    {
      id: "quiet",
      done: progress.quietOrTalk,
      label: "Prayer closet or Talk it through",
      detail: "Quiet room with worship, or a conversation when something's heavy",
      href: "/prayer-closet",
      testId: "path-step-closet",
      variant: "closet",
    },
    {
      id: "journal",
      done: progress.journal,
      label: "Prayer journal",
      detail: "Save a prayer or reflection you don't want to lose",
      href: "/journal",
      testId: "path-step-journal",
      variant: "journal",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="card-your-path"
      className="relative rounded-2xl border border-primary/25 bg-card overflow-hidden shadow-sm"
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-teal-400 via-primary to-violet-500" />
      <button
        type="button"
        onClick={dismissYourPathCard}
        data-testid="button-dismiss-your-path"
        aria-label="Dismiss"
        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-muted/80 text-muted-foreground hover:text-foreground z-10"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="px-4 pt-4 pb-4 pr-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-1">
          Your path · day {daysWithApp}
        </p>
        <p className="text-[16px] font-bold text-foreground leading-snug mb-1">
          Three doors — pick what fits today
        </p>
        <p className="text-[12px] text-muted-foreground/75 leading-snug mb-3">
          {doneCount === 0
            ? "No wrong order. Chapel first, then quiet or talk, then journal when you're ready."
            : `${doneCount} of 3 touched — keep going at your pace.`}
        </p>

        <div className="flex flex-col gap-2">
          {steps.map((step) => (
            <Link key={step.id} href={step.href}>
              <div
                data-testid={step.testId}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 min-h-[52px] transition-all active:scale-[0.99] ${
                  step.done
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-border/50 bg-card/60 hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                {step.done ? (
                  <span className="w-10 h-10 rounded-[13px] bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                  </span>
                ) : (
                  <ShortcutPathIcon variant={step.variant} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-snug">{step.label}</p>
                  <p className="text-[11px] text-muted-foreground/70 leading-snug mt-0.5">{step.detail}</p>
                </div>
                {!step.done && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground/45 shrink-0" />
                )}
              </div>
            </Link>
          ))}
        </div>

        {progress.quietOrTalk ? null : (
          <p className="text-[11px] text-center text-muted-foreground/55 mt-3">
            Something heavy?{" "}
            <Link href="/guidance" className="font-semibold text-primary hover:underline">
              Talk it through
            </Link>{" "}
            instead of the closet.
          </p>
        )}
      </div>
    </motion.div>
  );
}
