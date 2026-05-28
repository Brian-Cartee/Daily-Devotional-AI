/** Shared top-right ⋯ — frosted charcoal glass, white dots (same on every screen). */
export function topMoreMenuButtonClass(open: boolean): string {
  const base =
    "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all " +
    "text-white/90 shadow-md shadow-black/25 backdrop-blur-md ring-1 ring-white/10 " +
    "active:scale-[0.97]";
  return open
    ? `${base} bg-black/40 hover:bg-black/45`
    : `${base} bg-black/30 hover:bg-black/38`;
}
