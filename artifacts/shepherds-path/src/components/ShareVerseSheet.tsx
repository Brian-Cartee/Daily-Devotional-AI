import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check, X, ImageIcon, Heart, Link2, Loader2, Download } from "lucide-react";
import { createShareImage, createStoryShareImage } from "@/lib/shareImage";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";
import {
  buildFriendVerseShareText,
  buildImageShareCaption,
  buildVerseShareText,
  copyToClipboard,
  downloadBlob,
  easternVerseDateKey,
  shareImageBlob,
  shareImageFilename,
  shareNative,
} from "@/lib/shareVerse";
import { getUserName } from "@/lib/userName";
import { useToast } from "@/hooks/use-toast";

export type ShareVerseVariant = "verse" | "moment";

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
  /** Take a Moment: verse baked on today's art, image-first flow */
  variant?: ShareVerseVariant;
  sheetTitle?: string;
  /** Pre-build square preview when the sheet opens (needs imageBgUrl) */
  generateOnOpen?: boolean;
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
  variant = "verse",
  sheetTitle,
  generateOnOpen = false,
}: Props) {
  const { toast } = useToast();
  const date = dateProp ?? easternVerseDateKey();
  const isMoment = variant === "moment";
  const title = sheetTitle ?? (isMoment ? "Share this moment" : "Share Scripture");

  const [busy, setBusy] = useState<"image" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<"square" | "story">("story");
  const [done, setDone] = useState<string | null>(null);
  const autoGenAttempted = useRef(false);

  const clearPreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewBlob(null);
  }, []);

  useEffect(() => {
    if (!open) {
      clearPreview();
      setDone(null);
      setFormat("story");
      autoGenAttempted.current = false;
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
  const imageShareCaption = buildImageShareCaption(reference, date);

  const generateImage = useCallback(
    async (fmt: "square" | "story" = "square"): Promise<Blob | null> => {
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
        return blob;
      } catch {
        toast({ title: "Couldn't make image", variant: "destructive" });
        return null;
      } finally {
        setBusy(null);
      }
    },
    [imageBgUrl, text, reference, clearPreview, toast],
  );

  useEffect(() => {
    if (!open || !generateOnOpen || autoGenAttempted.current) return;
    if (!imageBgUrl && !isMoment) return;
    autoGenAttempted.current = true;
    void generateImage("story");
  }, [open, generateOnOpen, imageBgUrl, isMoment, generateImage]);

  const runShareText = async (body: string, shareTitle: string) => {
    const result = await shareNative({ title: shareTitle, text: body });
    if (result === "shared") {
      setDone("text");
      setTimeout(() => setDone(null), 2000);
      toast({ title: "Ready to send", description: "Pick where to share in the sheet." });
    }
  };

  const shareImageFile = async () => {
    let blob = previewBlob;
    if (!blob) {
      blob = await generateImage(format);
      if (!blob) return;
    }
    const caption = isMoment ? imageShareCaption : shareText;
    const result = await shareImageBlob(blob, {
      filename: shareImageFilename(reference),
      title: `${reference} — Shepherd's Path`,
      text: isMoment ? caption : shareText,
    });
    if (result === "shared") {
      setDone("image");
      toast({ title: "Ready to send", description: "Pick Messages, Instagram, or any app." });
    } else if (result === "saved") {
      setDone("image");
      toast({
        title: "Image saved",
        description: isMoment
          ? "Verse is on the image — share from Photos or paste the link separately."
          : "Share it from your photos app.",
      });
    }
  };

  if (!open) return null;

  const primaryImageBtn = (
    <button
      type="button"
      data-testid="button-share-verse-image"
      disabled={busy === "image"}
      onClick={() => void shareImageFile()}
      className="flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-[15px] font-semibold text-[#1a1208] bg-gradient-to-r from-amber-100/95 via-amber-200/90 to-amber-100/95"
    >
      {busy === "image" ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done === "image" ? (
        <Check className="w-4 h-4" />
      ) : previewBlob ? (
        <Share2 className="w-4 h-4" />
      ) : (
        <ImageIcon className="w-4 h-4" />
      )}
      {busy === "image"
        ? "Preparing your card…"
        : previewBlob
          ? "Share image"
          : "Create image"}
    </button>
  );

  const textShareBtn = (
    <button
      type="button"
      data-testid="button-share-verse-text"
      onClick={() => void runShareText(shareText, reference)}
      className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-[14px] font-semibold border border-border/50 text-foreground/85"
    >
      {done === "text" ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      Send verse as text
    </button>
  );

  const saveToPhotosBtn = previewBlob ? (
    <button
      type="button"
      data-testid="button-save-verse-image"
      onClick={() => downloadBlob(previewBlob, shareImageFilename(reference))}
      className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-[13px] font-medium text-muted-foreground"
    >
      <Download className="w-3.5 h-3.5" />
      Save to Photos
    </button>
  ) : null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
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
            <p className="text-[15px] font-bold text-foreground">{title}</p>
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
            {isMoment && (
              <p className="text-[12px] text-muted-foreground leading-relaxed -mt-1">
                Your verse appears on today&apos;s art — one beautiful card, not a bare photo.
              </p>
            )}

            <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
              <p
                className="text-[15px] text-foreground/90 leading-snug italic line-clamp-4"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                &ldquo;{text}&rdquo;
              </p>
              <p className="text-[13px] font-semibold text-primary/70 mt-1">— {reference}</p>
            </div>

            {(previewUrl || busy === "image") && (
              <div className="rounded-xl overflow-hidden border border-border/40 bg-black/20">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Share preview with verse on today's art"
                    className="w-full object-contain mx-auto"
                    style={{ aspectRatio: format === "story" ? "9/16" : "1/1", maxHeight: 280 }}
                  />
                ) : (
                  <div
                    className="flex flex-col items-center justify-center gap-2 text-muted-foreground"
                    style={{ aspectRatio: "1/1", maxHeight: 280 }}
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
                    <span className="text-[12px]">Placing verse on today&apos;s art…</span>
                  </div>
                )}
                <div className="flex gap-2 p-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => void generateImage("story")}
                    className={`flex-1 py-2 text-[12px] font-semibold rounded-lg ${
                      format === "story" ? "bg-primary/15 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Story
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateImage("square")}
                    className={`flex-1 py-2 text-[12px] font-semibold rounded-lg ${
                      format === "square" ? "bg-primary/15 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Square
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              {isMoment ? (
                <>
                  {primaryImageBtn}
                  {saveToPhotosBtn}
                  {textShareBtn}
                </>
              ) : (
                <>
                  {textShareBtn}
                  {primaryImageBtn}
                  {saveToPhotosBtn}
                </>
              )}

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
              {isMoment
                ? "Private journal notes are never included — only the verse and art you preview above."
                : "Your journal and private prayers are never included — only what you choose here."}
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
  variant = "verse",
  sheetTitle,
  generateOnOpen = false,
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
        variant={variant}
        sheetTitle={sheetTitle}
        generateOnOpen={generateOnOpen}
      />
    </>
  );
}
