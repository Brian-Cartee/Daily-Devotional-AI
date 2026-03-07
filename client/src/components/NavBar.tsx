import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Sun, Compass, NotebookPen, Bell, Search, Mail } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { NotificationSettings } from "@/components/NotificationSettings";
import { EmailSubscribePanel } from "@/components/EmailSubscribe";

const LEFT_NAV = [
  { href: "/devotional", label: "Devotional", icon: Sun },
  { href: "/understand", label: "Journey", icon: Compass },
  { href: "/read", label: "Read", icon: BookOpen },
  { href: "/study", label: "Study", icon: Search },
];

export function NavBar() {
  const [location] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const navLink = (href: string, label: string, Icon: React.ElementType) => {
    const active = location === href || location.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        data-testid={`nav-${label.toLowerCase()}`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <span className="text-primary-foreground text-[11px] font-extrabold tracking-tight">SP</span>
            </div>
            <span className="font-bold text-sm text-foreground hidden sm:inline tracking-tight">Shepherd's Path</span>
          </Link>

          {/* Left nav items */}
          <div className="flex items-center gap-0.5 ml-2">
            {LEFT_NAV.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side: Journal · Mail · Bell */}
          <div className="flex items-center gap-0.5">
            {navLink("/journal", "Journal", NotebookPen)}

            {/* Daily email trigger */}
            <div className="relative ml-1">
              <button
                onClick={() => { setEmailOpen((v) => !v); setNotifOpen(false); }}
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

            {/* Notifications */}
            <button
              onClick={() => { setNotifOpen(true); setEmailOpen(false); }}
              data-testid="nav-notifications"
              className="ml-0.5 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
              aria-label="Notification settings"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {notifOpen && <NotificationSettings onClose={() => setNotifOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
