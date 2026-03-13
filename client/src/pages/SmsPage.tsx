import { MessageCircle, ArrowRight, BookOpen, Heart, Bell, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const logoSmall = "/logo-mark-white.png";

const EXAMPLES = [
  {
    user: "I feel anxious about tomorrow",
    reply: `"Cast all your anxiety on Him because He cares for you." — 1 Peter 5:7\n\nYou don't have to carry tomorrow alone. What's weighing on you most?`,
  },
  {
    user: "Pray",
    reply: `Here is a prayer for you today:\n\nLord, be near to this person right now. Whatever they are carrying — fear, doubt, weariness, or hope — meet them there. Remind them that You are not far off. Amen.`,
  },
  {
    user: "VERSE",
    reply: `Today's verse:\n\n"The Lord your God is in your midst, a mighty one who will save; He will rejoice over you with gladness." — Zephaniah 3:17`,
  },
];

const COMMANDS = [
  { cmd: "PRAY", desc: "Receive a personalized prayer" },
  { cmd: "VERSE", desc: "Get today's scripture" },
  { cmd: "DEVOTIONAL", desc: "Your full daily devotional reflection" },
  { cmd: "Anything on your heart", desc: "Ask a question, share a struggle — receive scripture and prayer from God's Word" },
  { cmd: "STOP", desc: "Unsubscribe from all messages immediately" },
  { cmd: "START", desc: "Re-subscribe at any time" },
];

export default function SmsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg,#5b21b6,#2e1065)" }}>
                <img src={logoSmall} className="w-6 h-6 object-contain rounded-md" alt="" />
              </div>
              <span className="font-bold text-foreground text-[15px]">Shepherd's Path</span>
            </div>
          </Link>
          <Link href="/devotional">
            <button className="text-[13px] font-medium text-primary hover:underline">
              Open the app →
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-10 pb-20">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-[12px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
            <MessageCircle className="w-3.5 h-3.5" />
            SMS Devotional Service
          </div>
          <h1 className="text-[2rem] font-black text-foreground leading-tight mb-3">
            Daily faith, right in your texts.
          </h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed max-w-lg mx-auto">
            No app. No account. Just text <strong>+1 (833) 962-9341</strong> anything on your heart — scripture, prayer, or a question — and receive a thoughtful response grounded in God's Word.
          </p>
        </div>

        {/* CTA */}
        <a
          href="sms:+18339629341&body=Pray"
          className="flex items-center justify-between w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground rounded-2xl px-6 py-4 transition-all mb-10 shadow-lg"
          data-testid="sms-cta-main"
        >
          <div>
            <p className="text-[16px] font-bold leading-tight">Text PRAY to get started</p>
            <p className="text-[12px] opacity-80 mt-0.5">+1 (833) 962-9341 · Free · No sign-up</p>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0 opacity-80" />
        </a>

        {/* Example conversations */}
        <div className="mb-10">
          <h2 className="text-[16px] font-bold text-foreground mb-4">How it works</h2>
          <div className="space-y-5">
            {EXAMPLES.map((ex, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground text-[13px] rounded-2xl rounded-br-sm px-4 py-2 max-w-[75%] leading-snug shadow-sm">
                    {ex.user}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-card border border-border text-foreground text-[13px] rounded-2xl rounded-bl-sm px-4 py-3 max-w-[88%] leading-snug whitespace-pre-line shadow-sm">
                    {ex.reply}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commands */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-[14px] font-bold text-foreground">What you can text</h2>
          </div>
          <div className="space-y-3">
            {COMMANDS.map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-start gap-3">
                <span className="text-[12px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md shrink-0 mt-0.5 font-mono">
                  {cmd}
                </span>
                <span className="text-[13px] text-muted-foreground leading-snug">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How opt-in works — consent documentation */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-8" id="consent">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-[14px] font-bold text-foreground">How you opt in</h2>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
            Shepherd's Path SMS is a <strong>keyword opt-in</strong> service. You opt in by texting any message to <strong>+1 (833) 962-9341</strong>. By doing so, you consent to receive automated SMS messages including scripture, prayers, and devotional reflections.
          </p>
          <ul className="space-y-1.5 text-[13px] text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">·</span> Message frequency varies based on your interaction</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">·</span> Message and data rates may apply</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">·</span> Text <strong>STOP</strong> at any time to unsubscribe immediately</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">·</span> Text <strong>HELP</strong> for assistance</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">·</span> Text <strong>START</strong> to re-subscribe after opting out</li>
          </ul>
        </div>

        {/* Daily subscription */}
        <div className="rounded-2xl border border-amber-200/60 dark:border-amber-700/40 p-5 mb-8" style={{ background: "linear-gradient(135deg, hsl(38 96% 97%) 0%, hsl(43 100% 94%) 100%)" }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-amber-900 mb-1">Get a devotional every morning</p>
              <p className="text-[13px] text-amber-800/80 leading-relaxed mb-3">
                Text <strong>DAILY</strong> to subscribe to a morning devotional sent automatically each day — scripture, reflection, and a prayer to start your morning.
              </p>
              <a
                href="sms:+18339629341&body=DAILY"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
                data-testid="sms-daily-subscribe"
              >
                Text DAILY → <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Prayer network */}
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 mb-10">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground mb-1">Join the prayer chain</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
                Text <strong>JOIN PRAYER</strong> to receive prayer requests from others and stand with them. When someone shares a need, you'll get a text and can reply AMEN-[number] to add your prayer.
              </p>
              <a
                href="sms:+18339629341&body=JOIN PRAYER"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors"
                data-testid="sms-join-prayer"
              >
                Text JOIN PRAYER → <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed">
          Shepherd's Path · support@shepherdspathai.com<br />
          Standard messaging rates apply. Text STOP to unsubscribe. Text HELP for help.<br />
          <a href="https://shepherdspathai.com/sms#consent" className="underline hover:text-muted-foreground">Opt-in terms</a>
        </p>
      </div>
    </div>
  );
}
