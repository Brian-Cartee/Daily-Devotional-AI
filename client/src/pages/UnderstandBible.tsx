import { useState, useEffect, type ReactNode } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, ChevronDown, Sparkles, HeartHandshake, Loader2,
  BookMarked, ArrowLeft, MapPin, Presentation, Heart, ImageDown, Check,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ShepherdCrookMark } from "@/components/ShepherdCrookMark";
import { canUseAi, recordAiUsage } from "@/lib/aiUsage";
import { UpgradeModal } from "@/components/UpgradeModal";
import { NavBar } from "@/components/NavBar";
import { saveBookmark, getBookmark } from "@/lib/bookmarks";
import { ResumeBar } from "@/components/ResumeBar";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { InlineEmailSignup, InlineSmsSignup } from "@/components/EmailSubscribe";
import { useQuery } from "@tanstack/react-query";
import { capitalizeDivinePronouns } from "@/lib/divinePronouns";
import { getStoredLang } from "@/lib/language";
import { getUserName } from "@/lib/userName";
import { ListenButton } from "@/components/ListenButton";
import { getHeroImage } from "@/lib/heroImage";
import { createShareImage } from "@/lib/shareImage";
import { ALL_JOURNEYS, type Journey, type GuidedChapter } from "@/data/journeys";
import { saveSnippet } from "@/lib/snippets";
import { useToast } from "@/hooks/use-toast";

function usePassageText(apiRef: string, enabled: boolean) {
  const url = `/api/bible?ref=${encodeURIComponent(apiRef)}`;
  return useQuery<{ text: string; reference: string }>({ queryKey: [url], enabled });
}

function ChapterCard({ chapter }: { chapter: GuidedChapter }) {
  const [open, setOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"reflect" | "pray" | "chat" | null>(null);
  const [aiContent, setAiContent] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [snippetSaved, setSnippetSaved] = useState(false);
  const [snippetSaving, setSnippetSaving] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);
  const [cardDone, setCardDone] = useState(false);
  const { toast } = useToast();

  const textQuery = usePassageText(chapter.apiRef, open);

  const generateAI = async (type: "reflect" | "pray") => {
    if (!canUseAi()) { setShowUpgrade(true); return; }
    recordAiUsage();
    setAiMode(type);
    setAiContent("");
    setIsAiLoading(true);
    const passageText = textQuery.data?.text ?? chapter.summary;
    const lang = getStoredLang();
    const userName = getUserName() ?? undefined;
    try {
      const res = await apiRequest("POST", "/api/chat/passage", {
        passageRef: chapter.reference,
        passageText,
        lang,
        userName,
        sessionId: getSessionId(),
        daysWithApp: getRelationshipAge(),
        messages: [{
          role: "user",
          content: type === "reflect"
            ? `Write a 2-paragraph devotional reflection on ${chapter.reference} that helps someone understand why this passage matters for their life today.`
            : `Write a heartfelt prayer based on the themes of ${chapter.reference} — ${chapter.title}. Keep it personal, warm, and about 3 sentences.`,
        }],
      });
      const data = await res.json();
      setAiContent(capitalizeDivinePronouns(data.content));
    } catch {
      setAiContent("Sorry, we couldn't generate a response right now. Please try again.");
    }
    setIsAiLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || isAiLoading) return;
    if (!canUseAi()) { setShowUpgrade(true); return; }
    recordAiUsage();
    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages([...newMessages, { role: "assistant", content: "" }]);
    setChatInput("");
    setIsAiLoading(true);
    const passageText = textQuery.data?.text ?? chapter.summary;
    const lang = getStoredLang();
    const userName = getUserName() ?? undefined;
    try {
      const response = await fetch("/api/chat/passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageRef: chapter.reference,
          passageText,
          lang,
          userName,
          sessionId: getSessionId(),
          daysWithApp: getRelationshipAge(),
          messages: newMessages,
        }),
      });
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setChatMessages([...newMessages, { role: "assistant", content: capitalizeDivinePronouns(full) }]);
      }
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't respond. Please try again." }]);
    }
    setIsAiLoading(false);
  };

  const handleSaveSnippet = async () => {
    if (snippetSaved || snippetSaving) return;
    setSnippetSaving(true);
    try {
      const text = textQuery.data?.text
        ? textQuery.data.text.replace(/\[\d+\]/g, "").trim().slice(0, 400)
        : chapter.summary;
      await saveSnippet({
        text,
        reference: chapter.reference,
        source: chapter.title,
      });
      setSnippetSaved(true);
      toast({ description: "Saved to your path ✦" });
    } catch {
      toast({ description: "Could not save. Please try again.", variant: "destructive" });
    } finally {
      setSnippetSaving(false);
    }
  };

  const handleShareCard = async () => {
    if (sharingCard || !textQuery.data) return;
    setSharingCard(true);
    try {
      const verseText = textQuery.data.text.replace(/\[\d+\]/g, "").trim();
      const blob = await createShareImage(verseText, chapter.reference, null);
      const file = new File([blob], `shepherd-path-${chapter.reference.replace(/\s/g, "-")}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${chapter.reference} — Shepherd's Path` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast({ description: "Scripture card saved!" });
      }
      setCardDone(true);
      setTimeout(() => setCardDone(false), 2500);
    } catch {
      toast({ description: "Couldn't create card. Try again.", variant: "destructive" });
    }
    setSharingCard(false);
  };

  return (
    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-white/30 dark:hover:bg-slate-700/20 transition-colors"
        data-testid={`chapter-toggle-${chapter.id}`}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {chapter.order}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-primary uppercase tracking-wide">{chapter.reference}</span>
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base leading-tight">{chapter.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{chapter.summary}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="px-5 pb-5 space-y-4 border-t border-white/20 dark:border-slate-700/30 pt-4">
              <div className="bg-primary/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookMarked className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">Why it matters</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{chapter.whyItMatters}</p>
              </div>
              {textQuery.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading passage...</div>}
              {textQuery.data && (
                <div className="bg-white/40 dark:bg-slate-700/30 rounded-xl p-4 max-h-56 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{chapter.reference}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleShareCard}
                        disabled={sharingCard}
                        data-testid={`btn-card-${chapter.id}`}
                        title="Save as scripture card"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                      >
                        {sharingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : cardDone ? <Check className="w-3.5 h-3.5 text-green-500" /> : <ImageDown className="w-3.5 h-3.5" />}
                        {sharingCard ? "Creating…" : cardDone ? "Done!" : "Card"}
                      </button>
                      <ListenButton text={textQuery.data.text} label="Listen" className="text-[11px]" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{textQuery.data.text}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => generateAI("reflect")} disabled={isAiLoading} data-testid={`btn-reflect-${chapter.id}`}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Reflection
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => generateAI("pray")} disabled={isAiLoading} data-testid={`btn-pray-${chapter.id}`}>
                  <HeartHandshake className="w-3.5 h-3.5 mr-1.5" /> Prayer
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => { setAiMode("chat"); setChatMessages([]); }} disabled={isAiLoading}>
                  Ask a question
                </Button>
                <button
                  onClick={handleSaveSnippet}
                  disabled={snippetSaving}
                  data-testid={`btn-save-snippet-${chapter.id}`}
                  aria-label="Save to your path"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    snippetSaved
                      ? "text-primary bg-primary/10 border-primary/30"
                      : "text-muted-foreground border-border hover:text-primary hover:border-primary/30 hover:bg-primary/8"
                  } disabled:opacity-50`}
                >
                  {snippetSaving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Heart className={`w-3.5 h-3.5 transition-all ${snippetSaved ? "fill-current" : ""}`} />
                  }
                  {snippetSaved ? "Saved" : "Save"}
                </button>
              </div>
              {isAiLoading && !aiContent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" /> Reflecting on {chapter.reference}...</div>
              )}
              {aiContent && (aiMode === "reflect" || aiMode === "pray") && (
                <div className="bg-white/50 dark:bg-slate-700/40 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {aiMode === "reflect" ? <Sparkles className="w-4 h-4 text-primary" /> : <HeartHandshake className="w-4 h-4 text-primary" />}
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">{aiMode === "reflect" ? "Reflection" : "Prayer"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShareButton
                        title={`${aiMode === "reflect" ? "Reflection" : "Prayer"} — ${chapter.reference}`}
                        text={aiContent}
                      />
                      <ListenButton text={aiContent} label="Listen" className="text-[11px]" />
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                    {aiContent.split("\n").map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
                  </div>
                </div>
              )}
              {aiMode === "chat" && (
                <div className="space-y-3">
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {chatMessages.length === 0 && (
                      <p className="text-sm text-muted-foreground/70 italic text-center py-4">What's on your heart about {chapter.reference}?</p>
                    )}
                    {chatMessages.map((m, i) =>
                      m.role === "user" ? (
                        <p key={i} className="text-xs text-muted-foreground/70 italic">"{m.content}"</p>
                      ) : (
                        <div key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5 pb-3 mb-1 border-b border-white/20 last:border-0">
                          {m.content
                            ? m.content.split("\n").map((p, j) => p.trim() ? <p key={j}>{p}</p> : null)
                            : <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse rounded-sm" />
                          }
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="What's on your heart about this passage?" className="flex-1 bg-white/60 dark:bg-slate-700/60 border border-white/30 dark:border-slate-600/40 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" disabled={isAiLoading} />
                    <Button size="sm" onClick={sendChat} disabled={!chatInput.trim() || isAiLoading} className="rounded-xl">Send</Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </AnimatePresence>
    </div>
  );
}

function JourneyHub({ onSelect, onLifeSeasonSelect, resumeBar }: { onSelect: (journey: Journey) => void; onLifeSeasonSelect: (journey: Journey) => void; resumeBar?: React.ReactNode }) {
  const search = useSearch();
  const [lifePhase, setLifePhase] = useState<"idle" | "input" | "loading">("idle");
  const [lifeSituation, setLifeSituation] = useState(() => {
    const params = new URLSearchParams(search);
    return params.get("situation") ?? "";
  });
  const [lifeError, setLifeError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const situation = params.get("situation");
    if (situation) {
      setLifeSituation(situation);
      // Use pre-generated journey from GuidancePage if available
      const cached = sessionStorage.getItem("sp-guidance-journey");
      if (cached) {
        try {
          const j = JSON.parse(cached);
          sessionStorage.removeItem("sp-guidance-journey");
          onLifeSeasonSelect(j as Journey);
          return;
        } catch { /* fall through to fetch */ }
      }
      setLifePhase("loading");
      fetch("/api/journey/life-season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: situation.trim() }),
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(journey => onLifeSeasonSelect(journey as Journey))
        .catch(() => { setLifeError("Something went wrong. Please try again."); setLifePhase("input"); });
    }
  }, []);

  const handleGenerateLifeJourney = async () => {
    if (!lifeSituation.trim()) return;
    setLifePhase("loading");
    setLifeError(null);
    try {
      const res = await fetch("/api/journey/life-season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: lifeSituation.trim() }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const journey = await res.json();
      onLifeSeasonSelect(journey as Journey);
    } catch {
      setLifeError("Something went wrong. Please try again.");
      setLifePhase("input");
    }
  };

  return (
    <main className="min-h-screen bg-background pt-20 pb-28 sm:pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {resumeBar}
        <div className="relative h-52 sm:h-64 rounded-2xl overflow-hidden mb-8">
          <img src={getHeroImage("understand")} alt="Bible Journeys" className="absolute inset-0 w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/70" />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center justify-end h-full pb-6 text-center px-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/25 backdrop-blur-sm text-white text-[13px] font-bold uppercase tracking-widest mb-2">
              <Compass className="w-3 h-3" />
              Bible Journeys
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">Choose Your Path</h1>
            <p className="text-white/85 text-[14px] mt-1.5 max-w-xs drop-shadow">Guided reading plans through the heart of Scripture</p>
          </motion.div>
        </div>

        {/* Life Season Journey */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-7"
        >
          <div className="flex items-center gap-2 mb-3 px-0.5">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">Life Season</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {lifePhase === "idle" ? (
            <button
              data-testid="btn-life-season-start"
              onClick={() => setLifePhase("input")}
              className="w-full text-left rounded-2xl relative overflow-hidden border border-violet-200/60 dark:border-violet-800/40 bg-card p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 pointer-events-none" />
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-full">Personalized</span>
                  </div>
                  <h2 className="text-[17px] font-bold text-foreground leading-tight">Navigate a Life Season</h2>
                  <p className="text-xs font-semibold text-violet-500 dark:text-violet-400 mb-1.5">AI-crafted · 7 passages</p>
                  <p className="text-sm text-muted-foreground leading-snug">Tell us what you're walking through. We'll build a 7-day Bible journey written just for you.</p>
                </div>
                <ChevronDown className="w-5 h-5 text-violet-400 flex-shrink-0 mt-1 -rotate-90" />
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <p className="text-[13px] font-semibold text-foreground">What are you walking through right now?</p>
              </div>
              <textarea
                value={lifeSituation}
                onChange={e => setLifeSituation(e.target.value)}
                placeholder="e.g. I just lost my job… I'm going through a divorce… caring for a sick parent… struggling with doubt…"
                className="w-full text-[13px] leading-relaxed rounded-xl border border-border bg-background px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 min-h-[80px] mb-3"
                disabled={lifePhase === "loading"}
              />
              {lifeError && <p className="text-[12px] text-rose-500 mb-2">{lifeError}</p>}
              <div className="flex gap-2">
                <button
                  data-testid="btn-life-season-generate"
                  onClick={handleGenerateLifeJourney}
                  disabled={lifePhase === "loading" || !lifeSituation.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50 transition-all hover:opacity-90"
                >
                  {lifePhase === "loading" ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Building your journey…</>
                  ) : (
                    <>Build my journey →</>
                  )}
                </button>
                <button
                  onClick={() => { setLifePhase("idle"); setLifeSituation(""); setLifeError(null); }}
                  disabled={lifePhase === "loading"}
                  className="px-3 py-2 rounded-xl text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {(() => {
          const categories = Array.from(new Set(ALL_JOURNEYS.map(j => j.category)));
          return (
            <div className="space-y-7">
              {categories.map((cat, ci) => {
                const group = ALL_JOURNEYS.filter(j => j.category === cat);
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-3 px-0.5">
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">{cat}</span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                    <div className="space-y-3">
                      {group.map((journey, i) => (
                        <motion.button
                          key={journey.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: (ci * 0.1) + i * 0.07 }}
                          onClick={() => onSelect(journey)}
                          data-testid={`journey-card-${journey.id}`}
                          className={`w-full text-left rounded-2xl relative overflow-hidden border ${journey.borderColor} bg-card p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}
                        >
                          {journey.image && (
                            <img
                              src={journey.image}
                              alt=""
                              aria-hidden="true"
                              className="absolute inset-0 w-full h-full object-cover opacity-[0.14] pointer-events-none select-none"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          )}
                          <div className={`absolute inset-0 bg-gradient-to-br ${journey.colorFrom} ${journey.colorTo} pointer-events-none`} />
                          <div className="relative z-10 flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl ${journey.pillBg} flex items-center justify-center flex-shrink-0`}>
                              <MapPin className={`w-5 h-5 ${journey.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-[11px] font-bold uppercase tracking-widest ${journey.pillText} ${journey.pillBg} px-2 py-0.5 rounded-full`}>
                                  {journey.length} passages
                                </span>
                                {journey.badgeText && (
                                  <span className={`text-[11px] font-bold uppercase tracking-widest text-white px-2 py-0.5 rounded-full ${journey.badgeBg}`}>
                                    {journey.badgeText}
                                  </span>
                                )}
                              </div>
                              <h2 className="text-[17px] font-bold text-foreground leading-tight">{journey.title}</h2>
                              <p className={`text-xs font-semibold ${journey.iconColor} mb-1.5`}>{journey.subtitle}</p>
                              <p className="text-sm text-muted-foreground leading-snug">{journey.description}</p>
                            </div>
                            <ChevronDown className={`w-5 h-5 ${journey.iconColor} flex-shrink-0 mt-1 -rotate-90`} />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Email + SMS signups — shown at bottom */}
      <div className="max-w-2xl mx-auto px-4 pb-8 mt-2 space-y-3">
        <InlineEmailSignup />
        <InlineSmsSignup />
      </div>
    </main>
  );
}

function JourneyDetail({ journey, onBack, backLabel = "All Journeys" }: { journey: Journey; onBack: () => void; backLabel?: string }) {
  const themes = Array.from(new Set(journey.entries.map((e) => e.theme)));
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const filtered = activeTheme ? journey.entries.filter((e) => e.theme === activeTheme) : journey.entries;

  return (
    <main className="min-h-screen bg-background pt-20 pb-28 sm:pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden mb-6">
          <img src={journey.image || getHeroImage("understand")} alt={journey.title} className="absolute inset-0 w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/65" />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col h-full pb-5 px-5"
          >
            <button
              onClick={onBack}
              data-testid="btn-journey-back"
              className="mt-4 self-start flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {backLabel}
            </button>
            <div className="flex-1 flex flex-col justify-end">
              {journey.badgeText && (
                <span className={`self-start text-[11px] font-bold uppercase tracking-widest text-white px-2.5 py-0.5 rounded-full mb-2 ${journey.badgeBg}`}>
                  {journey.badgeText}
                </span>
              )}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg leading-tight">{journey.title}</h1>
                  <p className="text-white/85 text-[13px] mt-1 drop-shadow">{journey.subtitle} · {journey.length} passages</p>
                </div>
                {!journey.id.startsWith("life-season") && (
                  <a
                    href={`/present?j=${journey.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="btn-present-journey"
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-[12px] font-semibold backdrop-blur-sm transition-all"
                    title="Open in Presentation Mode"
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Present</span>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {themes.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 justify-center mb-5"
          >
            <button
              onClick={() => { setActiveTheme(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeTheme === null ? "bg-primary text-primary-foreground" : "bg-white/50 dark:bg-slate-700/50 text-muted-foreground hover:text-foreground border border-white/30"}`}
            >
              All
            </button>
            {themes.map((theme) => (
              <button
                key={theme}
                onClick={() => { setActiveTheme(activeTheme === theme ? null : theme); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeTheme === theme ? "bg-primary text-primary-foreground" : "bg-white/50 dark:bg-slate-700/50 text-muted-foreground hover:text-foreground border border-white/30"}`}
              >
                {theme}
              </button>
            ))}
          </motion.div>
        )}

        {journey.pastoralIntro && journey.id.startsWith("life-season") && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="bg-violet-50/70 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-700/30 rounded-2xl px-5 py-4 mb-5"
          >
            <div className="flex items-start gap-3">
              <ShepherdCrookMark className="w-7 h-7 flex-shrink-0 opacity-70 mt-0.5" />
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed" data-testid="text-pastoral-intro">
                {journey.pastoralIntro}
              </p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          {filtered.map((entry) => (
            <ChapterCard key={entry.id} chapter={entry} />
          ))}
        </motion.div>
      </div>
    </main>
  );
}

export default function UnderstandBible() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const journeyId = params.get("j");
  const situation = params.get("situation") ?? "";
  const selectedJourney = journeyId ? (ALL_JOURNEYS.find(j => j.id === journeyId) ?? null) : null;
  const [lifeSeasonJourney, setLifeSeasonJourney] = useState<Journey | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);

  const activeJourney = selectedJourney ?? lifeSeasonJourney;

  useEffect(() => {
    if (selectedJourney) {
      saveBookmark("journey", { journeyId: selectedJourney.id, label: selectedJourney.title });
    }
  }, [selectedJourney?.id]);

  const handleSelect = (journey: Journey) => { window.scrollTo({ top: 0, behavior: "instant" }); navigate(`/understand?j=${journey.id}`); };
  const handleLifeSeasonSelect = (journey: Journey) => { window.scrollTo({ top: 0, behavior: "instant" }); setLifeSeasonJourney(journey); };
  const handleBack = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (lifeSeasonJourney && situation) {
      navigate(`/guidance?situation=${encodeURIComponent(situation)}`);
    } else if (lifeSeasonJourney) {
      setLifeSeasonJourney(null);
    } else {
      navigate("/understand");
    }
  };
  const backLabel = lifeSeasonJourney && situation ? "Your Teachings" : "All Journeys";

  return (
    <>
      <NavBar />
      <AnimatePresence mode="wait">
        {activeJourney ? (
          <motion.div key={activeJourney.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <JourneyDetail journey={activeJourney} onBack={handleBack} backLabel={backLabel} />
          </motion.div>
        ) : (
          <motion.div key="hub" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.25 }}>
            <JourneyHub
              onSelect={handleSelect}
              onLifeSeasonSelect={handleLifeSeasonSelect}
              resumeBar={
                <AnimatePresence>
                  {!resumeDismissed && (() => {
                    const bm = getBookmark("journey");
                    return bm ? (
                      <ResumeBar
                        key="journey-resume"
                        label={bm.label}
                        onResume={() => { navigate(`/understand?j=${bm.journeyId}`); setResumeDismissed(true); }}
                        onDismiss={() => setResumeDismissed(true)}
                      />
                    ) : null;
                  })()}
                </AnimatePresence>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
