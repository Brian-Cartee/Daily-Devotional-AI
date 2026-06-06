import { useState, useEffect, type ReactNode } from "react";
import { useEmailSubscriptionStatus, getKnownDeviceEmail } from "@/hooks/use-email-subscription";
import { subscribeWithIdentity } from "@/lib/identity";
import { getRelationshipAge } from "@/lib/relationship";
import { motion } from "framer-motion";
import { Mail, CheckCircle, Loader2, X, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionId } from "@/lib/session";
import {
  getStoredSubscriberEmail,
  isEmailSubscribedLocally,
  persistSubscriberState,
} from "@/lib/subscriberState";

export function isEmailSubscribed(): boolean {
  return isEmailSubscribedLocally();
}

export function getSubscribedEmail(): string | null {
  return getStoredSubscriberEmail();
}

export function markEmailSubscribed(email?: string) {
  if (email?.trim()) {
    persistSubscriberState(email);
    return;
  }
  try {
    localStorage.setItem("sp-email-subscribed", "true");
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
        markEmailSubscribed(email.trim());
      } else {
        setStatus("error");
        setMessage(data.message || "We can try that again.");
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

function SubscribedEmailSuccess({
  title,
  detail,
  variant = "compact",
}: {
  title: string;
  detail: string;
  variant?: "compact" | "footer";
}) {
  const subscribedEmail = getSubscribedEmail();
  const isFooter = variant === "footer";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative rounded-2xl border border-green-500/20 bg-green-500/5 flex gap-3 ${
        isFooter
          ? "border-green-500/25 bg-green-500/8 px-5 sm:px-6 py-5 items-start sm:items-center gap-4"
          : "px-5 py-4 items-center"
      }`}
    >
      <div
        className={`rounded-full bg-green-500/15 flex items-center justify-center shrink-0 ${
          isFooter ? "w-10 h-10 sm:w-11 sm:h-11" : "w-8 h-8"
        }`}
      >
        <Check
          className={`text-green-600 dark:text-green-400 ${isFooter ? "w-5 h-5" : "w-4 h-4"}`}
          strokeWidth={2.5}
        />
      </div>
      <div className="min-w-0">
        <p
          className={`font-semibold text-foreground leading-snug ${
            isFooter ? "text-[15px] sm:text-base" : "text-[13px] leading-tight"
          }`}
        >
          {title}
        </p>
        <p
          className={`text-muted-foreground ${isFooter ? "text-[14px] sm:text-[15px] mt-1 leading-relaxed" : "text-[12px] mt-0.5"}`}
        >
          {detail}
        </p>
        {subscribedEmail && (
          <p className="text-[12px] text-muted-foreground/90 mt-1 truncate">{subscribedEmail}</p>
        )}
      </div>
    </motion.div>
  );
}

export function InlineEmailSignup() {
  const [alreadySubscribed] = useState(() => isEmailSubscribed());
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    const result = await subscribeWithIdentity({
      email,
      name,
      socialHandle,
      source: "inline-email-signup",
    });
    if (result.ok) {
      setStatus("success");
      setMessage(result.message);
    } else {
      setStatus("error");
      setMessage(result.message);
    }
  };

  if (alreadySubscribed || status === "success") {
    return (
      <SubscribedEmailSuccess
        title="You're receiving daily Scripture by email"
        detail="Each morning, a verse delivered to your inbox."
      />
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
            <p className="text-[11px] text-muted-foreground mt-0.5">One email, no account — daily Scripture, free.</p>
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
          <Input
            data-testid="input-inline-subscribe-social"
            type="text"
            placeholder="Instagram or TikTok @ (optional)"
            value={socialHandle}
            onChange={(e) => setSocialHandle(e.target.value)}
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

// ─── Email Subscribe (SMS tab hidden until carrier registration is complete) ──

export function InlineSubscribeToggle() {
  const { subscribed: serverSubscribed, hydrated } = useEmailSubscriptionStatus();
  const [emailSubscribed, setEmailSubscribed] = useState(() => isEmailSubscribed());
  const isSubscribed = emailSubscribed || serverSubscribed;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<Status>("idle");
  const [emailMsg, setEmailMsg] = useState("");

  useEffect(() => {
    if (!hydrated || isSubscribed || email.trim()) return;
    const known = getKnownDeviceEmail();
    if (known) setEmail(known);
  }, [hydrated, isSubscribed, email]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailStatus("loading");
    const result = await subscribeWithIdentity({
      email,
      name,
      source: "home-footer",
    });
    if (result.ok) {
      markEmailSubscribed(email.trim());
      setEmailStatus("success");
      setEmailMsg(result.message);
      setEmailSubscribed(true);
    } else {
      setEmailStatus("error");
      setEmailMsg(result.message);
    }
  };

  if (isSubscribed) {
    return (
      <SubscribedEmailSuccess
        variant="footer"
        title="You're receiving daily Scripture by email"
        detail="A quiet word each morning — straight to your inbox."
      />
    );
  }

  if (!hydrated) {
    return (
      <div
        className="rounded-2xl border border-border/40 bg-card/30 h-[200px] animate-pulse"
        aria-hidden="true"
        data-testid="home-footer-email-subscribe-loading"
      />
    );
  }

  if (getRelationshipAge() >= 7 && !getStoredSubscriberEmail()) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl border border-primary/20 bg-primary/4 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400" />
      <div className="px-5 sm:px-6 pt-6 pb-6 sm:pb-7">
        <div className="mb-5">
          <p className="text-[16px] sm:text-[17px] font-bold text-foreground leading-snug">
            Daily Scripture by email
          </p>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground mt-1.5 leading-relaxed">
            Enter your email below. New signups and existing subscribers use the same step — we&apos;ll
            connect this device without a duplicate list entry.
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          <Input
            data-testid="input-toggle-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="text-base sm:text-[15px] h-12 rounded-xl bg-background"
            disabled={emailStatus === "loading"}
          />
          <Input
            data-testid="input-toggle-name"
            type="text"
            placeholder="Your first name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            className="text-base sm:text-[15px] h-12 rounded-xl bg-background"
            disabled={emailStatus === "loading"}
          />
          {emailStatus === "error" && <p className="text-sm text-destructive">{emailMsg}</p>}
          <Button
            data-testid="button-toggle-email-submit"
            type="submit"
            disabled={!email.trim() || emailStatus === "loading"}
            className="w-full min-h-[48px] rounded-xl font-semibold text-[15px]"
          >
            {emailStatus === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Mail className="w-4 h-4 mr-1.5" />
                Continue
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground/80 text-center leading-snug">
            We never sell your email. Unsubscribe in one click.
          </p>
        </form>
      </div>
    </motion.div>
  );
}

/** Home footer — success only. Signup lives in Settings / nav menu, not Home. */
export function HomeFooterEmailSubscribeSection({
  anchorId,
  className,
  children,
}: {
  anchorId: string;
  className?: string;
  children?: ReactNode;
}) {
  const { subscribed, hydrated } = useEmailSubscriptionStatus();

  if (!hydrated || !subscribed) {
    return null;
  }

  return (
    <div id={anchorId} className={className} data-testid="home-footer-email-subscribe">
      {children}
      <SubscribedEmailSuccess
        variant="footer"
        title="You're receiving daily Scripture by email"
        detail="A quiet word each morning — straight to your inbox."
      />
    </div>
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
        setMessage(data.message || "We can try that again.");
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
