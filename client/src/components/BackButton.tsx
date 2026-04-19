import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  onClick: () => void;
  testId?: string;
  className?: string;
}

export function BackButton({ onClick, testId, className = "" }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      aria-label="Go back"
      className={`flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-sm transition-all active:scale-95 hover:bg-primary/20 ${className}`}
      style={{
        background: "hsl(var(--primary) / 0.12)",
        border: "1px solid hsl(var(--primary) / 0.28)",
        color: "hsl(var(--primary))",
      }}
    >
      <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );
}
