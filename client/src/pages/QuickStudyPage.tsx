import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "anxiety", "forgiveness", "Romans 8", "the cross", "prayer",
  "hope", "John 3:16", "grace", "Psalm 23", "faith vs works",
];

export default function QuickStudyPage() {
  const [topic, setTopic] = useState("");
  const [study, setStudy] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTopic, setActiveTopic] = useState("");

  const generate = async (e: React.FormEvent | null, overrideTopic?: string) => {
    if (e) e.preventDefault();
    const q = (overrideTopic ?? topic).trim();
    if (!q) return;
    setLoading(true);
    setStudy("");
    setSubmitted(true);
    setActiveTopic(q);
    try {
      const res = await apiRequest("POST", "/api/chat/passage", {
        passageRef: q,
        passageText: q,
        messages: [{
          role: "user",
          content: `Create a short, structured Bible study on: "${q}". Format it as:
1. Key Verses (2–3 relevant scriptures with brief notes)
2. Central Truth (1 paragraph on the main insight)
3. Personal Application (2–3 practical questions to reflect on)
4. Closing Prayer (2–3 sentences)
Keep it warm, accessible, and grounded in Scripture.`,
        }],
      });
      const data = await res.json();
      setStudy(data.content ?? "");
    } catch {
      setStudy("Sorry, we couldn't generate a study right now. Please try again.");
    }
    setLoading(false);
  };

  const reset = () => { setTopic(""); setStudy(""); setSubmitted(false); setActiveTopic(""); };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-background pt-20 pb-16 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/15 text-primary text-[11px] font-bold uppercase tracking-widest mb-3">
              <Sparkles className="w-3 h-3" />
              AI-Powered
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-2">Quick Bible Study</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Any topic, passage, or question — studied in seconds.</p>
          </motion.div>

          {/* Search card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="bg-card border border-border/60 rounded-2xl px-6 py-6 shadow-sm mb-5"
          >
            {!submitted ? (
              <>
                <form onSubmit={generate} className="flex gap-2.5 mb-5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder='e.g. "anxiety", "Romans 8", "forgiveness"'
                      data-testid="quick-study-input"
                      className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </div>
                  <Button type="submit" disabled={!topic.trim()} className="rounded-xl font-semibold shrink-0 px-5" data-testid="quick-study-submit">
                    Study
                  </Button>
                </form>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Try one of these</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        data-testid={`suggestion-${s}`}
                        onClick={() => { setTopic(s); generate(null, s); }}
                        className="px-3 py-1.5 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/40 text-[12px] font-medium text-muted-foreground transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Preparing your study on "{activeTopic}"...</span>
                    </div>
                    {[1, 0.92, 0.85, 0.75, 0.9, 0.8].map((w, i) => (
                      <div key={i} className="h-3 bg-muted animate-pulse rounded-full" style={{ width: `${w * 100}%` }} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="result" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">{activeTopic}</p>
                      <button onClick={reset} className="text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors underline" data-testid="quick-study-reset">
                        New study
                      </button>
                    </div>
                    <div className="text-[15px] text-foreground/80 leading-relaxed space-y-2.5">
                      {study.split("\n").map((line, i) => {
                        if (!line.trim()) return null;
                        const isHeading = /^\d+\.|^#{1,3}\s/.test(line.trim());
                        return isHeading
                          ? <p key={i} className="font-bold text-foreground mt-4 first:mt-0 text-base">{line.replace(/^#+\s/, "")}</p>
                          : <p key={i}>{line}</p>;
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>

        </div>
      </main>
    </>
  );
}
