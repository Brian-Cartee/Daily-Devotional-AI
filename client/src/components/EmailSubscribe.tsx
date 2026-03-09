import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "idle" | "loading" | "success" | "error";

export function EmailSubscribePanel({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

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
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="fixed top-14 right-2 w-80 max-w-[calc(100vw-1rem)] bg-card/95 backdrop-blur-xl border border-border shadow-xl rounded-2xl p-5 z-50"
    >
      <button
        onClick={onClose}
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
          <p className="text-sm text-foreground font-medium">{message}</p>
        </motion.div>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="font-bold text-foreground text-sm tracking-tight">
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
              className="text-sm rounded-xl"
              disabled={status === "loading"}
            />
            <Input
              data-testid="input-subscribe-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-sm rounded-xl"
              disabled={status === "loading"}
            />
            {status === "error" && (
              <p className="text-xs text-destructive">{message}</p>
            )}
            <Button
              data-testid="button-subscribe-submit"
              type="submit"
              disabled={!email.trim() || status === "loading"}
              className="w-full rounded-xl font-semibold"
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
  );
}
