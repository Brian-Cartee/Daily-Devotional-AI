import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle, Loader2, X, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionId } from "@/lib/session";

const EMAIL_SUBSCRIBED_KEY = "sp-email-subscribed";

export function isEmailSubscribed(): boolean {
  try {
    return localStorage.getItem(EMAIL_SUBSCRIBED_KEY) === "true";
  } catch {
    return false;
  }
}

function markEmailSubscribed() {
  try {
    localStorage.setItem(EMAIL_SUBSCRIBED_KEY, "true");
  } catch {}
}

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
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, sessionId: getSessionId() }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok || res.status === 200) {
        setStatus("success");
        setMessage(data.message || "You're subscribed!");
        markEmailSubscribed();
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

export function InlineEmailSignup() {
  const [alreadySubscribed] = useState(() => isEmailSubscribed());
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
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, sessionId: getSessionId() }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok || res.status === 200) {
        setStatus("success");
        setMessage(data.message || "You're subscribed!");
        markEmailSubscribed();
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not subscribe. Please check your connection.");
    }
  };

  if (alreadySubscribed || status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-4 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground leading-tight">You're receiving daily Scripture by email</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">Each morning, a verse delivered to your inbox.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl border border-primary/20 bg-primary/4 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400" />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground leading-tight">Get today's verse by email</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">A scripture delivered to your inbox each morning — free.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            data-testid="input-inline-subscribe-name"
            type="text"
            placeholder="Your first name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm rounded-xl bg-background"
            disabled={status === "loading"}
          />
          <Input
            data-testid="input-inline-subscribe-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="text-sm rounded-xl bg-background"
            disabled={status === "loading"}
          />
          {status === "error" && (
            <p className="text-xs text-destructive">{message}</p>
          )}
          <Button
            data-testid="button-inline-subscribe-submit"
            type="submit"
            disabled={!email.trim() || status === "loading"}
            className="w-full rounded-xl font-semibold text-sm"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Subscribe — it's free
              </>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}

// ─── Combined Email + SMS Toggle ─────────────────────────────────────────────

export function InlineSubscribeToggle() {
  const [tab, setTab] = useState<"email" | "sms">("email");

  const [emailSubscribed, setEmailSubscribed] = useState(() => isEmailSubscribed());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<Status>("idle");
  const [emailMsg, setEmailMsg] = useState("");

  const [smsSubscribed, setSmsSubscribed] = useState(() => isSmsSubscribed());
  const [phone, setPhone] = useState("");
  const [smsStatus, setSmsStatus] = useState<Status>("idle");
  const [smsMsg, setSmsMsg] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (res.ok || res.status === 409) {
        setEmailStatus("success");
        setEmailMsg(data.message || "You're subscribed!");
        markEmailSubscribed();
        setEmailSubscribed(true);
      } else {
        setEmailStatus("error");
        setEmailMsg(data.message || "Something went wrong.");
      }
    } catch {
      setEmailStatus("error");
      setEmailMsg("Could not subscribe. Please check your connection.");
    }
  };

  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setSmsStatus("loading");
    try {
      const res = await fetch("/api/sms/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        setSmsStatus("success");
        setSmsMsg(data.message || "You're signed up!");
        markSmsSubscribed();
        setSmsSubscribed(true);
      } else {
        setSmsStatus("error");
        setSmsMsg(data.message || "Something went wrong.");
      }
    } catch {
      setSmsStatus("error");
      setSmsMsg("Could not subscribe. Please check your connection.");
    }
  };

  if (emailSubscribed && smsSubscribed) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-4 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground leading-tight">You're all set — by email and text</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">Daily Scripture coming to your inbox and phone each morning.</p>
        </div>
      </motion.div>
    );
  }

  const thisTabDone = (tab === "email" && emailSubscribed) || (tab === "sms" && smsSubscribed);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="relative rounded-2xl border border-primary/20 bg-primary/4 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400" />
      <div className="px-5 pt-6 pb-6">
        <div className="mb-4">
          <p className="text-[14px] font-bold text-foreground leading-tight">Receive the daily verse</p>
          <p className="text-[12px] text-muted-foreground mt-1">A quiet reminder each morning.</p>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl mb-3">
          <button
            data-testid="toggle-email-tab"
            onClick={() => setTab("email")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              tab === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="w-3 h-3" />
            Email
            {emailSubscribed && <Check className="w-3 h-3 text-green-500" />}
          </button>
          <button
            data-testid="toggle-sms-tab"
            onClick={() => setTab("sms")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              tab === "sms" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="w-3 h-3" />
            Text
            {smsSubscribed && <Check className="w-3 h-3 text-green-500" />}
          </button>
        </div>

        {thisTabDone ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 bg-green-500/10 rounded-xl px-3 py-2.5"
          >
            <Check className="w-4 h-4 text-green-600 shrink-0" strokeWidth={2.5} />
            <p className="text-[12px] font-semibold text-foreground">
              {tab === "email" ? "You're receiving daily Scripture by email" : "You're receiving daily Scripture by text"}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === "email" ? (
              <motion.form key="email" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.15 }}
                onSubmit={handleEmailSubmit} className="space-y-3"
              >
                <Input data-testid="input-toggle-name" type="text" placeholder="Your first name (optional)" value={name} onChange={e => setName(e.target.value)} className="text-sm rounded-xl bg-background" disabled={emailStatus === "loading"} />
                <Input data-testid="input-toggle-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="text-sm rounded-xl bg-background" disabled={emailStatus === "loading"} />
                {emailStatus === "error" && <p className="text-xs text-destructive">{emailMsg}</p>}
                <Button data-testid="button-toggle-email-submit" type="submit" disabled={!email.trim() || emailStatus === "loading"} className="w-full rounded-xl font-semibold text-sm">
                  {emailStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-3.5 h-3.5 mr-1.5" />Send it to me</>}
                </Button>
              </motion.form>
            ) : (
              <motion.form key="sms" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
                onSubmit={handleSmsSubmit} className="space-y-3"
              >
                <Input data-testid="input-toggle-phone" type="tel" placeholder="(555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} required className="text-sm rounded-xl bg-background" disabled={smsStatus === "loading"} />
                {smsStatus === "error" && <p className="text-xs text-destructive">{smsMsg}</p>}
                <Button data-testid="button-toggle-sms-submit" type="submit" disabled={!phone.trim() || smsStatus === "loading"} className="w-full rounded-xl font-semibold text-sm">
                  {smsStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageCircle className="w-3.5 h-3.5 mr-1.5" />Sign me up — it's free</>}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">US numbers only. Reply STOP any time to unsubscribe.</p>
              </motion.form>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─── SMS Signup ───────────────────────────────────────────────────────────────

const SMS_SUBSCRIBED_KEY = "sp-sms-subscribed";

export function isSmsSubscribed(): boolean {
  try {
    return localStorage.getItem(SMS_SUBSCRIBED_KEY) === "true";
  } catch {
    return false;
  }
}

function markSmsSubscribed() {
  try {
    localStorage.setItem(SMS_SUBSCRIBED_KEY, "true");
  } catch {}
}

export function InlineSmsSignup() {
  const [alreadySubscribed] = useState(() => isSmsSubscribed());
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/sms/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        setStatus("success");
        setMessage(data.message || "You're signed up!");
        markSmsSubscribed();
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not subscribe. Please check your connection.");
    }
  };

  if (alreadySubscribed || status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-4 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground leading-tight">You're receiving daily Scripture by text</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">Each morning, a verse and reflection sent to your phone.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl border border-primary/20 bg-primary/4 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400" />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground leading-tight">Get today's verse by text</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">A morning devotional sent to your phone — free, no app required.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            data-testid="input-sms-subscribe-phone"
            type="tel"
            placeholder="(555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="text-sm rounded-xl bg-background"
            disabled={status === "loading"}
          />
          {status === "error" && (
            <p className="text-xs text-destructive">{message}</p>
          )}
          <Button
            data-testid="button-sms-subscribe-submit"
            type="submit"
            disabled={!phone.trim() || status === "loading"}
            className="w-full rounded-xl font-semibold text-sm"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                Sign me up — it's free
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            US numbers only. Reply STOP any time to unsubscribe.
          </p>
        </form>
      </div>
    </motion.div>
  );
}
