import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Compass, Heart, Home, NotebookPen, Search, Sun } from "lucide-react";
import { NavBarMoreMenu } from "@/components/NavBarMoreMenu";
import { ConvictionTopWhisper } from "@/components/ConvictionTopWhisper";
import { BrandIcon } from "@/components/BrandIcon";
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
import { applyHomeScrollToTop } from "@/lib/scrollPageToTop";
import { openConvictionPanel } from "@/lib/openConvictionPanel";
import { isNativeWebViewShell } from "@/lib/platform";

const NAV_ITEMS = [
  { href: "/devotional", label: "Devotional", icon: Sun },
  { href: "/understand", label: "Journey", icon: Compass },
  { href: "/read", label: "Bible", icon: BookOpen },
  { href: "/study", label: "Study", icon: Search },
  { href: "/journal", label: "Journal", icon: NotebookPen },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/", label: "For You", icon: Home, bookmark: null },
  { href: "/guidance", label: "Guidance", icon: Heart, bookmark: null },
  { href: "/understand", label: "Journey", icon: Compass, bookmark: "journey" as BookmarkSection },
  { href: "/journal", label: "Journal", icon: NotebookPen, bookmark: "journal" as BookmarkSection },
];

const NAV_BOOKMARK_MAP: Record<string, BookmarkSection> = {
  "/devotional": "devotional",
  "/understand": "journey",
  "/read": "read",
  "/study": "study",
  "/journal": "journal",
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
  const [location, setLocation] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [guidanceTone, setGuidanceTone] = useState<GuidanceMode>(() => getGuidanceMode());
  const [coachConsentOpen, setCoachConsentOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const inNativeApp = isNativeWebViewShell();

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
    const handler = (e: Event) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const id = window.setTimeout(() => {
      document.addEventListener("mousedown", handler, true);
      document.addEventListener("touchstart", handler, true);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("touchstart", handler, true);
    };
  }, [moreOpen]);

  const overHomeHero = location === "/" || location === "";
  const needsNotificationNudge =
    typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted";

  const moreMenu = (
    <NavBarMoreMenu
      onOpenConviction={openConvictionPanel}
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
  );

  const langPicker = (
    <AnimatePresence>
      {langOpen && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="absolute right-3 top-14 z-[250] bg-background border border-border rounded-xl shadow-lg py-1.5 min-w-[160px]"
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              data-testid={`lang-${l.code}`}
              onClick={() => {
                setLang(l.code as LangCode);
                setLangOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-sm hover:bg-muted/70 transition-colors"
            >
              <span className="font-medium">{l.native}</span>
              {lang === l.code && <span className="text-primary text-xs font-bold">✓</span>}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const emailPanel = (
    <AnimatePresence>{emailOpen && <EmailSubscribePanel onClose={() => setEmailOpen(false)} />}</AnimatePresence>
  );

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
      {showTop && inNativeApp && (
        <nav
          className="fixed top-0 left-0 right-0 z-[200] pointer-events-none"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          aria-label="App menu"
        >
          <div className="relative max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center pointer-events-none">
            <div className="pointer-events-auto shrink-0">
              <ConvictionTopWhisper />
            </div>
            <div className="ml-auto shrink-0 relative pointer-events-auto">
              {moreMenu}
              {langPicker}
              {emailPanel}
            </div>
          </div>
        </nav>
      )}

      {showTop && !inNativeApp && (
        <nav
          className={`fixed top-0 left-0 right-0 z-[100] ${
            overHomeHero
              ? "bg-gradient-to-b from-[#09031e]/88 via-[#09031e]/45 to-transparent backdrop-blur-md"
              : "bg-background/85 backdrop-blur-xl border-b border-border/40"
          }`}
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          aria-label="App menu"
        >
          <div className="relative max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-1">
            <Link
              href="/"
              onClick={() => {
                markReturningHome();
                applyHomeScrollToTop();
              }}
              className="hidden sm:block shrink-0 mr-1.5"
              title="Shepherd's Path"
              data-testid="nav-home-logo"
            >
              <BrandIcon
                size={40}
                className={`rounded-[12px] shadow-sm select-none ring-1 ring-primary/15 ${
                  overHomeHero ? "drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]" : ""
                }`}
              />
            </Link>

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
                          ? "text-white/90 hover:text-white hover:bg-white/12"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {hasPlace && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />
                    )}
                    <span className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-foreground text-background text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[110]">
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="flex-1 sm:hidden" />

            <div className="flex items-center gap-0.5 shrink-0 ml-auto sm:ml-0">
              <div className="hidden sm:block shrink-0 mr-0.5">
                <ConvictionTopWhisper />
              </div>
              {moreMenu}
              {langPicker}
              {emailPanel}
            </div>
          </div>
        </nav>
      )}

      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/82 backdrop-blur-xl border-t border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-[60px] px-1">
          {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon, bookmark }) => {
            const isHome = href === "/";
            const active = isHome
              ? location === "/" || location === ""
              : location === href || location.startsWith(href + "/");
            const hasPlace =
              bookmark && BOOKMARK_DOT_SECTIONS.has(bookmark) && bookmarked.has(bookmark) && !active;

            const goHome = () => {
              markReturningHome();
              if (!active) setLocation("/");
              applyHomeScrollToTop();
              requestAnimationFrame(() => applyHomeScrollToTop());
              window.setTimeout(() => applyHomeScrollToTop(), 120);
              window.setTimeout(() => {
                applyHomeScrollToTop();
                try {
                  (
                    window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
                  ).ReactNativeWebView?.postMessage(JSON.stringify({ type: "scroll_home_top" }));
                } catch {
                  /* noop */
                }
              }, 280);
            };

            if (isHome) {
              return (
                <button
                  key={href}
                  type="button"
                  data-testid="bottom-nav-for-you"
                  onClick={goHome}
                  className="flex flex-col items-center justify-center flex-1 h-full transition-all border-0 bg-transparent p-0 cursor-pointer"
                >
                  {active ? (
                    <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary border border-white/15 ring-1 ring-zinc-900/55 shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
                      <Icon className="w-5 h-5 text-white shrink-0" />
                      <span className="text-[13px] font-bold text-white leading-none">{label}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5 relative px-2.5 py-1.5 rounded-xl bg-zinc-900/35 border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <Icon className="w-[22px] h-[22px] text-zinc-300/85" />
                      <span className="text-[11px] font-semibold text-zinc-300/80 leading-none">{label}</span>
                    </div>
                  )}
                </button>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                data-testid={`bottom-nav-${label.toLowerCase()}`}
                className="flex flex-col items-center justify-center flex-1 h-full transition-all"
              >
                {active ? (
                  <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary border border-white/15 ring-1 ring-zinc-900/55 shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
                    <Icon
                      className={`${href === "/" ? "w-5 h-5" : "w-[18px] h-[18px]"} text-white shrink-0`}
                    />
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
