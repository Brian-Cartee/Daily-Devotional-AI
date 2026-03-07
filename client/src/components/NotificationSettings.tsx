import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Mail, Smartphone, MonitorSmartphone, Check, Loader2, X, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotifPrefs {
  email: string;
  emailSubscribed: boolean;
  browserEnabled: boolean;
  smsPhone: string;
  smsSaved: boolean;
}

function loadPrefs(): NotifPrefs {
  try {
    return JSON.parse(localStorage.getItem("sp_notif_prefs") ?? "{}");
  } catch {
    return {} as NotifPrefs;
  }
}

function savePrefs(prefs: Partial<NotifPrefs>) {
  const current = loadPrefs();
  localStorage.setItem("sp_notif_prefs", JSON.stringify({ ...current, ...prefs }));
}

export function NotificationSettings({ onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = useState<NotifPrefs>(loadPrefs());
  const [emailInput, setEmailInput] = useState(prefs.email ?? "");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDone, setEmailDone] = useState(prefs.emailSubscribed ?? false);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserStatus, setBrowserStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  const [phoneInput, setPhoneInput] = useState(prefs.smsPhone ?? "");
  const [phoneSaved, setPhoneSaved] = useState(prefs.smsSaved ?? false);

  useEffect(() => {
    if ("Notification" in window) {
      setBrowserStatus(Notification.permission as "unknown" | "granted" | "denied");
    }
  }, []);

  const handleEmailSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setEmailLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      if (res.ok || res.status === 409) {
        setEmailDone(true);
        savePrefs({ email: emailInput.trim(), emailSubscribed: true });
        setPrefs(loadPrefs());
      }
    } catch {}
    setEmailLoading(false);
  };

  const handleBrowserEnable = async () => {
    if (!("Notification" in window)) return;
    setBrowserLoading(true);
    const permission = await Notification.requestPermission();
    setBrowserStatus(permission as "unknown" | "granted" | "denied");
    if (permission === "granted") {
      savePrefs({ browserEnabled: true });
      new Notification("Shepherd Path", {
        body: "Daily devotional reminders are on. See you at 7 AM. 🙏",
        icon: "/favicon.png",
      });
    }
    setBrowserLoading(false);
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    savePrefs({ smsPhone: phoneInput.trim(), smsSaved: true });
    setPhoneSaved(true);
  };

  const sections = [
    {
      id: "email",
      icon: Mail,
      label: "Email Reminders",
      description: "Daily verse delivered every morning at 7 AM",
      color: "text-indigo-500",
      content: emailDone ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <Check className="w-4 h-4" />
          Subscribed · {prefs.email}
        </div>
      ) : (
        <form onSubmit={handleEmailSubscribe} className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="your@email.com"
            required
            data-testid="notif-email-input"
            className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 min-w-0"
          />
          <Button type="submit" size="sm" disabled={emailLoading || !emailInput.trim()} className="rounded-xl shrink-0" data-testid="notif-email-submit">
            {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Subscribe"}
          </Button>
        </form>
      ),
    },
    {
      id: "browser",
      icon: MonitorSmartphone,
      label: "Browser / App Notifications",
      description: "Pop-up reminder when you open Shepherd Path",
      color: "text-amber-500",
      content: browserStatus === "granted" ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <Check className="w-4 h-4" />
          Notifications enabled
        </div>
      ) : browserStatus === "denied" ? (
        <p className="text-sm text-muted-foreground">
          Notifications blocked in your browser settings. Enable them under Site Settings → Notifications.
        </p>
      ) : (
        <Button size="sm" variant="outline" onClick={handleBrowserEnable} disabled={browserLoading} className="rounded-xl" data-testid="notif-browser-enable">
          {browserLoading ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Enabling...</> : <><Bell className="w-3.5 h-3.5 mr-2" /> Enable Notifications</>}
        </Button>
      ),
    },
    {
      id: "sms",
      icon: Smartphone,
      label: "SMS Reminders",
      description: "Text message reminder at 7 AM · Coming soon",
      color: "text-teal-500",
      content: phoneSaved ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <Check className="w-4 h-4" />
          Number saved · You'll be notified when SMS is live
        </div>
      ) : (
        <form onSubmit={handleSavePhone} className="flex gap-2">
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="+1 (555) 000-0000"
            required
            data-testid="notif-sms-input"
            className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 min-w-0"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!phoneInput.trim()} className="rounded-xl shrink-0 opacity-70" data-testid="notif-sms-submit">
            Notify Me
          </Button>
        </form>
      ),
    },
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
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full sm:max-w-md bg-card border border-border/60 rounded-t-3xl sm:rounded-2xl shadow-2xl mx-0 sm:mx-4 overflow-hidden"
      >
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Reminders</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Choose how you want to be reminded</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors" data-testid="notif-close">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 pb-8 pt-4 space-y-5">
          {sections.map(({ id, icon: Icon, label, description, color, content }) => (
            <div key={id} className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${color} shrink-0`} />
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="pl-6">{content}</div>
              {id !== "sms" && <div className="h-px bg-border/40" />}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
