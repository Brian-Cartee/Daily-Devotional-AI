import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { isNativeWebViewShell } from "@/lib/platform";
import {
  Bell, BellOff, Mail, Check, Loader2, X, Sun, Moon,
  Clock, AlarmClock, CalendarDays, ChevronDown, ShieldCheck, HelpCircle, ArrowRight,
} from "lucide-react";
import { getCompanionMode, setCompanionMode, type CompanionMode } from "@/lib/companionMode";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import { fetchVapidPublicKey } from "@/lib/push";
import { getUserTimezone } from "@/lib/timezone";
import { useToast } from "@/hooks/use-toast";
import { markEmailSubscribed } from "@/components/EmailSubscribe";
import { subscribeWithIdentity } from "@/lib/identity";
import { getDailyEmailDeliveryDescription } from "@/lib/dailyEmailSchedule";
import { getStoredSubscriberEmail } from "@/lib/subscriberState";
import { useEmailSubscriptionStatus, getKnownDeviceEmail, isDailyEmailLinked } from "@/hooks/use-email-subscription";

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
  eveningEnabled: false,
  eveningTime: "20:00",
  middayEnabled: false,
  streakReminder: false,
  weeklySummary: false,
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

function useEmailSectionState() {
  const { toast } = useToast();
  const { subscribed, email: syncedEmail } = useEmailSubscriptionStatus();
  const [email, setEmail] = useState(() => getStoredSubscriberEmail() ?? "");
  const [loading, setLoading] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [localActive, setLocalActive] = useState(() => isDailyEmailLinked());

  useEffect(() => {
    const refresh = () => {
      const active = isDailyEmailLinked();
      setLocalActive(active);
      if (active) setLinkSuccess(true);
      const stored = getStoredSubscriberEmail();
      if (stored) setEmail(stored);
    };
    refresh();
    window.addEventListener("sp-email-subscription-updated", refresh);
    return () => window.removeEventListener("sp-email-subscription-updated", refresh);
  }, []);

  useEffect(() => {
    if (syncedEmail) setEmail(syncedEmail);
  }, [syncedEmail]);

  const isActive = linkSuccess || localActive || subscribed || isDailyEmailLinked();
  const displayEmail = getStoredSubscriberEmail() || syncedEmail || email || getKnownDeviceEmail();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const result = await subscribeWithIdentity({ email: email.trim(), source: "notification-settings" });
    if (result.ok) {
      markEmailSubscribed(email.trim());
      setLocalActive(true);
      setLinkSuccess(true);
      toast({ description: result.message || "Daily word email linked on this device." });
    } else {
      toast({ description: result.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return { email, setEmail, loading, isActive, displayEmail, handleSubscribe };
}

function EmailSectionInner() {
  const { email, setEmail, loading, isActive, displayEmail, handleSubscribe } = useEmailSectionState();
  return (
    <div style={{ padding: "0 16px 14px" }}>
      {isActive ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", margin: 0 }}>Subscribed</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "2px 0 0" }}>Sending to {displayEmail} · {getDailyEmailDeliveryDescription()}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubscribe} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", margin: 0, lineHeight: 1.5 }}>
            Already subscribed? Enter your address to link this device, or subscribe now.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              data-testid="notif-email-input"
              style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "9px 13px", fontSize: 14, color: "rgba(255,255,255,0.90)", outline: "none", minWidth: 0 }}
            />
            <Button type="submit" size="sm" disabled={loading || !email.trim()} className="rounded-xl shrink-0 text-[12px]" data-testid="notif-email-submit">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Link"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function SmsCard() {
  const sessionId = getSessionId();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/user-phone?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.phone) { setPhone(d.phone); setSaved(true); } })
      .catch(() => {});
  }, [sessionId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const r = await fetch("/api/user-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, phone: trimmed }),
      });
      if (r.ok) {
        setSaved(true);
        setOpen(false);
        toast({ description: "You're on the list. When morning texts go live, you'll be first." });
      }
    } catch {
      toast({ description: "Couldn't save — try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(52,211,153,0.25)", backgroundColor: "rgba(52,211,153,0.06)", overflow: "hidden" }}>
      {/* Header row */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
          💬
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.92)", margin: 0 }}>
              Text message
            </p>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", backgroundColor: "rgba(52,211,153,0.20)", color: "rgb(52,211,153)", borderRadius: 6, padding: "2px 7px" }}>
              Best
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>
              Coming soon
            </span>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", margin: "4px 0 0", lineHeight: 1.5 }}>
            A morning text the way a close friend reaches out — not a notification to dismiss, but a word that lands.
          </p>
        </div>
        {saved && (
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>✅</span>
        )}
      </div>

      {/* Saved state */}
      {saved ? (
        <div style={{ padding: "0 16px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgb(52,211,153)", fontWeight: 600 }}>
            Saved — we&apos;ll text {phone} when this goes live
          </span>
          <button
            type="button"
            onClick={() => { setSaved(false); setOpen(true); }}
            style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          {/* CTA */}
          {!open && (
            <div style={{ padding: "0 16px 14px" }}>
              <button
                type="button"
                onClick={() => setOpen(true)}
                style={{ fontSize: 13, fontWeight: 700, color: "rgb(52,211,153)", background: "none", border: "1px solid rgba(52,211,153,0.35)", borderRadius: 12, padding: "8px 18px", cursor: "pointer" }}
              >
                Reserve my spot
              </button>
            </div>
          )}

          {/* Input form */}
          {open && (
            <form onSubmit={handleSave} style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.6 }}>
                One short morning message. No marketing. No spam. Opt out anytime with a single reply.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  autoFocus
                  style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "9px 13px", fontSize: 14, color: "rgba(255,255,255,0.90)", outline: "none", minWidth: 0 }}
                />
                <button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  style={{ backgroundColor: "rgba(52,211,153,0.22)", border: "1px solid rgba(52,211,153,0.45)", borderRadius: 12, padding: "9px 18px", fontSize: 13, fontWeight: 700, color: "rgb(52,211,153)", cursor: loading || !phone.trim() ? "not-allowed" : "pointer", flexShrink: 0, opacity: loading || !phone.trim() ? 0.5 : 1 }}
                >
                  {loading ? "…" : "Save"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  visitDates: string[];
}

function StreakCard({ streak }: { streak: StreakData }) {
  const today = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // Build 7-day window: Sun through Sat of current week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const visitSet = new Set(streak.visitDates);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const isToday = key === today.toISOString().slice(0, 10);
    return { label: days[i]!, visited: visitSet.has(key), isToday };
  });

  return (
    <div style={{ borderRadius: "16px", border: "1px solid rgba(255,180,0,0.18)", backgroundColor: "rgba(255,180,0,0.06)", padding: "14px 16px" }}>
      {streak.currentStreak >= 1 && (
        <p style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.88)", marginBottom: "10px" }}>
          🔥 <strong>Day {streak.currentStreak}</strong> walking with God
        </p>
      )}
      {streak.visitDates.length > 0 && (
        <>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: "8px" }}>
            This week
          </p>
          <div style={{ display: "flex", gap: "6px", justifyContent: "space-between" }}>
            {weekDays.map(({ label, visited, isToday }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: visited ? "rgba(34,197,94,0.75)" : "rgba(255,255,255,0.07)",
                    border: isToday ? "2px solid rgba(255,180,0,0.55)" : "2px solid transparent",
                  }}
                />
                <span style={{ fontSize: "9px", fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CompanionModeSection() {
  const [mode, setMode] = useState<CompanionMode>(getCompanionMode);
  const [confirmed, setConfirmed] = useState(false);

  const handleSwitch = (next: CompanionMode) => {
    setCompanionMode(next);
    setMode(next);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  };

  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.30)", margin: "0 0 10px 0" }}>
          Companion Experience
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "0 0 14px 0", lineHeight: 1.5 }}>
          Some days you may want a companion. Other days you may just want space. Both are welcome here.
        </p>

        {/* Walk With Philip */}
        <button
          onClick={() => handleSwitch("philip")}
          style={{
            display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
            padding: "10px 12px", borderRadius: 12, marginBottom: 8,
            border: mode === "philip" ? "1px solid rgba(167,139,250,0.45)" : "1px solid rgba(255,255,255,0.07)",
            backgroundColor: mode === "philip" ? "rgba(167,139,250,0.08)" : "transparent",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: mode === "philip" ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.15)", marginTop: 5, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.90)", margin: 0 }}>Walk With Philip</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "2px 0 0 0", lineHeight: 1.4 }}>Voice-guided conversation with Philip</p>
          </div>
        </button>

        {/* Solo */}
        <button
          onClick={() => handleSwitch("solo")}
          style={{
            display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
            padding: "10px 12px", borderRadius: 12,
            border: mode === "solo" ? "1px solid rgba(113,113,122,0.55)" : "1px solid rgba(255,255,255,0.07)",
            backgroundColor: mode === "solo" ? "rgba(113,113,122,0.10)" : "transparent",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: mode === "solo" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.15)", marginTop: 5, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.90)", margin: 0 }}>Solo</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "2px 0 0 0", lineHeight: 1.4 }}>Quiet written guidance without Philip's voice or opening</p>
          </div>
        </button>

        {confirmed && (
          <p style={{ fontSize: 12, color: mode === "philip" ? "rgba(167,139,250,0.8)" : "rgba(255,255,255,0.45)", marginTop: 10, textAlign: "center" }}>
            {mode === "philip"
              ? "Philip is with you."
              : "Solo mode is on. You'll still receive thoughtful spiritual guidance."}
          </p>
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
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  useEffect(() => {
    fetch("/api/streak")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStreakData(data); })
      .catch(() => {});
  }, []);

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
      const publicKey = await fetchVapidPublicKey();
      if (!publicKey) {
        toast({
          description:
            "Push reminders aren't available on the server yet. Try again later or use daily email in My rhythm.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const convertedKey = await urlBase64ToUint8Array(publicKey);
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedKey });
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          subscription: subJson,
          timezone: getUserTimezone(),
          ...settings,
        }),
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
        body: JSON.stringify({ sessionId, timezone: getUserTimezone(), [key]: value }),
      });
    } catch {}
    setSaving(false);
  }, [settings, sessionId]);

  // Lock body scroll while sheet is open (iOS WebView fix)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const pushCards = [
    { icon: Sun, colorIcon: "rgb(245,158,11)", colorBg: "rgba(245,158,11,0.10)", label: "Morning devotional", desc: "Daily word to start your day" },
    { icon: Clock, colorIcon: "rgb(56,189,248)", colorBg: "rgba(56,189,248,0.10)", label: "Midday check-in", desc: "Gentle nudge if you haven't opened yet" },
    { icon: Moon, colorIcon: "rgb(129,140,248)", colorBg: "rgba(129,140,248,0.10)", label: "Evening reflection", desc: "A closing word before the day ends" },
    { icon: AlarmClock, colorIcon: "rgb(248,113,113)", colorBg: "rgba(248,113,113,0.10)", label: "Streak keeper", desc: "Nudge if today's visit is still open" },
    { icon: CalendarDays, colorIcon: "rgb(167,139,250)", colorBg: "rgba(167,139,250,0.10)", label: "Weekly recap", desc: "Your week, reflected back every Sunday" },
  ];

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
        onTouchMove={(e) => e.preventDefault()}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full sm:max-w-md bg-card border border-border/60 rounded-t-3xl sm:rounded-2xl shadow-2xl mx-0 sm:mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between sticky top-0 bg-card border-b border-border/30 z-10">
          <div>
            <h2 className="text-[16px] font-bold text-foreground">How should your Shepherd reach you?</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              The more connected we stay, the more this becomes a real companion — not just an app you open when you remember.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors" data-testid="notif-close">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* ── Section label ── */}
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.30)", margin: 0 }}>
            Preferred method
          </p>

          {/* ── 1. SMS — the gold standard ── */}
          <SmsCard />

          {/* ── 2. Push notifications ── */}
          <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
            {/* Push header */}
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: "rgba(251,191,36,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
                🔔
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.92)", margin: 0 }}>
                    Push notification
                  </p>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", backgroundColor: "rgba(251,191,36,0.15)", color: "rgb(251,191,36)", borderRadius: 6, padding: "2px 7px" }}>
                    Great
                  </span>
                  {isNativeWebViewShell() && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>Coming soon</span>
                  )}
                  {!isNativeWebViewShell() && subscribed && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgb(52,211,153)" }}>● ON</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", margin: "4px 0 0", lineHeight: 1.5 }}>
                  Tap your shoulder on the lock screen — quiet, personal, easy to act on in one tap.
                </p>
              </div>
            </div>

            {/* Push body — varies by state */}
            {isNativeWebViewShell() ? (
              <div style={{ padding: "0 16px 14px" }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", margin: 0, lineHeight: 1.6 }}>
                  Native push is coming in a future app update. Add your number above to be reached in the meantime.
                </p>
              </div>
            ) : permission === "denied" ? (
              <div style={{ padding: "0 16px 14px" }}>
                <div style={{ backgroundColor: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12, padding: "10px 13px" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "rgb(248,113,113)", margin: "0 0 4px" }}>Blocked in phone settings</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", margin: 0, lineHeight: 1.5 }}>
                    Go to Settings → Notifications → Shepherd&apos;s Path → Allow
                  </p>
                </div>
              </div>
            ) : subscribed ? (
              <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Individual toggles */}
                <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  {pushCards.map(({ icon: Icon, colorIcon, colorBg, label, desc }, i) => {
                    const keys: (keyof PushSettings)[] = ["morningEnabled","middayEnabled","eveningEnabled","streakReminder","weeklySummary"];
                    const timeKeys: (keyof PushSettings | null)[] = ["morningTime", null, "eveningTime", null, null];
                    const timeOptions = [MORNING_TIMES, [], EVENING_TIMES, [], []];
                    const key = keys[i]!;
                    const timeKey = timeKeys[i];
                    return (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < pushCards.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                        <div style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colorBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon style={{ width: 15, height: 15, color: colorIcon }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0 }}>{label}</p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", margin: "1px 0 0" }}>{desc}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {timeKey && settings[key] && (
                            <TimeSelect value={settings[timeKey] as string} options={timeOptions[i]!} onChange={(v) => saveSetting(timeKey, v)} />
                          )}
                          <Toggle checked={settings[key] as boolean} onChange={(v) => saveSetting(key, v)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={handleDisable} className="w-full text-center text-[11px] text-muted-foreground/40 hover:text-rose-500 py-1 transition-colors" data-testid="notif-push-disable">
                  Turn off push notifications
                </button>
              </div>
            ) : (
              <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  {pushCards.map(({ icon: Icon, colorIcon, colorBg, label, desc }, i) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < pushCards.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", opacity: 0.55 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colorBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon style={{ width: 15, height: 15, color: colorIcon }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0 }}>{label}</p>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", margin: "1px 0 0" }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={handleEnable} disabled={loading} className="w-full rounded-2xl h-11 text-[14px] font-semibold" data-testid="notif-push-enable">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enabling…</> : <><Bell className="w-4 h-4 mr-2" /> Let my Shepherd reach me</>}
                </Button>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", textAlign: "center", margin: 0 }}>
                  Quiet. Respectful. Turn off anytime from your phone settings.
                </p>
              </div>
            )}
          </div>

          {/* ── 3. Email ── */}
          <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
                ✉️
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.92)", margin: 0 }}>Daily email</p>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", backgroundColor: "rgba(99,102,241,0.18)", color: "rgb(129,140,248)", borderRadius: 6, padding: "2px 7px" }}>
                    Good
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", margin: "4px 0 0", lineHeight: 1.5 }}>
                  Today&apos;s word delivered to your inbox each morning — read it whenever you get there.
                </p>
              </div>
            </div>
            <EmailSectionInner />
          </div>

          {/* ── Streak card ── */}
          {streakData && (streakData.currentStreak >= 1 || streakData.visitDates.length > 0) && (
            <StreakCard streak={streakData} />
          )}

          {/* ── Companion Experience ── */}
          <CompanionModeSection />

          <Link
            href="/how-to-use"
            onClick={onClose}
            data-testid="link-reminders-how-to-use"
            className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 min-h-[48px] hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <HelpCircle className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[13px] font-semibold text-foreground">How to use Shepherd&apos;s Path</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>

        </div>
      </motion.div>
    </motion.div>
  );
}
