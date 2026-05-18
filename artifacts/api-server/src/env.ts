import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/** api-server package root (dist/ when bundled → parent is package root). */
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function loadEnvFile(filePath: string, override = false): boolean {
  if (!existsSync(filePath)) return false;
  const result = dotenv.config({ path: filePath, override });
  if (result.error) {
    console.warn(`[env] Failed to load ${filePath}:`, result.error.message);
    return false;
  }
  return true;
}

function uniquePaths(candidates: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of candidates) {
    const resolved = path.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
  }
  return out;
}

function envFileCandidates(): string[] {
  const cwd = process.cwd();
  return uniquePaths([
    path.join(packageRoot, ".env"),
    path.join(cwd, ".env"),
    path.join(cwd, "artifacts", "api-server", ".env"),
  ]);
}

const loaded: string[] = [];
const explicitPath = process.env.DOTENV_CONFIG_PATH;

if (explicitPath) {
  const resolved = path.resolve(explicitPath);
  if (loadEnvFile(resolved, true)) loaded.push(resolved);
} else {
  for (const filePath of envFileCandidates()) {
    if (loadEnvFile(filePath)) loaded.push(filePath);
  }

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv) {
    for (const filePath of uniquePaths([
      path.join(packageRoot, `.env.${nodeEnv}`),
      path.join(process.cwd(), `.env.${nodeEnv}`),
      path.join(process.cwd(), "artifacts", "api-server", `.env.${nodeEnv}`),
    ])) {
      if (loadEnvFile(filePath, true)) loaded.push(filePath);
    }
  }
}

if (loaded.length > 0) {
  console.log(`[env] Loaded ${loaded.join(", ")}`);
} else if (!explicitPath) {
  console.warn(
    "[env] No .env file found; using shell/system environment only. Copy .env.example to .env on your VPS.",
  );
}
