import { useEffect, useState } from "react";
import { APP_STORE_URL, YOUTUBE_CHANNEL_URL } from "@/components/ExternalPromoLinks";
import { getSessionId } from "@/lib/session";
import { markEmailSubscribed, getSubscribedEmail, isEmailSubscribed } from "@/components/EmailSubscribe";
import { isNativeWebViewShell, isAndroid } from "@/lib/platform";

const APP_STORE_BADGE =
  "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/white/en-us?size=250x83";

// Persist UTM params from social traffic for analytics
function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
      const v = params.get(k);
      if (v) utm[k] = v;
    });
    if (Object.keys(utm).length > 0) {
      sessionStorage.setItem("sp_utm", JSON.stringify(utm));
    }
  } catch {}
}

function buildAppStoreUrl(): string {
  try {
    const utm = sessionStorage.getItem("sp_utm");
    if (!utm) return APP_STORE_URL;
    const parsed = JSON.parse(utm) as Record<string, string>;
    const url = new URL(APP_STORE_URL);
    // App Store doesn't support UTM natively — store for later analytics only
    void parsed;
    return url.toString();
  } catch {
    return APP_STORE_URL;
  }
}

type EmailStatus = "idle" | "loading" | "success" | "error";

export default function StartPage() {
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>(
    isEmailSubscribed() ? "success" : "idle"
  );
  const [emailMsg, setEmailMsg] = useState(
    isEmailSubscribed() ? `You're receiving daily Scripture at ${getSubscribedEmail() ?? "your email"}.` : ""
  );
  const [showEmail, setShowEmail] = useState(false);
  const appStoreUrl = buildAppStoreUrl();
  const inNativeApp = isNativeWebViewShell();

  useEffect(() => {
    captureUtm();
    document.title = "Shepherd's Path — Find Your Way Back to God";

    // og meta for social previews
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const setMetaName = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("og:title", "Shepherd's Path — Find Your Way Back to God");
    setMeta("og:description", "One moment at a time. Daily Scripture, guided prayer, and a quiet companion — free on iPhone and web.");
    setMeta("og:url", "https://www.shepherdspathai.com/start");
    setMeta("og:image", "https://www.shepherdspathai.com/hero-landing.png");
    setMetaName("twitter:card", "summary_large_image");
    setMetaName("twitter:title", "Shepherd's Path — Find Your Way Back to God");
    setMetaName("twitter:description", "One moment at a time. Daily Scripture, guided prayer, and a quiet companion — free on iPhone and web.");
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), sessionId: getSessionId() }),
        credentials: "include",
      });
      const data = await res.json() as { message?: string };
      if (res.ok) {
        setEmailStatus("success");
        setEmailMsg(data.message ?? "You're in — daily Scripture is on its way.");
        markEmailSubscribed(email.trim());
      } else {
        setEmailStatus("error");
        setEmailMsg("Something went wrong. Try again?");
      }
    } catch {
      setEmailStatus("error");
      setEmailMsg("Something went wrong. Try again?");
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(175deg, #1e0d50 0%, #130636 50%, #09031e 100%)",
        padding: "env(safe-area-inset-top, 24px) 24px env(safe-area-inset-bottom, 32px)",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      {/* Radial glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(110,50,220,0.28) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "380px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0px",
        }}
      >
        {/* App icon */}
        <img
          src="/app-icon.png"
          alt="Shepherd's Path"
          style={{ width: 80, height: 80, borderRadius: 18, marginBottom: 20 }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/sp-icon.png";
          }}
        />

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(1.75rem, 7vw, 2.25rem)",
            fontWeight: 700,
            color: "rgba(255,255,255,0.96)",
            lineHeight: 1.2,
            margin: "0 0 12px",
            fontFamily: "var(--font-serif, Georgia, serif)",
          }}
        >
          Find your way back to God
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.65)",
            margin: "0 0 8px",
            fontStyle: "italic",
          }}
        >
          one moment at a time.
        </p>

        <p
          style={{
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.48)",
            margin: "0 0 36px",
            lineHeight: 1.5,
            maxWidth: 320,
          }}
        >
          Daily Scripture, guided prayer, and a quiet companion — free on iPhone and web.
        </p>

        {/* PRIMARY CTA — App Store */}
        {!inNativeApp && !isAndroid() && (
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", marginBottom: 14 }}
            aria-label="Download Shepherd's Path on the App Store"
          >
            <img
              src={APP_STORE_BADGE}
              alt="Download on the App Store"
              style={{ height: 48, width: "auto" }}
            />
          </a>
        )}

        {/* SECONDARY CTA — Continue on web */}
        <a
          href="/?enter=1"
          style={{
            display: "block",
            width: "100%",
            maxWidth: 320,
            padding: "14px 20px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.88)",
            fontSize: "1rem",
            fontWeight: 600,
            textDecoration: "none",
            marginBottom: 12,
            boxSizing: "border-box",
          }}
        >
          Continue on web →
        </a>

        {/* YouTube link */}
        <a
          href={YOUTUBE_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "rgba(255,255,255,0.52)",
            fontSize: "0.875rem",
            textDecoration: "none",
            marginBottom: 28,
            padding: "8px 16px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          Watch daily devotionals on YouTube
        </a>

        {/* TERTIARY CTA — Daily email */}
        {emailStatus === "success" ? (
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", marginBottom: 24 }}>
            ✓ {emailMsg}
          </p>
        ) : !showEmail ? (
          <button
            onClick={() => setShowEmail(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.40)",
              fontSize: "0.8rem",
              cursor: "pointer",
              textDecoration: "underline",
              marginBottom: 24,
              padding: "4px 8px",
            }}
          >
            Get daily Scripture by email
          </button>
        ) : (
          <form
            onSubmit={(e) => void handleEmailSubmit(e)}
            style={{
              width: "100%",
              maxWidth: 320,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.90)",
                fontSize: "1rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="submit"
              disabled={emailStatus === "loading"}
              style={{
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: "rgba(124,58,237,0.85)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: emailStatus === "loading" ? "not-allowed" : "pointer",
                opacity: emailStatus === "loading" ? 0.7 : 1,
              }}
            >
              {emailStatus === "loading" ? "Sending…" : "Send me daily Scripture"}
            </button>
            {emailStatus === "error" && (
              <p style={{ color: "rgba(255,100,100,0.85)", fontSize: "0.8rem", margin: 0 }}>
                {emailMsg}
              </p>
            )}
          </form>
        )}

        {/* Trust signals */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {["⭐","⭐","⭐","⭐","⭐"].map((s, i) => (
              <span key={i} style={{ fontSize: "12px" }}>{s}</span>
            ))}
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginLeft: "2px" }}>
              App Store
            </span>
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.28)",
              margin: 0,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            Scripture &amp; prayer stay free.{" "}
            <span style={{ whiteSpace: "nowrap" }}>No paywall to pray.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
