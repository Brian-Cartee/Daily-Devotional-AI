/**
 * Session Mind telemetry gate — fast check before full golden deploy gate.
 *
 * Usage:
 *   cd eval && npx tsx mind-gate.ts
 *   cd eval && npx tsx mind-gate.ts --local
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { MIND_CONTINUITY_SCENARIO_ID } from "./golden.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extraArgs = process.argv.slice(2);

const result = spawnSync(
  "npx",
  [
    "tsx",
    "philip-turing-test.ts",
    "--scenario",
    MIND_CONTINUITY_SCENARIO_ID,
    "--exchanges",
    "6",
    "--gate",
    ...extraArgs,
  ],
  { cwd: __dirname, stdio: "inherit", env: process.env },
);

process.exit(result.status === 0 ? 0 : 1);
