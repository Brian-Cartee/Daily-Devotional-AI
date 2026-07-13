export type WebViewDiagEntry = {
  source: "web" | "native";
  event: string;
  detail: string;
  ts: number;
};

export function formatDiagLines(entries: WebViewDiagEntry[], max = 10): string {
  return entries
    .slice(-max)
    .map((e) => {
      const t = new Date(e.ts).toISOString().slice(11, 19);
      const d = e.detail ? ` — ${e.detail}` : "";
      return `${t} [${e.source}] ${e.event}${d}`;
    })
    .join("\n");
}

/** Newest first — easier to read on the stuck-help sheet without fragile scrolling. */
export function formatDiagLinesNewestFirst(entries: WebViewDiagEntry[], max = 24): string {
  return [...entries]
    .slice(-max)
    .reverse()
    .map((e) => {
      const t = new Date(e.ts).toISOString().slice(11, 19);
      const d = e.detail ? ` — ${e.detail}` : "";
      return `${t} [${e.source}] ${e.event}${d}`;
    })
    .join("\n");
}
