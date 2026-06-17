import { useEffect } from "react";
import { Link } from "wouter";
import { APP_STORE_URL } from "@/components/ExternalPromoLinks";

const APP_STORE_BADGE_SRC =
  "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/white/en-us?size=250x83";

export default function StartPage() {
  useEffect(() => {
    document.title = "Shepherd's Path — Walk with God, One Moment at a Time";
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#09031e",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column" }}
        data-testid="start-acquisition-page"
      >
        <img
          src="/hero-landing.webp"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
          }}
        />

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.20) 40%, rgba(20,10,4,0.78) 75%, rgba(30,15,5,0.97) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding:
              "max(52px, env(safe-area-inset-top, 52px)) 28px max(48px, calc(36px + env(safe-area-inset-bottom, 0px)))",
            maxWidth: 420,
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          <p
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              margin: 0,
            }}
          >
            Shepherd&apos;s Path
          </p>

          <div>
            <h1
              style={{
                fontSize: "clamp(2rem, 8vw, 2.6rem)",
                fontWeight: 500,
                fontFamily: "var(--font-serif, Georgia, serif)",
                color: "rgba(255,255,255,0.96)",
                lineHeight: 1.22,
                margin: "0 0 28px",
                letterSpacing: "-0.01em",
                textShadow: "0 2px 16px rgba(0,0,0,0.55)",
              }}
            >
              Walk with God,<br />
              one moment<br />
              at a time.
            </h1>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: "14px",
              }}
            >
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-app-store-start"
                aria-label="Download on the App Store"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  lineHeight: 0,
                }}
              >
                <img
                  src={APP_STORE_BADGE_SRC}
                  alt="Download on the App Store"
                  height={44}
                  style={{ height: 44, width: "auto", display: "block" }}
                />
              </a>

              <p
                style={{
                  margin: 0,
                  textAlign: "center",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.32)",
                }}
              >
                Coming soon to Google Play
              </p>

              <Link
                href="/welcome"
                data-testid="link-continue-on-web"
                style={{
                  display: "block",
                  marginTop: "8px",
                  padding: "10px 0",
                  textAlign: "center",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.55)",
                  textDecoration: "none",
                  transition: "color 0.18s",
                }}
              >
                Continue on web →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
