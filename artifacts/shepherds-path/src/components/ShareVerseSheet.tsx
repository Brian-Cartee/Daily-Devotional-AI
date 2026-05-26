import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check, X, ImageIcon, Heart, Link2, Loader2 } from "lucide-react";
import { createShareImage, createStoryShareImage } from "@/lib/shareImage";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";
import {
  buildFriendVerseShareText,
  buildVerseShareText,
  easternVerseDateKey,
  shareNative,
} from "@/lib/shareVerse";
import { getUserName } from "@/lib/userName";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onClose: () => void;
  text: string;
  reference: string;
  date?: string;
  extraLine?: string;
  /** Background for generated share card */
  imageBgUrl?: string | null;
  /** Show "thinking of you" template */
  showFriend?: boolean;
};

export function ShareVerseSheet({
  open,
  onClose,
  text,
  reference,
  date: dateProp,
  extraLine,
  imageBgUrl,
  showFriend = true,
}: Props) {
  const { toast } = useToast();
  const date = dateProp ?? easternVerseDateKey();
  const [busy, setBusy] = useState<"image" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<"square" | "story">("square");
  const [done, setDone] = useState<string | null>(null);

  const clearPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
  }, [previewUrl]);

  useEffect(() => {
    if (!open) {
      clearPreview();
      setDone(null);
      setFormat("square");
    }
  }, [open, clearPreview]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const shareText = buildVerseShareText({ text, reference, date, extraLine });

  const runShareText = async (body: string, title: string) => {
    const result = await shareNative({ title, text: body });
    if (result === "shared") {
      setDone("text");
      setTimeout(() => setDone(null), 2000);
      toast({ title: "Ready to send", description: "Pick where to share in the sheet." });
    }
  };

  const generateImage = async (fmt: "square" | "story" = format) => {
    setBusy("image");
    try {
      const bg = imageBgUrl ?? getDevotionalHeroImage();
      const blob =
        fmt === "story"
          ? await createStoryShareImage(text, reference, bg)
          : await createShareImage(text, reference, bg);
      clearPreview();
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setFormat(fmt);
    } catch {
      toast({ title: "Couldn't make image", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const shareImageFile = async () => {
    if (!previewBlob) {
      await generateImage();
      return;
    }
    const file = new File([previewBlob], `shepherds-path-${reference.replace(/\s/g, "-")}.png`, {
      type: "image/png",
    });
    if (navigator.canShare?.({ files: [file] })) {
      const result = await shareNative({
        title: `${reference} — Shepherd's Path`,
        text: shareText,
        files: [file],
      });
      if (result === "shared") setDone("image");
    } else if (previewUrl) {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = file.name;
      a.click();
      toast({ title: "Image saved", description: "Share it from your photos app." });
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Share Scripture"
        data-testid="share-verse-sheet"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          aria-label="Close"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="relative z-10 w-full max-w-md max-h-[min(92dvh,640px)] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border/50 bg-card shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40 bg-card/95 backdrop-blur-sm">
            <p className="text-[15px] font-bold text-foreground">Share Scripture</p>
            <button
              type="button"
              onClick={onClose}
              data-testid="button-close-share-verse"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/80"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-4 space-y-4">
            <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
              <p
                className="text-[15px] text-foreground/90 leading-snug italic line-clamp-4"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                &ldquo;{text}&rdquo;
              </p>
              <p className="text-[13px] font-semibold text-primary/70 mt-1">— {reference}</p>
            </div>

            {previewUrl && (
              <div className="rounded-xl overflow-hidden border border-border/40 bg-black/20">
                <img
                  src={previewUrl}
                  alt="Share preview"
                  className="w-full object-contain mx-auto"
                  style={{ aspectRatio: format === "story" ? "9/16" : "1/1", maxHeight: 280 }}
                />
                <div className="flex gap-2 p-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => void generateImage("square")}
                    className={`flex-1 py-2 text-[12px] font-semibold rounded-lg ${
                      format === "square" ? "bg-primary/15 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Square
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateImage("story")}
                    className={`flex-1 py-2 text-[12px] font-semibold rounded-lg ${
                      format === "story" ? "bg-primary/15 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Story
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <button
                type="button"
                data-testid="button-share-verse-text"
                onClick={() => void runShareText(shareText, reference)}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-[15px] font-semibold text-[#1a1208] bg-gradient-to-r from-amber-100/95 via-amber-200/90 to-amber-100/95"
              >
                {done === "text" ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                Share verse &amp; link
              </button>

              <button
                type="button"
                data-testid="button-share-verse-image"
                disabled={busy === "image"}
                onClick={() => (previewBlob ? void shareImageFile() : void generateImage())}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 border border-primary/30 text-[14px] font-semibold text-foreground"
              >
                {busy === "image" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : done === "image" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : previewBlob ? (
                  <Share2 className="w-4 h-4" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                {previewBlob ? "Share image card" : "Create image card"}
              </button>

              {showFriend && (
                <button
                  type="button"
                  data-testid="button-share-verse-friend"
                  onClick={() =>
                    void runShareText(
                      buildFriendVerseShareText(text, reference, getUserName(), date),
                      "Thinking of you",
                    )
                  }
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-3 border border-border/50 text-[14px] font-semibold text-foreground/85"
                >
                  <Heart className="w-4 h-4 text-rose-400/80" />
                  Send to someone on your heart
                </button>
              )}

              <button
                type="button"
                data-testid="button-copy-verse-link"
                onClick={async () => {
                  const ok = await copyToClipboard(shareText);
                  if (ok) {
                    setDone("link");
                    setTimeout(() => setDone(null), 2000);
                    toast({ title: "Copied" });
                  }
                }}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-[13px] font-medium text-muted-foreground"
              >
                {done === "link" ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                Copy message &amp; link
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed px-1">
              Your journal and private prayers are never included — only what you choose here.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/** Opens ShareVerseSheet — use anywhere */
export function ShareVerseTrigger({
  text,
  reference,
  date,
  extraLine,
  imageBgUrl,
  showFriend = true,
  className = "",
  label = "Share",
  testId = "button-share-verse-trigger",
}: Omit<Props, "open" | "onClose"> & {
  className?: string;
  label?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-testid={testId}
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary/75 hover:text-primary transition-colors ${className}`}
      >
        <Share2 className="w-3.5 h-3.5 shrink-0" />
        {label}
      </button>
      <ShareVerseSheet
        open={open}
        onClose={() => setOpen(false)}
        text={text}
        reference={reference}
        date={date}
        extraLine={extraLine}
        imageBgUrl={imageBgUrl}
        showFriend={showFriend}
      />
    </>
  );
}
