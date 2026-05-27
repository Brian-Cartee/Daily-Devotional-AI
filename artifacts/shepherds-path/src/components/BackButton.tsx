import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { navigateBackToHomePaths } from "@/lib/homePathsNav";

interface BackButtonProps {
  onClick?: () => void;
  /** Navigate here when clicked (if onClick not provided) */
  href?: string;
  /** Used when history is empty */
  fallback?: string;
  /** Go to home More paths section instead of page top or history.back */
  backToPaths?: boolean;
  testId?: string;
  className?: string;
}

export function BackButton({
  onClick,
  href,
  fallback = "/",
  backToPaths = false,
  testId,
  className = "",
}: BackButtonProps) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (backToPaths) {
      navigateBackToHomePaths(navigate);
      return;
    }
    if (href) {
      navigate(href);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate(fallback);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={testId}
      aria-label="Go back"
      className={`flex items-center justify-center w-11 h-11 rounded-full backdrop-blur-md transition-all active:scale-95 ${className}`}
      style={{
        background: "rgba(0, 0, 0, 0.42)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        color: "hsl(var(--primary))",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        touchAction: "manipulation",
      }}
    >
      <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );
}
