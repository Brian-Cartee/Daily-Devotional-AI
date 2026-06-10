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
  const minHeight = compactTeaser ? "120px" : "148px";

  return (
    <Link href="/prayer-closet">
      <div
        data-testid="card-home-prayer-closet"
        onClick={() => markClosetVisit()}
        style={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid rgba(139,92,246,0.30)",
          minHeight,
          background: "linear-gradient(145deg, #1a0f2e 0%, #0d0618 100%)",
          boxShadow: "0 10px 15px -3px rgba(46,16,101,0.30)",
          display: "block",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "3px",
            background: "linear-gradient(to right, rgba(251,191,36,0.90), #8b5cf6, #d946ef)",
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
            inset: 0,
            width: "100%",
            height: "118%",
            objectFit: "cover",
            objectPosition: "center 22%",
            transform: "scale(1.04)",
            zIndex: 0,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, rgba(46,16,101,0.55) 0%, transparent 55%)",
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            padding: compactTeaser ? "12px 16px" : "16px",
            minHeight,
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
              color: "rgba(253,230,138,0.90)",
              marginBottom: "4px",
            }}
          >
            {visited ? "Your space" : compactTeaser ? "When you're ready" : "New · your space"}
          </p>
          <p
            style={{
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.25,
              fontSize: compactTeaser ? "16px" : "18px",
              textShadow: "0 1px 4px rgba(0,0,0,0.45)",
            }}
          >
            {title}
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.70)",
              lineHeight: 1.375,
              maxWidth: "90%",
              fontSize: compactTeaser ? "11px" : "12px",
              marginTop: compactTeaser ? "2px" : "4px",
            }}
          >
            {compactTeaser
              ? "Your prayer closet — worship, vision board, honest prayer"
              : (statusLine ?? "Worship, vision board, and honest prayer inside")}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: compactTeaser ? "8px" : "12px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(221,214,254,0.90)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Enter closet
            </span>
            <ArrowRight style={{ width: "20px", height: "20px", color: "rgba(253,230,138,0.80)" }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
