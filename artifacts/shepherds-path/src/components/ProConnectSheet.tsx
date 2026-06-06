import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectIdentity, dismissIdentityConnect } from "@/lib/identity";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
};

export function ProConnectSheet({ open, onClose, onConnected }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [dailyEmail, setDailyEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const result = await connectIdentity({
      email,
      socialHandle,
      source: "pro-connect-sheet",
      subscribeDaily: dailyEmail,
    });
    setLoading(false);
    if (!result.connected) {
      setError(result.message || "Could not save your email.");
      return;
    }
    toast({
      title: "You're connected",
      description: "We'll use this email for Pro restore and community updates.",
    });
    onConnected?.();
    onClose();
  };

  const handleSkip = () => {
    dismissIdentityConnect();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
          data-testid="pro-connect-sheet"
          onClick={handleSkip}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border bg-background shadow-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-br from-primary via-primary/90 to-amber-500/80 px-6 pt-6 pb-8 text-center">
              <button
                type="button"
                onClick={handleSkip}
                aria-label="Close"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white/85 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Save your Pro — stay connected
              </h2>
              <p className="text-white/85 text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                Add your email so we can restore Pro on a new phone, send your Weekly Spiritual Weather, and keep you in the Shepherd&apos;s Path community.
                No password. Unsubscribe anytime.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
              <div>
                <label htmlFor="pro-connect-email" className="sr-only">
                  Email
                </label>
                <Input
                  id="pro-connect-email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  data-testid="input-pro-connect-email"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label htmlFor="pro-connect-social" className="text-[11px] font-semibold text-muted-foreground">
                  Instagram or TikTok @ (optional)
                </label>
                <Input
                  id="pro-connect-social"
                  type="text"
                  placeholder="@yourhandle"
                  value={socialHandle}
                  onChange={(e) => setSocialHandle(e.target.value)}
                  disabled={loading}
                  data-testid="input-pro-connect-social"
                  className="rounded-xl mt-1"
                />
                <p className="text-[10px] text-muted-foreground/80 mt-1 leading-snug">
                  Helps us recognize supporters from social — never shown publicly unless you ask us to.
                </p>
              </div>

              <label className="flex items-start gap-2.5 text-[12px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={dailyEmail}
                  onChange={(e) => setDailyEmail(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 rounded border-border"
                  data-testid="checkbox-pro-connect-daily"
                />
                <span>Also send me daily Scripture by email (free)</span>
              </label>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                data-testid="btn-pro-connect-save"
                className="w-full rounded-2xl py-5 font-bold bg-gradient-to-r from-primary to-amber-500 border-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" /> Save my email
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                data-testid="btn-pro-connect-skip"
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
              >
                Not now
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
