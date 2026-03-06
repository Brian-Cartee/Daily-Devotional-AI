import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "idle" | "loading" | "success" | "error";

export function EmailSubscribe() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

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

  return (
    <div ref={panelRef} className="fixed top-4 right-4 z-50">
      {/* Trigger button */}
      <button
        data-testid="button-subscribe-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Subscribe to daily verse emails"
        className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/30 dark:border-slate-600/40 shadow-md rounded-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:shadow-lg transition-shadow"
      >
        <Mail className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline">Daily email</span>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute top-12 right-0 w-80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/30 dark:border-slate-600/40 shadow-xl rounded-2xl p-5"
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {status === "success" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 py-2 text-center"
              >
                <CheckCircle className="w-8 h-8 text-green-500" />
                <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
              </motion.div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                    Get today's verse by email
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Delivered to your inbox each morning
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-2.5">
                  <Input
                    data-testid="input-subscribe-name"
                    type="text"
                    placeholder="Your first name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/60 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 rounded-xl text-sm"
                    disabled={status === "loading"}
                  />
                  <Input
                    data-testid="input-subscribe-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/60 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 rounded-xl text-sm"
                    disabled={status === "loading"}
                  />
                  {status === "error" && (
                    <p className="text-xs text-destructive">{message}</p>
                  )}
                  <Button
                    data-testid="button-subscribe-submit"
                    type="submit"
                    disabled={!email.trim() || status === "loading"}
                    className="w-full rounded-xl"
                  >
                    {status === "loading" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
