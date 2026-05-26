/** Shared email visual system — matches Shepherd's Path home / sacred presence UI */

export const EMAIL_THEME = {
  outerBg: "#0c0a12",
  cardBg: "#141018",
  cardBorder: "#2a2535",
  text: "#f4efe6",
  textSoft: "#c8c0b4",
  textMuted: "#8a8378",
  accent: "#d4a574",
  accentHover: "#e8c99b",
  accentInk: "#1a1208",
  rule: "linear-gradient(90deg, transparent, #d4a574 40%, transparent)",
  serif: "Georgia, 'Times New Roman', Times, serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
} as const;

export function emailPreheader(text: string): string {
  const t = text.replace(/<[^>]+>/g, "").slice(0, 120);
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${t}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`;
}
