import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Sun, Compass, NotebookPen, Bell, Search, Mail, Globe, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationSettings } from "@/components/NotificationSettings";
import { EmailSubscribePanel } from "@/components/EmailSubscribe";
import { useLanguage, LANGUAGES, type LangCode } from "@/lib/language";

const NAV_ITEMS = [
  { href: "/devotional", label: "Devotional", icon: Sun },
  { href: "/understand", label: "Journey",    icon: Compass },
  { href: "/read",       label: "Read",       icon: BookOpen },
  { href: "/study",      label: "Study",      icon: Search },
  { href: "/journal",    label: "Journal",    icon: NotebookPen },
];

export function NavBar() {
  const [location] = useLocation();
  const [notifOpen, setNotifOpen]   = useState(false);
  const [emailOpen, setEmailOpen]   = useState(false);
  const [langOpen,  setLangOpen]    = useState(false);
  const { lang, setLang } = useLanguage();

  const closeAll = () => { setNotifOpen(false); setEmailOpen(false); setLangOpen(false); };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2">

          {/* Logo — icon only on mobile, stacked wordmark on sm+ */}
          <Link href="/" className="flex items-center gap-2 group shrink-0 mr-1">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 overflow-hidden">
              <img src="/sp-logo.png" alt="SP" className="w-full h-full object-contain scale-[1.15]" style={{ mixBlendMode: "screen" }} />
            </div>
            <div className="hidden sm:flex flex-col leading-none select-none">
              <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-foreground/60 mb-[2px]">Shepherd's</span>
              <span className="text-[1.35rem] font-black tracking-tight text-foreground leading-none">PATH</span>
            </div>
          </Link>

          {/* All 5 nav items together */}
          <div className="flex items-center gap-0 flex-1 min-w-0">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = location === href || location.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-${label.toLowerCase()}`}
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all whitespace-nowrap ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Utility icons — Mail · Globe · Bell — always on the right */}
          <div className="flex items-center gap-0 shrink-0">

            {/* Daily email */}
            <div className="relative">
              <button
                onClick={() => { setEmailOpen((v) => !v); setNotifOpen(false); setLangOpen(false); }}
                data-testid="button-subscribe-toggle"
                aria-label="Subscribe to daily verse emails"
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  emailOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {emailOpen && <EmailSubscribePanel onClose={() => setEmailOpen(false)} />}
              </AnimatePresence>
            </div>

            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => { setLangOpen((v) => !v); setEmailOpen(false); setNotifOpen(false); }}
                data-testid="button-language-toggle"
                aria-label="Change language"
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  langOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 z-50 bg-background border border-border rounded-xl shadow-lg py-1.5 min-w-[150px]"
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        data-testid={`lang-${l.code}`}
                        onClick={() => { setLang(l.code as LangCode); setLangOpen(false); }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-sm hover:bg-muted/70 transition-colors"
                      >
                        <span className="font-medium">{l.native}</span>
                        {lang === l.code && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => { closeAll(); setNotifOpen(true); }}
                data-testid="nav-notifications"
                aria-label="Notification settings"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all shrink-0"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
              {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse pointer-events-none" />
              )}
            </div>

          </div>
        </div>
      </nav>

      <AnimatePresence>
        {notifOpen && <NotificationSettings onClose={() => setNotifOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
