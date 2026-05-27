import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Headphones,
  HandHeart,
  HelpCircle,
  Mail,
  Moon,
  MoreHorizontal,
  Shield,
  ShoppingBag,
  Sun,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { GuidanceMode } from "@/lib/guidanceMode";

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
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick?: () => void;
  href?: string;
  testId?: string;
  accent?: boolean;
}) {
  const className =
    "w-full flex items-center gap-3 px-3.5 py-3 min-h-[48px] text-sm hover:bg-muted/70 active:bg-muted transition-colors text-left";
  const inner = (
    <>
      <Icon className={`w-4 h-4 shrink-0 ${accent ? "text-amber-500" : "text-muted-foreground"}`} />
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
  theme: "light" | "dark";
  onToggleTheme: () => void;
  guidanceTone: GuidanceMode;
  onToggleTone: () => void;
  voicePref: string;
  onToggleVoice: () => void;
  onOpenEmail: () => void;
  onOpenLanguage: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
};

export function NavBarMoreMenu({
  open,
  onToggle,
  theme,
  onToggleTheme,
  guidanceTone,
  onToggleTone,
  voicePref,
  onToggleVoice,
  onOpenEmail,
  onOpenLanguage,
  onClose,
  menuRef,
}: Props) {
  const toneLabel = guidanceTone === "coach" ? "Direct & accountable" : "Gentle & encouraging";
  const voiceLabel = voicePref === "onyx" ? "Male voice" : "Female voice";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={onToggle}
        data-testid="button-more-menu"
        aria-label="Settings and more"
        aria-expanded={open}
        title="Settings"
        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
          open ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
        }`}
      >
        <MoreHorizontal className="w-[18px] h-[18px]" />
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-11 z-50 bg-background border border-border rounded-2xl shadow-xl py-1 min-w-[240px] max-w-[min(280px,calc(100vw-1.5rem))] overflow-hidden"
          role="menu"
        >
          <MenuLabel>Stay connected</MenuLabel>
          <MenuRow
            icon={Mail}
            label="Daily verse email"
            hint="Morning verse in your inbox"
            testId="button-subscribe-toggle"
            onClick={() => {
              onClose();
              onOpenEmail();
            }}
          />

          <div className="mx-3 my-1 h-px bg-border/50" />

          <MenuLabel>Your experience</MenuLabel>
          <MenuRow
            icon={theme === "dark" ? Sun : Moon}
            label="Appearance"
            hint={theme === "dark" ? "Night · tap for morning" : "Morning · tap for night"}
            testId="button-appearance-toggle"
            onClick={() => {
              onClose();
              onToggleTheme();
            }}
          />
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
