/**
 * Pre-deploy quality gate — runs golden 15 against live and exits non-zero on failure.
 *
 * Usage: cd eval && npm run turing:gate
 *        cd eval && npm run turing:gate -- --local
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
