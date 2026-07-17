import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE_ROOT = path.resolve(HERE, "../../..");
export const DEFAULT_PHASE2_CREDENTIAL_PATH = path.join(
  WORKTREE_ROOT,
  ".env.phase2.local",
);

/**
 * Parse OPENAI_API_KEY from a dotenv-style local file.
 * Never logs or returns diagnostic text that includes the secret value.
 */
export function parseOpenAiApiKeyFromEnvFile(raw, { sourceLabel = "credential file" } = {}) {
  const text = String(raw ?? "").replace(/^\uFEFF/, "");
  const assignments = [];

  for (const rawLine of text.split(/\n/)) {
    // Accept Windows CRLF by stripping a single trailing CR only.
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!/^\s*OPENAI_API_KEY\s*=/.test(line)) continue;

    // Any remaining CR means the value itself is malformed.
    if (line.includes("\r")) {
      throw new Error(`${sourceLabel}: OPENAI_API_KEY contains embedded line breaks`);
    }

    const match = line.match(/^\s*OPENAI_API_KEY\s*=\s*(.*)$/);
    if (!match) {
      throw new Error(`${sourceLabel}: OPENAI_API_KEY assignment could not be parsed`);
    }
    assignments.push(match[1]);
  }

  if (assignments.length === 0) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY assignment not found`);
  }
  if (assignments.length > 1) {
    throw new Error(`${sourceLabel}: expected exactly one OPENAI_API_KEY assignment`);
  }

  let value = assignments[0];
  if (value.includes("\r") || value.includes("\n")) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY contains embedded line breaks`);
  }

  value = value.trim();
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    value = value.slice(1, -1);
  }

  if (!value) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY value is empty`);
  }
  if (/^<.*>$/.test(value) || /^\$\{.+\}$/.test(value)) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY looks like a placeholder`);
  }

  // Refuse the Session 1 failure mode: treating the assignment line itself as the token.
  if (value === "OPENAI_API_KEY" || value.startsWith("OPENAI_API_KEY=")) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY parsed as the assignment line, not a secret`);
  }

  return value;
}

/**
 * Broken Session 1 ad-hoc parser retained only for regression proof.
 * DO NOT use at runtime.
 */
export function brokenSession1AdHocParser(raw) {
  let s = String(raw).replace(/^\uFEFF/, "").trim();
  const m = s.match(/OPENAI_API_KEY\s*=\s*(.+)/);
  return (m ? m[1] : s).trim();
}

export function loadPhase2OpenAiApiKey({
  filePath = DEFAULT_PHASE2_CREDENTIAL_PATH,
  env = process.env,
  readFile = readFileSync,
} = {}) {
  // Prefer an already-valid process env only if it is nonempty and not the
  // known broken fallback token. Otherwise load from the gitignored local file.
  const existing = env.OPENAI_API_KEY;
  if (
    typeof existing === "string" &&
    existing.trim() &&
    existing !== "OPENAI_API_KEY" &&
    !existing.startsWith("OPENAI_API_KEY=")
  ) {
    return existing.trim();
  }

  let raw;
  try {
    raw = readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error("phase2 credential file not found");
    }
    throw error;
  }

  return parseOpenAiApiKeyFromEnvFile(raw, {
    sourceLabel: path.basename(filePath),
  });
}

export function applyPhase2OpenAiApiKey(options = {}) {
  const value = loadPhase2OpenAiApiKey(options);
  process.env.OPENAI_API_KEY = value;
  return { loaded: true, source: options.filePath || DEFAULT_PHASE2_CREDENTIAL_PATH };
}
