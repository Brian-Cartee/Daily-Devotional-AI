import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Sun, Compass, NotebookPen, Bell, Search, Mail, Globe, Check, Heart, ShoppingBag, HelpCircle, MoreHorizontal, Home } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationSettings } from "@/components/NotificationSettings";
import { EmailSubscribePanel } from "@/components/EmailSubscribe";
import { useLanguage, LANGUAGES, type LangCode } from "@/lib/language";
import { hasBookmark, type BookmarkSection } from "@/lib/bookmarks";


const NAV_ITEMS = [
  { href: "/devotional", label: "Devotional", icon: Sun },
  { href: "/understand", label: "Journey",    icon: Compass },
  { href: "/read",       label: "Bible",      icon: BookOpen },
  { href: "/study",      label: "Study",      icon: Search },
  { href: "/journal",    label: "Journal",    icon: NotebookPen },
  { href: "/stories",    label: "Stories",    icon: Heart },
  { href: "/store",      label: "Store",      icon: ShoppingBag },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/",           label: "Home",       icon: Home,        bookmark: null },
  { href: "/devotional", label: "Devotional", icon: Sun,         bookmark: "devotional" as BookmarkSection },
  { href: "/understand", label: "Journey",    icon: Compass,     bookmark: "journey" as BookmarkSection },
  { href: "/read",       label: "Bible",      icon: BookOpen,    bookmark: "read" as BookmarkSection },
  { href: "/journal",    label: "Journal",    icon: NotebookPen, bookmark: "journal" as BookmarkSection },
];

const NAV_BOOKMARK_MAP: Record<string, BookmarkSection> = {
  "/devotional": "devotional",
  "/understand": "journey",
  "/read":       "read",
  "/study":      "study",
  "/journal":    "journal",
};

const BOOKMARK_DOT_SECTIONS = new Set<BookmarkSection>(["journey", "read"]);

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
  const [moreOpen,  setMoreOpen]  = useState(false);
  const { lang, setLang } = useLanguage();
  const bookmarked = useBookmarkedSections();
  const moreRef = useRef<HTMLDivElement>(null);

  const closeAll = () => { setNotifOpen(false); setEmailOpen(false); setLangOpen(false); setMoreOpen(false); };

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  return (
    <>
      {/* ── Top navigation bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-1">

          {/* Logo — icon only */}
          <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="shrink-0 mr-2" title="Shepherd's Path">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm">
              <img
                src="/cross-path-transparent.png"
                alt="Shepherd's Path"
                className="w-full h-full select-none"
                style={{ objectFit: "cover", objectPosition: "50% 30%" }}
                draggable={false}
              />
            </div>
          </Link>

          {/* Nav items — desktop only, icon + tooltip */}
          <div className="hidden sm:flex items-center gap-0.5 flex-1 min-w-0">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = location === href || location.startsWith(href + "/");
              const bm = NAV_BOOKMARK_MAP[href];
              const hasPlace = bm && BOOKMARK_DOT_SECTIONS.has(bm) && bookmarked.has(bm) && !active;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-${label.toLowerCase()}`}
                  title={label}
                  className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all group ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {hasPlace && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />
                  )}
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-foreground text-background text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Spacer on mobile */}
          <div className="flex-1 sm:hidden" />

          {/* Utility icons */}
          <div className="flex items-center gap-0.5 shrink-0">

            {/* ⋯ More menu — Mail, Language, Help */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => { setMoreOpen((v) => !v); setNotifOpen(false); setEmailOpen(false); setLangOpen(false); }}
                data-testid="button-more-menu"
                aria-label="More options"
                title="More"
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  moreOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                <MoreHorizontal className="w-[18px] h-[18px]" />
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 z-50 bg-background border border-border rounded-xl shadow-lg py-1.5 min-w-[180px]"
                  >
                    {/* Email subscribe */}
                    <button
                      onClick={() => { setMoreOpen(false); setEmailOpen((v) => !v); }}
                      data-testid="button-subscribe-toggle"
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-muted/70 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Daily Verse Email</span>
                    </button>

                    {/* Language submenu trigger */}
                    <button
                      onClick={() => { setMoreOpen(false); setLangOpen((v) => !v); }}
                      data-testid="button-language-toggle"
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-muted/70 transition-colors"
                    >
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Language</span>
                    </button>

                    {/* How to use */}
                    <Link
                      href="/how-to-use"
                      data-testid="nav-how-to-use"
                      onClick={() => setMoreOpen(false)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-muted/70 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">How to Use</span>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Language picker — floats independently */}
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-4 top-14 z-50 bg-background border border-border rounded-xl shadow-lg py-1.5 min-w-[160px]"
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

            {/* Email panel */}
            <AnimatePresence>
              {emailOpen && <EmailSubscribePanel onClose={() => setEmailOpen(false)} />}
            </AnimatePresence>

            {/* Bell / Reminders */}
            <div className="relative">
              {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" ? (
                <button
                  onClick={() => { closeAll(); setNotifOpen(true); }}
                  data-testid="nav-notifications"
                  aria-label="Turn on reminders"
                  className="flex items-center gap-1 pl-2 pr-2.5 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-all shrink-0 border border-amber-200 dark:border-amber-700/40"
                >
                  <Bell className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-bold leading-none hidden min-[380px]:inline">Reminders</span>
                </button>
              ) : (
                <button
                  onClick={() => { closeAll(); setNotifOpen(true); }}
                  data-testid="nav-notifications"
                  aria-label="Notification settings"
                  title="Reminders"
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all shrink-0"
                >
                  <Bell className="w-[18px] h-[18px]" />
                </button>
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
            const hasPlace = bookmark && BOOKMARK_DOT_SECTIONS.has(bookmark) && bookmarked.has(bookmark) && !active;
            return (
              <Link
                key={href}
                href={href}
                data-testid={`bottom-nav-${label.toLowerCase()}`}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className={`w-10 h-7 min-[430px]:w-12 min-[430px]:h-9 flex items-center justify-center rounded-xl transition-all relative ${
                  active ? "bg-primary/10" : ""
                }`}>
                  <Icon className={`transition-all ${active ? "w-5 h-5 min-[430px]:w-6 min-[430px]:h-6" : "w-[18px] h-[18px] min-[430px]:w-[22px] min-[430px]:h-[22px]"}`} />
                  {hasPlace && (
                    <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />
                  )}
                </div>
                <span className={`text-[10px] min-[430px]:text-[12px] font-semibold leading-none ${active ? "text-primary" : "text-muted-foreground"}`}>
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
