/**
 * Phase C — zero-cost authentication check.
 * Loads credential in-process only. Never prints the secret.
 * Does not consume a Realtime attempt.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyPhase2OpenAiApiKey,
  scrubSecrets,
} from "./loadCredential.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_ROOT = path.resolve(HERE, "../evidence/phase2");

async function main() {
  applyPhase2OpenAiApiKey();
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("credential_not_loaded");

  const startedAt = new Date().toISOString();
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(20_000),
  });

  let providerErrorType = null;
  let providerErrorCode = null;
  if (!response.ok) {
    try {
      const body = await response.json();
      providerErrorType = body?.error?.type || null;
      providerErrorCode = body?.error?.code || null;
    } catch {
      // ignore non-JSON
    }
  } else {
    // Drain body without retaining model catalog in evidence.
    await response.arrayBuffer();
  }

  const evidence = {
    schemaVersion: 1,
    kind: "phase2_auth_check",
    endpoint: "GET https://api.openai.com/v1/models",
    startedAt,
    finishedAt: new Date().toISOString(),
    httpStatus: response.status,
    authenticationPassed: response.status === 200,
    providerErrorType,
    providerErrorCode,
    providerRequestId: response.headers.get("x-request-id") || null,
    consumesRealtimeAttempt: false,
    estimatedCostUsd: 0,
  };

  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const outPath = path.join(EVIDENCE_ROOT, "auth-check.json");
  await writeFile(outPath, `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });

  // Console output is scrubbed and secret-free.
  console.log(scrubSecrets(JSON.stringify(evidence, null, 2)));
  if (!evidence.authenticationPassed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(scrubSecrets(`PHASE2_AUTH_CHECK_FAILED ${String(error.message || error)}`));
  process.exitCode = 1;
});
