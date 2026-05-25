import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Heart,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { BackButton } from "@/components/BackButton";
import { ClosetDoorwayFrame } from "@/components/ClosetDoorwayFrame";
import { PrayerClosetRoom } from "@/components/PrayerClosetRoom";
import {
  WorshipBedControls,
  WORSHIP_YOUTUBE_PLAYER_ID,
} from "@/components/WorshipBedControls";
import { useDailyArt } from "@/hooks/use-daily-art";
import { useDailyVerse } from "@/hooks/use-verses";
import { useWorshipBed } from "@/hooks/use-worship-bed";
import { useWorshipYoutube } from "@/hooks/use-worship-youtube";
import { isYoutubeWorshipSource } from "@/lib/worshipBedSource";
import type { WorshipYoutubeMixId } from "@/lib/worshipYouTubeMixes";
import { getSessionId } from "@/lib/session";
import { getUserName } from "@/lib/userName";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CLOSET_BACKGROUNDS,
  closetDisplayName,
  loadClosetNote,
  loadClosetSettings,
  markClosetVisit,
  saveClosetNote,
  saveClosetSettings,
  type ClosetBackgroundId,
  type ClosetSettings,
} from "@/lib/prayerCloset";
import type { WorshipTrackId } from "@/lib/worshipTracks";
import type { JournalEntry } from "@shared/schema";

export default function PrayerClosetPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = getSessionId();
  const { imageUrl: dailyArtUrl } = useDailyArt();
  const { data: dailyVerse } = useDailyVerse();

  const [settings, setSettings] = useState<ClosetSettings>(() => loadClosetSettings());
  const [note, setNote] = useState(() => loadClosetNote());
  const [showSetup, setShowSetup] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const youtubeWorship = isYoutubeWorshipSource(settings.worshipSource);
  const { usingGenerated } = useWorshipBed(
    settings.worshipEnabled,
    settings.worshipTrackId,
    settings.worshipVolume,
    youtubeWorship,
  );
  const { playerReady: youtubeReady, loadError: youtubeError } = useWorshipYoutube(
    settings.worshipEnabled && youtubeWorship,
    settings.worshipYoutubeMixId,
    settings.worshipVolume,
    WORSHIP_YOUTUBE_PLAYER_ID,
  );

  useEffect(() => {
    markClosetVisit();
    const name = getUserName();
    if (name && !settings.name.trim()) {
      const next = saveClosetSettings({ name });
      setSettings(next);
    }
  }, []);

  const { data: journalEntries } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/journal?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const lastPrayer = useMemo(() => {
    const prayers = (journalEntries ?? []).filter((e) => e.type === "prayer");
    return prayers[0] ?? null;
  }, [journalEntries]);

  const backgroundSrc = useMemo(() => {
    if (settings.backgroundId === "daily-art" && dailyArtUrl) {
      return dailyArtUrl.replace(/\?.*$/, "");
    }
    const bg = CLOSET_BACKGROUNDS.find((b) => b.id === settings.backgroundId);
    return bg?.src || "/hero-landing.webp";
  }, [settings.backgroundId, dailyArtUrl]);

  const wallVerse = useMemo(() => {
    if (settings.pinnedText && settings.pinnedReference) {
      return { text: settings.pinnedText, reference: settings.pinnedReference };
    }
    if (dailyVerse?.text && dailyVerse?.reference) {
      return { text: dailyVerse.text, reference: dailyVerse.reference };
    }
    return {
      text: "Be still, and know that I am God.",
      reference: "Psalm 46:10",
    };
  }, [settings.pinnedText, settings.pinnedReference, dailyVerse]);

  const title = closetDisplayName(settings);
  const wallBg = CLOSET_BACKGROUNDS.find((b) => b.id === settings.backgroundId);
  const dailyArtThumb =
    settings.backgroundId === "daily-art" && dailyArtUrl
      ? dailyArtUrl.replace(/\?.*$/, "")
      : dailyArtUrl?.replace(/\?.*$/, "") ?? null;

  const patchSettings = (patch: Partial<ClosetSettings>) => {
    const next = saveClosetSettings(patch);
    setSettings(next);
  };

  const pinTodayVerse = () => {
    if (!dailyVerse?.text) return;
    patchSettings({
      pinnedText: dailyVerse.text,
      pinnedReference: dailyVerse.reference,
    });
    toast({ title: "Verse pinned to your closet wall" });
  };

  const saveNoteToJournal = async () => {
    const content = note.trim();
    if (!content) return;
    setSavingNote(true);
    try {
      await apiRequest("POST", "/api/journal", {
        sessionId,
        type: "prayer",
        title: "Prayer closet",
        content,
      });
      saveClosetNote("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/journal", sessionId] });
      toast({ title: "Saved to your journal" });
    } catch {
      toast({ title: "Couldn't save", variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-[#07050f] pb-32 pt-14">
        <div className="relative max-w-xl mx-auto px-3">
          {/* Fixed controls — always tappable above room art */}
          <div
            className="sticky top-14 z-50 flex items-center justify-between gap-2 mb-2 py-1"
            data-testid="closet-page-header"
          >
            <BackButton
              href="/"
              testId="button-back-prayer-closet"
              className="relative z-50"
            />
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              data-testid="button-closet-settings"
              aria-label="Closet settings"
              aria-expanded={showSetup}
              className="relative z-50 flex items-center justify-center w-11 h-11 rounded-full bg-black/55 border border-white/15 text-white/90 backdrop-blur-sm active:scale-95"
              style={{ touchAction: "manipulation" }}
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>

          <ClosetDoorwayFrame>
            <PrayerClosetRoom
              title={title}
              wallArtSrc={backgroundSrc}
              wallArtPosition={wallBg?.position}
              wallVerse={wallVerse}
              candleLevel={settings.candleLevel}
              draftNote={note}
              lastPrayerSnippet={
                lastPrayer?.content
                  ? lastPrayer.content.length > 80
                    ? `${lastPrayer.content.slice(0, 80)}…`
                    : lastPrayer.content
                  : null
              }
              dailyArtThumb={settings.backgroundId !== "daily-art" ? dailyArtThumb : null}
              canPinVerse={!!(dailyVerse && !settings.pinnedText)}
              onPinVerse={pinTodayVerse}
              onCandleChange={(candleLevel) => patchSettings({ candleLevel })}
            />
          </ClosetDoorwayFrame>

          <p
            className="path-reminder-quote text-center text-[15px] text-white/70 leading-relaxed mt-4 px-2"
            data-testid="closet-wall-verse"
          >
            &ldquo;{wallVerse.text.length > 160 ? `${wallVerse.text.slice(0, 160)}…` : wallVerse.text}&rdquo;
            <span className="block text-[12px] text-violet-200/70 mt-1.5 not-italic font-semibold">
              — {wallVerse.reference}
            </span>
          </p>
        </div>

        <div className="max-w-xl mx-auto px-3 sm:px-4 mt-5 space-y-4">
          {showSetup && (
            <div
              className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-3 sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="closet-setup-title"
              data-testid="closet-setup-overlay"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                aria-label="Close settings"
                onClick={() => setShowSetup(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md max-h-[min(85vh,520px)] overflow-y-auto rounded-2xl border border-border/50 bg-card shadow-2xl p-4 space-y-4"
                data-testid="closet-setup-panel"
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    id="closet-setup-title"
                    className="text-[14px] font-bold text-foreground"
                  >
                    Closet settings
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSetup(false)}
                    data-testid="button-close-closet-setup"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/80 text-foreground"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Name your closet
                  </label>
                  <input
                    value={settings.name}
                    onChange={(e) => patchSettings({ name: e.target.value })}
                    placeholder="e.g. Brian"
                    data-testid="input-closet-name"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[15px]"
                  />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Framed wall art
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CLOSET_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        data-testid={`closet-bg-${bg.id}`}
                        onClick={() => patchSettings({ backgroundId: bg.id as ClosetBackgroundId })}
                        className={`rounded-xl border px-2 py-2 text-[12px] font-medium transition-colors ${
                          settings.backgroundId === bg.id
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="w-full rounded-xl py-2.5 text-[14px] font-semibold text-white bg-primary"
                >
                  Done
                </button>
              </motion.div>
            </div>
          )}

          <WorshipBedControls
            enabled={settings.worshipEnabled}
            source={settings.worshipSource ?? "youtube"}
            trackId={settings.worshipTrackId}
            youtubeMixId={settings.worshipYoutubeMixId ?? "holy-voltage-ep1"}
            volume={settings.worshipVolume}
            usingGenerated={usingGenerated}
            youtubeReady={youtubeReady}
            youtubeError={youtubeError}
            onEnabledChange={(worshipEnabled) => patchSettings({ worshipEnabled })}
            onSourceChange={(worshipSource) => patchSettings({ worshipSource })}
            onTrackChange={(id: WorshipTrackId) => patchSettings({ worshipTrackId: id })}
            onYoutubeMixChange={(worshipYoutubeMixId: WorshipYoutubeMixId) =>
              patchSettings({ worshipYoutubeMixId })
            }
            onVolumeChange={(worshipVolume) => patchSettings({ worshipVolume })}
          />

          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <p className="text-[12px] font-bold uppercase tracking-widest text-primary/70 mb-2">
              What&apos;s on your heart
            </p>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                saveClosetNote(e.target.value);
              }}
              rows={4}
              placeholder="A few honest words for God — no polish required…"
              data-testid="input-closet-prayer"
              className="w-full resize-none rounded-xl border border-border/60 bg-background/80 px-3 py-3 text-[16px] leading-relaxed"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                disabled={!note.trim() || savingNote}
                onClick={saveNoteToJournal}
                data-testid="button-save-closet-prayer"
                className="flex-1 min-w-[140px] rounded-xl py-2.5 text-[14px] font-semibold text-white bg-primary hover:opacity-95 disabled:opacity-45"
              >
                {savingNote ? "Saving…" : "Save to journal"}
              </button>
              <Link href="/guidance">
                <span
                  data-testid="link-closet-guidance"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/30 px-4 py-2.5 text-[14px] font-semibold text-primary"
                >
                  <Sparkles className="w-4 h-4" />
                  Talk It Through
                </span>
              </Link>
            </div>
          </div>

          {lastPrayer && (
            <div className="rounded-2xl border border-border/40 bg-card/40 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                Last prayer you held
              </p>
              <p className="text-[14px] text-foreground/80 leading-relaxed line-clamp-3 italic path-reminder-quote">
                {lastPrayer.content}
              </p>
              {lastPrayer.reference && (
                <p className="text-[12px] text-primary/60 mt-1">— {lastPrayer.reference}</p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/journal" className="flex-1">
              <span
                data-testid="link-closet-journal"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border/50 py-3 text-[14px] font-semibold text-foreground/85"
              >
                <BookOpen className="w-4 h-4" />
                Open journal
              </span>
            </Link>
            <Link href="/devotional" className="flex-1">
              <span
                data-testid="link-closet-devotional"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border/50 py-3 text-[14px] font-semibold text-foreground/85"
              >
                <Heart className="w-4 h-4" />
                Today&apos;s devotional
                <ArrowRight className="w-4 h-4 opacity-50" />
              </span>
            </Link>
          </div>

          <p className="text-center text-[12px] text-muted-foreground/55 leading-relaxed px-2 pb-4">
            &ldquo;When you pray, go into your room, close the door…&rdquo; — Matthew 6:6. This space is yours; nothing here is posted publicly.
          </p>
        </div>
      </main>
    </>
  );
}
