import { Link } from "wouter";
import { ArrowRight, BookOpen, Wind } from "lucide-react";
import { SpeakLifeHeroPrompt } from "@/components/SpeakLifeHeroPrompt";
import { ShareVerseTrigger } from "@/components/ShareVerseSheet";
import { easternVerseDateKey } from "@/lib/shareVerse";
import type { PresenceDoorId } from "@/components/HomePresenceDoors";
import type { ThresholdNeed } from "@/lib/thresholdState";
import { isLateNight } from "@/lib/nightMode";

type Verse = { text: string; reference: string };

type Props = {
  door: PresenceDoorId;
  phase?: string;
  thresholdNeed?: ThresholdNeed | null;
  verse?: Verse | null;
  onSelectSpeakLife?: () => void;
};

const cardShell = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(245,158,11,0.25)",
  backgroundColor: "rgba(18,16,26,0.95)",
  padding: "16px",
  boxSizing: "border-box",
  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.25)",
};

export function HomePresenceHero({ door, verse, onSelectSpeakLife }: Props) {
  if (door === "speaklife") {
    return <SpeakLifeHeroPrompt />;
  }

  if (door === "scripture") {
    return (
      <div style={cardShell} data-testid="card-sit-scripture-hero">
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px" }}>
          <BookOpen
            style={{ width: "20px", height: "20px", color: "rgba(253,230,138,0.80)", flexShrink: 0, marginTop: "2px" }}
            aria-hidden
          />
          <div>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: "rgba(255,255,255,0.55)",
                marginBottom: "4px",
              }}
            >
              Sit in Scripture
            </p>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.82)", lineHeight: 1.375 }}>
              Today&apos;s verse and a short devotional — read or listen at your pace.
            </p>
          </div>
        </div>
        {verse ? (
          <div
            style={{
              borderRadius: "12px",
              border: "1px solid rgba(245,158,11,0.15)",
              backgroundColor: "rgba(0,0,0,0.30)",
              padding: "10px 12px",
              marginBottom: "12px",
            }}
          >
            <p
              style={{
                fontSize: "15px",
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.375,
                fontStyle: "italic",
                fontFamily: "var(--font-serif, Georgia, serif)",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }}
            >
              &ldquo;{verse.text}&rdquo;
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "4px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(253,230,138,0.75)" }}>— {verse.reference}</p>
              <ShareVerseTrigger
                text={verse.text}
                reference={verse.reference}
                date={easternVerseDateKey()}
                label="Share"
                testId="button-share-home-scripture"
                className="text-amber-200/80 hover:text-amber-100"
              />
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.50)", marginBottom: "12px" }}>
            Your verse for today is ready.
          </p>
        )}
        <p
          style={{
            fontSize: "11px",
            textAlign: "center",
            color: "rgba(255,255,255,0.45)",
            marginBottom: "8px",
            lineHeight: 1.375,
          }}
        >
          Your full devotional continues just below ↓
        </p>
        <Link href="/devotional">
          <span
            data-testid="btn-hero-open-devotional"
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderRadius: "12px",
              padding: "14px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#1a1208",
              background: "linear-gradient(to right, rgba(254,243,199,0.95), rgba(253,230,138,0.90), rgba(254,243,199,0.95))",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.20)",
              boxSizing: "border-box",
            }}
          >
            Open today&apos;s devotional
            <ArrowRight style={{ width: "16px", height: "16px" }} />
          </span>
        </Link>
      </div>
    );
  }

  const quietHref = isLateNight() ? "/night" : "/sigh";
  const quietTitle = isLateNight() ? "Night Shepherd" : "Just breathe";

  return (
    <div
      style={{
        ...cardShell,
        border: "1px solid rgba(167,139,250,0.20)",
      }}
      data-testid="card-just-breathe-hero"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px" }}>
        <Wind
          style={{ width: "20px", height: "20px", color: "rgba(221,214,254,0.75)", flexShrink: 0, marginTop: "2px" }}
          aria-hidden
        />
        <div>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.55)",
              marginBottom: "4px",
            }}
          >
            {quietTitle}
          </p>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.82)", lineHeight: 1.375 }}>
            A quieter room — breath, stillness, and gentle Scripture. No performance, no streak
            pressure.
          </p>
        </div>
      </div>
      <Link href={quietHref}>
        <span
          data-testid="btn-hero-quiet-room"
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "16px",
            fontWeight: 600,
            color: "#ffffff",
            backgroundColor: "rgba(124,58,237,0.90)",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.20)",
            boxSizing: "border-box",
          }}
        >
          {isLateNight() ? "Open Night Shepherd" : "Enter the quiet room"}
          <ArrowRight style={{ width: "16px", height: "16px" }} />
        </span>
      </Link>
      <p
        style={{
          marginTop: "10px",
          textAlign: "center",
          fontSize: "11px",
          color: "rgba(255,255,255,0.38)",
          lineHeight: 1.625,
        }}
      >
        Or return to{" "}
        <button
          type="button"
          style={{
            textDecoration: "underline",
            textUnderlineOffset: "2px",
            color: "rgba(255,255,255,0.50)",
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            cursor: "pointer",
          }}
          onClick={onSelectSpeakLife}
        >
          Speak Life
        </button>{" "}
        when someone comes to mind.
      </p>
    </div>
  );
}
