import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Compass, Home, MessageCircle, NotebookPen, Search, Sun } from "lucide-react";
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
  getDevotionalEntryMode,
  setDevotionalEntryMode,
  type DevotionalEntryMode,
} from "@/lib/devotionalEntry";
import { TALK_IT_THROUGH_LABEL } from "@/lib/navigationLabels";
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
import { isNativeWebViewShell, usesCompactTopNav } from "@/lib/platform";
import { useEntryOverlayActive } from "@/lib/entryOverlayState";
import { getRhythm } from "@/lib/faithRhythm";
import { useEmailSubscriptionStatus } from "@/hooks/use-email-subscription";

const NAV_ITEMS = [
  { href: "/devotional", label: "Devotional", icon: Sun },
  { href: "/understand", label: "Journey", icon: Compass },
  { href: "/read", label: "Bible", icon: BookOpen },
  { href: "/study", label: "Study", icon: Search },
  { href: "/journal", label: "Journal", icon: NotebookPen },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, bookmark: null, navId: "for-you" },
  {
    href: "/devotional",
    label: "Today",
    icon: Sun,
    bookmark: "devotional" as BookmarkSection,
    navId: "today",
  },
  { href: "/guidance", label: TALK_IT_THROUGH_LABEL, icon: MessageCircle, bookmark: null, navId: "guidance" },
  {
    href: "/understand",
    label: "Journey",
    icon: Compass,
    bookmark: "journey" as BookmarkSection,
    navId: "journey",
  },
] as const;

function BottomNavVisual({
  active,
  label,
  icon: Icon,
  hasPlace,
}: {
  active: boolean;
  label: string;
  icon: typeof Home;
  hasPlace: boolean;
}) {
  if (active) {
    return (
      <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary border border-white/15 ring-1 ring-zinc-900/55 shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
        <Icon className="w-[18px] h-[18px] text-white shrink-0" aria-hidden />
        <span className="text-[13px] font-bold text-white leading-none whitespace-nowrap">{label}</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-9 h-9 rounded-xl">
      <Icon className="w-[17px] h-[17px] text-zinc-300/85" aria-hidden />
      {hasPlace && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />
      )}
    </div>
  );
}

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
  const [devotionalEntry, setDevotionalEntry] = useState<DevotionalEntryMode>(
    () => getDevotionalEntryMode(),
  );
  const [coachConsentOpen, setCoachConsentOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const inNativeApp = isNativeWebViewShell();
  const compactTopNav = usesCompactTopNav();
  const entryOverlayActive = useEntryOverlayActive();

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

  const { subscribed: emailSubscribed } = useEmailSubscriptionStatus();
  const [rhythmDone, setRhythmDone] = useState(() => getRhythm() !== null);

  useEffect(() => {
    const refresh = () => setRhythmDone(getRhythm() !== null);
    window.addEventListener("sp-rhythm-updated", refresh);
    return () => window.removeEventListener("sp-rhythm-updated", refresh);
  }, []);

  const emailDone = emailSubscribed;
  // On iOS, "My rhythm" = daily email (no push available), so rhythm is done when email is done
  const effectiveRhythmDone = inNativeApp ? emailDone : rhythmDone;
  const needsSetupNudge = !effectiveRhythmDone || !emailDone;

  const overHomeHero = location === "/" || location === "";
  const overCinematicHero =
    overHomeHero ||
    location === "/about" ||
    location === "/prayer-wall" ||
    location === "/greatest-gift" ||
    location === "/how-to-use" ||
    location === "/guidance" ||
    location.startsWith("/guidance/") ||
    location === "/devotional" ||
    location.startsWith("/devotional/") ||
    location === "/understand" ||
    location.startsWith("/understand/") ||
    location === "/journal" ||
    location.startsWith("/journal/");
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
      onSetTheme={setTheme}
      devotionalEntry={devotionalEntry}
      onSetDevotionalEntry={(mode) => {
        setDevotionalEntryMode(mode);
        setDevotionalEntry(mode);
      }}
      guidanceTone={guidanceTone}
      onToggleTone={toggleTone}
      voicePref={voicePref}
      onToggleVoice={toggleVoice}
      onOpenEmail={() => setEmailOpen(true)}
      onOpenLanguage={() => setLangOpen(true)}
      onOpenNotifications={() => setNotifOpen(true)}
      hasNotificationBadge={needsNotificationNudge}
      hasSetupBadge={needsSetupNudge}
      rhythmDone={effectiveRhythmDone}
      emailDone={emailDone}
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
      {showTop && compactTopNav && !entryOverlayActive && (
        <nav
          data-testid="native-top-nav"
          aria-label="App menu"
          style={
            inNativeApp
              ? {
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 9999,
                  paddingTop: "env(safe-area-inset-top, 0px)",
                  pointerEvents: "none",
                }
              : { paddingTop: "env(safe-area-inset-top, 0px)" }
          }
          className={inNativeApp ? undefined : "fixed top-0 left-0 right-0 z-[250] pointer-events-none"}
        >
          <div
            style={
              inNativeApp
                ? {
                    position: "relative",
                    maxWidth: "56rem",
                    marginLeft: "auto",
                    marginRight: "auto",
                    paddingLeft: "12px",
                    paddingRight: "12px",
                    height: "38px",
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                    boxSizing: "border-box",
                  }
                : undefined
            }
            className={inNativeApp ? undefined : "relative max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center pointer-events-none"}
          >
            <div style={inNativeApp ? { pointerEvents: "auto", flexShrink: 0 } : undefined} className={inNativeApp ? undefined : "pointer-events-auto shrink-0"}>
              <ConvictionTopWhisper />
            </div>
            <div
              style={inNativeApp ? { pointerEvents: "auto", marginLeft: "auto", flexShrink: 0, position: "relative" } : undefined}
              className={inNativeApp ? undefined : "ml-auto shrink-0 relative pointer-events-auto"}
            >
              {moreMenu}
              {langPicker}
              {emailPanel}
            </div>
          </div>
        </nav>
      )}

      {showTop && !compactTopNav && (
        <nav
          className={`fixed top-0 left-0 right-0 z-[100] ${
            overCinematicHero
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

      {!(inNativeApp && entryOverlayActive) && <nav
        aria-label="Main"
        style={
          inNativeApp
            ? {
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9998,
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
                backgroundColor: "rgba(9, 9, 11, 0.92)",
                borderTop: "1px solid rgba(255,255,255,0.10)",
              }
            : { paddingBottom: "env(safe-area-inset-bottom, 0px)" }
        }
        className={inNativeApp ? "sm:hidden" : "sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/82 backdrop-blur-xl border-t border-white/10"}
      >
        <div
          style={
            inNativeApp
              ? { display: "flex", alignItems: "center", justifyContent: "space-around", height: "32px", paddingLeft: "2px", paddingRight: "2px" }
              : undefined
          }
          className={inNativeApp ? undefined : "flex items-center justify-around h-[32px] px-0.5"}
        >
          {BOTTOM_NAV_ITEMS.map(({ href, label, icon, bookmark, navId }) => {
            const isHome = href === "/";
            const active = isHome
              ? location === "/" || location === ""
              : location === href || location.startsWith(href + "/");
            const hasPlace = Boolean(
              bookmark && BOOKMARK_DOT_SECTIONS.has(bookmark) && bookmarked.has(bookmark) && !active,
            );
            const visual = (
              <BottomNavVisual active={active} label={label} icon={icon} hasPlace={hasPlace} />
            );

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
                  data-testid={`bottom-nav-${navId}`}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  onClick={goHome}
                  className="flex items-center justify-center flex-1 h-full transition-all border-0 bg-transparent p-0 cursor-pointer"
                >
                  {visual}
                </button>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                data-testid={`bottom-nav-${navId}`}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="flex items-center justify-center flex-1 h-full transition-all"
              >
                {visual}
              </Link>
            );
          })}
        </div>
      </nav>}

      <AnimatePresence>
        {notifOpen && <NotificationSettings onClose={() => setNotifOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
