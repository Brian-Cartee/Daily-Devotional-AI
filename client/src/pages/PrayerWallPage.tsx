import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { HandHeart, Send, Loader2, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WallEntry {
  id: number;
  displayName: string | null;
  request: string;
  prayCount: number;
  hasPrayed: boolean;
  createdAt: string;
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

  const { data: entries = [], isLoading } = useQuery<WallEntry[]>({
    queryKey: ["/api/prayer-wall", sessionId],
    queryFn: () => fetch(`/api/prayer-wall?sessionId=${sessionId}`).then(r => r.json()),
    refetchInterval: 30000,
  });

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
      setPrayedIds(prev => new Set([...prev, id]));
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-wall"] });
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
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-20 pb-28">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
              <HandHeart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-foreground">Prayer Wall</h1>
          </div>
          <p className="text-[14px] text-muted-foreground leading-relaxed mt-1 pl-13">
            Share what's on your heart. Other believers are here — and they're praying with you.
          </p>
          <p className="text-[12px] text-muted-foreground/60 mt-2 pl-13 italic">
            "For where two or three gather in My name, there am I with them." — Matthew 18:20
          </p>
        </motion.div>

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
                  Add your prayer request
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/40 dark:bg-violet-950/20 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-t-2xl" />
                <div className="p-4">
                  <p className="text-[14px] font-bold text-foreground mb-3">Share your prayer request</p>
                  <textarea
                    data-testid="input-prayer-request"
                    value={request}
                    onChange={e => setRequest(e.target.value)}
                    spellCheck
                    maxLength={280}
                    rows={4}
                    placeholder="What would you like others to pray for? Share what's on your heart — you can be as specific or as general as you need..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
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

        {/* Stats bar */}
        {entries.length > 0 && (
          <motion.div {...fadeUp(0.1)} className="flex items-center gap-4 mb-4 px-1">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{entries.length} prayer{entries.length !== 1 ? "s" : ""} lifted</span>
            </div>
            <div className="flex-1 h-px bg-border/60" />
            <p className="text-[11px] text-muted-foreground/50">Newest first</p>
          </motion.div>
        )}

        {/* Prayer feed */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <motion.div {...fadeUp(0.15)} className="text-center py-12">
            <HandHeart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-foreground/60">Be the first to share</p>
            <p className="text-[13px] text-muted-foreground mt-1">The wall is quiet right now — open it up.</p>
          </motion.div>
        )}

        <AnimatePresence>
          {entries.map((entry, i) => {
            const hasPrayed = entry.hasPrayed || prayedIds.has(entry.id);
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
                          ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 border border-violet-200/60 dark:border-violet-700/50"
                          : "border border-border hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 text-foreground/70 hover:text-violet-600"
                      }`}
                    >
                      <span className="text-[15px]">🙏</span>
                      <span>{hasPrayed ? "Praying" : "I'm praying"}</span>
                    </button>
                    {entry.prayCount > 0 && (
                      <p className="text-[12px] text-muted-foreground">
                        {entry.prayCount} {entry.prayCount === 1 ? "person" : "people"} praying
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

      </div>
    </div>
  );
}
