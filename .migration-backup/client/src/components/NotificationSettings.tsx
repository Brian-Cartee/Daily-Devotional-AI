import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bell, BellOff, Mail, Check, Loader2, X, Sun, Moon,
  Clock, AlarmClock, CalendarDays, ChevronDown, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

interface PushSettings {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  middayEnabled: boolean;
  streakReminder: boolean;
  weeklySummary: boolean;
}

const DEFAULT_SETTINGS: PushSettings = {
  morningEnabled: true,
  morningTime: "07:00",
  eveningEnabled: true,
  eveningTime: "20:00",
  middayEnabled: false,
  streakReminder: true,
  weeklySummary: true,
};

const MORNING_TIMES = ["05:00","06:00","07:00","08:00","09:00","10:00"];
const EVENING_TIMES = ["17:00","18:00","19:00","20:00","21:00","22:00"];

function formatTime(t: string) {
  const [h] = t.split(":").map(Number);
  return h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
}

async function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      data-testid={`toggle-${checked}`}
      className={`flex items-center gap-1.5 shrink-0 transition-all duration-200`}
      aria-label={checked ? "Turn off" : "Turn on"}
    >
      <span className={`text-[11px] font-bold uppercase tracking-wide transition-colors ${checked ? "text-primary" : "text-muted-foreground/50"}`}>
        {checked ? "On" : "Off"}
      </span>
      <div
        className={`relative w-11 rounded-full transition-all duration-200 ${checked ? "bg-primary" : "bg-muted-foreground/25"}`}
        style={{ height: 24 }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? "translate-x-[18px]" : "translate-x-0"}`}
        />
      </div>
    </button>
  );
}

function TimeSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-primary/8 border border-primary/20 rounded-lg text-[12px] font-semibold text-primary px-2.5 py-1 pr-6 focus:outline-none"
      >
        {options.map((t) => (
          <option key={t} value={t}>{formatTime(t)}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/60 pointer-events-none" />
    </div>
  );
}

function EmailSection() {
  const { toast } = useToast();
  const [email, setEmail] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sp_notif_prefs") || "{}").email ?? ""; } catch { return ""; }
  });
  const [subscribed, setSubscribed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sp_notif_prefs") || "{}").emailSubscribed ?? false; } catch { return false; }
  });
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok || res.status === 409) {
        setSubscribed(true);
        const current = JSON.parse(localStorage.getItem("sp_notif_prefs") || "{}");
        localStorage.setItem("sp_notif_prefs", JSON.stringify({ ...current, email: email.trim(), emailSubscribed: true }));
        toast({ description: "Daily verse email confirmed! 🙏" });
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/30 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border/30">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground">Daily email verse</p>
          <p className="text-[11px] text-muted-foreground">Delivered every morning at 7 AM ET</p>
        </div>
        {subscribed && (
          <div className="flex items-center gap-1 text-emerald-600 shrink-0">
            <Check className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wide">Active</span>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        {subscribed ? (
          <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Sending to <span className="text-foreground font-medium">{email}</span>
          </p>
        ) : (
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              data-testid="notif-email-input"
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 min-w-0"
            />
            <Button type="submit" size="sm" disabled={loading || !email.trim()} className="rounded-xl shrink-0 text-[12px]" data-testid="notif-email-submit">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Subscribe"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function NotificationSettings({ onClose }: { onClose: () => void }) {
  const sessionId = getSessionId();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [settings, setSettings] = useState<PushSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    fetch(`/api/push/settings/${sessionId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setSubscribed(true);
          setSettings({
            morningEnabled: data.morningEnabled,
            morningTime: data.morningTime,
            eveningEnabled: data.eveningEnabled,
            eveningTime: data.eveningTime,
            middayEnabled: data.middayEnabled,
            streakReminder: data.streakReminder,
            weeklySummary: data.weeklySummary,
          });
        }
      })
      .catch(() => {});
  }, [permission, sessionId]);

  const handleEnable = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setLoading(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await fetch("/api/push/vapid-key");
      const { publicKey } = await vapidRes.json();
      const convertedKey = await urlBase64ToUint8Array(publicKey);
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedKey });
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, subscription: subJson }),
      });
      setSubscribed(true);
      toast({ description: "Notifications enabled! You'll hear from us. 🙏" });
    } catch (err) {
      console.error("[push] enable error:", err);
      toast({ description: "Notifications couldn't be enabled right now — try again from settings." });
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch(`/api/push/subscribe/${sessionId}`, { method: "DELETE" });
      setSubscribed(false);
      toast({ description: "Push notifications turned off." });
    } catch {}
  };

  const saveSetting = useCallback(async (key: keyof PushSettings, value: boolean | string) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    try {
      await fetch("/api/push/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, [key]: value }),
      });
    } catch {}
    setSaving(false);
  }, [settings, sessionId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full sm:max-w-md bg-card border border-border/60 rounded-t-3xl sm:rounded-2xl shadow-2xl mx-0 sm:mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between sticky top-0 bg-card border-b border-border/30 z-10">
          <div>
            <h2 className="text-[16px] font-bold text-foreground">Reminders</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Push notifications &amp; daily email</p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors" data-testid="notif-close">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* ── Push status banner ── */}
          {permission === "denied" ? (
            <div className="rounded-2xl bg-rose-500/8 border border-rose-400/25 px-4 py-4 space-y-1">
              <div className="flex items-center gap-2">
                <BellOff className="w-4 h-4 text-rose-500 shrink-0" />
                <p className="text-[14px] font-bold text-foreground">Notifications blocked</p>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed pl-6">
                To enable them, open your browser Settings → Site Settings → Notifications → Allow this site.
              </p>
            </div>
          ) : subscribed ? (
            /* ── ENABLED STATE ── */
            <div className="space-y-4">
              {/* Active status card */}
              <div className="rounded-2xl bg-emerald-500/8 border border-emerald-400/25 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/12 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400">Push notifications are ON</p>
                  <p className="text-[11px] text-muted-foreground">Adjust which ones you receive below</p>
                </div>
              </div>

              {/* Individual toggles */}
              <div className="rounded-2xl border border-border/50 bg-muted/20 divide-y divide-border/30 overflow-hidden">

                {/* Morning */}
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/12 flex items-center justify-center shrink-0">
                    <Sun className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Morning devotional</p>
                    <p className="text-[11px] text-muted-foreground">Daily verse + reflection prompt</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {settings.morningEnabled && (
                      <TimeSelect value={settings.morningTime} options={MORNING_TIMES} onChange={(v) => saveSetting("morningTime", v)} />
                    )}
                    <Toggle checked={settings.morningEnabled} onChange={(v) => saveSetting("morningEnabled", v)} />
                  </div>
                </div>

                {/* Midday */}
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-400/12 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Midday check-in</p>
                    <p className="text-[11px] text-muted-foreground">Gentle nudge at noon if not done yet</p>
                  </div>
                  <Toggle checked={settings.middayEnabled} onChange={(v) => saveSetting("middayEnabled", v)} />
                </div>

                {/* Evening */}
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-400/12 flex items-center justify-center shrink-0">
                    <Moon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Evening reflection</p>
                    <p className="text-[11px] text-muted-foreground">A closing nudge before the day ends</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {settings.eveningEnabled && (
                      <TimeSelect value={settings.eveningTime} options={EVENING_TIMES} onChange={(v) => saveSetting("eveningTime", v)} />
                    )}
                    <Toggle checked={settings.eveningEnabled} onChange={(v) => saveSetting("eveningEnabled", v)} />
                  </div>
                </div>

                {/* Streak */}
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-400/12 flex items-center justify-center shrink-0">
                    <AlarmClock className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Streak protection</p>
                    <p className="text-[11px] text-muted-foreground">Alert before your streak resets</p>
                  </div>
                  <Toggle checked={settings.streakReminder} onChange={(v) => saveSetting("streakReminder", v)} />
                </div>

                {/* Weekly */}
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-400/12 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Weekly summary</p>
                    <p className="text-[11px] text-muted-foreground">Your week in review, every Sunday</p>
                  </div>
                  <Toggle checked={settings.weeklySummary} onChange={(v) => saveSetting("weeklySummary", v)} />
                </div>
              </div>

              {/* Turn off */}
              <button
                onClick={handleDisable}
                className="w-full text-center text-[12px] text-muted-foreground/50 hover:text-rose-500 py-1 transition-colors"
                data-testid="notif-push-disable"
              >
                Turn off all push notifications
              </button>
            </div>
          ) : (
            /* ── NOT YET ENABLED STATE ── */
            <div className="space-y-4">
              {/* OFF status card */}
              <div className="rounded-2xl bg-muted/50 border border-border/40 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold text-foreground">Push notifications are OFF</p>
                  <p className="text-[11px] text-muted-foreground">You won't receive any reminders</p>
                </div>
              </div>

              {/* What you'll get */}
              <div className="rounded-2xl border border-primary/15 bg-primary/4 divide-y divide-primary/10 overflow-hidden">
                {[
                  { icon: Sun, color: "text-amber-500 bg-amber-400/12", label: "Morning devotional", desc: "Daily verse to start your day" },
                  { icon: Clock, color: "text-sky-500 bg-sky-400/12", label: "Midday check-in", desc: "Optional noon reminder" },
                  { icon: Moon, color: "text-indigo-400 bg-indigo-400/12", label: "Evening reflection", desc: "Close the day with intention" },
                  { icon: AlarmClock, color: "text-rose-400 bg-rose-400/12", label: "Streak protection", desc: "Never lose your streak" },
                  { icon: CalendarDays, color: "text-violet-400 bg-violet-400/12", label: "Weekly summary", desc: "Your week, reflected back" },
                ].map(({ icon: Icon, color, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color.split(" ")[1]}`}>
                      <Icon className={`w-3.5 h-3.5 ${color.split(" ")[0]}`} />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleEnable}
                disabled={loading}
                className="w-full rounded-2xl h-12 text-[15px] font-semibold"
                data-testid="notif-push-enable"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enabling…</>
                ) : (
                  <><Bell className="w-4 h-4 mr-2" /> Turn On Notifications</>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">Quiet. Respectful. Always on your terms.</p>
            </div>
          )}

          {/* ── Divider ── */}
          <div className="h-px bg-border/30" />

          {/* ── Email section ── */}
          <EmailSection />

        </div>
      </motion.div>
    </motion.div>
  );
}
