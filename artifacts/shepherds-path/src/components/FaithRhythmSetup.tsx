import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Check, Loader2, ChevronDown } from "lucide-react";
import {
  type Season, type TimeSlot, type Focus,
  saveRhythm,
} from "@/lib/faithRhythm";
import {
  MORNING_TIME_OPTIONS,
  describeRhythmReminders,
  formatReminderTime,
  getRhythmReminderPreset,
} from "@/lib/rhythmReminders";
import { subscribePush, isPushSupported } from "@/lib/push";
import { getUserTimezone } from "@/lib/timezone";
import { NotificationSettings } from "@/components/NotificationSettings";
import { Button } from "@/components/ui/button";

interface Props {
  onDone: () => void;
  onDismiss: () => void;
}

const SEASONS: Array<{ value: Season; label: string; desc: string; emoji: string }> = [
  { value: "seeking",  label: "Just starting out",              emoji: "🌱", desc: "I'm new to faith or finding my way back" },
  { value: "growing",  label: "Growing steady",                 emoji: "🌿", desc: "I'm walking with God and want to go deeper" },
  { value: "hardship", label: "Walking through something hard", emoji: "🕊️", desc: "I'm in a difficult season and need His presence" },
  { value: "deeper",   label: "Ready to go deeper",            emoji: "📖", desc: "I want to seriously study and understand Scripture" },
];

const TIME_SLOTS: Array<{ value: TimeSlot; label: string; desc: string }> = [
  { value: "5min",  label: "A few minutes",       desc: "5–10 min — a short devotional and one verse each day" },
  { value: "15min", label: "Around 15 minutes",   desc: "A devotional, a passage, and a moment of prayer" },
  { value: "30min", label: "Half an hour or more", desc: "A full reading, reflection, and time to journal" },
];

const FOCUS_OPTIONS: Array<{ value: Focus; label: string; icon: string }> = [
  { value: "peace",     label: "Peace",     icon: "🕊️" },
  { value: "strength",  label: "Strength",  icon: "⚡" },
  { value: "purpose",   label: "Purpose",   icon: "🧭" },
  { value: "healing",   label: "Healing",   icon: "🌿" },
  { value: "gratitude", label: "Gratitude", icon: "🙏" },
  { value: "wisdom",    label: "Wisdom",    icon: "📖" },
  { value: "family",    label: "Family",    icon: "❤️" },
];

const NOTIF_STRIP_KEY = "sp_notif_strip_shown";
const NOTIF_DEEP_KEY = "sp_notif_nudge_dismissed";

function markNotifNudgesComplete() {
  localStorage.setItem(NOTIF_STRIP_KEY, "1");
  localStorage.setItem(NOTIF_DEEP_KEY, "1");
}

export function FaithRhythmSetup({ onDone, onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const [season, setSeason] = useState<Season | null>(null);
  const [time, setTime] = useState<TimeSlot | null>(null);
  const [morningTime, setMorningTime] = useState("07:00");
  const [settingRhythm, setSettingRhythm] = useState(false);
  const [rhythmSet, setRhythmSet] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  const handleFocusSelect = (value: Focus) => {
    if (!season || !time) return;
    saveRhythm({ season, time, focus: value, setAt: new Date().toISOString() });
    setStep(3);
  };

  const finishWithoutReminders = () => {
    markNotifNudgesComplete();
    onDone();
  };

  const handleSetRhythm = async () => {
    if (!time) return;
    setSettingRhythm(true);
    const preset = getRhythmReminderPreset(time, morningTime);

    if (isPushSupported()) {
      const ok = await subscribePush({
        ...preset,
        timezone: getUserTimezone(),
      });
      if (ok) {
        markNotifNudgesComplete();
        setRhythmSet(true);
        setTimeout(() => onDone(), 1800);
        setSettingRhythm(false);
        return;
      }
    }

    markNotifNudgesComplete();
    onDone();
    setSettingRhythm(false);
  };

  if (showCustomize) {
    return (
      <NotificationSettings
        onClose={() => {
          markNotifNudgesComplete();
          setShowCustomize(false);
          onDone();
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-background/97 backdrop-blur-sm flex flex-col"
    >
      <div className="flex items-center justify-between px-5 pt-12 pb-2 max-w-md mx-auto w-full">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-400 ${
                i === step
                  ? "w-10 bg-primary"
                  : i < step
                  ? "w-6 bg-primary/35"
                  : "w-6 bg-muted"
              }`}
            />
          ))}
        </div>
        <button
          data-testid="btn-rhythm-dismiss"
          onClick={onDismiss}
          className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-10 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">

          {step === 0 && (
            <motion.div
              key="season"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary/55 mb-2">Step 1 of 4</p>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight mb-1.5">
                Where are you right now?
              </h2>
              <p className="text-[14px] text-muted-foreground mb-7 leading-relaxed">
                No wrong answers — this helps us walk alongside you well.
              </p>
              <div className="flex flex-col gap-3">
                {SEASONS.map(({ value, label, desc, emoji }) => (
                  <button
                    key={value}
                    data-testid={`rhythm-season-${value}`}
                    onClick={() => { setSeason(value); setStep(1); }}
                    className="text-left px-4 py-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/4 active:scale-[0.98] transition-all flex items-start gap-3.5 group"
                  >
                    <span className="text-2xl mt-0.5 shrink-0">{emoji}</span>
                    <div>
                      <p className="font-bold text-foreground text-[15px] leading-tight mb-0.5 group-hover:text-primary transition-colors">{label}</p>
                      <p className="text-[13px] text-muted-foreground leading-snug">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="time"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary/55 mb-2">Step 2 of 4</p>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight mb-1.5">
                How much time with God most days?
              </h2>
              <p className="text-[14px] text-muted-foreground mb-7 leading-relaxed">
                Even a few minutes every day adds up to something life-changing.
              </p>
              <div className="flex flex-col gap-3">
                {TIME_SLOTS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    data-testid={`rhythm-time-${value}`}
                    onClick={() => { setTime(value); setStep(2); }}
                    className="text-left px-4 py-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/4 active:scale-[0.98] transition-all group"
                  >
                    <p className="font-bold text-foreground text-[15px] leading-tight mb-0.5 group-hover:text-primary transition-colors">{label}</p>
                    <p className="text-[13px] text-muted-foreground leading-snug">{desc}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(0)}
                className="mt-5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="focus"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary/55 mb-2">Step 3 of 4</p>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight mb-1.5">
                What does your soul most need this season?
              </h2>
              <p className="text-[14px] text-muted-foreground mb-7 leading-relaxed">
                Your daily verse, prayer prompt, and Bible journey will be shaped around this.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_OPTIONS.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    data-testid={`rhythm-focus-${value}`}
                    onClick={() => handleFocusSelect(value)}
                    className="flex flex-col items-center gap-2.5 px-4 py-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97] transition-all group"
                  >
                    <span className="text-3xl">{icon}</span>
                    <span className="font-bold text-foreground text-[14px] group-hover:text-primary transition-colors">{label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="mt-5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {step === 3 && time && (
            <motion.div
              key="reminders"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary/55 mb-2">Step 4 of 4</p>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight mb-1.5">
                When works best for a gentle reminder?
              </h2>
              <p className="text-[14px] text-muted-foreground mb-5 leading-relaxed">
                Quiet nudges in your local time — turn off anytime under My rhythm.
              </p>

              {rhythmSet ? (
                <div className="rounded-2xl bg-emerald-500/8 border border-emerald-400/25 px-4 py-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/12 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400">Your rhythm is set</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      You'll hear from us tomorrow at {formatReminderTime(morningTime)}.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-[12px] font-semibold text-foreground mb-2">Morning time</p>
                    <div className="relative">
                      <select
                        value={morningTime}
                        onChange={(e) => setMorningTime(e.target.value)}
                        data-testid="rhythm-morning-time"
                        className="w-full appearance-none bg-card border border-border rounded-xl text-[14px] font-semibold text-foreground px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/25"
                      >
                        {MORNING_TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{formatReminderTime(t)}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/15 bg-primary/4 divide-y divide-primary/10 overflow-hidden mb-5">
                    {describeRhythmReminders(time, morningTime).map((line) => (
                      <div key={line} className="flex items-start gap-3 px-4 py-3">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[13px] text-foreground leading-snug">{line}</p>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleSetRhythm}
                    disabled={settingRhythm}
                    data-testid="btn-rhythm-set"
                    className="w-full rounded-2xl h-12 text-[15px] font-semibold mb-3"
                  >
                    {settingRhythm ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up…</>
                    ) : (
                      <><Bell className="w-4 h-4 mr-2" /> Set my rhythm</>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowCustomize(true)}
                    data-testid="btn-rhythm-customize"
                    className="w-full text-center text-[13px] font-semibold text-primary hover:text-primary/80 py-2 transition-colors"
                  >
                    Customize reminders
                  </button>

                  <button
                    type="button"
                    onClick={finishWithoutReminders}
                    data-testid="btn-rhythm-skip"
                    className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground py-2 transition-colors"
                  >
                    Skip for now
                  </button>
                </>
              )}

              {step === 3 && !rhythmSet && (
                <button
                  onClick={() => setStep(2)}
                  className="mt-4 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
