import type { CSSProperties } from "react";

/** Shared top-right ⋯ — light gray box, white dots (same on every screen). */
export function topMoreMenuButtonStyle(open: boolean): CSSProperties {
  return {
    backgroundColor: open ? "#9a9aa0" : "#a8a8ad",
    color: "#ffffff",
    boxShadow: "0 1px 6px rgba(0,0,0,0.18)",
    border: "1px solid rgba(0,0,0,0.12)",
  };
}

export function topMoreMenuButtonClass(open: boolean): string {
  return [
    "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all",
    "active:scale-[0.97]",
    open ? "ring-2 ring-white/40" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
