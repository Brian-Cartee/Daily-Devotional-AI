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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 1) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || chatMutation.isPending) return;
    if (!canUseAi()) { setShowUpgrade(true); return; }
    recordAiUsage();

    const userMessage: ChatMessage = { role: "user", content: question.trim() };
    const historyBeforeThisQuestion = [...messages];
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

      {/* Chat header — source + capability summary */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-primary/5 border border-primary/15">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground leading-tight">AI Bible Scholar</p>
            <p className="text-[10px] text-muted-foreground">AI-guided reflection</p>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/60 hidden sm:block text-right leading-tight max-w-[140px]">
          Ask about history, meaning,<br />cross-refs & life application
        </span>
      </div>

      {/* Conversation thread — skip first message (it's the reflection card above) */}
      <AnimatePresence initial={false}>
        {messages.slice(1).map((msg, idx) => (
          <motion.div
            key={idx}
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

      <div ref={bottomRef} />

      {/* Divider with label */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
          Explore further
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Preset prompt buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PRESET_PROMPTS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            data-testid={`button-preset-${label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => sendMessage(label)}
            disabled={chatMutation.isPending}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/40 text-sm text-slate-600 dark:text-slate-300 text-left hover-elevate disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Icon className="w-4 h-4 flex-shrink-0 text-primary/70" />
            <span className="leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* Custom question input */}
      <div className="flex gap-2 items-end mt-1">
        <div className="flex-1 relative">
          <Textarea
            ref={inputRef}
            data-testid="input-verse-question"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this verse..."
            className="resize-none min-h-[52px] max-h-32 bg-white/60 dark:bg-slate-800/60 border-white/30 dark:border-slate-700/40 rounded-xl text-sm pr-4 focus-visible:ring-primary/30"
            rows={1}
            disabled={chatMutation.isPending}
          />
        </div>
        <Button
          data-testid="button-ask-verse"
          size="icon"
          onClick={() => sendMessage(inputValue)}
          disabled={!inputValue.trim() || chatMutation.isPending}
          className="h-[52px] w-[52px] rounded-xl flex-shrink-0 bg-primary"
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
        return remaining <= 3 ? (
          <p className="text-xs text-center -mt-1">
            <span className="text-amber-500 font-semibold">{remaining} free AI {remaining === 1 ? "response" : "responses"} left today</span>
            {" · "}
            <button onClick={() => setShowUpgrade(true)} className="text-primary underline underline-offset-2">Upgrade for unlimited</button>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground text-center -mt-1">
            Press Enter to send · Shift+Enter for new line
          </p>
        );
      })()}

      <AnimatePresence>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </AnimatePresence>
    </div>
  );
}
