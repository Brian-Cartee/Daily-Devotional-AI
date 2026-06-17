import { Cross } from "lucide-react";

export function MissionPartnerBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary ${className}`}
      title="Mission Partner"
      aria-label="Mission Partner"
    >
      <Cross className="w-2.5 h-2.5" strokeWidth={2.5} />
    </span>
  );
}
