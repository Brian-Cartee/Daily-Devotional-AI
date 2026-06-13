import { useState, useEffect, useRef, type ReactNode } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, ChevronDown, Sparkles, HeartHandshake, Loader2,
  BookMarked, MapPin, Presentation, Heart, ImageDown, Check, MessageCircle,
  Bookmark, BookmarkCheck, BookOpen, ArrowLeft, Lightbulb,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ShepherdCrookMark } from "@/components/ShepherdCrookMark";
import { canUseAi, recordAiUsage } from "@/lib/aiUsage";
import { AiPauseModal } from "@/components/AiPauseModal";
import { saveBookmark, getBookmark } from "@/lib/bookmarks";
import { ResumeBar } from "@/components/ResumeBar";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { InlineSubscribeToggle } from "@/components/EmailSubscribe";
import { useQuery } from "@tanstack/react-query";
import { capitalizeDivinePronouns } from "@/lib/divinePronouns";
import { getStoredLang } from "@/lib/language";
import { getUserName, getUserVoice } from "@/lib/userName";
import { ListenButton } from "@/components/ListenButton";
import { FloatingListenPlayer } from "@/components/FloatingListenPlayer";
import { JourneyStepListenBar } from "@/components/JourneyStepListenBar";
import { useTTS, prewarmTTS } from "@/hooks/use-tts";
import { buildJourneyStepListenText, journeyDayStorageKey } from "@/lib/journeyListenText";
import { getHeroImage } from "@/lib/heroImage";
import { createShareImage } from "@/lib/shareImage";
import { shareImageBlob, shareImageFilename } from "@/lib/shareVerse";
import { ALL_JOURNEYS, type Journey, type GuidedChapter } from "@/data/journeys";
import { GuidedPathwaysSection } from "@/components/GuidedPathwaysSection";
import { JourneyMoodTiles } from "@/components/JourneyMoodTiles";
import { UpgradeModal } from "@/components/UpgradeModal";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { canAccessJourney, getJourneyById, proPathways } from "@/lib/journeyCatalog";
import { apiSessionExtras } from "@/lib/requestExtras";
import { saveSnippet } from "@/lib/snippets";
import { useToast } from "@/hooks/use-toast";
import { BiblePassageText } from "@/components/BiblePassageText";
import { CinematicPageHero } from "@/components/CinematicPageHero";
import { scrollPageToTopReliable } from "@/lib/scrollPageToTop";

function usePassageText(apiRef: string, enabled: boolean) {
  const url = `/api/bible?ref=${encodeURIComponent(apiRef)}`;
  return useQuery<{ text: string; reference: string }>({ queryKey: [url], enabled });
}


function ChapterCard({
  chapter,
  open,
  onToggle,
  isActive = false,
}: {
  chapter: GuidedChapter;
  open: boolean;
  onToggle: () => void;
  isActive?: boolean;
}) {
  const [aiMode, setAiMode] = useState<"reflect" | "pray" | "explain" | "chat" | null>(null);
  const [aiContent, setAiContent] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiPause, setShowAiPause] = useState(false);
  const [snippetSaved, setSnippetSaved] = useState(false);
  const [snippetSaving, setSnippetSaving] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);
  const [cardDone, setCardDone] = useState(false);
  const [aiReply, setAiReply] = useState("");
  const [aiReplySaved, setAiReplySaved] = useState(false);
  const { toast } = useToast();

  const textQuery = usePassageText(chapter.apiRef, open);

  const generateAI = async (type: "reflect" | "pray" | "explain") => {
    if (!canUseAi()) { setShowAiPause(true); return; }
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
            : type === "pray"
            ? `Write a heartfelt prayer based on the themes of ${chapter.reference} — ${chapter.title}. Keep it personal, warm, and about 3 sentences.`
            : `In 2 short paragraphs, explain what is happening in ${chapter.reference} — ${chapter.title}. First, briefly describe the historical and cultural moment: who wrote it, to whom, and what was happening. Second, explain in plain language what the passage is actually saying and why it matters. Write as if speaking to someone who is curious but has never studied the Bible.`,
        }],
      });
      const text = await res.text();
      setAiContent(capitalizeDivinePronouns(text));
    } catch {
      setAiContent("Sorry, we couldn't generate a response right now. Please try again.");
    }
    setIsAiLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || isAiLoading) return;
    if (!canUseAi()) { setShowAiPause(true); return; }
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
      toast({ description: "This has been added to your Journal. You can come back to it anytime." });
    } catch {
      toast({ description: "We can try that again.", variant: "destructive" });
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
      const result = await shareImageBlob(blob, {
        filename: shareImageFilename(chapter.reference),
        title: `${chapter.reference} — Shepherd's Path`,
        text: `"${verseText.slice(0, 200)}${verseText.length > 200 ? "…" : ""}"\n— ${chapter.reference}\n\nShepherd's Path`,
      });
      if (result === "shared") {
        toast({ description: "Choose where to send your scripture card." });
      } else if (result === "saved") {
        toast({ description: "Scripture card saved — share from Photos." });
      }
      setCardDone(true);
      setTimeout(() => setCardDone(false), 2500);
    } catch {
      toast({ description: "Couldn't create card. Try again.", variant: "destructive" });
    }
    setSharingCard(false);
  };

  return (
    <div
      id={`chapter-card-${chapter.id}`}
      className={`bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/30 rounded-2xl overflow-hidden transition-shadow ${
        isActive ? "ring-2 ring-primary/25 shadow-md shadow-primary/5" : ""
      }`}
    >
      <button
        onClick={onToggle}
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
                      {/* Remember this — quiet bookmark, not a primary action */}
                      <button
                        onClick={handleSaveSnippet}
                        disabled={snippetSaving}
                        data-testid={`btn-save-snippet-${chapter.id}`}
                        aria-label={snippetSaved ? "Remembered" : "Remember this passage"}
                        title={snippetSaved ? "Added to your Journal" : "Remember this"}
                        className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors disabled:opacity-40 text-muted-foreground hover:text-primary"
                      >
                        {snippetSaving
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : snippetSaved
                            ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                            : <Bookmark className="w-3.5 h-3.5" />
                        }
                        <span>{snippetSaved ? "Remembered" : "Remember"}</span>
                      </button>
                    </div>
                  </div>
                  <BiblePassageText text={textQuery.data.text} />
                </div>
              )}
              {/* "The story behind this" — quiet context layer, collapsed by default */}
              <button
                onClick={() => setStoryOpen(v => !v)}
                className="w-full flex items-center gap-2 text-left text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1 group"
              >
                <BookOpen className="w-3 h-3 flex-shrink-0 group-hover:text-primary/60 transition-colors" />
                <span className="italic">{storyOpen ? "Close background" : "The story behind this"}</span>
                <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${storyOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {storyOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, delay: 0.12, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/30 dark:bg-slate-700/20 rounded-xl p-4 border border-white/20 mb-2">
                      <p className="text-[10px] font-medium text-primary/40 mb-3 italic">Let's take a look…</p>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/50 mb-2">What's happening here</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{chapter.whyItMatters}</p>
                      <p className="text-[10px] text-muted-foreground/40 mt-3 italic">Historical and cultural depth — coming soon.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action row — 3 spiritual engagement actions only */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                {/* Reflect */}
                <button
                  onClick={() => generateAI("reflect")}
                  disabled={isAiLoading}
                  data-testid={`btn-reflect-${chapter.id}`}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 disabled:opacity-40 transition-all group"
                >
                  <Sparkles className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground leading-tight text-center">Reflect</span>
                </button>

                {/* Prayer */}
                <button
                  onClick={() => generateAI("pray")}
                  disabled={isAiLoading}
                  data-testid={`btn-pray-${chapter.id}`}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 disabled:opacity-40 transition-all group"
                >
                  <HeartHandshake className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground leading-tight text-center">Prayer</span>
                </button>

                {/* Explain */}
                <button
                  onClick={() => generateAI("explain")}
                  disabled={isAiLoading}
                  data-testid={`btn-explain-${chapter.id}`}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 disabled:opacity-40 transition-all group"
                >
                  <Lightbulb className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground leading-tight text-center">Explain</span>
                </button>

              </div>
              {isAiLoading && !aiContent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {aiMode === "explain" ? `Looking at the context of ${chapter.reference}…` : `Reflecting on ${chapter.reference}...`}
                </div>
              )}
              {aiContent && (aiMode === "reflect" || aiMode === "pray" || aiMode === "explain") && (
                <div className="bg-white/50 dark:bg-slate-700/40 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {aiMode === "reflect" ? <Sparkles className="w-4 h-4 text-primary" /> : aiMode === "pray" ? <HeartHandshake className="w-4 h-4 text-primary" /> : <Lightbulb className="w-4 h-4 text-primary" />}
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">{aiMode === "reflect" ? "Reflection" : aiMode === "pray" ? "Prayer" : "Explanation"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShareButton
                        title={`${aiMode === "reflect" ? "Reflection" : aiMode === "pray" ? "Prayer" : "Explanation"} — ${chapter.reference}`}
                        text={aiContent}
                      />
                      <ListenButton text={aiContent} label="Listen instead" className="text-[11px]" />
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                    {aiContent.split("\n").map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/30">
                    <p className="text-[11px] font-semibold text-foreground/60 mb-1.5">How does this speak to you?</p>
                    <textarea
                      data-testid="textarea-bible-ai-reply"
                      value={aiReply}
                      onChange={e => { setAiReply(e.target.value); setAiReplySaved(false); }}
                      placeholder="Share a thought, question, or response…"
                      spellCheck
                      rows={2}
                      className="w-full resize-none rounded-lg border border-white/40 bg-white/60 dark:bg-slate-600/40 px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <div className="flex justify-end mt-1.5">
                      {aiReplySaved ? (
                        <span className="text-[11px] font-semibold text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>
                      ) : (
                        <button
                          data-testid="btn-save-bible-ai-reply"
                          disabled={!aiReply.trim()}
                          onClick={async () => {
                            if (!aiReply.trim()) return;
                            try {
                              await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ sessionId: getSessionId(), verseRef: chapter.reference, verseText: "", content: aiReply.trim(), type: "reflection" }) });
                              setAiReplySaved(true);
                            } catch { setAiReplySaved(true); }
                          }}
                          className="text-[11px] font-bold rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 disabled:opacity-40 hover:bg-primary/90 transition-colors"
                        >Save to Journal</button>
                      )}
                    </div>
                  </div>

                  {/* Natural next — gentle invitation to continue the moment */}
                  <div className="mt-3 pt-3 border-t border-white/20">
                    {aiMode === "reflect" && (
                      <button
                        onClick={() => generateAI("pray")}
                        disabled={isAiLoading}
                        className="w-full text-left text-[11px] text-muted-foreground/60 hover:text-primary/70 transition-colors italic"
                      >
                        Would you like to turn this into a prayer? →
                      </button>
                    )}
                    {aiMode === "pray" && (
                      <button
                        onClick={() => { setAiMode("chat"); setChatMessages([]); }}
                        disabled={isAiLoading}
                        className="w-full text-left text-[11px] text-muted-foreground/60 hover:text-primary/70 transition-colors italic"
                      >
                        Is there anything you want to ask about this? →
                      </button>
                    )}
                    {aiMode === "explain" && (
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => generateAI("reflect")}
                          disabled={isAiLoading}
                          className="w-full text-left text-[11px] text-muted-foreground/60 hover:text-primary/70 transition-colors italic"
                        >
                          Now sit with it — get a devotional reflection →
                        </button>
                        <button
                          onClick={() => { setAiMode("chat"); setChatMessages([]); }}
                          disabled={isAiLoading}
                          className="w-full text-left text-[11px] text-muted-foreground/60 hover:text-primary/70 transition-colors italic"
                        >
                          Have a question about this? Ask →
                        </button>
                      </div>
                    )}
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
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="What's on your heart about this passage?" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="send" className="flex-1 bg-white/60 dark:bg-slate-700/60 border border-white/30 dark:border-slate-600/40 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" disabled={isAiLoading} />
                    <Button size="sm" onClick={sendChat} disabled={!chatInput.trim() || isAiLoading} className="rounded-xl">Send</Button>
                  </div>
                  {/* Natural next — invite them to hold onto this moment */}
                  {chatMessages.length >= 2 && !snippetSaved && (
                    <button
                      onClick={handleSaveSnippet}
                      disabled={snippetSaving}
                      className="w-full text-left text-[11px] text-muted-foreground/60 hover:text-primary/70 transition-colors italic pt-1"
                    >
                      Do you want to hold onto this passage? →
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAiPause && <AiPauseModal onClose={() => setShowAiPause(false)} />}
      </AnimatePresence>
    </div>
  );
}

function JourneyHub({
  onSelect,
  onLifeSeasonSelect,
  onLockedSelect,
  resumeBar,
}: {
  onSelect: (journey: Journey) => void;
  onLifeSeasonSelect: (journey: Journey) => void;
  onLockedSelect: () => void;
  resumeBar?: React.ReactNode;
}) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const isPro = isProVerifiedLocally();
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
      if (!isPro) {
        setLifePhase("input");
        return;
      }
      fetch("/api/journey/life-season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: situation.trim(), ...apiSessionExtras() }),
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(journey => onLifeSeasonSelect(journey as Journey))
        .catch(() => { setLifeError("We can try that again."); setLifePhase("input"); });
    }
  }, []);

  const handleGenerateLifeJourney = async () => {
    if (!lifeSituation.trim()) return;
    if (!isPro) {
      onLockedSelect();
      return;
    }
    setLifePhase("loading");
    setLifeError(null);
    try {
      const res = await fetch("/api/journey/life-season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: lifeSituation.trim(), ...apiSessionExtras() }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const journey = await res.json();
      onLifeSeasonSelect(journey as Journey);
    } catch {
      setLifeError("We can try that again.");
      setLifePhase("input");
    }
  };

  return (
    <main className="min-h-screen bg-background pb-28 sm:pb-16">
      <CinematicPageHero imageSrc={getHeroImage("understand")} testId="journey-hub-hero" objectPosition="center 30%">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-1 flex-col items-center justify-end text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/25 backdrop-blur-sm text-white/80 text-[11px] font-semibold uppercase tracking-widest mb-2">
            <Compass className="w-3 h-3" />
            Journeys
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">Start where you are</h1>
          <p className="text-white/85 text-[14px] mt-1.5 max-w-xs drop-shadow">There&apos;s a path for this moment.</p>
        </motion.div>
      </CinematicPageHero>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {resumeBar}

        <JourneyMoodTiles onSelect={onSelect} />

        <GuidedPathwaysSection
          pathways={proPathways()}
          onSelect={onSelect}
        />

        {/* Life Season Journey — Pro: AI-shaped from your words */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-7"
        >
          <div className="flex items-center gap-2 mb-3 px-0.5">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap flex-shrink-0">
              {isPro ? "Start with what you're walking through" : "Journey from your exact words"}
            </span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {!isPro && lifePhase === "idle" ? (
            <button
              type="button"
              data-testid="btn-life-season-pro"
              onClick={onLockedSelect}
              className="w-full text-left rounded-2xl border border-violet-200/50 dark:border-violet-800/40 bg-card/80 p-4 hover:bg-card transition-colors"
            >
              <p className="text-[14px] font-semibold text-foreground leading-snug">
                Your own path — coming soon.
              </p>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                For now, every journey above is free and waiting.
              </p>
            </button>
          ) : lifePhase === "idle" ? (
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
                  <h2 className="text-[17px] font-bold text-foreground leading-tight">Start with what you're walking through</h2>
                  <p className="text-xs font-semibold text-violet-500 dark:text-violet-400 mb-1.5">7 passages, shaped for where you are</p>
                  <p className="text-sm text-muted-foreground leading-snug">Tell us what's on your heart — we'll guide you.</p>
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
                spellCheck
                className="w-full text-[13px] leading-relaxed rounded-xl border border-border bg-background px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 min-h-[80px] mb-3"
                disabled={lifePhase === "loading"}
              />
              {lifeError && <p className="text-[12px] text-rose-500 mb-2">{lifeError}</p>}
              <div className="flex gap-2">
                <button
                  data-testid="btn-life-season-generate"
                  onClick={handleGenerateLifeJourney}
                  disabled={lifePhase === "loading" || !lifeSituation.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-[13px] font-semibold disabled:opacity-50 transition-all shadow-sm shadow-amber-500/25"
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
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap flex-shrink-0">{cat}</span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                    <div className="space-y-3">
                      {group.map((journey, i) => (
                        <motion.button
                          key={journey.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: (ci * 0.1) + i * 0.07 }}
                          onClick={() => (canAccessJourney(journey, isPro) ? onSelect(journey) : onLockedSelect())}
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
                              <p className={`text-xs font-semibold ${journey.iconColor} mb-1.5 dark:brightness-125`}>{journey.subtitle}</p>
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

      {/* Subscribe — shown at bottom */}
      <div className="max-w-2xl mx-auto pb-8 mt-2">
        <InlineSubscribeToggle />
      </div>
    </main>
  );
}

function JourneyDetail({ journey, onBack, backLabel = "All Journeys" }: { journey: Journey; onBack: () => void; backLabel?: string }) {
  const themes = Array.from(new Set(journey.entries.map((e) => e.theme)));
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const filtered = activeTheme ? journey.entries.filter((e) => e.theme === activeTheme) : journey.entries;
  const storageKey = journeyDayStorageKey(journey.id);

  const resolveInitialIndex = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const idx = filtered.findIndex((e) => e.id === saved);
        if (idx >= 0) return idx;
      }
    } catch {
      /* ignore */
    }
    return 0;
  };

  const [activeIndex, setActiveIndex] = useState(resolveInitialIndex);
  const [expandedId, setExpandedId] = useState<string | null>(() => filtered[resolveInitialIndex()]?.id ?? null);
  const [listenSession, setListenSession] = useState(false);
  const tts = useTTS();
  const themeFilterMounted = useRef(false);

  const activeChapter = filtered[activeIndex];
  const passageQuery = usePassageText(activeChapter?.apiRef ?? "", !!activeChapter);
  const listenText =
    passageQuery.data && activeChapter
      ? buildJourneyStepListenText(activeChapter, passageQuery.data.text)
      : "";

  useEffect(() => {
    if (!themeFilterMounted.current) {
      themeFilterMounted.current = true;
      return;
    }
    setActiveIndex(0);
    setExpandedId(filtered[0]?.id ?? null);
  }, [activeTheme, filtered]);

  useEffect(() => {
    if (!listenText || !isProVerifiedLocally()) return;
    prewarmTTS(listenText, getUserVoice(), "snippet");
  }, [listenText, activeChapter?.id]);

  useEffect(() => {
    if (!listenSession || !listenText || passageQuery.isLoading) return;
    void tts.play(listenText, getUserVoice(), { scope: "snippet" });
  }, [activeIndex, activeTheme]);

  useEffect(() => () => { tts.stop(); }, []);

  const goToStep = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= filtered.length) return;
    const chapter = filtered[nextIndex];
    setActiveIndex(nextIndex);
    setExpandedId(chapter.id);
    try {
      localStorage.setItem(storageKey, chapter.id);
    } catch {
      /* ignore */
    }
    document.getElementById(`chapter-card-${chapter.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const startListen = () => {
    if (!listenText.trim()) return;
    if (activeChapter && expandedId !== activeChapter.id) {
      setExpandedId(activeChapter.id);
    }
    setListenSession(true);
    void tts.play(listenText, getUserVoice(), { scope: "snippet" });
  };

  const stopListen = () => {
    setListenSession(false);
    tts.stop();
  };

  const listenReady = !!listenText.trim() && !passageQuery.isLoading;
  const dayLabel = activeChapter ? `Play Day ${activeChapter.order}` : "Play this step";
  const listenSubtitle = activeChapter
    ? `${activeChapter.reference} · passage and why it matters`
    : "Loading this step…";

  return (
    <main id="journey-detail-top" className="min-h-screen bg-background pb-28 sm:pb-16">
      <CinematicPageHero
        compact
        imageSrc={journey.image || getHeroImage("understand")}
        imageAlt={journey.title}
        testId="journey-detail-hero"
        objectPosition="center 28%"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-1 flex-col"
        >
          <button
            type="button"
            onClick={onBack}
            data-testid="btn-journey-back"
            className="self-start flex items-center gap-1.5 text-white/85 hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </button>
          <div className="flex-1 flex flex-col justify-end pb-1">
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
      </CinematicPageHero>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {themes.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 justify-center mb-5"
          >
            <button
              onClick={() => { setActiveTheme(null); scrollPageToTopReliable("smooth"); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeTheme === null ? "bg-primary text-primary-foreground" : "bg-white/50 dark:bg-slate-700/50 text-muted-foreground hover:text-foreground border border-white/30"}`}
            >
              All
            </button>
            {themes.map((theme) => (
              <button
                key={theme}
                onClick={() => { setActiveTheme(activeTheme === theme ? null : theme); scrollPageToTopReliable("smooth"); }}
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

        <JourneyStepListenBar
          dayLabel={dayLabel}
          subtitle={listenSubtitle}
          ready={listenReady}
          tts={tts}
          onPlay={startListen}
          onStop={stopListen}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          {filtered.map((entry, index) => (
            <ChapterCard
              key={entry.id}
              chapter={entry}
              open={expandedId === entry.id}
              isActive={activeIndex === index}
              onToggle={() => {
                if (expandedId === entry.id) {
                  setExpandedId(null);
                  return;
                }
                setExpandedId(entry.id);
                setActiveIndex(index);
                try {
                  localStorage.setItem(storageKey, entry.id);
                } catch {
                  /* ignore */
                }
              }}
            />
          ))}
        </motion.div>
      </div>

      {activeChapter && listenText && (
        <FloatingListenPlayer
          titleLine={`Day ${activeChapter.order} · ${activeChapter.reference}`}
          listenText={listenText}
          canPrev={activeIndex > 0}
          canNext={activeIndex < filtered.length - 1}
          onPrev={() => goToStep(activeIndex - 1)}
          onNext={() => goToStep(activeIndex + 1)}
          tts={tts}
          onListenStart={() => setListenSession(true)}
          onListenStop={() => setListenSession(false)}
          testId="floating-journey-player"
        />
      )}
    </main>
  );
}

export default function UnderstandBible() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const journeyId = params.get("j");
  const situation = params.get("situation") ?? "";
  const selectedJourney = journeyId ? (getJourneyById(journeyId) ?? null) : null;
  const [lifeSeasonJourney, setLifeSeasonJourney] = useState<Journey | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const activeJourney = selectedJourney ?? lifeSeasonJourney;

  const scrollJourneyToTop = () => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    scrollPageToTopReliable("auto");
  };

  useEffect(() => {
    if (!activeJourney?.id) return;
    scrollJourneyToTop();
    const t1 = window.setTimeout(scrollJourneyToTop, 80);
    const t2 = window.setTimeout(scrollJourneyToTop, 280);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [activeJourney?.id]);

  useEffect(() => {
    if (selectedJourney) {
      if (!canAccessJourney(selectedJourney)) {
        setShowUpgrade(true);
        navigate("/understand#pathways");
        return;
      }
      saveBookmark("journey", { journeyId: selectedJourney.id, label: selectedJourney.title });
    }
  }, [selectedJourney?.id]);

  useEffect(() => {
    if (window.location.hash === "#pathways") {
      const el = document.getElementById("pathways");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSelect = (journey: Journey) => {
    if (!canAccessJourney(journey)) {
      setShowUpgrade(true);
      return;
    }
    scrollJourneyToTop();
    navigate(`/understand?j=${journey.id}`);
  };
  const handleLifeSeasonSelect = (journey: Journey) => {
    scrollJourneyToTop();
    setLifeSeasonJourney(journey);
  };
  const handleBack = () => {
    scrollJourneyToTop();
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
              onLockedSelect={() => setShowUpgrade(true)}
              resumeBar={
                <AnimatePresence>
                  {!resumeDismissed && (() => {
                    const bm = getBookmark("journey");
                    return bm ? (
                      <ResumeBar
                        key="journey-resume"
                        label={bm.label}
                        onResume={() => {
                          scrollJourneyToTop();
                          navigate(`/understand?j=${bm.journeyId}`);
                          setResumeDismissed(true);
                        }}
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
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </>
  );
}
