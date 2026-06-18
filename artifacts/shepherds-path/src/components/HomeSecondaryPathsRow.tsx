import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ShortcutPathIcon } from "@/components/ShortcutPathIcon";
import { getBookmark } from "@/lib/bookmarks";
import { NATIVE_TEXT, NATIVE_TEXT_FAINT, NATIVE_TEXT_MUTED } from "@/lib/nativeColors";

const rowStyle = (border: string, background: string) => ({
  display: "flex" as const,
  alignItems: "center" as const,
  gap: "12px",
  borderRadius: "12px",
  border: `1px solid ${border}`,
  background,
  padding: "12px 16px",
  boxSizing: "border-box" as const,
});

/** Compact secondaries during home devotional focus — not full shortcut stack. */
export function HomeSecondaryPathsRow({ hideCloset = false }: { hideCloset?: boolean }) {
  const [readLabel, setReadLabel] = useState<string | null>(() => getBookmark("read")?.label ?? null);

  useEffect(() => {
    const sync = () => setReadLabel(getBookmark("read")?.label ?? null);
    sync();
    window.addEventListener("sp-bookmark-change", sync);
    return () => window.removeEventListener("sp-bookmark-change", sync);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} data-testid="home-secondary-paths">
      <Link href="/guidance" className="sp-native-card-link">
        <div
          data-testid="home-secondary-guidance"
          data-card="talk-it-through"
          className="border border-violet-500/60"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderRadius: "12px",
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.30) 0%, rgba(109,40,217,0.18) 50%, rgba(88,28,220,0.10) 100%)",
            padding: "12px 16px",
            boxSizing: "border-box",
            boxShadow:
              "0 0 24px rgba(139,92,246,0.30), 0 0 8px rgba(139,92,246,0.20), inset 0 0 20px rgba(139,92,246,0.08)",
          }}
        >
          <span style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.5))" }}>
            <ShortcutPathIcon variant="guidance" size="sm" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-violet-300 mb-0.5 block">
              ✦ signature
            </span>
            <p style={{ fontSize: "14px", fontWeight: 700, color: NATIVE_TEXT, lineHeight: 1.25 }}>
              Talk it through
            </p>
            <p
              style={{
                fontSize: "12px",
                color: NATIVE_TEXT_MUTED,
                lineHeight: 1.375,
                marginTop: "2px",
              }}
            >
              When you're carrying something
            </p>
          </div>
          <ArrowRight style={{ width: "16px", height: "16px", flexShrink: 0, color: NATIVE_TEXT_FAINT }} />
        </div>
      </Link>

      {!hideCloset && (
        <Link href="/prayer-closet" className="sp-native-card-link">
          <div
            data-testid="home-secondary-closet"
            style={rowStyle(
              "rgba(20,184,166,0.20)",
              "linear-gradient(to bottom right, rgba(20,184,166,0.10), rgba(16,185,129,0.06))",
            )}
          >
            <ShortcutPathIcon variant="closet" size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: NATIVE_TEXT, lineHeight: 1.25 }}>
                Prayer closet
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: NATIVE_TEXT_MUTED,
                  lineHeight: 1.375,
                  marginTop: "2px",
                }}
              >
                Quiet room · worship · stillness
              </p>
            </div>
            <ArrowRight style={{ width: "16px", height: "16px", flexShrink: 0, color: NATIVE_TEXT_FAINT }} />
          </div>
        </Link>
      )}

      <Link href="/read" className="sp-native-card-link">
        <div
          data-testid="home-secondary-read"
          style={rowStyle(
            "rgba(245,158,11,0.20)",
            "linear-gradient(to bottom right, rgba(245,158,11,0.10), rgba(249,115,22,0.06))",
          )}
        >
          <ShortcutPathIcon variant="media" size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: NATIVE_TEXT, lineHeight: 1.25 }}>
              {readLabel ? `Continue ${readLabel}` : "Read or listen"}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: NATIVE_TEXT_MUTED,
                lineHeight: 1.375,
                marginTop: "2px",
              }}
            >
              {readLabel ? "Pick up where you left off" : "Play any Bible chapter — KJV, WEB, ASV"}
            </p>
          </div>
          <ArrowRight style={{ width: "16px", height: "16px", flexShrink: 0, color: NATIVE_TEXT_FAINT }} />
        </div>
      </Link>
    </div>
  );
}
