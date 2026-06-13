import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import {
  loadClosetSettings,
  closetDisplayName,
  closetHomeStatus,
  markClosetVisit,
  hasVisitedCloset,
} from "@/lib/prayerCloset";

const CLOSET_DOORWAY_SRC = "/closet-doorway.png";
const CLOSET_FALLBACK_SRC = "/hero-landing.webp";

type Props = {
  /** Week-one focus: shorter card, still shows doorway art */
  compactTeaser?: boolean;
};

export function PrayerClosetHomeCard({ compactTeaser = false }: Props) {
  const settings = loadClosetSettings();
  const title = closetDisplayName(settings, "Your prayer closet");
  const [visited] = useState(hasVisitedCloset);
  const [imgSrc, setImgSrc] = useState(CLOSET_DOORWAY_SRC);
  const statusLine = closetHomeStatus(settings);
  const minH = compactTeaser ? 128 : 156;

  return (
    <Link href="/prayer-closet" className="sp-native-card-link">
      <div
        data-testid="card-home-prayer-closet"
        onClick={() => markClosetVisit()}
        style={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid rgba(139, 92, 246, 0.30)",
          minHeight: `${minH}px`,
          background: "linear-gradient(145deg, #1a0f2e 0%, #0d0618 100%)",
          boxShadow: "0 8px 20px rgba(46, 16, 101, 0.35)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(to right, rgba(251,191,36,0.90), #8b5cf6, #c44ee0)",
            zIndex: 20,
          }}
        />

        <img
          src={imgSrc}
          alt=""
          loading="eager"
          decoding="async"
          onError={() => {
            if (imgSrc !== CLOSET_FALLBACK_SRC) setImgSrc(CLOSET_FALLBACK_SRC);
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 22%",
            zIndex: 0,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.20) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(to right, rgba(46,16,101,0.50) 0%, transparent 55%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            padding: compactTeaser ? "12px 16px" : "16px",
            minHeight: `${minH}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            boxSizing: "border-box",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(253, 230, 138, 0.90)",
              marginBottom: "4px",
              marginTop: 0,
            }}
          >
            {visited ? "Your space" : compactTeaser ? "When you're ready" : "New · your space"}
          </p>
          <p
            style={{
              fontSize: compactTeaser ? "16px" : "18px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.2,
              margin: 0,
              textShadow: "0 1px 4px rgba(0,0,0,0.45)",
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: compactTeaser ? "11px" : "12px",
              color: "rgba(255,255,255,0.72)",
              lineHeight: 1.4,
              marginTop: "4px",
              marginBottom: 0,
              maxWidth: "92%",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {compactTeaser
              ? "Your prayer closet — a private space for worship and honest prayer"
              : (statusLine ?? "Worship, vision board, and honest prayer inside")}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: compactTeaser ? "10px" : "14px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(221, 214, 254, 0.90)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Enter closet
            </span>
            <ArrowRight style={{ width: 20, height: 20, color: "rgba(253, 230, 138, 0.80)", flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
