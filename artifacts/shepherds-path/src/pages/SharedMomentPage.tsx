/**
 * SharedMomentPage — personalized landing page for /s/:id share links.
 *
 * Shows: "[Sender] sent you this", verse, optional note, soft CTA → /start
 */

import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";
import { APP_STORE_URL } from "@/components/ExternalPromoLinks";

interface ShareMoment {
  verse: string;
  reference: string;
  senderName: string | null;
  note: string | null;
  heroDate: string | null;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInstalledPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export default function SharedMomentPage() {
  const [, params] = useRoute("/s/:id");
  const id = params?.id ?? "";

  const { data, isLoading, isError } = useQuery<ShareMoment>({
    queryKey: ["/api/share/moment", id],
    queryFn: async () => {
      const r = await fetch(`/api/share/moment/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error("not found");
      return r.json();
    },
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
  });

  const heroBg = data?.heroDate
    ? getDevotionalHeroImage(data.heroDate)
    : getDevotionalHeroImage(new Date().toISOString().split("T")[0]);

  const senderLine = data?.senderName
    ? `${data.senderName} was thinking of you.`
    : "Someone was thinking of you.";

  const openUrl = isInstalledPWA()
    ? "/start"
    : isIOS()
    ? APP_STORE_URL
    : "/start";

  useEffect(() => {
    if (!data) return;
    document.title = `${data.reference} — Shepherd's Path`;
  }, [data]);

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
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Shepherd's Path
        </span>
      </div>

      {/* Hero */}
      <div className="relative flex-1 flex flex-col">
        {heroBg && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(13,10,26,0.30) 0%, rgba(13,10,26,0.55) 50%, rgba(13,10,26,0.92) 100%)",
              }}
            />
          </div>
        )}

        <div className="relative z-10 flex-1 flex flex-col items-center justify-end px-6 pb-10 min-h-[58vh]">
          {isLoading && (
            <p
              className="text-center animate-pulse"
              style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px" }}
            >
              Loading…
            </p>
          )}

          {isError && (
            <div className="text-center max-w-xs">
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px", marginBottom: "8px" }}>
                This link has expired.
              </p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
                Share links are valid for 7 days.
              </p>
            </div>
          )}

          {data && (
            <div className="max-w-sm w-full text-center">
              {/* Sender attribution */}
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "rgba(134,193,172,0.85)",
                  letterSpacing: "0.12em",
                  marginBottom: "20px",
                  textTransform: "uppercase",
                }}
              >
                {senderLine}
              </p>

              {/* Verse */}
              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "22px",
                  lineHeight: 1.55,
                  fontStyle: "italic",
                  color: "#ffffff",
                  textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                  marginBottom: "16px",
                }}
              >
                &ldquo;{data.verse}&rdquo;
              </p>

              {/* Reference */}
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#d4af72",
                  marginBottom: data.note ? "20px" : "0",
                }}
              >
                — {data.reference}
              </p>

              {/* Personal note */}
              {data.note && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    marginTop: "4px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "rgba(255,255,255,0.75)",
                      fontStyle: "italic",
                      margin: 0,
                    }}
                  >
                    "{data.note}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTAs */}
      <div
        className="z-10 px-6 pb-10 pt-6 flex flex-col gap-3"
        style={{ background: "#0d0a1a" }}
      >
        {data && (
          <>
            <a
              href={openUrl}
              className="flex w-full items-center justify-center rounded-2xl py-4 text-[17px] font-bold transition-opacity active:opacity-80"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #6025c0 100%)",
                color: "#ffffff",
                boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
                textDecoration: "none",
              }}
            >
              Start your own walk →
            </a>
            <p
              className="text-center text-[13px]"
              style={{ color: "rgba(255,255,255,0.40)" }}
            >
              Daily Scripture, prayer, and reflection.{" "}
              <span style={{ color: "rgba(255,255,255,0.60)" }}>Free.</span>
            </p>
          </>
        )}

        {isError && (
          <a
            href="/start"
            className="flex w-full items-center justify-center rounded-2xl py-4 text-[16px] font-semibold"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
            }}
          >
            Explore Shepherd's Path
          </a>
        )}
      </div>
    </div>
  );
}
