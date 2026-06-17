/**
 * Retry fetcher — reads verses-output.csv, finds rows with fetch errors,
 * re-fetches them with a longer delay, and writes a corrected CSV.
 *
 * Usage:  node scripts/retry-verses.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH  = join(__dirname, "verses-output.csv");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function refToUrl(ref) {
  return encodeURIComponent(ref.toLowerCase().replace(/\s+/g, "+"));
}

async function fetchVerse(ref, attempt = 1) {
  const url = `https://bible-api.com/${refToUrl(ref)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (res.status === 429) {
      if (attempt <= 5) {
        const wait = attempt * 3000;
        console.log(`     ⏳ Rate limited, waiting ${wait/1000}s before retry ${attempt}...`);
        await sleep(wait);
        return fetchVerse(ref, attempt + 1);
      }
      return "[FETCH ERROR 429 — MANUAL LOOKUP NEEDED]";
    }
    if (!res.ok) return `[FETCH ERROR ${res.status}]`;
    const data = await res.json();
    const text = (data.text || "").replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim();
    return text || "[NO TEXT RETURNED]";
  } catch (err) {
    return `[ERROR: ${err.message}]`;
  }
}

function csvCell(val) {
  return `"${String(val).replace(/"/g, '""')}"`;
}

// ─── Parse existing CSV ───────────────────────────────────────────────────────

const raw = readFileSync(CSV_PATH, "utf8");
const lines = raw.split("\n");
const header = lines[0];

// Parse rows — handle quoted commas
function parseCSVLine(line) {
  const cells = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      cells.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

const rows = lines.slice(1).filter(l => l.trim()).map(parseCSVLine);

// ─── Find and fix errors ──────────────────────────────────────────────────────

let fixCount = 0;
let errorCount = 0;

for (let i = 0; i < rows.length; i++) {
  const verseText = rows[i][1]; // Column B = Verse Text
  const ref       = rows[i][2]; // Column C = Reference

  if (!verseText.startsWith("[FETCH ERROR") && !verseText.startsWith("[ERROR")) continue;

  process.stdout.write(`Retrying Day ${i + 1} | ${ref.padEnd(30)} `);
  await sleep(2000); // 2s between each request

  const text = await fetchVerse(ref);
  const ok = !text.startsWith("[");
  console.log(ok ? "✓" : text);

  rows[i][1] = text;
  if (ok) fixCount++; else errorCount++;
}

// ─── Write updated CSV ────────────────────────────────────────────────────────

const csvLines = [
  header,
  ...rows.map(row => row.map(csvCell).join(",")),
];

writeFileSync(CSV_PATH, csvLines.join("\n"), "utf8");

console.log(`\n✅ Retry complete.`);
console.log(`   Fixed: ${fixCount} verses`);
console.log(`   Still failing: ${errorCount} verses (need manual lookup)`);
console.log(`   Updated CSV saved to: scripts/verses-output.csv`);
