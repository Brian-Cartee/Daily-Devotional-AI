import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowLeft, Trash2 } from "lucide-react";
import { getMoments, removeMoment, type SavedMoment } from "@/lib/moments";

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function MomentCard({ moment, onRemove }: { moment: SavedMoment; onRemove: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid hsl(var(--border) / 0.5)" }}
    >
      {/* Image */}
      {moment.imageUrl && (
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          <img
            src={moment.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.65) 100%)" }}
          />
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <p className="text-[13px] text-white/90 font-medium leading-snug drop-shadow-sm">
              &ldquo;{moment.verse}&rdquo;
            </p>
            <p className="text-[10px] text-amber-300/80 font-semibold uppercase tracking-wide mt-1">
              {moment.reference}
            </p>
          </div>
        </div>
      )}

      {/* Bottom section */}
      <div className="px-4 py-3 flex flex-col gap-2" style={{ background: "hsl(var(--background))" }}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/50 font-medium">
            {formatDate(moment.date)}
          </p>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onRemove}
                className="text-[11px] text-red-400/80 hover:text-red-400 font-semibold transition-colors"
                data-testid="button-confirm-remove-moment"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              data-testid="button-remove-moment"
              className="text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {moment.note && (
          <p className="text-[13px] text-foreground/70 leading-relaxed italic border-l-2 border-primary/20 pl-3">
            {moment.note}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function Moments() {
  const [moments, setMoments] = useState<SavedMoment[]>(() => getMoments());

  useEffect(() => {
    const sync = () => setMoments(getMoments());
    window.addEventListener("sp-moments-change", sync);
    return () => window.removeEventListener("sp-moments-change", sync);
  }, []);

  const handleRemove = (date: string) => {
    removeMoment(date);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="sticky top-0 z-50 flex items-center gap-3 px-4 py-4"
        style={{ background: "hsl(var(--background) / 0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid hsl(var(--border) / 0.4)" }}
      >
        <Link href="/">
          <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted/60 transition-colors" data-testid="button-moments-back">
            <ArrowLeft className="w-4 h-4 text-foreground/60" />
          </button>
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <Heart className="w-4 h-4 text-red-400/80 fill-red-400/80" />
          <h1 className="text-[16px] font-semibold text-foreground">My Moments</h1>
        </div>
        {moments.length > 0 && (
          <span className="text-[11px] text-muted-foreground/50 font-medium">
            {moments.length} {moments.length === 1 ? "moment" : "moments"}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="max-w-xl mx-auto px-4 py-6">
        {moments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-24 text-center gap-4"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--muted) / 0.5)" }}
            >
              <Heart className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-[15px] font-medium text-foreground/60">Nothing saved yet</p>
              <p className="text-[13px] text-muted-foreground/45 mt-1 max-w-xs leading-relaxed">
                When something speaks to you, tap the heart on today's art. It will live here.
              </p>
            </div>
            <Link href="/">
              <button className="mt-2 text-[13px] font-semibold text-primary/70 hover:text-primary transition-colors">
                Back to home →
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {moments.map(m => (
                <MomentCard key={m.date} moment={m} onRemove={() => handleRemove(m.date)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
