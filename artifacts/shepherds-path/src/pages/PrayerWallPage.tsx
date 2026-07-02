import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getSessionId } from "@/lib/session";
import { fetchMyChurches } from "@/lib/church";
import { useToast } from "@/hooks/use-toast";
import { HandHeart, Send, Loader2, Clock, Users, Bell, BellRing, Church } from "lucide-react";
import { Button } from "@/components/ui/button";

type WallTab = "recent" | "praying" | "answered";

interface WallEntry {
  id: number;
  displayName: string | null;
  request: string;
  status?: string;
  answeredText?: string | null;
  answeredAt?: string | null;
  createdAt: string;
  encouragements?: { prayed: number; total: number };
  myActions?: string[];
}

interface AnsweredEntry {
  id: number;
  displayName: string | null;
  request: string;
  answeredText?: string | null;
  answeredAt?: string | null;
  createdAt: string;
}

function prayCount(entry: WallEntry): number {
  return entry.encouragements?.prayed ?? entry.encouragements?.total ?? 0;
}

function hasPrayedEntry(entry: WallEntry, prayedIds: Set<number>): boolean {
  return prayedIds.has(entry.id) || (entry.myActions?.includes("prayed") ?? false);
}

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

export default function PrayerWallPage() {
  const sessionId = getSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [request, setRequest] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [prayedIds, setPrayedIds] = useState<Set<number>>(new Set());
  const [remindedIds, setRemindedIds] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<WallTab>("recent");

  const { data: entries = [], isLoading } = useQuery<WallEntry[]>({
    queryKey: ["/api/prayer-wall", sessionId],
    queryFn: () => fetch(`/api/prayer-wall?sessionId=${sessionId}`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: answeredEntries = [], isLoading: answeredLoading } = useQuery<AnsweredEntry[]>({
    queryKey: ["/api/prayer-wall/answered"],
    queryFn: () => fetch("/api/prayer-wall/answered").then((r) => r.json()),
    enabled: tab === "answered",
  });

  const { data: myChurches = [] } = useQuery({
    queryKey: ["/api/churches/mine", sessionId],
    queryFn: () => fetchMyChurches(sessionId),
    staleTime: 60_000,
  });
  const connectedChurch = myChurches[0]?.church ?? null;

  const visibleEntries = useMemo(() => {
    if (tab === "answered") return [];
    const active = entries.filter((e) => e.status !== "answered");
    if (tab === "praying") {
      return active.filter((e) => hasPrayedEntry(e, prayedIds));
    }
    return active;
  }, [entries, tab, prayedIds]);

  const submitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/prayer-wall", {
      sessionId,
      request: request.trim(),
      displayName: displayName.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-wall"] });
      setRequest("");
      setDisplayName("");
      setShowForm(false);
      toast({ description: "Your prayer request has been lifted up. 🙏" });
    },
    onError: () => {
      toast({ description: "Could not submit your request. Please try again.", variant: "destructive" });
    },
  });

  const prayMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/prayer-wall/${id}/pray`, { sessionId }),
    onSuccess: (data: any, id: number) => {
      setPrayedIds(prev => new Set(Array.from(prev).concat(id)));
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-wall"] });
    },
  });

  const remindMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/prayer-wall/${id}/remind`, { sessionId, hoursFromNow: 24 }),
    onSuccess: (_data: any, id: number) => {
      setRemindedIds(prev => new Set(Array.from(prev).concat(id)));
      toast({ description: "We'll remind you to pray for this again tomorrow. 🙏" });
    },
    onError: () => {
      toast({ description: "Couldn't set the reminder. Enable notifications in settings first.", variant: "destructive" });
    },
  });

  const canSubmit = request.trim().length >= 10 && !submitMutation.isPending;

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  });

  return (
    <div className="min-h-screen bg-background">

      {/* ── Cinematic hero ── */}
      <div className="relative overflow-hidden" style={{ height: "42vh", minHeight: "280px", maxHeight: "380px" }}>
        <img
          src="/hero-prayer-wall-lake.jpg"
          alt="Sun setting through pine trees reflected in a still lake"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 45%" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(6,3,18,0.65) 0%, rgba(10,5,20,0.08) 38%, rgba(6,3,18,0.88) 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "linear-gradient(to top, rgba(80,30,0,0.18) 0%, transparent 100%)" }} />

        {/* Hero text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 px-6 text-center">
          <h1
            className="text-[30px] font-black text-white leading-tight mb-2"
            style={{ textShadow: "0 2px 24px rgba(0,0,0,0.7)", letterSpacing: "-0.02em" }}
          >
            Prayer Wall
          </h1>
          <p
            className="text-[13.5px] text-white/70 leading-relaxed"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)", maxWidth: "280px" }}
          >
            A quiet place to be held in prayer. Share only what you feel safe sharing.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-28">

        {/* Matthew verse — compact below hero */}
        <motion.p {...fadeUp(0)} className="text-[12px] text-muted-foreground/55 text-center italic mb-6 mt-1">
          "For where two or three gather in My name, there am I with them." — Matthew 18:20
        </motion.p>

        {connectedChurch && (
          <motion.div
            {...fadeUp(0.03)}
            className="mb-5 rounded-2xl px-4 py-3.5 flex gap-3"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.22)" }}
          >
            <Church className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[13px] text-foreground/85 leading-relaxed">
                Requests here are shared with the wider Shepherd&apos;s Path community — not your church&apos;s pastor inbox.
              </p>
              <Link
                href="/church"
                className="inline-block mt-1.5 text-[12px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              >
                Need pastoral care from {connectedChurch.name}? Go to Church →
              </Link>
            </div>
          </motion.div>
        )}

        {/* Submit button / form */}
        <motion.div {...fadeUp(0.05)} className="mb-6">
          <AnimatePresence mode="wait">
            {!showForm ? (
              <motion.div key="toggle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  data-testid="btn-open-prayer-form"
                  onClick={() => setShowForm(true)}
                  className="w-full rounded-2xl py-5 font-bold text-[15px] bg-gradient-to-r from-violet-500 to-rose-500 hover:opacity-90 border-0 text-white shadow-md shadow-violet-500/20"
                >
                  <HandHeart className="w-4 h-4 mr-2" />
                  Share a request
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.25)" }}
              >
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-t-2xl" />
                <div className="p-4">
                  <p className="text-[14px] font-bold text-foreground mb-1">Share your prayer request</p>
                  <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
                    This goes to the community prayer wall — visible to others in the app, not your church leaders.
                  </p>
                  <textarea
                    data-testid="input-prayer-request"
                    value={request}
                    onChange={e => setRequest(e.target.value)}
                    spellCheck
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    maxLength={280}
                    rows={4}
                    placeholder="What would you like others to pray for? Share what's on your heart — you can be as specific or as general as you need..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[16px] text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex items-center justify-between mt-1 mb-3">
                    <p className="text-[11px] text-muted-foreground/60">
                      {request.length}/280
                    </p>
                  </div>
                  <input
                    data-testid="input-display-name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={40}
                    autoCapitalize="words"
                    autoCorrect="off"
                    autoComplete="given-name"
                    enterKeyHint="done"
                    placeholder="Your name (optional — leave blank to be Anonymous Believer)"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowForm(false); setRequest(""); setDisplayName(""); }}
                      className="flex-1 py-2.5 rounded-xl border border-border text-[13px] font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      data-testid="btn-submit-prayer"
                      disabled={!canSubmit}
                      onClick={() => submitMutation.mutate()}
                      className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-rose-500 border-0 text-white font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      {submitMutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><Send className="w-3.5 h-3.5 mr-1.5" />Lift it up</>
                      }
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div {...fadeUp(0.08)} className="mb-5">
          <SegmentedControl<WallTab>
            testId="prayer-wall-tabs"
            value={tab}
            onChange={setTab}
            segments={[
              { id: "recent", label: "Recent" },
              { id: "praying", label: "Praying" },
              { id: "answered", label: "Answered" },
            ]}
          />
        </motion.div>

        {/* Stats bar */}
        {tab !== "answered" && visibleEntries.length > 0 && (
          <motion.div {...fadeUp(0.1)} className="flex items-center gap-4 mb-4 px-1">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>
                {visibleEntries.length} prayer{visibleEntries.length !== 1 ? "s" : ""}
                {tab === "praying" ? " you're holding" : " lifted"}
              </span>
            </div>
            <div className="flex-1 h-px bg-border/60" />
            <p className="text-[11px] text-muted-foreground/50">Pray as you feel led</p>
          </motion.div>
        )}

        {/* Prayer feed */}
        {tab !== "answered" && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && tab !== "answered" && visibleEntries.length === 0 && (
          <motion.div {...fadeUp(0.15)} className="text-center py-12">
            <HandHeart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-foreground/60">
              {tab === "praying" ? "No prayers you're holding yet" : "Be the first to share"}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">
              {tab === "praying"
                ? "Tap “I'm praying” on a request — it will show up here."
                : "The wall is quiet right now — open it up."}
            </p>
          </motion.div>
        )}

        {tab === "answered" && answeredLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {tab === "answered" && !answeredLoading && answeredEntries.length === 0 && (
          <motion.div {...fadeUp(0.15)} className="text-center py-12">
            <p className="text-[14px] font-semibold text-foreground/60">No answered prayers yet</p>
            <p className="text-[13px] text-muted-foreground mt-1">When God moves, stories of hope can land here.</p>
          </motion.div>
        )}

        {tab === "answered" && !answeredLoading && (
          <AnimatePresence>
            {answeredEntries.map((entry, i) => (
              <motion.div
                key={entry.id}
                data-testid={`card-answered-${entry.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="mb-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 overflow-hidden"
              >
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80 mb-2">
                    Answered
                  </p>
                  <p className="text-[14px] text-foreground/85 leading-relaxed mb-2">{entry.request}</p>
                  {entry.answeredText && (
                    <p className="text-[13px] text-muted-foreground italic leading-relaxed border-l-2 border-emerald-500/40 pl-3">
                      {entry.answeredText}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        <AnimatePresence>
          {tab !== "answered" && visibleEntries.map((entry, i) => {
            const hasPrayed = hasPrayedEntry(entry, prayedIds);
            const hasReminded = remindedIds.has(entry.id);
            return (
              <motion.div
                key={entry.id}
                data-testid={`card-prayer-${entry.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="mb-3 rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400/30 to-rose-400/30 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300">
                          {(entry.displayName ?? "A")[0].toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[12px] font-semibold text-foreground/70">
                        {entry.displayName ?? "Anonymous Believer"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo(entry.createdAt)}</span>
                    </div>
                  </div>

                  <p className="text-[14px] text-foreground/85 leading-relaxed mb-3">
                    {entry.request}
                  </p>

                  <div className="flex items-center justify-between">
                    <button
                      data-testid={`btn-pray-${entry.id}`}
                      onClick={() => !hasPrayed && prayMutation.mutate(entry.id)}
                      disabled={hasPrayed || prayMutation.isPending}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${
                        hasPrayed
                          ? "text-violet-600 dark:text-violet-300 border"
                          : "border border-border hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 text-foreground/70 hover:text-violet-600"
                      }`}
                      style={hasPrayed ? { background: "rgba(139,92,246,0.09)", borderColor: "rgba(139,92,246,0.25)" } : undefined}
                    >
                      <span className="text-[15px]">🙏</span>
                      <span>{hasPrayed ? "Praying" : "I'm praying"}</span>
                    </button>
                    {prayCount(entry) > 0 && (
                      <p className="text-[12px] text-muted-foreground">
                        {prayCount(entry)} {prayCount(entry) === 1 ? "person" : "people"} praying
                      </p>
                    )}
                  </div>

                  {hasPrayed && (
                    <div className="mt-2.5 pt-2.5 border-t border-border/50">
                      <button
                        data-testid={`btn-remind-${entry.id}`}
                        onClick={() => !hasReminded && remindMutation.mutate(entry.id)}
                        disabled={hasReminded || remindMutation.isPending}
                        className={`flex items-center gap-1.5 text-[11px] font-semibold transition-all px-2.5 py-1.5 rounded-lg ${
                          hasReminded
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-amber-900/20"
                        }`}
                        style={hasReminded ? { background: "rgba(245,158,11,0.09)" } : undefined}
                      >
                        {hasReminded
                          ? <><BellRing className="w-3.5 h-3.5" /> Reminder set for tomorrow</>
                          : <><Bell className="w-3.5 h-3.5" /> Remind me to pray again tomorrow</>
                        }
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

      </div>
    </div>
  );
}
