import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Sun, Compass, NotebookPen, Search, Check, Heart, Home } from "lucide-react";
import { NavBarMoreMenu } from "@/components/NavBarMoreMenu";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationSettings } from "@/components/NotificationSettings";
import { EmailSubscribePanel } from "@/components/EmailSubscribe";
import { useLanguage, LANGUAGES, type LangCode } from "@/lib/language";
import { hasBookmark, type BookmarkSection } from "@/lib/bookmarks";
import { getGuidanceMode, saveGuidanceMode, type GuidanceMode } from "@/lib/guidanceMode";
import {
  grantCoachConsentThisSession,
  hasCoachConsentThisSession,
} from "@/lib/coachConsent";
import { CoachConsentModal } from "@/components/coach/CoachConsentModal";
import { useTheme } from "@/lib/theme";
import { getUserVoice, setUserVoice } from "@/lib/userName";
import { markReturningHome } from "@/lib/introState";
import { BrandIcon } from "@/components/BrandIcon";


const NAV_ITEMS = [
  { href: "/devotional", label: "Devotional", icon: Sun },
  { href: "/understand", label: "Journey",    icon: Compass },
  { href: "/read",       label: "Bible",      icon: BookOpen },
  { href: "/study",      label: "Study",      icon: Search },
  { href: "/journal",    label: "Journal",    icon: NotebookPen },
  { href: "/stories",    label: "Stories",    icon: Heart },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/",           label: "For You",   icon: Home,        bookmark: null },
  { href: "/guidance",   label: "Guidance",  icon: Heart,       bookmark: null },
  { href: "/understand", label: "Journey",   icon: Compass,     bookmark: "journey" as BookmarkSection },
  { href: "/journal",    label: "Journal",   icon: NotebookPen, bookmark: "journal" as BookmarkSection },
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

export function NavBar({ showTop = true }: { showTop?: boolean } = {}) {
  const [location] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [langOpen,  setLangOpen]  = useState(false);
  const [moreOpen,  setMoreOpen]  = useState(false);
  const [guidanceTone, setGuidanceTone] = useState<GuidanceMode>(() => getGuidanceMode());
  const [coachConsentOpen, setCoachConsentOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const applyGuidanceTone = (mode: GuidanceMode) => {
    saveGuidanceMode(mode);
    setGuidanceTone(mode);
  };

  const toggleTone = () => {
    if (guidanceTone === "coach") {
      applyGuidanceTone("encouraging");
      return;
    }
    if (!hasCoachConsentThisSession()) {
      setCoachConsentOpen(true);
      return;
    }
    applyGuidanceTone("coach");
  };
  const [voicePref, setVoicePref] = useState<string>(() => getUserVoice());
  const toggleVoice = () => {
    const next = voicePref === "onyx" ? "shimmer" : "onyx";
    setUserVoice(next);
    setVoicePref(next);
  };

  const { lang, setLang } = useLanguage();
  const bookmarked = useBookmarkedSections();
  const moreRef = useRef<HTMLDivElement>(null);

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

  const overHomeHero = location === "/";
  const needsNotificationNudge =
    typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted";

  return (
    <>
      <CoachConsentModal
        open={coachConsentOpen}
        onAccept={() => {
          grantCoachConsentThisSession();
          setCoachConsentOpen(false);
          applyGuidanceTone("coach");
        }}
        onDecline={() => setCoachConsentOpen(false)}
      />
      {showTop && (
        <>
      {/* ── Top navigation bar — transparent on home so hero fills behind it ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 ${
          overHomeHero ? "bg-transparent" : "bg-background/80 backdrop-blur-xl"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="relative max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-1">

          {/* Logo — icon only */}
          <Link
            href="/"
            onClick={() => {
              markReturningHome();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="shrink-0 mr-2"
            title="Shepherd's Path"
          >
            <BrandIcon
              size={40}
              className={`rounded-[12px] shadow-sm select-none ring-1 ring-primary/15 ${
                overHomeHero ? "drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]" : ""
              }`}
            />
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
                      : overHomeHero
                        ? "text-white/85 hover:text-white hover:bg-white/12"
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

            <NavBarMoreMenu
              overHero={overHomeHero}
              menuRef={moreRef}
              open={moreOpen}
              onToggle={() => {
                setMoreOpen((v) => !v);
                setNotifOpen(false);
                setEmailOpen(false);
                setLangOpen(false);
              }}
              onClose={() => setMoreOpen(false)}
              theme={theme}
              onToggleTheme={toggleTheme}
              guidanceTone={guidanceTone}
              onToggleTone={toggleTone}
              voicePref={voicePref}
              onToggleVoice={toggleVoice}
              onOpenEmail={() => setEmailOpen(true)}
              onOpenLanguage={() => setLangOpen(true)}
              onOpenNotifications={() => setNotifOpen(true)}
              hasNotificationBadge={needsNotificationNudge}
            />

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

          </div>
        </div>
      </nav>
      </>
      )}

      {/* ── Bottom tab bar — mobile only ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/82 backdrop-blur-xl border-t border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-[60px] px-1">
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
                onClick={() => {
                  if (href === "/") markReturningHome();
                }}
                className="flex flex-col items-center justify-center flex-1 h-full transition-all"
              >
                {active ? (
                  <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary border border-white/15 ring-1 ring-zinc-900/55 shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
                    <Icon className={`${href === "/" ? "w-5 h-5" : "w-[18px] h-[18px]"} text-white shrink-0`} />
                    <span className="text-[13px] font-bold text-white leading-none">{label}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-0.5 relative px-2.5 py-1.5 rounded-xl bg-zinc-900/35 border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <Icon className="w-[22px] h-[22px] text-zinc-300/85" />
                    <span className="text-[11px] font-semibold text-zinc-300/80 leading-none">{label}</span>
                    {hasPlace && (
                      <span className="absolute -top-0.5 right-0 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />
                    )}
                  </div>
                )}
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
