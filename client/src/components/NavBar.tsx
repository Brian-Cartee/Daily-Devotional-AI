import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Sun, Compass, NotebookPen, Bell, Search, Mail, Globe, Check, Home } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationSettings } from "@/components/NotificationSettings";
import { EmailSubscribePanel } from "@/components/EmailSubscribe";
import { useLanguage, LANGUAGES, type LangCode } from "@/lib/language";
import { hasBookmark, type BookmarkSection } from "@/lib/bookmarks";

const NAV_ITEMS = [
  { href: "/devotional", label: "Devotional", icon: Sun },
  { href: "/understand", label: "Journey",    icon: Compass },
  { href: "/read",       label: "Read",       icon: BookOpen },
  { href: "/study",      label: "Study",      icon: Search },
  { href: "/journal",    label: "Journal",    icon: NotebookPen },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/",           label: "Home",       icon: Home,        bookmark: null },
  { href: "/devotional", label: "Devotional", icon: Sun,         bookmark: "devotional" as BookmarkSection },
  { href: "/understand", label: "Journey",    icon: Compass,     bookmark: "journey" as BookmarkSection },
  { href: "/read",       label: "Read",       icon: BookOpen,    bookmark: "read" as BookmarkSection },
  { href: "/study",      label: "Study",      icon: Search,      bookmark: "study" as BookmarkSection },
  { href: "/journal",    label: "Journal",    icon: NotebookPen, bookmark: "journal" as BookmarkSection },
];

const NAV_BOOKMARK_MAP: Record<string, BookmarkSection> = {
  "/devotional": "devotional",
  "/understand": "journey",
  "/read":       "read",
  "/study":      "study",
  "/journal":    "journal",
};

function useBookmarkedSections() {
  const [bookmarked, setBookmarked] = useState<Set<BookmarkSection>>(() => {
    const sections: BookmarkSection[] = ["read", "study", "journey", "devotional", "journal"];
    return new Set(sections.filter(hasBookmark));
  });
  useEffect(() => {
    const update = () => {
      const sections: BookmarkSection[] = ["read", "study", "journey", "devotional", "journal"];
      setBookmarked(new Set(sections.filter(hasBookmark)));
    };
    window.addEventListener("sp-bookmark-change", update);
    return () => window.removeEventListener("sp-bookmark-change", update);
  }, []);
  return bookmarked;
}

export function NavBar() {
  const [location] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [langOpen,  setLangOpen]  = useState(false);
  const { lang, setLang } = useLanguage();
  const bookmarked = useBookmarkedSections();

  const closeAll = () => { setNotifOpen(false); setEmailOpen(false); setLangOpen(false); };

  return (
    <>
      {/* ── Top navigation bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0 mr-1">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 overflow-hidden">
              <img src={logoSmall} alt="Shepherd's Path" className="w-6 h-6 object-contain rounded-md" />
            </div>
            <div className="hidden sm:flex flex-col leading-none select-none">
              <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-foreground/55 mb-[2px]">Shepherd's</span>
              <span className="text-[1.35rem] font-black tracking-tight text-foreground leading-none">PATH</span>
            </div>
          </Link>

          {/* Nav items — desktop only (mobile uses bottom tab bar) */}
          <div className="hidden sm:flex items-center gap-0 flex-1 min-w-0">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = location === href || location.startsWith(href + "/");
              const bm = NAV_BOOKMARK_MAP[href];
              const hasPlace = bm && bookmarked.has(bm) && !active;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-${label.toLowerCase()}`}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {hasPlace && (
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />
                    )}
                  </div>
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Spacer on mobile so utility icons sit at the right */}
          <div className="flex-1 sm:hidden" />

          {/* Utility icons — Mail · Globe · Bell */}
          <div className="flex items-center gap-0 shrink-0">

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

      {/* ── Bottom tab bar — mobile only ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-16">
          {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon, bookmark }) => {
            const active = href === "/"
              ? location === "/"
              : location === href || location.startsWith(href + "/");
            const hasPlace = bookmark && bookmarked.has(bookmark) && !active;
            return (
              <Link
                key={href}
                href={href}
                data-testid={`bottom-nav-${label.toLowerCase()}`}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className={`w-10 h-7 flex items-center justify-center rounded-xl transition-all relative ${
                  active ? "bg-primary/10" : ""
                }`}>
                  <Icon className={`transition-all ${active ? "w-5 h-5" : "w-[18px] h-[18px]"}`} />
                  {hasPlace && (
                    <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold leading-none ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {active && <span className="w-3.5 h-0.5 rounded-full bg-amber-400/80 -mt-px" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {notifOpen && <NotificationSettings onClose={() => setNotifOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
