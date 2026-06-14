import { useState } from "react";
import { Image, Loader2 } from "lucide-react";
import { createStoryShareImage, createPurpleStoryImage } from "@/lib/shareImage";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";
import { downloadBlob, shareImageFilename } from "@/lib/shareVerse";

export async function saveVerseCardToPhotos(verseText: string, verseReference: string): Promise<void> {
  if (!verseText?.trim() || !verseReference?.trim()) return;
  let blob: Blob;
  try {
    const bg = getDevotionalHeroImage();
    blob = await createStoryShareImage(verseText, verseReference, bg);
  } catch {
    // Photo background failed — fall back to branded purple card which has no external deps
    blob = await createPurpleStoryImage(verseText, verseReference);
  }
  downloadBlob(blob, shareImageFilename(verseReference));
}

interface ShareVerseImageButtonProps {
  verseText: string;
  verseReference: string;
  className?: string;
  vertical?: boolean;
  testId?: string;
  label?: string;
}

export function ShareVerseImageButton({
  verseText,
  verseReference,
  className = "",
  vertical = false,
  testId = "button-share-verse-image",
  label = "Share Image",
}: ShareVerseImageButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await saveVerseCardToPhotos(verseText, verseReference);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const baseClass = vertical
    ? "flex flex-col items-center gap-1.5 text-foreground/55 hover:text-primary transition-colors disabled:opacity-50"
    : "inline-flex items-center gap-1.5 transition-colors disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      data-testid={testId}
      className={`${baseClass} ${className}`.trim()}
    >
      {loading ? (
        <Loader2 className={vertical ? "w-5 h-5 animate-spin" : "w-4 h-4 animate-spin"} />
      ) : (
        <Image className={vertical ? "w-5 h-5" : "w-4 h-4"} />
      )}
      <span className={vertical ? "text-[12px] font-semibold leading-none" : undefined}>
        {label}
      </span>
    </button>
  );
}
