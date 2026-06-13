import { Link } from "wouter";
import { Heart } from "lucide-react";

type Props = {
  /** Shown inside the same section card (e.g. week-one devotional focus hint) */
  footerHint?: string;
};

/** Single calm entry when life feels heavy — avoids hunting the explore grid. */
export function HomeHeavyMomentLink({ footerHint }: Props) {
  return (
    <div
      data-testid="section-something-heavy"
      style={{
        maxWidth: "36rem",
        marginLeft: "auto",
        marginRight: "auto",
        paddingLeft: "16px",
        paddingRight: "16px",
        position: "relative",
        zIndex: 10,
        marginTop: "-4px",
        marginBottom: footerHint ? "20px" : "12px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(139,92,246,0.25)",
          backgroundColor: "rgba(46,16,101,0.25)",
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(46,16,101,0.20)",
        }}
      >
        <Link
          href="/guidance"
          data-testid="link-something-heavy"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 16px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "rgba(139,92,246,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Heart style={{ width: "16px", height: "16px", color: "rgba(196,181,253,0.90)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.25 }}>
              Something is on your heart
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.55)",
                marginTop: "2px",
                lineHeight: 1.375,
              }}
            >
              Scripture and prayer for what you&apos;re carrying — no performance
            </p>
          </div>
        </Link>
        {footerHint ? (
          <p
            data-testid="text-sacred-first-hint"
            style={{
              borderTop: "1px solid rgba(139,92,246,0.15)",
              padding: "10px 16px",
              textAlign: "center",
              fontSize: "13px",
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.625,
              margin: 0,
            }}
          >
            {footerHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
