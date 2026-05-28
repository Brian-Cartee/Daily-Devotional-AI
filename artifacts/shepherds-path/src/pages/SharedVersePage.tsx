import { Link, useRoute } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen } from "lucide-react";
import { ShareVerseTrigger } from "@/components/ShareVerseSheet";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";
import { buildVerseSharePreviewUrl } from "@/lib/shareVerse";

type Verse = {
  id?: number;
  text: string;
  reference: string;
  date?: string;
};

export default function SharedVersePage() {
  const [, params] = useRoute("/v/:date");
  const date = params?.date ?? "";

  const { data: verse, isLoading, isError } = useQuery({
    queryKey: ["/api/verses/daily", date],
    queryFn: async () => {
      const res = await fetch(`/api/verses/daily?date=${encodeURIComponent(date)}`);
      if (!res.ok) throw new Error("verse not found");
      return res.json() as Verse;
    },
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
    staleTime: 60 * 60 * 1000,
  });

  const { data: verseArt } = useQuery({
    queryKey: ["/api/verse-art", date],
    queryFn: async () => {
      const res = await fetch(`/api/verse-art/${date}`);
      if (!res.ok) return null;
      return res.json() as { imageUrl: string | null };
    },
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
    staleTime: 6 * 60 * 60 * 1000,
  });

  const heroBg = verseArt?.imageUrl ?? getDevotionalHeroImage();

  useEffect(() => {
    if (!verse || !date) return;
    sharedVerseMeta(date, verse);
  }, [verse, date]);

  return (
    <>
      <main className="min-h-screen bg-background pb-24">
        <div className="max-w-lg mx-auto px-4 py-8">
          {!/^\d{4}-\d{2}-\d{2}$/.test(date) && (
            <p className="text-center text-muted-foreground">This verse link isn&apos;t valid.</p>
          )}

          {isLoading && (
            <p className="text-center text-muted-foreground animate-pulse">Loading Scripture…</p>
          )}

          {isError && (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">We couldn&apos;t find that day&apos;s verse.</p>
              <Link href="/devotional">
                <span className="text-primary font-semibold underline">Open today&apos;s devotional</span>
              </Link>
            </div>
          )}

          {verse && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60 text-center mb-2">
                Scripture for you
              </p>
              <div className="rounded-2xl overflow-hidden border border-border/50 shadow-lg mb-4">
                <div
                  className="h-36 bg-cover bg-center"
                  style={{ backgroundImage: `url(${heroBg})` }}
                />
                <div className="px-5 py-5 bg-card">
                  <p
                    className="text-[18px] leading-relaxed text-foreground italic"
                    style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
                  >
                    &ldquo;{verse.text}&rdquo;
                  </p>
                  <p className="text-[15px] font-bold text-primary mt-3">— {verse.reference}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link href="/devotional">
                  <span
                    data-testid="link-shared-verse-devotional"
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-primary-foreground bg-primary"
                  >
                    <BookOpen className="w-5 h-5" />
                    Sit in Scripture — full devotional
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
                <div className="flex justify-center pt-2">
                  <ShareVerseTrigger
                    text={verse.text}
                    reference={verse.reference}
                    date={date}
                    imageBgUrl={heroBg}
                    label="Share this verse"
                    testId="button-share-shared-verse"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground/60 text-center mt-6 leading-relaxed">
                Shepherd&apos;s Path — Scripture and prayer for real life.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}

/** For document head updates when landing on shared verse */
export function sharedVerseMeta(date: string, verse?: Verse | null) {
  if (!verse) return;
  const title = `${verse.reference} — Shepherd's Path`;
  const desc = verse.text.length > 160 ? `${verse.text.slice(0, 157)}…` : verse.text;
  document.title = title;
  const setMeta = (prop: string, content: string) => {
    let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", prop);
      document.head.appendChild(el);
    }
    el.content = content;
  };
  setMeta("og:title", title);
  setMeta("og:description", desc);
  setMeta("og:url", buildVerseSharePreviewUrl(date));
}
