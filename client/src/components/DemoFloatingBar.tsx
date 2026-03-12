import { useState } from "react";
import { X, Palette, Sparkles, Check, Copy, ChevronUp, ChevronDown } from "lucide-react";
import { useDemoMode } from "@/components/DemoProvider";
import { COLOR_PRESETS, buildDemoUrl } from "@/lib/demo";

export function DemoFloatingBar() {
  const demo = useDemoMode();
  const [panelOpen, setPanelOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [copied, setCopied] = useState(false);

  if (!demo?.config.isDemo) return null;

  const { config, update, exit } = demo;

  const handleNameBlur = () => {
    if (nameInput.trim()) update({ churchName: nameInput.trim() });
  };

  const handleCopyLink = () => {
    const url = buildDemoUrl(config.churchName, config.colorHex);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGetStarted = () => {
    const subject = encodeURIComponent(`Shepherd's Path — Demo for ${config.churchName}`);
    const body = encodeURIComponent(
      `We're interested in bringing Shepherd's Path to ${config.churchName}. We've been exploring the demo and love what we see.\n\nPlease reach out to discuss next steps.`
    );
    window.open(`mailto:partnerships@shepherdspathai.com?subject=${subject}&body=${body}`);
  };

  return (
    <>
      {/* Slide-up customization panel */}
      {panelOpen && (
        <div className="fixed bottom-[60px] left-0 right-0 z-50 px-4 pb-2">
          <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-foreground">Customize Your Demo</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Changes apply live — share the link when ready</p>
              </div>
              <button onClick={() => setPanelOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Church name */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Church Name</label>
                <input
                  type="text"
                  defaultValue={config.churchName}
                  onChange={e => setNameInput(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={e => e.key === "Enter" && handleNameBlur()}
                  placeholder="Grace Community Church"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="demo-church-name-input"
                />
              </div>

              {/* Color presets */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Brand Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.hex}
                      onClick={() => update({ colorHex: preset.hex, colorHsl: preset.hsl, colorName: preset.name })}
                      className="flex flex-col items-center gap-1 group"
                      data-testid={`demo-color-${preset.name.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center"
                        style={{
                          backgroundColor: preset.hex,
                          borderColor: config.colorHex === preset.hex ? "#f59e0b" : "transparent",
                          boxShadow: config.colorHex === preset.hex ? "0 0 0 3px rgba(245,158,11,0.3)" : undefined,
                        }}
                      >
                        {config.colorHex === preset.hex && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-[12px] font-semibold text-foreground hover:bg-muted transition-colors"
                  data-testid="demo-copy-link"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
                </button>
                <button
                  onClick={handleGetStarted}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold text-white transition-colors"
                  style={{ backgroundColor: config.colorHex }}
                  data-testid="demo-get-started"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
        <div className="max-w-md mx-auto mb-3">
          <div
            className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl shadow-xl border border-white/10"
            style={{ backgroundColor: config.colorHex }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Palette className="w-4 h-4 text-white/80 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider leading-none mb-0.5">Live Demo</p>
                <p className="text-[12px] font-bold text-white leading-none truncate">{config.churchName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setPanelOpen(prev => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white text-[11px] font-semibold"
                data-testid="demo-customize-btn"
              >
                Customize {panelOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
              <button
                onClick={handleGetStarted}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-[11px] font-bold transition-colors"
                style={{ color: config.colorHex }}
                data-testid="demo-claim-btn"
              >
                Claim This →
              </button>
              <button
                onClick={exit}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                data-testid="demo-exit-btn"
              >
                <X className="w-3 h-3 text-white/70" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
