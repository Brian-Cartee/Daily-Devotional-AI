import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Clock, PenLine, Heart, Lightbulb, GitBranch,
  Send, Loader2, User, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamAI } from "@/lib/streamAI";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { ShareButton } from "@/components/ShareButton";
import type { ChatMessage } from "@shared/routes";
import { canUseAi, recordAiUsage, getRemainingAi, AI_FREE_LIMIT } from "@/lib/aiUsage";
import { UpgradeModal } from "@/components/UpgradeModal";
import { getUserName } from "@/lib/userName";
import { useChatWithVerse } from "@/hooks/use-verses";
import { ResourceSuggestionCard } from "@/components/ResourceSuggestionCard";

interface BibleStudyChatProps {
  verseId: number;
  initialReflection: string;
}

const PRESET_PROMPTS = [
  { label: "Cross-reference scriptures", icon: GitBranch },
  { label: "Historical context", icon: Clock },
  { label: "Who wrote this and why", icon: PenLine },
  { label: "Life application", icon: Lightbulb },
  { label: "Generate prayer", icon: Heart },
  { label: "Explain simply", icon: BookOpen },
];

export function BibleStudyChat({ verseId, initialReflection }: BibleStudyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialReflection }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const chatMutation = useChatWithVerse();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const newMsgRef = useRef<HTMLDivElement>(null);
  const pendingScrollIdx = useRef<number | null>(null);

  // Scroll to the start of the newest user message so the response reads downward
  useEffect(() => {
    if (pendingScrollIdx.current !== null) {
      setTimeout(() => {
        newMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        pendingScrollIdx.current = null;
      }, 60);
    }
  }, [messages.length]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || chatMutation.isPending) return;
    if (!canUseAi()) { setShowUpgrade(true); return; }
    recordAiUsage();

    const userMessage: ChatMessage = { role: "user", content: question.trim() };
    const historyBeforeThisQuestion = [...messages];
    // Mark which index in slice(1) the new user message will occupy
    pendingScrollIdx.current = messages.length - 1;
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
        { role: "assistant", content: "Sorry, I couldn't get a response right now. Please try again." },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-4">

      {/* ── Guided entry point — always at the top, always visible ── */}
      <div className="rounded-2xl border border-primary/15 bg-primary/4 dark:bg-primary/6 px-4 pt-4 pb-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/70">
            Go deeper with this verse
          </span>
        </div>

        {/* Preset prompt buttons */}
        <div className="grid grid-cols-2 gap-2">
          {PRESET_PROMPTS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              data-testid={`button-preset-${label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => sendMessage(label)}
              disabled={chatMutation.isPending}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-background/70 dark:bg-slate-800/60 border border-border/50 text-sm text-foreground/75 text-left hover:bg-background hover:border-primary/30 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-primary/60" />
              <span className="leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {/* Custom question input */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              data-testid="input-verse-question"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Or ask anything about this verse…"
              className="resize-none min-h-[48px] max-h-32 bg-background dark:bg-slate-800/80 border-border/60 rounded-xl text-[14px] text-foreground pr-4 placeholder:text-muted-foreground/65 focus-visible:ring-primary/30"
              rows={1}
              disabled={chatMutation.isPending}
            />
          </div>
          <Button
            data-testid="button-ask-verse"
            size="icon"
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || chatMutation.isPending}
            className="h-[48px] w-[48px] rounded-xl flex-shrink-0 bg-primary"
          >
            {chatMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        {(() => {
          const remaining = getRemainingAi();
          if (remaining <= 2 && remaining > 0) {
            return (
              <p className="text-xs text-center -mt-1">
                <span className="text-amber-500 font-semibold">{remaining} free AI {remaining === 1 ? "response" : "responses"} left today</span>
                {" · "}
                <button onClick={() => setShowUpgrade(true)} className="text-primary underline underline-offset-2">Upgrade for unlimited</button>
              </p>
            );
          }
          return (
            <p className="text-[10px] text-muted-foreground/60 text-center -mt-1">
              Press Enter to send · Shift+Enter for new line
            </p>
          );
        })()}
      </div>

      {/* Conversation thread — accumulates below the action panel */}
      <AnimatePresence initial={false}>
        {messages.slice(1).map((msg, idx) => (
          <motion.div
            key={idx}
            ref={idx === pendingScrollIdx.current ? newMsgRef : undefined}
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
                className={`rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-white/50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-white/20 rounded-tl-sm"
                }`}
              >
                {msg.content.split("\n").map((para, i) =>
                  para.trim() ? <p key={i} className="mb-2 last:mb-0">{para}</p> : null
                )}
              </div>
              {msg.role === "assistant" && (
                <ShareButton title="Shepherd's Path Reflection" text={msg.content} showLabel={false} className="ml-1 opacity-50 hover:opacity-100" />
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mt-1">
                <User className="w-4 h-4 text-slate-500 dark:text-slate-300" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* AI typing indicator */}
      {chatMutation.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 justify-start"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="bg-white/50 dark:bg-slate-800/60 border border-white/20 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
            <span className="text-sm text-muted-foreground">Thinking...</span>
          </div>
        </motion.div>
      )}

      {/* Curated resource — surfaces only after meaningful back-and-forth */}
      {!chatMutation.isPending && (
        <ResourceSuggestionCard messages={messages} />
      )}

      <AnimatePresence>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </AnimatePresence>
    </div>
  );
}
