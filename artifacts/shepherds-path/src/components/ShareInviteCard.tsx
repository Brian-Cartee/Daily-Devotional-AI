import { useState } from "react";
import { Link } from "wouter";
import { Gift, Copy, Share2, Check, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useReferralInvite } from "@/hooks/useReferralInvite";
import { inviteShareText, INVITE_SHARE_TITLE } from "@/lib/referralShare";

type ShareInviteVariant = "full" | "compact" | "inline";

interface ShareInviteCardProps {
  variant?: ShareInviteVariant;
  className?: string;
}

export function ShareInviteCard({ variant = "full", className = "" }: ShareInviteCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const { data, isLoading, bonusDays, welcomeDays, daysRemaining } = useReferralInvite();

  const handleCopy = async () => {
    if (!data?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share it with someone who needs this." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copy failed", description: "Please copy the link manually.", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (!data?.shareUrl) return;
    const text = inviteShareText(bonusDays, welcomeDays);
    if (navigator.share) {
      try {
        await navigator.share({
          title: INVITE_SHARE_TITLE,
          text,
          url: data.shareUrl,
        });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n\n${data.shareUrl}`);
        toast({ title: "Copied invite message", description: "Paste into a text or group chat." });
      } catch {
        handleCopy();
      }
    }
  };

  if (isLoading) return null;

  if (variant === "inline") {
    return (
      <Link href="/invite">
        <div
          data-testid="share-invite-inline"
          className={`flex items-center gap-2 rounded-xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/30 px-3 py-2.5 active:scale-[0.99] transition-transform ${className}`}
        >
          <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-[13px] font-semibold text-foreground flex-1">
            Invite a friend — {bonusDays} Pro days each
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        </div>
      </Link>
    );
  }

  const isCompact = variant === "compact";

  return (
    <div
      className={`${isCompact ? "mt-4" : "mt-8"} rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-primary/10 dark:from-amber-500/15 dark:to-primary/10 dark:border-amber-500/30 ${isCompact ? "p-4" : "p-5"} ${className}`}
      data-testid="share-invite-card"
    >
      <div className={`flex items-start gap-3 ${isCompact ? "mb-2" : "mb-3"}`}>
        <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">
            {isCompact ? "Share the walk" : `Invite a friend — earn ${bonusDays} free Pro days`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Friends get <strong>{welcomeDays} days of Pro</strong> when they join through your link.
            You earn <strong>{bonusDays} bonus days</strong> per friend.
            {!isCompact && " No limits."}
          </p>
        </div>
        {isCompact && (
          <Link href="/invite" className="text-[11px] font-semibold text-primary shrink-0">
            Details
          </Link>
        )}
      </div>

      {(data?.referralCount ?? 0) > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>{data?.referralCount}</strong> friend{data?.referralCount !== 1 ? "s" : ""} joined
            {daysRemaining > 0 && (
              <>
                {" "}
                · <strong>{daysRemaining} days</strong> referral Pro left
              </>
            )}
          </span>
        </div>
      )}

      {!isCompact && (
        <div className="flex items-center gap-2 mb-3 bg-white/70 dark:bg-gray-800/50 rounded-lg border border-gray-200/60 dark:border-gray-600/40 px-3 py-2">
          <p
            className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate font-mono"
            data-testid="text-referral-url"
          >
            {data?.shareUrl ?? "Loading..."}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          onClick={handleCopy}
          data-testid="button-copy-referral"
        >
          {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
          onClick={handleNativeShare}
          data-testid="button-share-referral"
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          Share
        </Button>
      </div>
    </div>
  );
}
