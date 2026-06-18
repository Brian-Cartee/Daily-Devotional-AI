import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Globe,
  Headphones,
  HandHeart,
  HelpCircle,
  Mail,
  MessageCircle,
  MoreHorizontal,
  NotebookPen,
  Shield,
  Star,
  ShoppingBag,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { GuidanceMode } from "@/lib/guidanceMode";
import type { AppTheme } from "@/lib/theme";
import type { DevotionalEntryMode } from "@/lib/devotionalEntry";
import { SegmentedControl } from "@/components/SegmentedControl";
import { topMoreMenuButtonClass, topMoreMenuButtonStyle } from "@/lib/topMoreMenuButton";
import { isNativeWebViewShell, usesCompactTopNav } from "@/lib/platform";

function MenuLabel({ children }: { children: string }) {
  return (
    <p className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/65">
      {children}
    </p>
  );
}

function MenuRow({
  icon: Icon,
  label,
  hint,
  onClick,
  href,
  testId,
  accent,
  nudge,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick?: () => void;
  href?: string;
  testId?: string;
  accent?: boolean;
  nudge?: boolean;
}) {
  const className =
    "w-full flex items-center gap-3 px-3.5 py-3 min-h-[48px] text-sm hover:bg-muted/70 active:bg-muted transition-colors text-left";
  const inner = (
    <>
      <Icon
        className={`w-4 h-4 shrink-0 ${accent ? "text-amber-500" : nudge ? "" : "text-muted-foreground"}`}
        style={nudge ? { color: "rgb(34,197,94)" } : undefined}
      />
      <div className="flex-1 min-w-0">
        <span className={`font-medium block leading-tight ${accent ? "text-amber-600 dark:text-amber-400" : ""}`}>
          {label}
        </span>
        {hint && (
          <span className="text-[11px] text-muted-foreground leading-snug block mt-0.5">{hint}</span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} data-testid={testId} onClick={onClick} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" data-testid={testId} onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  theme: AppTheme;
  onSetTheme: (theme: AppTheme) => void;
  devotionalEntry: DevotionalEntryMode;
  onSetDevotionalEntry: (mode: DevotionalEntryMode) => void;
  guidanceTone: GuidanceMode;
  onToggleTone: () => void;
  voicePref: string;
  onToggleVoice: () => void;
  onOpenEmail: () => void;
  onOpenLanguage: () => void;
  onOpenNotifications: () => void;
  onOpenConviction: () => void;
  hasNotificationBadge?: boolean;
  hasSetupBadge?: boolean;
  rhythmDone?: boolean;
  emailDone?: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
};

export function NavBarMoreMenu({
  open,
  onToggle,
  theme,
  onSetTheme,
  devotionalEntry,
  onSetDevotionalEntry,
  guidanceTone,
  onToggleTone,
  voicePref,
  onToggleVoice,
  onOpenEmail,
  onOpenLanguage,
  onOpenNotifications,
  onOpenConviction,
  onClose,
  menuRef,
  hasNotificationBadge = false,
  hasSetupBadge = false,
  rhythmDone = true,
  emailDone = true,
}: Props) {
  const toneLabel = guidanceTone === "coach" ? "Direct & accountable" : "Gentle & encouraging";
  const voiceLabel = voicePref === "onyx" ? "Male voice" : "Female voice";
  const nativeShell = isNativeWebViewShell();
  const compact = usesCompactTopNav();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        data-testid="button-more-menu"
        aria-label="Settings and more"
        aria-expanded={open}
        title="Settings"
        className={nativeShell || compact ? undefined : topMoreMenuButtonClass(open)}
        style={nativeShell || compact ? topMoreMenuButtonStyle(open) : undefined}
      >
        <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={2.25} style={{ color: "rgba(255,255,255,0.92)" }} />
        {hasNotificationBadge && !hasSetupBadge && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        )}
        {hasSetupBadge && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "rgb(34,197,94)" }} />
        )}
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="fixed right-2 top-[calc(env(safe-area-inset-top,0px)+3.4rem)] sm:absolute sm:right-0 sm:top-11 z-[250] bg-background border border-border rounded-2xl shadow-xl py-1 min-w-[240px] w-[min(280px,calc(100vw-1rem))] sm:w-auto max-h-[calc(100dvh-env(safe-area-inset-top,0px)-5rem)] sm:max-h-[min(80dvh,560px)] overflow-y-auto overscroll-contain"
          role="menu"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        >
          <MenuLabel>Stay connected</MenuLabel>
          <div style={!rhythmDone ? { borderRadius: "10px", boxShadow: "0 0 0 1.5px rgba(34,197,94,0.45)" } : undefined}>
            <MenuRow
              icon={Bell}
              label="My rhythm"
              hint={rhythmDone ? "Gentle reminders & morning email" : "Tap to set up your reminders ✦"}
              testId="button-reminders-open"
              nudge={!rhythmDone}
              onClick={() => {
                onClose();
                onOpenNotifications();
              }}
            />
          </div>
          <div style={!emailDone ? { borderRadius: "10px", boxShadow: "0 0 0 1.5px rgba(34,197,94,0.45)", marginTop: "4px" } : undefined}>
            <MenuRow
              icon={Mail}
              label="Today's word email"
              hint={emailDone ? "Morning verse in your inbox" : "Tap to subscribe to daily Scripture ✦"}
              testId="button-subscribe-toggle"
              nudge={!emailDone}
              onClick={() => {
                onClose();
                onOpenEmail();
              }}
            />
          </div>

          <div className="mx-3 my-1 h-px bg-border/50" />

          <MenuLabel>Your experience</MenuLabel>
          <MenuRow
            icon={NotebookPen}
            label="Journal"
            hint="Prayers & reflections you saved"
            href="/journal"
            testId="nav-journal-more"
            onClick={onClose}
          />
          <div className="px-3 py-2">
            <p className="px-0.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/65">
              Appearance
            </p>
            <SegmentedControl
              testId="segmented-control-appearance"
              segments={[
                { id: "light", label: "☀️ Light" },
                { id: "dark", label: "🌙 Dark" },
                { id: "sanctuary", label: "✦ Sanctuary" },
              ]}
              value={theme}
              onChange={onSetTheme}
              className="rounded-lg"
            />
            {theme === "sanctuary" && (
              <p className="text-[11px] text-muted-foreground leading-snug mt-1.5 px-0.5">
                Deep purple & gold — a different kind of sacred
              </p>
            )}
          </div>
          <div className="px-3 py-2">
            <p className="px-0.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/65">
              Daily Devotional Entry
            </p>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { id: "auto" as const, label: "Begin automatically" },
                  { id: "tap" as const, label: "Begin with a tap" },
                ] as const
              ).map((opt) => {
                const active = devotionalEntry === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`devotional-entry-${opt.id}`}
                    onClick={() => onSetDevotionalEntry(opt.id)}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold transition-all ${
                      active
                        ? "bg-primary/12 text-foreground border border-primary/30 shadow-sm"
                        : "bg-muted/40 text-muted-foreground border border-transparent hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <MenuRow
            icon={Shield}
            label="Guidance tone"
            hint={`${toneLabel} · tap to switch`}
            testId="button-guidance-tone-toggle"
            onClick={() => {
              onToggleTone();
              onClose();
            }}
          />
          <MenuRow
            icon={Headphones}
            label="Listen voice"
            hint={`${voiceLabel} · tap to switch`}
            testId="button-voice-toggle"
            onClick={() => {
              onToggleVoice();
              onClose();
            }}
          />
          <MenuRow
            icon={Globe}
            label="Language"
            hint="App language"
            testId="button-language-toggle"
            onClick={() => {
              onClose();
              onOpenLanguage();
            }}
          />

          <div className="mx-3 my-1 h-px bg-border/50" />

          <MenuLabel>About us</MenuLabel>
          <MenuRow
            icon={Shield}
            label="Our conviction"
            hint="Scripture, mission & how we use AI"
            testId="nav-our-conviction"
            onClick={() => {
              onClose();
              onOpenConviction();
            }}
          />

          <div className="mx-3 my-1 h-px bg-border/50" />

          <MenuLabel>Help</MenuLabel>
          <MenuRow
            icon={HelpCircle}
            label="How to use the app"
            hint="Walkthrough of every path"
            href="/how-to-use"
            testId="nav-how-to-use"
            onClick={onClose}
          />
          <MenuRow
            icon={MessageCircle}
            label="Contact support"
            hint="Bug, billing, or something broken"
            href="/support"
            testId="nav-support"
            onClick={onClose}
          />
          <MenuRow
            icon={Star}
            label="Send feedback"
            hint="Ideas and how we're doing"
            href="/feedback"
            testId="nav-feedback"
            onClick={onClose}
          />
          <MenuRow
            icon={Shield}
            label="Safety & boundaries"
            hint="What this app is and isn't"
            href="/safety"
            testId="nav-safety-boundaries"
            onClick={onClose}
          />
          <MenuRow
            icon={HandHeart}
            label="Support the mission"
            hint="Why gifts & Pro help — no pressure"
            href="/how-to-use#ministry-support-heading"
            testId="nav-ministry-support"
            onClick={onClose}
          />
          <MenuRow
            icon={ShoppingBag}
            label="Merch store"
            href="/store"
            testId="nav-store-more"
            onClick={onClose}
          />

          <div className="mx-3 my-1 h-px bg-border/50" />

          <MenuRow
            icon={Zap}
            label="Restore Pro access"
            href="/restore"
            testId="nav-restore-pro"
            accent
            onClick={onClose}
          />
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
