import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { APP_ORIGIN, shareNative } from "@/lib/shareVerse";

interface ShareButtonProps {
  title: string;
  text: string;
  className?: string;
  showLabel?: boolean;
  /** When set, native share includes this URL (e.g. referral or /v/date link). */
  url?: string;
}

export function ShareButton({ title, text, className = "", showLabel = true, url }: ShareButtonProps) {
  const [done, setDone] = useState(false);

  const handleShare = async () => {
    const shareText = url
      ? `${text}\n\n${url}`
      : `${text}\n\n— Shepherd's Path\n${APP_ORIGIN}`;
    const result = await shareNative({ title, text: shareText, url: url || APP_ORIGIN });
    if (result === "shared") {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
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
