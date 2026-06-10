import type { CSSProperties } from "react";

/** Shared top nav icon buttons — frosted charcoal glass, always visible on hero photo. */
export const topMoreMenuButtonStyle = (open: boolean): CSSProperties => ({
  position: "relative",
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  color: "rgba(255,255,255,0.92)",
  backgroundColor: open ? "rgba(0,0,0,0.40)" : "rgba(0,0,0,0.30)",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.25)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.10)",
  cursor: "pointer",
  flexShrink: 0,
});

/** Class fallback for non-critical screens; prefer topMoreMenuButtonStyle in native shell. */
export function topMoreMenuButtonClass(open: boolean): string {
  const base =
    "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all " +
    "text-white/90 shadow-md shadow-black/25 backdrop-blur-md ring-1 ring-white/10 " +
    "active:scale-[0.97]";
  return open
    ? `${base} bg-black/40 hover:bg-black/45`
    : `${base} bg-black/30 hover:bg-black/38`;
}
