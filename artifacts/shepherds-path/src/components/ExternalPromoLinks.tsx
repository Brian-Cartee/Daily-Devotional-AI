import { Youtube } from "lucide-react";
import { isAndroid, isNativeWebViewShell } from "@/lib/platform";

export const APP_STORE_URL = "https://apps.apple.com/app/shepherds-path/id6760953522";
export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/channel/UCDMo8aTnYp6VHJP3Q_Nmw0Q";

/** Official Apple badge — white variant for dark backgrounds */
const APP_STORE_BADGE_SRC =
  "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/white/en-us?size=250x83";

type ExternalPromoLinksProps = {
  variant: "hero" | "footer";
};

export function ExternalPromoLinks({ variant }: ExternalPromoLinksProps) {
  if (isNativeWebViewShell()) return null;

  const isHero = variant === "hero";
  const badgeHeight = isHero ? 40 : 36;

  return (
    <div
      data-testid={isHero ? "hero-external-promo-links" : "footer-external-promo-links"}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: isHero ? "14px" : "12px",
        width: "100%",
        marginTop: isHero ? "20px" : 0,
        marginBottom: isHero ? 0 : "16px",
        paddingLeft: isHero ? 0 : "16px",
        paddingRight: isHero ? 0 : "16px",
        boxSizing: "border-box",
      }}
    >
      {!isAndroid() && (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={isHero ? "link-app-store-hero" : "link-app-store-footer"}
          aria-label="Download on the App Store"
          style={{ display: "inline-flex", flexShrink: 0, lineHeight: 0 }}
        >
          <img
            src={APP_STORE_BADGE_SRC}
            alt="Download on the App Store"
            height={badgeHeight}
            style={{ height: badgeHeight, width: "auto", display: "block" }}
          />
        </a>
      )}
      <a
        href={YOUTUBE_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={isHero ? "link-youtube-hero" : "link-youtube-footer"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: isHero ? "8px 14px" : "7px 12px",
          borderRadius: "9999px",
          border: "1px solid rgba(255,255,255,0.14)",
          backgroundColor: "rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.72)",
          fontSize: isHero ? "13px" : "12px",
          fontWeight: 600,
          textDecoration: "none",
          flexShrink: 0,
          minHeight: "36px",
          boxSizing: "border-box",
        }}
      >
        <Youtube
          aria-hidden
          style={{
            width: isHero ? 18 : 16,
            height: isHero ? 18 : 16,
            color: "rgba(255,255,255,0.85)",
            flexShrink: 0,
          }}
        />
        Watch on YouTube
      </a>
    </div>
  );
}
