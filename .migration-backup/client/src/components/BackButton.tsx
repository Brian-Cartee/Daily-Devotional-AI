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
      className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md transition-all active:scale-95 ${className}`}
      style={{
        background: "rgba(0, 0, 0, 0.42)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        color: "hsl(var(--primary))",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
      }}
    >
      <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );
}
