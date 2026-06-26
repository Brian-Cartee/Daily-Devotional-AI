/**
 * pnpm may skip googleapis' prepare/compile step unless onlyBuiltDependencies
 * includes it at the workspace root. This ensures the runtime entry exists before start.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(apiRoot, "../..");
const googleapisEntry = path.join(apiRoot, "node_modules/googleapis/build/src/index.js");

if (fs.existsSync(googleapisEntry)) {
  process.exit(0);
}

console.warn("[googleapis] build/src/index.js missing — rebuilding googleapis…");

const result = spawnSync("pnpm", ["rebuild", "googleapis"], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error(
    "[googleapis] rebuild failed. From the repo root run:\n  pnpm install && pnpm rebuild googleapis",
  );
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(googleapisEntry)) {
  console.error(`[googleapis] still missing after rebuild: ${googleapisEntry}`);
  process.exit(1);
}

console.log("[googleapis] build ready");
