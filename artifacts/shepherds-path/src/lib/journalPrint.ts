import type { JournalEntry } from "@shared/schema";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const TYPE_LABELS: Record<string, string> = {
  prayer: "Prayer",
  reflection: "Reflection",
  verse: "Scripture",
  note: "Sermon note",
  guidance_memory: "Talk it through",
};

/** Opens the browser print dialog — user can save as PDF. Pro export path. */
export function printJournalEntries(entries: JournalEntry[]): void {
  if (entries.length === 0) return;

  const sections: Record<string, JournalEntry[]> = {};
  for (const e of entries) {
    if (!sections[e.type]) sections[e.type] = [];
    sections[e.type].push(e);
  }

  const order = ["prayer", "reflection", "verse", "note", "guidance_memory"];
  let bodyHtml = "";
  for (const key of order) {
    const group = sections[key];
    if (!group?.length) continue;
    bodyHtml += `<h2 style="font-family:Georgia,serif;color:#3d1a6e;margin:28px 0 12px;font-size:18px;">${TYPE_LABELS[key] ?? key}</h2>`;
    for (const e of group) {
      const saved = formatDate(String(e.createdAt));
      bodyHtml += `<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e8e0f0;">`;
      if (e.title) bodyHtml += `<p style="margin:0 0 6px;font-weight:700;font-size:15px;">${escapeHtml(e.title)}</p>`;
      if (e.reference) {
        bodyHtml += `<p style="margin:0 0 6px;font-size:12px;color:#5a3d8a;font-weight:600;">${escapeHtml(e.reference)}</p>`;
      }
      bodyHtml += `<p style="margin:0 0 8px;font-size:11px;color:#888;">${saved}</p>`;
      bodyHtml += `<p style="margin:0;font-size:14px;line-height:1.65;color:#333;white-space:pre-wrap;font-family:Georgia,serif;">${escapeHtml(e.content)}</p>`;
      bodyHtml += `</div>`;
    }
  }

  const savedOn = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Shepherd's Path Journal</title>
<style>@media print{body{margin:0.75in}}</style></head><body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1a1a1a;">
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;color:#3d1a6e;margin:0 0 4px;">Shepherd's Path</h1>
<p style="margin:0 0 24px;font-size:13px;color:#666;">Your prayer journal · exported ${savedOn}</p>
${bodyHtml}
<p style="margin-top:32px;font-size:11px;color:#aaa;font-style:italic;">Your word is a lamp to my feet — Psalm 119:105</p>
</body></html>`;

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    alert("Please allow pop-ups to print your journal, or use Save as Text.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
