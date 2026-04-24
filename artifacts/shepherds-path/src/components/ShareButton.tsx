import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text: string;
  className?: string;
  showLabel?: boolean;
}

export function ShareButton({ title, text, className = "", showLabel = true }: ShareButtonProps) {
  const [done, setDone] = useState(false);

  const handleShare = async () => {
    const shareText = `${text}\n\n— Shepherd's Path | shepherdspathAI.com`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText });
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      } catch { }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      } catch { }
    }
  };

  return (
    <button
      onClick={handleShare}
      data-testid="button-share-content"
      title="Share"
      className={`inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-[11px] font-medium ${className}`}
    >
      {done
        ? <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        : <Share2 className="w-3.5 h-3.5 flex-shrink-0" />}
      {showLabel && (done ? "Shared!" : "Share")}
    </button>
  );
}
