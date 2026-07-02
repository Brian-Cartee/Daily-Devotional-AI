import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  HandHeart,
  Loader2,
  LogOut,
  Megaphone,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSessionId } from "@/lib/session";
import {
  fetchAnnouncements,
  fetchMyChurches,
  joinChurch,
  leaveChurch,
  submitChurchPrayer,
  type MyChurchEntry,
} from "@/lib/church";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  };
}

export default function ChurchPage() {
  const sessionId = getSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [, joinParams] = useRoute("/join/:slug");

  const urlParams = useMemo(() => new URLSearchParams(search), [search]);
  const urlCode = urlParams.get("code")?.trim() ?? "";
  const urlSlug = urlParams.get("slug")?.trim().toLowerCase() ?? "";
  const routeSlug = joinParams?.slug?.trim().toLowerCase() ?? "";

  const [inviteCode, setInviteCode] = useState(urlCode);
  const [slugInput, setSlugInput] = useState(urlSlug || routeSlug);
  const [request, setRequest] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPrayerForm, setShowPrayerForm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (urlCode) setInviteCode(urlCode);
  }, [urlCode]);

  useEffect(() => {
    const nextSlug = urlSlug || routeSlug;
    if (nextSlug) setSlugInput(nextSlug);
  }, [urlSlug, routeSlug]);

  const {
    data: myChurches = [],
    isLoading: churchesLoading,
    refetch: refetchChurches,
  } = useQuery({
    queryKey: ["my-churches", sessionId],
    queryFn: () => fetchMyChurches(sessionId),
  });

  const activeChurch: MyChurchEntry | null = myChurches[0] ?? null;

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ["church-announcements", activeChurch?.church.slug],
    queryFn: () => fetchAnnouncements(activeChurch!.church.slug),
    enabled: Boolean(activeChurch?.church.slug),
  });

  const joinMutation = useMutation({
    mutationFn: () => {
      const code = inviteCode.trim();
      const slug = slugInput.trim().toLowerCase();
      if (!code && !slug) {
        return Promise.reject(new Error("Enter an invite code or church slug."));
      }
      return joinChurch(sessionId, {
        inviteCode: code || undefined,
        slug: code ? undefined : slug,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-churches", sessionId] });
      setInviteCode("");
      toast({ description: "You're connected with your church." });
    },
    onError: (err: Error) => {
      toast({
        description: err.message || "Could not join this church. Check your code and try again.",
        variant: "destructive",
      });
    },
  });

  const prayerMutation = useMutation({
    mutationFn: () =>
      submitChurchPrayer({
        sessionId,
        churchId: activeChurch!.church.id,
        request: request.trim(),
        displayName: displayName.trim() || undefined,
        isAnonymous: !displayName.trim(),
      }),
    onSuccess: () => {
      setRequest("");
      setDisplayName("");
      setShowPrayerForm(false);
      toast({ description: "Your prayer was shared with your church pastors." });
    },
    onError: () => {
      toast({
        description: "Could not submit your prayer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLeave = async () => {
    if (!activeChurch || leaving) return;
    if (!window.confirm(`Leave ${activeChurch.church.name}? You can rejoin anytime with an invite.`)) {
      return;
    }
    setLeaving(true);
    try {
      await leaveChurch(sessionId, activeChurch.church.id);
      await refetchChurches();
      toast({ description: "You've left this church." });
    } catch {
      toast({ description: "Could not leave church. Please try again.", variant: "destructive" });
    } finally {
      setLeaving(false);
    }
  };

  const canJoin = (inviteCode.trim().length >= 6 || slugInput.trim().length >= 2) && !joinMutation.isPending;
  const canSubmitPrayer = request.trim().length >= 10 && !prayerMutation.isPending;

  if (churchesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeChurch) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-xl mx-auto px-5 pt-6 pb-28">
          <motion.div {...fadeUp()} className="mt-6 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(59,130,246,0.09)" }}
            >
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight" data-testid="church-page-title">
              Connect with your church
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md">
              Join your congregation on Shepherd&apos;s Path to receive announcements and share prayer
              requests with your pastors.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp(0.05)}
            className="rounded-2xl p-4 mb-4"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.22)" }}
          >
            <label className="text-[13px] font-semibold text-foreground block mb-2">
              Invite code
            </label>
            <input
              data-testid="input-church-invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. grace-demo-2026"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
            />

            <p className="text-[11px] text-muted-foreground/70 text-center mb-3">or</p>

            <label className="text-[13px] font-semibold text-foreground block mb-2">
              Church slug
            </label>
            <input
              data-testid="input-church-slug"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              placeholder="e.g. grace-community-demo"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
            />

            <Button
              data-testid="btn-join-church"
              disabled={!canJoin}
              onClick={() => joinMutation.mutate()}
              className="w-full rounded-xl py-5 font-bold text-[15px]"
            >
              {joinMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Join church
                </>
              )}
            </Button>
          </motion.div>

          <motion.p {...fadeUp(0.1)} className="text-center text-xs text-muted-foreground">
            <a href="mailto:support@shepherdspathai.com" className="text-primary font-semibold hover:underline">
              Church isn&apos;t on Shepherd&apos;s Path yet?
            </a>
          </motion.p>

          <motion.div {...fadeUp(0.12)} className="mt-10 text-center">
            <button
              type="button"
              data-testid="btn-continue-without-church"
              onClick={() => setLocation("/")}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue without a church
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const { church } = activeChurch;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-5 pt-6 pb-28">
        <motion.div {...fadeUp()} className="mt-6 mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(59,130,246,0.09)" }}
          >
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{church.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">/{church.slug}</p>
        </motion.div>

        <motion.div {...fadeUp(0.05)} className="mb-6">
          <AnimatePresence mode="wait">
            {!showPrayerForm ? (
              <motion.div key="toggle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  data-testid="btn-open-church-prayer-form"
                  onClick={() => setShowPrayerForm(true)}
                  className="w-full rounded-2xl py-5 font-bold text-[15px] bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 border-0 text-white shadow-md shadow-blue-500/20"
                >
                  <HandHeart className="w-4 h-4 mr-2" />
                  Share a prayer with pastors
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(59,130,246,0.09)", border: "1px solid rgba(59,130,246,0.25)" }}
              >
                <div className="p-4">
                  <p className="text-[14px] font-bold text-foreground mb-3">
                    Prayer for {church.name}
                  </p>
                  <textarea
                    data-testid="input-church-prayer-request"
                    value={request}
                    onChange={(e) => setRequest(e.target.value)}
                    spellCheck
                    autoCapitalize="sentences"
                    maxLength={500}
                    rows={4}
                    placeholder="What would you like your pastors to pray for?"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[16px] text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-[11px] text-muted-foreground/60 mt-1 mb-3">{request.length}/500</p>
                  <input
                    data-testid="input-church-prayer-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={40}
                    autoCapitalize="words"
                    placeholder="Your name (optional — leave blank to stay anonymous)"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPrayerForm(false);
                        setRequest("");
                        setDisplayName("");
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-border text-[13px] font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      data-testid="btn-submit-church-prayer"
                      disabled={!canSubmitPrayer}
                      onClick={() => prayerMutation.mutate()}
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 border-0 text-white font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      {prayerMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Send prayer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div {...fadeUp(0.08)} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-[15px] font-bold text-foreground">Announcements</h2>
          </div>

          {announcementsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : announcements.length === 0 ? (
            <div
              className="rounded-xl px-4 py-5 text-center"
              style={{ background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.18)" }}
            >
              <p className="text-[13px] text-muted-foreground">No announcements yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl px-4 py-3.5"
                  style={{ background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.18)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[14px] font-semibold text-foreground">{item.title}</p>
                    {item.pinned && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide shrink-0 px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(245,158,11,0.12)", color: "rgba(217,119,6,1)" }}
                      >
                        Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {item.body}
                  </p>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">
                    {timeAgo(item.published_at ?? item.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div {...fadeUp(0.12)} className="pt-2 border-t border-border/60">
          <button
            type="button"
            data-testid="btn-leave-church"
            onClick={handleLeave}
            disabled={leaving}
            className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            {leaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            Leave church
          </button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          <Link href="/" className="text-primary font-semibold hover:underline">
            Return home
          </Link>
        </p>
      </div>
    </div>
  );
}
