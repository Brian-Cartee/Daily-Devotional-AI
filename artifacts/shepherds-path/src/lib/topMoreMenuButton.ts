/** Shared top-right ⋯ control — frosted light grey box on every screen. */
export function topMoreMenuButtonClass(open: boolean): string {
  const base =
    "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all " +
    "text-zinc-800 shadow-[0_1px_10px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.09] backdrop-blur-md " +
    "bg-[rgba(244,244,246,0.94)] hover:bg-[rgba(252,252,254,0.98)] active:scale-[0.97]";
  return open ? `${base} ring-2 ring-primary/35` : base;
}
