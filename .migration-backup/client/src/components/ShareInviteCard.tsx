import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Gift, Copy, Share2, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

interface ReferralData {
  code: string;
  shareUrl: string;
  referralCount: number;
  proExpiresAt: string | null;
}

export function ShareInviteCard() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const sessionId = getSessionId();

  const { data, isLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referral/my-code", sessionId],
    queryFn: () =>
      fetch(`/api/referral/my-code?sessionId=${encodeURIComponent(sessionId)}`).then((r) => r.json()),
  });

  const daysRemaining = (() => {
    if (!data?.proExpiresAt) return 0;
    const diff = new Date(data.proExpiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

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
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Shepherd's Path — Daily Walk with Jesus",
          text: "I've been using this for my daily devotional. Open your Bible. We'll open the conversation.",
          url: data.shareUrl,
        });
      } catch {
        // user cancelled, no action needed
      }
    } else {
      handleCopy();
    }
  };

  if (isLoading) return null;

  return (
    <div
      className="mt-8 rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-50/60 to-purple-50/40 dark:from-amber-900/10 dark:to-purple-900/10 dark:border-amber-700/20 p-5"
      data-testid="share-invite-card"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
            Invite a friend — earn 14 free Pro days
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Every friend who joins through your link adds 14 days of Pro to your account. No limits.
          </p>
        </div>
      </div>

      {(data?.referralCount ?? 0) > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>{data?.referralCount}</strong> friend{data?.referralCount !== 1 ? "s" : ""} joined
            {daysRemaining > 0 && (
              <> · <strong>{daysRemaining} days</strong> Pro remaining</>
            )}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 bg-white/70 dark:bg-gray-800/50 rounded-lg border border-gray-200/60 dark:border-gray-600/40 px-3 py-2">
        <p
          className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate font-mono"
          data-testid="text-referral-url"
        >
          {data?.shareUrl ?? "Loading..."}
        </p>
      </div>

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
