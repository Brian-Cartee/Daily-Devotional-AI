import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, Mail, Check, Loader2, X, Sun, Moon,
  Sparkles, Clock, AlarmClock, CalendarDays, ChevronDown, ToggleLeft, ToggleRight
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
  return h === 0 ? "12:00 AM" : h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`;
}

async function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      data-testid={`toggle-${checked}`}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-200 shrink-0 ${checked ? "bg-primary" : "bg-muted-foreground/25"}`}
      style={{ height: 22 }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? "translate-x-[18px]" : "translate-x-0"}`}
      />
    </button>
  );
}

function TimeSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-muted/60 border border-border rounded-lg text-[12px] font-medium text-foreground px-2.5 py-1.5 pr-6 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map((t) => (
          <option key={t} value={t}>{formatTime(t)}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function EmailSection({ onClose }: { onClose: () => void }) {
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
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-foreground">Daily email</p>
          <p className="text-[11px] text-muted-foreground">Today's verse delivered every morning at 7 AM ET</p>
        </div>
      </div>
      <div className="pl-5">
        {subscribed ? (
          <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
            <Check className="w-3.5 h-3.5" />
            Subscribed · {email}
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              data-testid="notif-email-input"
              className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 min-w-0"
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

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

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
      toast({ description: "Something went wrong enabling notifications.", variant: "destructive" });
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

  const activeCount = subscribed
    ? [settings.morningEnabled, settings.eveningEnabled, settings.middayEnabled, settings.streakReminder, settings.weeklySummary].filter(Boolean).length
    : 0;

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
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-card border-b border-border/40 z-10">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${subscribed ? "bg-primary/10" : "bg-muted"}`}>
              {subscribed ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">Reminders</h2>
              <p className="text-[11px] text-muted-foreground">
                {subscribed ? `${activeCount} active · adjust anytime` : "Stay on the path daily"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors" data-testid="notif-close">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Push Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[13px] font-semibold text-foreground">Push Notifications</p>
              </div>
              {subscribed && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">Active</span>
              )}
            </div>

            {permission === "denied" ? (
              <div className="bg-muted/50 rounded-xl p-4 text-[12px] text-muted-foreground leading-relaxed">
                Notifications are blocked in your browser. To enable them, open your browser settings → Site Settings → Notifications and allow this site.
              </div>
            ) : !subscribed ? (
              <div className="space-y-3">
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 space-y-1">
                  <p className="text-[13px] font-semibold text-foreground">Never miss your daily walk</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Get a morning devotional nudge, an evening reminder, streak protection, and a weekly summary — all quietly, on your terms.
                  </p>
                </div>
                <Button
                  onClick={handleEnable}
                  disabled={loading}
                  className="w-full rounded-xl"
                  data-testid="notif-push-enable"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enabling...</>
                  ) : (
                    <><Bell className="w-4 h-4 mr-2" /> Enable Push Notifications</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">

                {/* Morning */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                  <div className="flex items-center gap-2.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Morning devotional</p>
                      <p className="text-[11px] text-muted-foreground">Daily verse + devotional prompt</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {settings.morningEnabled && (
                      <TimeSelect
                        value={settings.morningTime}
                        options={MORNING_TIMES}
                        onChange={(v) => saveSetting("morningTime", v)}
                      />
                    )}
                    <Toggle
                      checked={settings.morningEnabled}
                      onChange={(v) => saveSetting("morningEnabled", v)}
                    />
                  </div>
                </div>

                {/* Midday */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Midday check-in</p>
                      <p className="text-[11px] text-muted-foreground">Gentle 12 PM nudge if not done yet</p>
                    </div>
                  </div>
                  <Toggle
                    checked={settings.middayEnabled}
                    onChange={(v) => saveSetting("middayEnabled", v)}
                  />
                </div>

                {/* Evening */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Evening reflection</p>
                      <p className="text-[11px] text-muted-foreground">A final nudge before the day ends</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {settings.eveningEnabled && (
                      <TimeSelect
                        value={settings.eveningTime}
                        options={EVENING_TIMES}
                        onChange={(v) => saveSetting("eveningTime", v)}
                      />
                    )}
                    <Toggle
                      checked={settings.eveningEnabled}
                      onChange={(v) => saveSetting("eveningEnabled", v)}
                    />
                  </div>
                </div>

                {/* Streak reminder */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                  <div className="flex items-center gap-2.5">
                    <AlarmClock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Streak protection</p>
                      <p className="text-[11px] text-muted-foreground">9 PM alert if streak at risk today</p>
                    </div>
                  </div>
                  <Toggle
                    checked={settings.streakReminder}
                    onChange={(v) => saveSetting("streakReminder", v)}
                  />
                </div>

                {/* Weekly summary */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Weekly summary</p>
                      <p className="text-[11px] text-muted-foreground">Sunday evening — your week in review</p>
                    </div>
                  </div>
                  <Toggle
                    checked={settings.weeklySummary}
                    onChange={(v) => saveSetting("weeklySummary", v)}
                  />
                </div>

                <button
                  onClick={handleDisable}
                  className="w-full text-center text-[11px] text-muted-foreground/60 hover:text-muted-foreground py-1 transition-colors"
                  data-testid="notif-push-disable"
                >
                  Turn off push notifications
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-border/40" />

          {/* Email section */}
          <EmailSection onClose={onClose} />

        </div>
      </motion.div>
    </motion.div>
  );
}
