/** Shared top-right ⋯ control — soft light grey box on every screen (not bright white). */
export function topMoreMenuButtonClass(open: boolean): string {
  const base =
    "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all " +
    "text-zinc-600 shadow-[0_1px_8px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.07] backdrop-blur-md " +
    "bg-[rgba(214,214,218,0.88)] hover:bg-[rgba(206,206,212,0.92)] active:scale-[0.97]";
  return open ? `${base} ring-2 ring-primary/30` : base;
}
