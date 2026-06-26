import { useEffect, useMemo } from "react";
import { Link, useRoute } from "wouter";
import { BookOpen } from "lucide-react";
import { NATIVE_PAGE, NATIVE_TEXT, NATIVE_TEXT_MUTED, NATIVE_TEXT_SOFT } from "@/lib/nativeColors";
import { getSpeakLifeEntry, loadSpeakLifeArchive } from "@/lib/speakLife/archive";

function formatArchiveDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SpeakLifeArchivePage() {
  const [, params] = useRoute("/speak-life/archive/:id");
  const selectedId = params?.id ?? null;

  const entries = useMemo(() => loadSpeakLifeArchive(), []);
  const selected = selectedId ? getSpeakLifeEntry(selectedId) : null;

  useEffect(() => {
    document.title = "18:21 — Shepherd's Path";
  }, []);

  if (selected) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: NATIVE_PAGE,
          color: NATIVE_TEXT,
          padding: "24px 20px 120px",
        }}
      >
        <Link
          href="/speak-life/archive"
          style={{ fontSize: "14px", color: NATIVE_TEXT_MUTED, textDecoration: "none" }}
        >
          ← 18:21
        </Link>

        <h1 style={{ fontSize: "22px", fontWeight: 600, marginTop: "20px", marginBottom: "4px" }}>
          {selected.recipient_name}
        </h1>
        <p style={{ fontSize: "13px", color: NATIVE_TEXT_MUTED, marginBottom: "24px" }}>
          {formatArchiveDate(selected.saved_at)}
          {selected.private_only ? " · Saved privately" : ""}
        </p>

        <div
          style={{
            borderRadius: "16px",
            padding: "20px",
            background: "rgba(196,78,224,0.08)",
            border: "1px solid rgba(196,78,224,0.18)",
            marginBottom: "16px",
          }}
        >
          <p style={{ fontSize: "16px", lineHeight: 1.65, color: NATIVE_TEXT_SOFT, whiteSpace: "pre-wrap" }}>
            {selected.appreciation_text}
          </p>
        </div>

        {selected.prayer_text && (
          <div
            style={{
              borderRadius: "16px",
              padding: "20px",
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.16)",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: NATIVE_TEXT_MUTED,
                marginBottom: "10px",
              }}
            >
              Prayer
            </p>
            <p style={{ fontSize: "15px", lineHeight: 1.65, color: NATIVE_TEXT_SOFT, whiteSpace: "pre-wrap" }}>
              {selected.prayer_text}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: NATIVE_PAGE,
        color: NATIVE_TEXT,
        padding: "24px 20px 120px",
      }}
    >
      <Link
        href="/speak-life"
        style={{ fontSize: "14px", color: NATIVE_TEXT_MUTED, textDecoration: "none" }}
      >
        ← Speak Life
      </Link>

      <h1 style={{ fontSize: "28px", fontWeight: 600, marginTop: "20px", marginBottom: "6px" }}>
        18:21
      </h1>
      <p style={{ fontSize: "15px", color: NATIVE_TEXT_MUTED, marginBottom: "28px" }}>
        Words of life you&apos;ve spoken.
      </p>

      {entries.length === 0 ? (
        <div
          style={{
            borderRadius: "16px",
            padding: "24px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <BookOpen style={{ width: 24, height: 24, color: NATIVE_TEXT_MUTED, marginBottom: 12 }} />
          <p style={{ fontSize: "15px", color: NATIVE_TEXT_SOFT, lineHeight: 1.5 }}>
            When you save a word of encouragement here, it will stay — quiet and private.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/speak-life/archive/${entry.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  borderRadius: "14px",
                  padding: "16px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <p style={{ fontSize: "16px", fontWeight: 600, color: NATIVE_TEXT }}>{entry.recipient_name}</p>
                  <p style={{ fontSize: "12px", color: NATIVE_TEXT_MUTED, flexShrink: 0 }}>
                    {formatArchiveDate(entry.saved_at)}
                  </p>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: NATIVE_TEXT_SOFT,
                    lineHeight: 1.5,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {entry.appreciation_text}
                </p>
                {entry.prayer_text && (
                  <p style={{ fontSize: "11px", color: NATIVE_TEXT_MUTED, marginTop: 8 }}>Includes prayer</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
