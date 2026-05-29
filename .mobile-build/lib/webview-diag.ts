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
