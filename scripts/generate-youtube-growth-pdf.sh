#!/usr/bin/env bash
# Regenerate docs/YOUTUBE_APP_GROWTH_COMPLETE.pdf from the two source markdown files.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS="$REPO_ROOT/docs"
cd "$DOCS"

echo "==> Merging markdown..."
{
  echo "# Shepherd's Path — YouTube + App Growth"
  echo ""
  echo "**Complete PDF edition** · $(date +%B\ %Y) · shepherdspathai.com"
  echo ""
  echo "---"
  echo ""
  echo "# PART A — MASTER STRATEGY"
  echo ""
  tail -n +3 YOUTUBE_APP_GROWTH_MASTER.md
  echo ""
  echo "---"
  echo ""
  echo "# PART B — EXECUTION, LINKS & TOOLS"
  echo ""
  tail -n +3 YOUTUBE_GROWTH_EXECUTION.md
} > YOUTUBE_APP_GROWTH_COMPLETE.md

echo "==> Building HTML..."
python3 << 'PY'
import re
from pathlib import Path

md = Path("YOUTUBE_APP_GROWTH_COMPLETE.md").read_text(encoding="utf-8")

def md_to_html_simple(text):
    lines = text.split("\n")
    out = []
    in_pre = False
    in_table = False
    for line in lines:
        if line.strip().startswith("```"):
            if in_pre:
                out.append("</code></pre>")
                in_pre = False
            else:
                out.append("<pre><code>")
                in_pre = True
            continue
        if in_pre:
            out.append(line.replace("&", "&amp;").replace("<", "&lt;"))
            continue
        if "|" in line and line.strip().startswith("|"):
            if not in_table:
                out.append("<table>")
                in_table = True
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if all(set(c) <= set("-: ") for c in cells):
                continue
            tag = "th" if out[-1] == "<table>" else "td"
            row = "".join(f"<{tag}>{c}</{tag}>" for c in cells)
            out.append(f"<tr>{row}</tr>")
            continue
        elif in_table:
            out.append("</table>")
            in_table = False
        if line.startswith("# "):
            out.append(f"<h1>{line[2:]}</h1>")
        elif line.startswith("## "):
            out.append(f"<h2>{line[3:]}</h2>")
        elif line.startswith("### "):
            out.append(f"<h3>{line[4:]}</h3>")
        elif line.startswith("> "):
            out.append(f"<blockquote><p>{line[2:]}</p></blockquote>")
        elif line.strip() == "---":
            out.append("<hr>")
        elif line.strip().startswith("- "):
            if not out or (not out[-1].startswith("<li>") and out[-1] != "<ul>"):
                out.append("<ul>")
            out.append(f"<li>{line.strip()[2:]}</li>")
        elif line.strip() == "":
            if out and out[-1].startswith("<li>"):
                out.append("</ul>")
            out.append("")
        else:
            s = line
            s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
            s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
            s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
            s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
            if s.strip():
                out.append(f"<p>{s}</p>")
    if in_table:
        out.append("</table>")
    if in_pre:
        out.append("</code></pre>")
    return "\n".join(out)

body = md_to_html_simple(md)
css = Path("pdf-youtube-growth.css").read_text(encoding="utf-8")
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Shepherd's Path — YouTube + App Growth</title>
<style>{css}</style>
</head>
<body>
{body}
</body>
</html>"""
Path("YOUTUBE_APP_GROWTH_COMPLETE.html").write_text(html, encoding="utf-8")
print("Wrote YOUTUBE_APP_GROWTH_COMPLETE.html")
PY

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found. Open this file in a browser and Print → Save as PDF:"
  echo "  file://$DOCS/YOUTUBE_APP_GROWTH_COMPLETE.html"
  exit 0
fi

echo "==> Printing PDF..."
"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$DOCS/YOUTUBE_APP_GROWTH_COMPLETE.pdf" \
  "file://$DOCS/YOUTUBE_APP_GROWTH_COMPLETE.html" 2>/dev/null || true

if [[ -f "$DOCS/YOUTUBE_APP_GROWTH_COMPLETE.pdf" ]]; then
  echo "Done: $DOCS/YOUTUBE_APP_GROWTH_COMPLETE.pdf"
else
  echo "PDF print failed. Open $DOCS/YOUTUBE_APP_GROWTH_COMPLETE.html → Print → Save as PDF"
fi
