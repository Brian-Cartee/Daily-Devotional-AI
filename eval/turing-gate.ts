/**
 * Pre-deploy quality gate — runs golden 18 against live and exits non-zero on failure.
 *
 * Usage: cd eval && npm run turing:gate
 *        cd eval && npm run turing:gate -- --local
 *
 * Cost: defaults to Sonnet (~$6-8 full gate). Use `npm run turing:spot-gate` for iteration (~$3-5).
 * Override: TURING_MODEL=claude-opus-4-8 npm run turing:gate  (deep review only, ~$65)
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extraArgs = process.argv.slice(2);

const result = spawnSync(
  "npx",
  ["tsx", "philip-turing-test.ts", "--golden", "--gate", ...extraArgs],
  { cwd: __dirname, stdio: "inherit", env: process.env },
);

process.exit(result.status === 0 ? 0 : 1);
