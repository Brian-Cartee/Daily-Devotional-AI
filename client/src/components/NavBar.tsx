import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Sun, Compass, NotebookPen, Bell } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { NotificationSettings } from "@/components/NotificationSettings";

const NAV_ITEMS = [
  { href: "/devotional", label: "Devotional", icon: Sun },
  { href: "/understand", label: "Journey", icon: Compass },
  { href: "/read", label: "Read", icon: BookOpen },
  { href: "/journal", label: "Journal", icon: NotebookPen },
];

export function NavBar() {
  const [location] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 mr-auto group">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <span className="text-primary-foreground text-[11px] font-extrabold tracking-tight">SP</span>
            </div>
            <span className="font-bold text-sm text-foreground hidden sm:inline tracking-tight">Shepherd Path</span>
          </Link>

          <div className="flex items-center gap-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
            })}

            <button
              onClick={() => setNotifOpen(true)}
              data-testid="nav-notifications"
              className="ml-1 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
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
