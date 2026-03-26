import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, MessageCircle, Bell, Users, RefreshCw, LogOut, CheckCircle, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADMIN_SESSION_KEY = "sp-admin-token";

type Counts = { emailSubscribers: number; smsSubscribers: number; pushSubscriptions: number };
type EmailEntry = { id: number; name: string | null; email: string; active: boolean; createdAt: string | null; includeDailyArt: boolean };
type SmsEntry = { phone: string; lastMessageAt: string | null; exchangeCount: number; joinedPrayerNetwork: boolean; createdAt: string | null };
type Overview = { counts: Counts; emailList: EmailEntry[]; smsList: SmsEntry[] };

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl px-6 py-5 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </motion.div>
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
  const [activeTab, setActiveTab] = useState<"email" | "sms">("email");

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
      {/* Header */}
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

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stat cards */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Mail} label="Email subscribers" value={overview.counts.emailSubscribers} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
            <StatCard icon={MessageCircle} label="SMS subscribers" value={overview.counts.smsSubscribers} color="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
            <StatCard icon={Bell} label="Push notifications" value={overview.counts.pushSubscriptions} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
          </div>
        )}

        {/* Tabs */}
        {overview && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-border/50">
              <button
                data-testid="tab-email"
                onClick={() => setActiveTab("email")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === "email"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Email ({overview.emailList.length})
              </button>
              <button
                data-testid="tab-sms"
                onClick={() => setActiveTab("sms")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === "sms"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                SMS ({overview.smsList.length})
              </button>
            </div>

            {/* Email table */}
            {activeTab === "email" && (
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

            {/* SMS table */}
            {activeTab === "sms" && (
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
        )}

        {loading && !overview && (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading...</div>
        )}
      </main>
    </div>
  );
}
