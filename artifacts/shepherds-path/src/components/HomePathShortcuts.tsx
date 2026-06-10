import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ShortcutPathIcon, type ShortcutIconVariant } from "@/components/ShortcutPathIcon";
import { NATIVE_TEXT, NATIVE_TEXT_FAINT, NATIVE_TEXT_MUTED } from "@/lib/nativeColors";

const SHORTCUTS: {
  href: string;
  label: string;
  desc: string;
  testid: string;
  border: string;
  background: string;
  iconVariant: ShortcutIconVariant;
}[] = [
  {
    href: "/guidance",
    iconVariant: "guidance",
    label: "Talk it through",
    desc: "Scripture and prayer shaped for what's on your heart",
    testid: "shortcut-guidance",
    border: "rgba(124,58,237,0.20)",
    background: "linear-gradient(to bottom right, rgba(139,92,246,0.12), rgba(124,58,237,0.08))",
  },
  {
    href: "/journal",
    iconVariant: "journal",
    label: "Journal",
    desc: "Hold prayers and reflections you don't want to lose",
    testid: "shortcut-journal",
    border: "rgba(20,184,166,0.20)",
    background: "linear-gradient(to bottom right, rgba(20,184,166,0.10), rgba(16,185,129,0.06))",
  },
  {
    href: "/understand#pathways",
    iconVariant: "pathways",
    label: "Guided Pathways",
    desc: "7-day walks for grief, anxiety, and hard seasons",
    testid: "shortcut-journeys",
    border: "rgba(99,102,241,0.20)",
    background: "linear-gradient(to bottom right, rgba(99,102,241,0.10), rgba(139,92,246,0.06))",
  },
] as const;

/** Chapel week — three list rows before the 16-path catalog */
export function HomePathShortcuts() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} data-testid="home-path-shortcuts">
      {SHORTCUTS.map(({ href, iconVariant, label, desc, testid, border, background }) => (
        <Link key={href} href={href} className="sp-native-card-link">
          <div
            data-testid={testid}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              borderRadius: "12px",
              border: `1px solid ${border}`,
              background,
              padding: "12px 16px",
              boxSizing: "border-box",
            }}
          >
            <ShortcutPathIcon variant={iconVariant} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: NATIVE_TEXT, lineHeight: 1.25 }}>
                {label}
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: NATIVE_TEXT_MUTED,
                  lineHeight: 1.375,
                  marginTop: "2px",
                }}
              >
                {desc}
              </p>
            </div>
            <ArrowRight
              style={{ width: "16px", height: "16px", flexShrink: 0, color: NATIVE_TEXT_FAINT }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
