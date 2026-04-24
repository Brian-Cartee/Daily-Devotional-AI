import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Copy, Check, Mail, ExternalLink, Sparkles } from "lucide-react";
import { COLOR_PRESETS, buildDemoUrl, buildDemoEmailBody } from "@/lib/demo";

export default function DemoCreate() {
  const [churchName, setChurchName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  const demoUrl = churchName.trim()
    ? buildDemoUrl(churchName.trim(), selectedColor.hex)
    : "";

  const handleCopy = () => {
    if (!demoUrl) return;
    navigator.clipboard.writeText(demoUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleEmail = () => {
    if (!demoUrl || !churchName.trim()) return;
    const subject = encodeURIComponent(`A personalized demo of Shepherd's Path — for ${churchName.trim()}`);
    const body = encodeURIComponent(buildDemoEmailBody(churchName.trim(), demoUrl));
    const to = recipientEmail.trim() ? encodeURIComponent(recipientEmail.trim()) : "";
    window.open(`mailto:${to}?subject=${subject}&body=${body}`);
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  const handlePreview = () => {
    if (demoUrl) window.open(demoUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-5 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        </Link>
        <div>
          <h1 className="text-[15px] font-bold text-foreground leading-tight">Create Church Demo</h1>
          <p className="text-[11px] text-muted-foreground">Generate a personalized live preview link</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-8 space-y-8">

        {/* Intro */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-foreground mb-1">The Shopify for Faith Apps</h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Send a church a personalized demo link. They open it and see Shepherd's Path already wearing their name and colors — live, no commitment. The customization <em>is</em> the pitch.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Church name */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">1</span>
            </div>
            <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">Church Name</h3>
          </div>
          <input
            type="text"
            spellCheck
            value={churchName}
            onChange={e => setChurchName(e.target.value)}
            placeholder="e.g. Grace Community Church"
            className="w-full text-[15px] px-4 py-3 rounded-xl border border-border bg-[#faf5ea] dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
            data-testid="create-church-name"
          />
        </div>

        {/* Step 2: Brand color */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">2</span>
            </div>
            <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">Brand Color</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {COLOR_PRESETS.map(preset => (
              <button
                key={preset.hex}
                onClick={() => setSelectedColor(preset)}
                className="flex flex-col items-center gap-1.5 group"
                data-testid={`color-preset-${preset.name.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <div
                  className="w-14 h-14 rounded-2xl border-[3px] transition-all flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: preset.hex,
                    borderColor: selectedColor.hex === preset.hex ? "#f59e0b" : "transparent",
                    boxShadow: selectedColor.hex === preset.hex
                      ? `0 0 0 3px rgba(245,158,11,0.3), 0 4px 12px ${preset.hex}60`
                      : undefined,
                  }}
                >
                  {selectedColor.hex === preset.hex && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Recipient email (optional) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">3</span>
            </div>
            <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">Recipient Email <span className="font-normal text-muted-foreground normal-case tracking-normal">(optional)</span></h3>
          </div>
          <input
            type="email"
            value={recipientEmail}
            onChange={e => setRecipientEmail(e.target.value)}
            placeholder="pastor@gracecommunity.org"
            className="w-full text-[15px] px-4 py-3 rounded-xl border border-border bg-[#faf5ea] dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
            data-testid="create-recipient-email"
          />
        </div>

        {/* Generated URL preview */}
        {demoUrl && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60 mb-2">Your demo link</p>
            <p className="text-[12px] text-foreground font-mono break-all leading-relaxed">{demoUrl}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className={`space-y-3 ${!churchName.trim() ? "opacity-50 pointer-events-none" : ""}`}>
          <button
            onClick={handlePreview}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-border text-[14px] font-semibold text-foreground hover:bg-muted transition-colors"
            data-testid="demo-preview-btn"
          >
            <ExternalLink className="w-4 h-4" />
            Preview Demo
          </button>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-border text-[14px] font-semibold text-foreground hover:bg-muted transition-colors"
            data-testid="demo-copy-btn"
          >
            {copied
              ? <><Check className="w-4 h-4 text-green-500" /> Link Copied!</>
              : <><Copy className="w-4 h-4" /> Copy Demo Link</>}
          </button>

          <button
            onClick={handleEmail}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-[14px] font-bold transition-all hover:opacity-90"
            style={{ backgroundColor: selectedColor.hex }}
            data-testid="demo-email-btn"
          >
            {emailSent
              ? <><Check className="w-4 h-4" /> Email Draft Opened!</>
              : <><Mail className="w-4 h-4" /> Send via Email</>}
          </button>
        </div>

        {/* How it works */}
        <div className="border-t border-border pt-6">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-4">How it works</h3>
          <div className="space-y-3">
            {[
              ["1", "Enter the church name and choose their brand color above."],
              ["2", "Copy the link or send it directly via email — a professional draft is pre-written for you."],
              ["3", "The church opens the link and sees Shepherd's Path already wearing their identity — live and interactive."],
              ["4", "They hit \u201cClaim This\u201d and land in your inbox ready to sign up."],
            ].map(([n, text]) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{n}</div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
