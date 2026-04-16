import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Clock, PenLine, Heart, Lightbulb, GitBranch,
  Send, Loader2, User, Sparkles, ChevronRight
} from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import type { ChatMessage } from "@shared/routes";
import { canUseAi, recordAiUsage } from "@/lib/aiUsage";
import { AiPauseModal } from "@/components/AiPauseModal";
import { getUserName } from "@/lib/userName";
import { useChatWithVerse } from "@/hooks/use-verses";
import { ResourceSuggestionCard } from "@/components/ResourceSuggestionCard";

interface BibleStudyChatProps {
  verseId: number;
  verseReference?: string;
  initialReflection: string;
  prayerContent?: string;
}

export function BibleStudyChat({
  verseId,
  verseReference,
  initialReflection,
  prayerContent,
}: BibleStudyChatProps) {
  // How many initial messages to hide from UI (they are context for the AI, not visible chat)
  // messages[0] = today's reflection (always hidden)
  // messages[1] = today's prayer context note (hidden, only if prayer exists)
  const hiddenCount = prayerContent ? 2 : 1;

  const buildInitialMessages = (): ChatMessage[] => {
    const init: ChatMessage[] = [
      { role: "assistant", content: initialReflection },
    ];
    if (prayerContent) {
      init.push({
        role: "assistant",
        content: `[Devotional context note — the following personalized prayer was already generated for this person as part of today's spiritual practice on ${verseReference ?? "this verse"}: "${prayerContent}". When the person asks you to generate or deepen a prayer, build thoughtfully on this one rather than starting from scratch.]`,
      });
    }
    return init;
  };

  const [messages, setMessages] = useState<ChatMessage[]>(buildInitialMessages);
  const [inputValue, setInputValue] = useState("");
  const [showAiPause, setShowAiPause] = useState(false);
  const chatMutation = useChatWithVerse();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const newMsgRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef(false);

  useEffect(() => {
    if (pendingScrollRef.current) {
      setTimeout(() => {
        newMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        pendingScrollRef.current = false;
      }, 60);
    }
  }, [messages.length]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || chatMutation.isPending) return;
    if (!canUseAi()) { setShowAiPause(true); return; }
    recordAiUsage();

    const userMessage: ChatMessage = { role: "user", content: question.trim() };
    const historyBeforeThisQuestion = [...messages];
    pendingScrollRef.current = true;
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    try {
      const result = await chatMutation.mutateAsync({
        verseId,
        messages: historyBeforeThisQuestion,
        question: question.trim(),
        userName: getUserName() ?? undefined,
      });
      const assistantMessage: ChatMessage = { role: "assistant", content: result.content };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Something went wrong — please try again." },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // Presets: "Deepen today's prayer" when prayer exists, otherwise generic
  const PRESET_PROMPTS = [
    { label: "Cross-references",                         icon: GitBranch },
    { label: "Historical context",                       icon: Clock },
    { label: "Who wrote this & why",                     icon: PenLine },
    { label: "Life application",                         icon: Lightbulb },
    {
      label: prayerContent ? "Deepen today's prayer" : "Write me a prayer",
      question: prayerContent
        ? "Take the prayer I received today and deepen it — make it more personal, intimate, and specific to this verse and my life right now."
        : "Write me a short, heartfelt prayer based on this verse.",
      icon: Heart,
    },
    { label: "Explain simply",                           icon: BookOpen },
  ];

  return (
    <div className="flex flex-col gap-4 pt-3">

      {/* Warm contextual opener — only shown before any conversation */}
      {messages.length === hiddenCount && verseReference && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-[13px] text-muted-foreground/70 italic text-center px-2 leading-relaxed -mt-1"
        >
          {prayerContent
            ? `You've reflected and prayed through ${verseReference} today — go deeper whenever you're ready.`
            : `You've just spent time with ${verseReference} — ask anything that's on your heart.`}
        </motion.p>
      )}

      {/* Preset chips — horizontal scroll */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {PRESET_PROMPTS.map(({ label, question, icon: Icon }) => (
            <button
              key={label}
              data-testid={`button-preset-${label.toLowerCase().replace(/[\s&']+/g, "-")}`}
              onClick={() => sendMessage(question ?? label)}
              disabled={chatMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-primary/25 bg-primary/6 hover:bg-primary/12 hover:border-primary/45 text-primary/80 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap flex-shrink-0"
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[12px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 flex items-center justify-end"
          style={{ background: "linear-gradient(to right, transparent, hsl(var(--background)) 75%)" }}>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 mr-0.5" />
        </div>
      </div>

      {/* Input row — amber send button */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 rounded-xl border-2 border-border/50 hover:border-primary/30 focus-within:border-primary/50 bg-background/80 px-3 py-2.5 transition-colors">
          <textarea
            ref={inputRef}
            data-testid="input-verse-question"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this verse…"
            rows={2}
            disabled={chatMutation.isPending}
            className="w-full resize-none bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/55 outline-none leading-relaxed disabled:opacity-50"
          />
        </div>
        <button
          data-testid="button-ask-verse"
          onClick={() => sendMessage(inputValue)}
          disabled={!inputValue.trim() || chatMutation.isPending}
          className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-amber-400/30 transition-all"
        >
          {chatMutation.isPending
            ? <Loader2 className="w-5 h-5 text-white animate-spin" />
            : <Send className="w-5 h-5 text-white" />
          }
        </button>
      </div>


      {/* Conversation thread — skips hidden context messages */}
      <AnimatePresence initial={false}>
        {messages.slice(hiddenCount).map((msg, idx) => {
          const isLast = idx === messages.slice(hiddenCount).length - 1;
          return (
            <motion.div
              key={idx}
              ref={isLast && msg.role === "assistant" ? newMsgRef : undefined}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-white/10 dark:bg-slate-800/60 text-foreground border border-white/10 rounded-tl-sm"
                  }`}
                >
                  {msg.content.split("\n").map((para, i) =>
                    para.trim() ? <p key={i} className="mb-2 last:mb-0">{para}</p> : null
                  )}
                </div>
                {msg.role === "assistant" && (
                  <ShareButton
                    title="Shepherd's Path Reflection"
                    text={msg.content}
                    showLabel={false}
                    className="ml-1 opacity-50 hover:opacity-100"
                  />
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Searching indicator */}
      {chatMutation.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 justify-start"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="bg-white/10 dark:bg-slate-800/60 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
            <span className="text-[13px] text-muted-foreground italic">Searching the Scriptures…</span>
          </div>
        </motion.div>
      )}

      {!chatMutation.isPending && (
        <ResourceSuggestionCard messages={messages} />
      )}

      <AnimatePresence>
        {showAiPause && <AiPauseModal onClose={() => setShowAiPause(false)} />}
      </AnimatePresence>
    </div>
  );
}
