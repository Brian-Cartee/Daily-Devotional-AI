import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, MessageCircle, Bell, Users, RefreshCw, LogOut, CheckCircle, XCircle, Shield, Activity, BookOpen, Heart, TrendingUp, Crown, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADMIN_SESSION_KEY = "sp-admin-token";

type Counts = { emailSubscribers: number; smsSubscribers: number; pushSubscriptions: number };
type EmailEntry = { id: number; name: string | null; email: string; active: boolean; createdAt: string | null; includeDailyArt: boolean };
type SmsEntry = { phone: string; lastMessageAt: string | null; exchangeCount: number; joinedPrayerNetwork: boolean; createdAt: string | null };
type Overview = { counts: Counts; emailList: EmailEntry[]; smsList: SmsEntry[] };

type Analytics = {
  sessions: { total: number; activeToday: number; avgStreak: number; maxStreak: number; longestEver: number };
  journalDaily: { day: string; count: number }[];
  prayerDaily: { day: string; count: number }[];
  journalTotal30d: number;
  pro: { total: number; active: number };
  streakDist: { current_streak: number; sessions: number }[];
};

type ServiceStatus = { ok: boolean; message: string };
type HealthData = {
  status: "ok" | "degraded" | "down";
  ts: string;
  uptimeSeconds: number;
  services: {
    database: ServiceStatus;
    dailyVerse: ServiceStatus;
    openai: ServiceStatus;
    email: ServiceStatus;
    push: ServiceStatus;
    sms: ServiceStatus;
    googleSheets: ServiceStatus;
  };
};

const SERVICE_LABELS: Record<string, string> = {
  database: "Database",
  dailyVerse: "Daily Verse",
  openai: "AI (OpenAI)",
  email: "Email (Resend)",
  push: "Push Notifications",
  sms: "SMS (Twilio)",
  googleSheets: "Google Sheets",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function MiniBarChart({ data, label, barColor }: { data: { day: string; count: number }[]; label: string; barColor: string }) {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold text-foreground mb-3">{label}</p>
        <div className="text-center py-8 text-muted-foreground text-sm">No activity yet</div>
      </div>
    );
  }

  const last14Days: { day: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = data.find(r => r.day === key);
    last14Days.push({ day: key, count: found ? found.count : 0 });
  }

  const maxCount = Math.max(...last14Days.map(d => d.count), 1);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-sm font-semibold text-foreground mb-4">{label}</p>
      <div className="flex items-end gap-1 h-24">
        {last14Days.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 8 : 4)}%`,
                backgroundColor: d.count > 0 ? barColor : "rgba(0,0,0,0.08)",
              }}
            />
            {d.count > 0 && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded px-1">
                {d.count}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">{formatShortDate(last14Days[0].day)}</span>
        <span className="text-[10px] text-muted-foreground">{formatShortDate(last14Days[13].day)}</span>
      </div>
    </div>
  );
}

function UsageTab({ token }: { token: string }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics", { headers: { "x-admin-token": token } });
      if (!res.ok) throw new Error("Failed");
      setAnalytics(await res.json());
    } catch {
      setError("Could not load usage data.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) return <div className="text-center py-16 text-muted-foreground text-sm">Loading usage data…</div>;
  if (error) return <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">{error}</div>;
  if (!analytics) return null;

  const { sessions, journalDaily, prayerDaily, journalTotal30d, pro, streakDist } = analytics;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total sessions" value={sessions.total} color="bg-primary/10 text-primary" />
        <StatCard icon={Activity} label="Active today" value={sessions.activeToday} color="bg-green-500/10 text-green-600 dark:text-green-400" />
        <StatCard icon={BookOpen} label="Journal (30d)" value={journalTotal30d} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <StatCard icon={Crown} label="Pro subscribers" value={pro.active} sub={pro.total > pro.active ? `${pro.total} total` : undefined} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Flame} label="Avg streak" value={`${sessions.avgStreak}d`} color="bg-orange-500/10 text-orange-600 dark:text-orange-400" />
        <StatCard icon={TrendingUp} label="Highest streak" value={`${sessions.maxStreak}d`} color="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
        <StatCard icon={TrendingUp} label="Longest ever" value={`${sessions.longestEver}d`} color="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MiniBarChart data={journalDaily} label="Journal entries — last 14 days" barColor="#3b82f6" />
        <MiniBarChart data={prayerDaily} label="Prayer wall posts — last 14 days" barColor="#8b5cf6" />
      </div>

      {streakDist.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Active streaks breakdown</p>
          <div className="space-y-2">
            {streakDist.map((row) => (
              <div key={row.current_streak} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{row.current_streak} {row.current_streak === 1 ? "day" : "days"}</span>
                <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full"
                    style={{ width: `${(row.sessions / sessions.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{row.sessions} {row.sessions === 1 ? "person" : "people"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          data-testid="button-analytics-refresh"
          variant="ghost"
          size="sm"
          onClick={fetchAnalytics}
          className="rounded-xl text-muted-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>
    </motion.div>
  );
}

function HealthTab() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const fetchHealth = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/health");
      setHealth(await res.json());
      setLastChecked(new Date());
    } catch {
      setError("Could not reach health endpoint.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchHealth(); }, []);

  const statusColors = {
    ok: "bg-green-500/10 text-green-700 dark:text-green-400",
    degraded: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    down: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
  const dotColors = { ok: "bg-green-500", degraded: "bg-amber-500", down: "bg-red-500" };
  const statusLabels = {
    ok: "All systems operational",
    degraded: "Some services degraded",
    down: "Critical issues detected",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {health && (
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[health.status]}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${dotColors[health.status]}`} />
              {statusLabels[health.status]}
            </span>
          )}
          {lastChecked && (
            <p className="text-xs text-muted-foreground pl-1">
              Checked at {lastChecked.toLocaleTimeString()}
              {health && ` · Uptime ${formatUptime(health.uptimeSeconds)}`}
            </p>
          )}
        </div>
        <Button
          data-testid="button-health-refresh"
          variant="ghost"
          size="sm"
          onClick={fetchHealth}
          disabled={loading}
          className="rounded-xl"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Checking…" : "Re-check"}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {health && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl divide-y divide-border/50 overflow-hidden">
          {Object.entries(health.services).map(([key, svc]) => (
            <div key={key} data-testid={`health-row-${key}`} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${svc.ok ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm font-medium text-foreground">{SERVICE_LABELS[key] ?? key}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground text-right max-w-[200px]">{svc.message}</span>
                {svc.ok
                  ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {!health && !loading && !error && (
        <div className="text-center py-10 text-muted-foreground text-sm">No data yet.</div>
      )}

      <div className="bg-muted/30 border border-border/50 rounded-xl px-5 py-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-[13px] mb-2">External uptime monitoring</p>
        <p>For 24/7 alerts, connect this URL to a free service like <strong>UptimeRobot</strong> or <strong>Better Uptime</strong>:</p>
        <code className="block mt-2 bg-background border border-border rounded-lg px-3 py-2 text-[11px] font-mono break-all select-all">
          https://daily-devotional-ai.replit.app/api/health
        </code>
        <p className="mt-2">Set it to ping every 5 minutes and alert you by email or SMS if status is not 200.</p>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: password }),
      });
      if (res.ok) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, password);
        onLogin(password);
      } else {
        const data = await res.json();
        setError(data.message || "Wrong password.");
      }
    } catch {
      setError("Could not connect. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Enter your admin password to continue.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              data-testid="input-admin-password"
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              className="rounded-xl"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              data-testid="button-admin-login"
              type="submit"
              disabled={!password || loading}
              className="w-full rounded-xl"
            >
              {loading ? "Checking..." : "Enter"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(ADMIN_SESSION_KEY));
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"usage" | "email" | "sms" | "health">("usage");

  const fetchOverview = async (t: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "x-admin-token": t },
      });
      if (res.status === 401) { setToken(null); sessionStorage.removeItem(ADMIN_SESSION_KEY); return; }
      if (!res.ok) throw new Error("Failed to load");
      setOverview(await res.json());
    } catch {
      setError("Could not load data. Please refresh.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchOverview(token);
  }, [token]);

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setToken(null);
    setOverview(null);
  };

  if (!token) return <LoginScreen onLogin={(t) => { setToken(t); }} />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-foreground">Shepherd's Path — Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="button-admin-refresh"
              variant="ghost"
              size="sm"
              onClick={() => token && fetchOverview(token)}
              disabled={loading}
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              data-testid="button-admin-logout"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl text-muted-foreground"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {overview && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Mail} label="Email subscribers" value={overview.counts.emailSubscribers} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
            <StatCard icon={MessageCircle} label="SMS subscribers" value={overview.counts.smsSubscribers} color="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
            <StatCard icon={Bell} label="Push notifications" value={overview.counts.pushSubscriptions} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex gap-1 border-b border-border/50 overflow-x-auto">
            {([
              { id: "usage", label: "Usage", icon: TrendingUp },
              { id: "health", label: "System Health", icon: Activity },
              { id: "email", label: `Email${overview ? ` (${overview.emailList.length})` : ""}`, icon: Mail },
              { id: "sms", label: `SMS${overview ? ` (${overview.smsList.length})` : ""}`, icon: MessageCircle },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                data-testid={`tab-${id}`}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  activeTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {activeTab === "usage" && token && (
            <UsageTab token={token} />
          )}

          {activeTab === "health" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <HealthTab />
            </motion.div>
          )}

          {activeTab === "email" && overview && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl overflow-hidden">
              {overview.emailList.length === 0 ? (
                <div className="px-6 py-10 text-center text-muted-foreground text-sm">No email subscribers yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Art</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.emailList.map((s, i) => (
                        <tr key={s.id} data-testid={`row-email-${s.id}`} className={`border-b border-border/50 last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                          <td className="px-4 py-3 text-foreground">{s.name || <span className="text-muted-foreground italic">—</span>}</td>
                          <td className="px-4 py-3 text-foreground font-mono text-xs">{s.email}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(s.createdAt)}</td>
                          <td className="px-4 py-3">
                            {s.includeDailyArt
                              ? <CheckCircle className="w-4 h-4 text-green-500" />
                              : <XCircle className="w-4 h-4 text-muted-foreground/40" />}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.active ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                              {s.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "sms" && overview && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl overflow-hidden">
              {overview.smsList.length === 0 ? (
                <div className="px-6 py-10 text-center text-muted-foreground text-sm">No SMS subscribers yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Enrolled</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Message</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Exchanges</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prayer Network</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.smsList.map((s, i) => (
                        <tr key={s.phone} data-testid={`row-sms-${i}`} className={`border-b border-border/50 last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                          <td className="px-4 py-3 text-foreground font-mono text-xs">{s.phone}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(s.createdAt)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(s.lastMessageAt)}</td>
                          <td className="px-4 py-3 text-foreground">{s.exchangeCount}</td>
                          <td className="px-4 py-3">
                            {s.joinedPrayerNetwork
                              ? <CheckCircle className="w-4 h-4 text-green-500" />
                              : <XCircle className="w-4 h-4 text-muted-foreground/40" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {loading && !overview && (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading...</div>
        )}
      </main>
    </div>
  );
}
