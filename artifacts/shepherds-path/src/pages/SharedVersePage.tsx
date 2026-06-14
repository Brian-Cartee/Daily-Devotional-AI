import { useRoute } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";
import { buildVerseSharePreviewUrl, SHARE_SITE_ORIGIN } from "@/lib/shareVerse";
import { APP_STORE_URL } from "@/components/ExternalPromoLinks";

type Verse = {
  id?: number;
  text: string;
  reference: string;
  date?: string;
};

// Detect iOS for smart App Store vs web CTA
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Detect if already running as installed PWA
function isInstalledPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

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

  const heroBg = verseArt?.imageUrl ?? getDevotionalHeroImage(date);

  useEffect(() => {
    if (!verse || !date) return;
    sharedVerseMeta(date, verse, heroBg);
  }, [verse, date, heroBg]);

  const openAppUrl = isInstalledPWA()
    ? `/devotional?date=${date}`
    : isIOS()
    ? APP_STORE_URL
    : `${SHARE_SITE_ORIGIN}/devotional?date=${date}`;

  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0d0a1a" }}
    >
      {/* Branding strip */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-3 z-10">
        <img
          src="/talk-it-through-icon.png?v=6"
          alt="Shepherd's Path"
          className="w-8 h-8 rounded-lg"
        />
        <span
          className="text-[13px] font-semibold tracking-wide"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          Shepherd's Path
        </span>
      </div>

      {/* Hero section */}
      <div className="relative flex-1 flex flex-col">
        {/* Full-bleed hero image */}
        {heroBg && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Dark overlay for text legibility */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(13,10,26,0.35) 0%, rgba(13,10,26,0.55) 50%, rgba(13,10,26,0.88) 100%)",
              }}
            />
          </div>
        )}

        {/* Verse content centered over hero */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-end px-6 pb-10 min-h-[60vh]">
          {isLoading && (
            <p
              className="text-center animate-pulse text-lg"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Loading Scripture…
            </p>
          )}

          {!isValidDate && (
            <p className="text-center text-lg" style={{ color: "rgba(255,255,255,0.6)" }}>
              This verse link isn't valid.
            </p>
          )}

          {isError && (
            <p className="text-center text-lg" style={{ color: "rgba(255,255,255,0.6)" }}>
              We couldn't find that day's verse.
            </p>
          )}

          {verse && (
            <div className="max-w-sm w-full text-center">
              <p
                className="text-[22px] leading-[1.55] italic mb-5"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: "#ffffff",
                  textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                }}
              >
                &ldquo;{verse.text}&rdquo;
              </p>
              <p
                className="text-[15px] font-semibold tracking-wide"
                style={{ color: "#d4af72" }}
              >
                — {verse.reference}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel: CTAs */}
      <div
        className="z-10 px-6 pb-10 pt-6 flex flex-col gap-3"
        style={{ background: "#0d0a1a" }}
      >
        {/* Primary CTA */}
        <a
          href={openAppUrl}
          data-testid="link-shared-verse-open-app"
          className="flex w-full items-center justify-center rounded-2xl py-4 text-[17px] font-bold transition-opacity active:opacity-80"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #6025c0 100%)",
            color: "#ffffff",
            boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
          }}
        >
          Open in Shepherd's Path
        </a>

        {/* Secondary acquisition nudge */}
        <p
          className="text-center text-[13px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          New here?{" "}
          <a
            href={APP_STORE_URL}
            className="underline underline-offset-2 transition-opacity hover:opacity-80"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            It's free.
          </a>{" "}
          Daily Scripture and prayer.
        </p>

        {/* Fallback web link when already on web */}
        {!isInstalledPWA() && !isIOS() && (
          <p
            className="text-center text-[12px]"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Or{" "}
            <a
              href={`${SHARE_SITE_ORIGIN}/devotional?date=${date}`}
              className="underline underline-offset-2"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              continue on the web
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

/** Update document meta tags for OG link previews */
export function sharedVerseMeta(date: string, verse?: Verse | null, heroUrl?: string) {
  if (!verse) return;
  const title = `${verse.reference} — Shepherd's Path`;
  const desc = verse.text.length > 160 ? `${verse.text.slice(0, 157)}…` : verse.text;
  document.title = title;

  const setMeta = (attr: "property" | "name", key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.content = content;
  };

  setMeta("property", "og:title", title);
  setMeta("property", "og:description", desc);
  setMeta("property", "og:url", buildVerseSharePreviewUrl(date));
  setMeta("property", "og:type", "article");
  if (heroUrl) {
    setMeta("property", "og:image", heroUrl);
  }
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", desc);
  if (heroUrl) {
    setMeta("name", "twitter:image", heroUrl);
  }
}
