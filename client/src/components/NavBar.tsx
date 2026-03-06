import { Link, useLocation } from "wouter";
import { BookOpen, Sun, Compass, ChevronLeft } from "lucide-react";

interface NavBarProps {
  showBack?: boolean;
}

const NAV_ITEMS = [
  { href: "/devotional", label: "Devotional", icon: Sun },
  { href: "/understand", label: "Understand", icon: Compass },
  { href: "/read", label: "Read", icon: BookOpen },
];

export function NavBar({ showBack }: NavBarProps) {
  const [location] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/30">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
        {showBack && (
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-1">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        )}

        <Link href="/" className="flex items-center gap-2 mr-auto">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-xs font-bold">DB</span>
          </div>
          <span className="font-semibold text-sm text-foreground hidden sm:inline">Daily Bread</span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${label.toLowerCase()}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
