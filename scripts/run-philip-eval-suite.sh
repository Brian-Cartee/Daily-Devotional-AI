#!/usr/bin/env bash
# Philip quality suite — run while away (~1.5–2h sequential).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="/tmp/philip-eval-suite-$(date +%s).log"
exec > >(tee -a "$LOG") 2>&1

echo "==> Philip eval suite started: $(date -Iseconds)"
echo "    Log: $LOG"
cd "$ROOT/eval"

echo ""
echo "==> [2/4] Golden 15 (~25 min)"
npm run turing:golden

echo ""
echo "==> [3/4] Turing sweep count 20 (~45–75 min)"
npm run turing -- --count 20

echo ""
echo "==> [4a/4] eval:live"
npm run eval:live

echo ""
echo "==> [4b/4] eval:response (live)"
npm run eval:response -- --target live

echo ""
echo "==> Philip eval suite finished: $(date -Iseconds)"
echo "    Reports: $ROOT/eval/reports/"
