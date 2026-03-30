import { useState } from "react";
import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { MessageCircle, CheckCircle, ChevronDown, ChevronUp, Send, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FAQ = [
  {
    q: "How do I upgrade to PRO?",
    a: "Tap the crown icon or visit the Pricing page inside the app. Choose monthly ($5.99) or annual ($44.99). You'll get instant access after checkout.",
  },
  {
    q: "I have a discount code — where do I enter it?",
    a: "On the checkout screen, look for 'Add promotion code' and enter your code there. The discount will apply before your card is charged.",
  },
  {
    q: "I was charged but still don't have PRO access.",
    a: "This is rare but can happen if there was a delay in processing. Please send us a message below with your email and we'll resolve it within 1 business day.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can cancel anytime through your device's subscription settings (iOS: Settings → Apple ID → Subscriptions; Android: Play Store → Subscriptions) or by contacting us below.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your journal entries and prayer requests are private and stored securely. We do not sell or share personal data. See our Privacy Policy for full details.",
  },
  {
    q: "What Bible translations does the app use?",
    a: "The app uses the King James Version (KJV) in English, Reina-Valera 1960 in Spanish, and World English Bible (WEB) for French and Portuguese.",
  },
  {
    q: "Can I use the app in Spanish or other languages?",
    a: "Yes — tap the globe icon in the top navigation bar to switch between English, Spanish, French, and Portuguese. The AI guidance and devotionals will respond in your chosen language.",
  },
  {
    q: "How do I request a refund?",
    a: "Refunds are handled through Apple or Google depending on how you subscribed. You can also contact us below and we'll do our best to help.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-xl border border-border/60 bg-card px-4 py-3.5 transition-colors hover:bg-muted/40"
      data-testid={`faq-item-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-foreground leading-snug">{q}</p>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>
      {open && (
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2 text-left">{a}</p>
      )}
    </button>
  );
}

export default function SupportPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = name.trim() && email.trim().includes("@") && message.trim().length >= 10 && !sending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSending(true);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setSent(true);
    } catch {
      toast({ title: "Something went wrong", description: "Please try again or email us directly at support@shepherdspathai.com", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  });

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-20 pb-28">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-foreground">Support</h1>
          </div>
          <p className="text-[14px] text-muted-foreground leading-relaxed mt-1 pl-[52px]">
            We're here to help. Check the FAQ below — most questions are answered there. If not, send us a message and we'll get back to you within 1 business day.
          </p>
        </motion.div>

        {/* FAQ */}
        <motion.div {...fadeUp(0.05)} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 shrink-0">Frequently asked</p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border/60 to-transparent" />
          </div>
          <div className="space-y-2">
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </motion.div>

        {/* Contact form */}
        <motion.div {...fadeUp(0.1)}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 shrink-0">Still need help?</p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border/60 to-transparent" />
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-green-200/60 dark:border-green-800/40 bg-green-50/60 dark:bg-green-950/20 p-6 text-center"
            >
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <p className="text-[16px] font-bold text-foreground mb-1">Message received</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                We've sent a confirmation to <span className="font-semibold text-foreground">{email}</span>. We'll get back to you within 1 business day.
              </p>
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-foreground/70 mb-1 block">Your name</label>
                  <input
                    data-testid="input-support-name"
                    type="text"
                    spellCheck={false}
                    autoCapitalize="words"
                    autoCorrect="off"
                    autoComplete="given-name"
                    enterKeyHint="next"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="First name"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-foreground/70 mb-1 block">Your email</label>
                  <input
                    data-testid="input-support-email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="email"
                    enterKeyHint="next"
                    spellCheck={false}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-foreground/70 mb-1 block">Subject <span className="font-normal text-muted-foreground/60">(optional)</span></label>
                <input
                  data-testid="input-support-subject"
                  type="text"
                  spellCheck
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  enterKeyHint="next"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Briefly describe your question"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-foreground/70 mb-1 block">Message</label>
                <textarea
                  data-testid="input-support-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  spellCheck
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  rows={5}
                  placeholder="Tell us what's going on and we'll do our best to help..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <Button
                data-testid="btn-support-submit"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full rounded-2xl py-5 text-[15px] font-bold bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-white shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {sending ? "Sending…" : "Send message"}
              </Button>

              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Mail className="w-3.5 h-3.5 text-muted-foreground/50" />
                <p className="text-[12px] text-muted-foreground/60">
                  Or email us directly at{" "}
                  <a href="mailto:support@shepherdspathai.com" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    support@shepherdspathai.com
                  </a>
                </p>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
