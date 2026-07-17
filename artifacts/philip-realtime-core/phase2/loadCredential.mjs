import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE_ROOT = path.resolve(HERE, "../../..");
export const DEFAULT_PHASE2_CREDENTIAL_PATH = path.join(
  WORKTREE_ROOT,
  ".env.phase2.local",
);

const PLACEHOLDER_RE =
  /^(?:<.*>|\$\{.+\}$|your[_-]?api[_-]?key|your[_-]?key[_-]?here|changeme|replace[_-]?me|todo|xxx|sk-\.\.\.)$/i;

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

  // Detect malformed surrounding quotes (unbalanced) before stripping.
  const startsDouble = value.startsWith('"');
  const endsDouble = value.endsWith('"');
  const startsSingle = value.startsWith("'");
  const endsSingle = value.endsWith("'");
  if ((startsDouble && !endsDouble) || (!startsDouble && endsDouble)) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY has malformed surrounding quotes`);
  }
  if ((startsSingle && !endsSingle) || (!startsSingle && endsSingle)) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY has malformed surrounding quotes`);
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
  if (PLACEHOLDER_RE.test(value)) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY looks like a placeholder`);
  }

  // Refuse the Session 1 failure mode: treating the assignment line itself as the token.
  if (value === "OPENAI_API_KEY" || value.startsWith("OPENAI_API_KEY=")) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY parsed as the assignment line, not a secret`);
  }

  if (/\s/.test(value)) {
    throw new Error(`${sourceLabel}: OPENAI_API_KEY contains whitespace contamination`);
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

function isMalformedEnvToken(value) {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === "OPENAI_API_KEY" || trimmed.startsWith("OPENAI_API_KEY=")) return true;
  if (PLACEHOLDER_RE.test(trimmed)) return true;
  return false;
}

/**
 * Phase 2 authority is the gitignored local file.
 * A suspicious nonempty parent env that differs from the file is rejected.
 */
export function loadPhase2OpenAiApiKey({
  filePath = DEFAULT_PHASE2_CREDENTIAL_PATH,
  env = process.env,
  readFile = readFileSync,
} = {}) {
  let raw;
  try {
    raw = readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error("phase2 credential file not found");
    }
    throw error;
  }

  const fromFile = parseOpenAiApiKeyFromEnvFile(raw, {
    sourceLabel: path.basename(filePath),
  });

  const parent = env.OPENAI_API_KEY;
  if (typeof parent === "string" && parent.trim()) {
    if (isMalformedEnvToken(parent)) {
      throw new Error("suspicious parent-environment OPENAI_API_KEY override rejected");
    }
    if (parent.trim() !== fromFile) {
      throw new Error("suspicious parent-environment OPENAI_API_KEY override rejected");
    }
  }

  return fromFile;
}

export function applyPhase2OpenAiApiKey(options = {}) {
  const value = loadPhase2OpenAiApiKey(options);
  process.env.OPENAI_API_KEY = value;
  return {
    loaded: true,
    sourceBasename: path.basename(options.filePath || DEFAULT_PHASE2_CREDENTIAL_PATH),
  };
}

/** Scrub secrets from objects/strings before logging or persistence. */
export function scrubSecrets(input) {
  const text = typeof input === "string" ? input : JSON.stringify(input);
  return text
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]")
    .replace(/OPENAI_API_KEY\s*=\s*[^\s"']+/gi, "OPENAI_API_KEY=[redacted]")
    .replace(/("?(?:authorization|cookie|set-cookie|api[_-]?key|openai-api-key)"?\s*[:=]\s*")([^"]*)(")/gi, "$1[redacted]$3");
}
