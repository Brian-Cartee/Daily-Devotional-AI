/**
 * Low-cost pre-deploy spot gate — 3 presence/sendoff scenarios only.
 *
 * Usage: cd eval && npm run turing:spot-gate
 *        cd eval && npm run turing:spot-gate -- --local
 *
 * ~$3-5 per run with Sonnet (vs ~$65 full golden gate with Opus).
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extraArgs = process.argv.slice(2);

const result = spawnSync(
  "npx",
  ["tsx", "philip-turing-test.ts", "--spot", "--spot-gate", ...extraArgs],
  { cwd: __dirname, stdio: "inherit", env: process.env },
);

process.exit(result.status === 0 ? 0 : 1);
