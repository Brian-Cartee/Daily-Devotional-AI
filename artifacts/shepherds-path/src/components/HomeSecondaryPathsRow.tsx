import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ShortcutPathIcon } from "@/components/ShortcutPathIcon";
import { getBookmark } from "@/lib/bookmarks";
import { HOME_DARK } from "@/lib/homeTheme";

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
      <Link href="/guidance">
        <div
          data-testid="home-secondary-guidance"
          style={rowStyle(
            "rgba(124,58,237,0.20)",
            "linear-gradient(to bottom right, rgba(139,92,246,0.10), rgba(124,58,237,0.06))",
          )}
        >
          <ShortcutPathIcon variant="guidance" size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: HOME_DARK.text, lineHeight: 1.25 }}>
              Talk it through
            </p>
            <p
              style={{
                fontSize: "12px",
                color: HOME_DARK.textMuted,
                lineHeight: 1.375,
                marginTop: "2px",
              }}
            >
              When you need more than reading
            </p>
          </div>
          <ArrowRight style={{ width: "16px", height: "16px", flexShrink: 0, color: HOME_DARK.textSubtle }} />
        </div>
      </Link>

      {!hideCloset && (
        <Link href="/prayer-closet">
          <div
            data-testid="home-secondary-closet"
            style={rowStyle(
              "rgba(20,184,166,0.20)",
              "linear-gradient(to bottom right, rgba(20,184,166,0.10), rgba(16,185,129,0.06))",
            )}
          >
            <ShortcutPathIcon variant="closet" size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: HOME_DARK.text, lineHeight: 1.25 }}>
                Prayer closet
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: HOME_DARK.textMuted,
                  lineHeight: 1.375,
                  marginTop: "2px",
                }}
              >
                Quiet room · worship · stillness
              </p>
            </div>
            <ArrowRight style={{ width: "16px", height: "16px", flexShrink: 0, color: HOME_DARK.textSubtle }} />
          </div>
        </Link>
      )}

      <Link href="/read">
        <div
          data-testid="home-secondary-read"
          style={rowStyle(
            "rgba(245,158,11,0.20)",
            "linear-gradient(to bottom right, rgba(245,158,11,0.10), rgba(249,115,22,0.06))",
          )}
        >
          <ShortcutPathIcon variant="media" size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: HOME_DARK.text, lineHeight: 1.25 }}>
              {readLabel ? `Continue ${readLabel}` : "Read or listen"}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: HOME_DARK.textMuted,
                lineHeight: 1.375,
                marginTop: "2px",
              }}
            >
              {readLabel ? "Pick up where you left off" : "Play any chapter — KJV, WEB, ASV"}
            </p>
          </div>
          <ArrowRight style={{ width: "16px", height: "16px", flexShrink: 0, color: HOME_DARK.textSubtle }} />
        </div>
      </Link>
    </div>
  );
}
