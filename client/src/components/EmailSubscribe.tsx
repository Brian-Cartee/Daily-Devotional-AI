import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "idle" | "loading" | "success" | "error";

export function EmailSubscribe() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok || res.status === 200) {
        setStatus("success");
        setMessage(data.message || "You're subscribed!");
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not subscribe. Please check your connection.");
    }
  };

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 bg-white/50 dark:bg-slate-800/50 border border-white/30 rounded-2xl px-5 py-4"
      >
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      </motion.div>
    );
  }

  return (
    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
      <button
        data-testid="button-subscribe-toggle"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover-elevate"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Get today's verse by email
          </p>
          <p className="text-xs text-muted-foreground">
            Delivered to your inbox each morning
          </p>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground text-xs"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
              <Input
                data-testid="input-subscribe-name"
                type="text"
                placeholder="Your first name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/60 dark:bg-slate-700/60 border-white/30 rounded-xl text-sm"
                disabled={status === "loading"}
              />
              <div className="flex gap-2">
                <Input
                  data-testid="input-subscribe-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-white/60 dark:bg-slate-700/60 border-white/30 rounded-xl text-sm"
                  disabled={status === "loading"}
                />
                <Button
                  data-testid="button-subscribe-submit"
                  type="submit"
                  disabled={!email.trim() || status === "loading"}
                  className="rounded-xl px-4 flex-shrink-0"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </div>
              {status === "error" && (
                <p className="text-xs text-destructive">{message}</p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
