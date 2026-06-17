import { useEffect } from "react";
import { Link } from "wouter";
import { APP_STORE_URL } from "@/components/ExternalPromoLinks";
import { BRAND_ICON } from "@/lib/brand";
import { isAndroid } from "@/lib/platform";

const APPLE_ICON_PATH =
  "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z";

export default function StartPage() {
  const onAndroid = isAndroid();

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
              "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.22) 38%, rgba(20,10,4,0.82) 72%, rgba(30,15,5,0.98) 100%)",
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
            alignItems: "center",
            padding:
              "max(52px, env(safe-area-inset-top, 52px)) 24px max(40px, calc(32px + env(safe-area-inset-bottom, 0px)))",
            maxWidth: 420,
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {/* Brand lockup */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <img
              src={BRAND_ICON}
              alt=""
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
              }}
            />
            <p
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.72)",
                margin: 0,
              }}
            >
              Shepherd&apos;s Path
            </p>
          </div>

          {/* Hero + CTAs — centered, bottom-anchored */}
          <div style={{ width: "100%", textAlign: "center" }}>
            <h1
              style={{
                fontSize: "clamp(2rem, 8vw, 2.55rem)",
                fontWeight: 500,
                fontFamily: "var(--font-serif, Georgia, serif)",
                color: "rgba(255,255,255,0.96)",
                lineHeight: 1.22,
                margin: "0 0 14px",
                letterSpacing: "-0.01em",
                textShadow: "0 2px 16px rgba(0,0,0,0.55)",
              }}
            >
              Walk with God,
              <br />
              one moment
              <br />
              at a time.
            </h1>

            <p
              style={{
                margin: "0 0 28px",
                fontSize: "0.95rem",
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.72)",
                textShadow: "0 1px 8px rgba(0,0,0,0.45)",
                maxWidth: "18rem",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Daily Scripture, guided prayer, and a quiet companion — free on iPhone and web.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                maxWidth: "20rem",
                margin: "0 auto",
              }}
            >
              {!onAndroid && (
                <>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    Free on iPhone
                  </p>
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-app-store-start"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      width: "100%",
                      padding: "16px 20px",
                      minHeight: "52px",
                      borderRadius: "14px",
                      backgroundColor: "#ede8e0",
                      color: "#0d0612",
                      fontWeight: 700,
                      fontSize: "16px",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.32)",
                      boxSizing: "border-box",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      style={{ width: 22, height: 22, fill: "currentColor", flexShrink: 0 }}
                      aria-hidden="true"
                    >
                      <path d={APPLE_ICON_PATH} />
                    </svg>
                    Get the app — App Store
                  </a>
                </>
              )}

              {onAndroid && (
                <>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    Available now on web
                  </p>
                  <Link
                    href="/welcome"
                    data-testid="link-continue-on-web-primary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      padding: "16px 20px",
                      minHeight: "52px",
                      borderRadius: "14px",
                      backgroundColor: "#ede8e0",
                      color: "#0d0612",
                      fontWeight: 700,
                      fontSize: "16px",
                      textDecoration: "none",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.32)",
                      boxSizing: "border-box",
                    }}
                  >
                    Continue on web →
                  </Link>
                </>
              )}

              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.30)",
                }}
              >
                Coming soon to Google Play
              </p>

              {!onAndroid && (
                <Link
                  href="/welcome"
                  data-testid="link-continue-on-web"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "4px",
                    padding: "12px 16px",
                    width: "100%",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.18)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.78)",
                    textDecoration: "none",
                    boxSizing: "border-box",
                  }}
                >
                  Or continue on web →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
