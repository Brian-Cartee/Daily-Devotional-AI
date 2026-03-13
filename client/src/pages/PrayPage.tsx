import { useEffect } from "react";
import { Link } from "wouter";
import { MessageSquare, BookOpen, Users } from "lucide-react";

export default function PrayPage() {
  useEffect(() => {
    document.title = "Text PRAY — Shepherd's Path";
  }, []);

  const smsHref = "sms:+18339629341?body=PRAY";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-5 py-10"
      style={{
        background: "linear-gradient(160deg, #1a0f3c 0%, #0d0820 55%, #1a0f2e 100%)",
      }}
    >
      {/* Top wordmark */}
      <div className="w-full flex justify-center pt-2">
        <span
          style={{
            fontFamily: "var(--font-decorative)",
            fontWeight: 300,
            fontSize: "0.85rem",
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.38)",
          }}
        >
          Shepherd&rsquo;s Path
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm w-full gap-8 py-10">

        {/* Headline */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-px w-8 bg-amber-400/40" />
            <span
              style={{
                fontFamily: "var(--font-decorative)",
                fontStyle: "italic",
                fontSize: "0.9rem",
                letterSpacing: "0.06em",
                color: "rgba(251,191,36,0.7)",
              }}
            >
              Your daily walk with Jesus
            </span>
            <div className="h-px w-8 bg-amber-400/40" />
          </div>

          <h1
            className="text-white leading-tight"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2.4rem, 10vw, 3.4rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 32px rgba(0,0,0,0.5)",
            }}
          >
            What are you<br />carrying today?
          </h1>

          <p
            className="leading-relaxed"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1.05rem",
              color: "rgba(255,255,255,0.68)",
              maxWidth: "17rem",
            }}
          >
            Text PRAY and receive scripture, prayer, and peace — in seconds. Free, right now.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col items-center gap-3 w-full">
          <a
            href={smsHref}
            data-testid="button-text-pray-primary"
            className="w-full max-w-xs flex items-center justify-center gap-3 rounded-2xl text-white font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
              padding: "1rem 1.5rem",
              fontSize: "1.15rem",
              letterSpacing: "0.01em",
              boxShadow: "0 8px 32px rgba(124,58,237,0.45), 0 2px 8px rgba(0,0,0,0.3)",
              fontFamily: "var(--font-body)",
            }}
          >
            <MessageSquare size={22} strokeWidth={2.2} />
            Text PRAY to get started
          </a>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.03em",
            }}
          >
            or text directly to{" "}
            <a
              href={smsHref}
              className="underline underline-offset-2"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              (833) 962-9341
            </a>
          </p>
        </div>

        {/* Three quiet proof points */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {[
            {
              icon: <BookOpen size={16} strokeWidth={2} />,
              text: "Personalized scripture sent instantly",
            },
            {
              icon: <MessageSquare size={16} strokeWidth={2} />,
              text: "AI-guided prayer and reflection",
            },
            {
              icon: <Users size={16} strokeWidth={2} />,
              text: "Real people praying with you",
            },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-lg flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(251,191,36,0.8)",
                }}
              >
                {icon}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.92rem",
                  color: "rgba(255,255,255,0.58)",
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Invitation card — warm bridge to the full app */}
      <div className="w-full max-w-sm pb-4">
        <Link href="/" data-testid="link-explore-full-app">
          <div
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex items-start gap-3 group transition-all hover:bg-white/10"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <BookOpen size={17} strokeWidth={2} style={{ color: "rgba(251,191,36,0.8)" }} />
            </div>
            <div className="flex-1">
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: "2px",
                }}
              >
                There's more waiting for you
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.42)",
                  lineHeight: 1.5,
                }}
              >
                Daily devotionals, Bible journeys, and a prayer journal — all in Shepherd's Path.
              </p>
            </div>
            <Users size={14} strokeWidth={2} style={{ color: "rgba(255,255,255,0.25)", marginTop: "4px", flexShrink: 0 }} />
          </div>
        </Link>
      </div>
    </div>
  );
}
