import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, ChevronDown, Sparkles, HeartHandshake, Loader2,
  BookMarked, ArrowLeft, MapPin,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { canUseAi, recordAiUsage } from "@/lib/aiUsage";
import { UpgradeModal } from "@/components/UpgradeModal";
import { NavBar } from "@/components/NavBar";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { capitalizeDivinePronouns } from "@/lib/divinePronouns";
import { getStoredLang } from "@/lib/language";
import { getUserName } from "@/lib/userName";
import { ListenButton } from "@/components/ListenButton";
import { getHeroImage } from "@/lib/heroImage";
import { ALL_JOURNEYS, type Journey, type GuidedChapter } from "@/data/journeys";

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
    if (!chatInput.trim()) return;
    if (!canUseAi()) { setShowUpgrade(true); return; }
    recordAiUsage();
    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsAiLoading(true);
    const passageText = textQuery.data?.text ?? chapter.summary;
    const lang = getStoredLang();
    const userName = getUserName() ?? undefined;
    try {
      const res = await apiRequest("POST", "/api/chat/passage", { passageRef: chapter.reference, passageText, lang, userName, sessionId: getSessionId(), daysWithApp: getRelationshipAge(), messages: newMessages });
      const data = await res.json();
      setChatMessages([...newMessages, { role: "assistant", content: capitalizeDivinePronouns(data.content) }]);
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't respond. Please try again." }]);
    }
    setIsAiLoading(false);
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
                    <ListenButton text={textQuery.data.text} label="Listen" className="text-[11px]" />
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
                    <ListenButton text={aiContent} label="Listen" className="text-[11px]" />
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                    {aiContent.split("\n").map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
                  </div>
                </div>
              )}
              {aiMode === "chat" && (
                <div className="space-y-3">
                  <div className="bg-white/40 dark:bg-slate-700/30 rounded-xl p-3 max-h-52 overflow-y-auto space-y-2">
                    {chatMessages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Ask anything about {chapter.reference}</p>}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white/60 dark:bg-slate-600/60 text-slate-700 dark:text-slate-200"}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {isAiLoading && <div className="flex justify-start"><div className="bg-white/60 dark:bg-slate-600/60 px-3 py-2 rounded-xl"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div></div>}
                  </div>
                  <div className="flex gap-2">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="Ask a question..." className="flex-1 bg-white/60 dark:bg-slate-700/60 border border-white/30 dark:border-slate-600/40 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" disabled={isAiLoading} />
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

function JourneyHub({ onSelect }: { onSelect: (journey: Journey) => void }) {
  return (
    <main className="min-h-screen bg-background pt-20 pb-28 sm:pb-16 px-4">
      <div className="max-w-2xl mx-auto">
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

        <div className="space-y-4">
          {ALL_JOURNEYS.map((journey, i) => (
            <motion.button
              key={journey.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              onClick={() => onSelect(journey)}
              data-testid={`journey-card-${journey.id}`}
              className={`w-full text-left rounded-2xl bg-gradient-to-br ${journey.colorFrom} ${journey.colorTo} border ${journey.borderColor} bg-card p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}
            >
              <div className="flex items-start gap-4">
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
    </main>
  );
}

function JourneyDetail({ journey, onBack }: { journey: Journey; onBack: () => void }) {
  const themes = Array.from(new Set(journey.entries.map((e) => e.theme)));
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const filtered = activeTheme ? journey.entries.filter((e) => e.theme === activeTheme) : journey.entries;

  return (
    <main className="min-h-screen bg-background pt-20 pb-28 sm:pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden mb-6">
          <img src={getHeroImage("understand")} alt={journey.title} className="absolute inset-0 w-full h-full object-cover object-center" />
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
              <ArrowLeft className="w-4 h-4" /> All Journeys
            </button>
            <div className="flex-1 flex flex-col justify-end">
              {journey.badgeText && (
                <span className={`self-start text-[11px] font-bold uppercase tracking-widest text-white px-2.5 py-0.5 rounded-full mb-2 ${journey.badgeBg}`}>
                  {journey.badgeText}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg leading-tight">{journey.title}</h1>
              <p className="text-white/85 text-[13px] mt-1 drop-shadow">{journey.subtitle} · {journey.length} passages</p>
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
              onClick={() => setActiveTheme(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeTheme === null ? "bg-primary text-primary-foreground" : "bg-white/50 dark:bg-slate-700/50 text-muted-foreground hover:text-foreground border border-white/30"}`}
            >
              All
            </button>
            {themes.map((theme) => (
              <button
                key={theme}
                onClick={() => setActiveTheme(activeTheme === theme ? null : theme)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeTheme === theme ? "bg-primary text-primary-foreground" : "bg-white/50 dark:bg-slate-700/50 text-muted-foreground hover:text-foreground border border-white/30"}`}
              >
                {theme}
              </button>
            ))}
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
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const journeyId = params.get("j");
  const selectedJourney = journeyId ? (ALL_JOURNEYS.find(j => j.id === journeyId) ?? null) : null;

  const handleSelect = (journey: Journey) => navigate(`/understand?j=${journey.id}`);
  const handleBack = () => navigate("/understand");

  return (
    <>
      <NavBar />
      <AnimatePresence mode="wait">
        {selectedJourney ? (
          <motion.div key={selectedJourney.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <JourneyDetail journey={selectedJourney} onBack={handleBack} />
          </motion.div>
        ) : (
          <motion.div key="hub" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.25 }}>
            <JourneyHub onSelect={handleSelect} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
