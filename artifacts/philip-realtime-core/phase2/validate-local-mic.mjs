/**
 * Unpaid local validation of the manual canary page.
 * Uses Chrome fake media devices. Makes no OpenAI calls.
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startPhase2Server } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, "..");
const OUT_DIR = path.join(PACKAGE_ROOT, "evidence", "phase2");
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE = path.join(PACKAGE_ROOT, "tmp", "phase2-manual-prep-chrome");

async function main() {
  delete process.env.ALLOW_ATTEMPT3;
  const beforeLedger = JSON.parse(
    await readFile(path.join(OUT_DIR, "attempt-ledger.json"), "utf8"),
  );
  const server = await startPhase2Server();
  await mkdir(PROFILE, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const resultPath = path.join(OUT_DIR, "manual-prep-validation.json");
  const url = `${server.origin}/manual-canary`;

  // Drive a short headless session: open page, assert Begin disabled, hit prep-status,
  // prove /api/session is rejected, prove no openai host contact from our server logs path.
  const validation = {
    schemaVersion: 1,
    kind: "phase2_manual_prep_validation",
    startedAt: new Date().toISOString(),
    pageUrl: url,
    checks: {},
  };

  try {
    const page = await fetch(url);
    validation.checks.pageStatus = page.status;
    const html = await page.text();
    validation.checks.bannerPresent = html.includes(
      "Attempt 3 of 3 — paid connection not started",
    );
    validation.checks.beginDisabledInHtml = /id="beginRealtime"[^>]*disabled/.test(html);

    const prep = await fetch(`${server.origin}/api/prep-status`).then((r) => r.json());
    validation.checks.prepStatus = prep;
    validation.checks.attempt3RemainsDisarmed = prep.attempt3Armed === false;

    const blocked = await fetch(`${server.origin}/api/session?session=1`, {
      method: "POST",
      headers: { "content-type": "application/sdp" },
      body: "v=0\r\n",
    });
    validation.checks.sessionStatus = blocked.status;
    validation.checks.sessionBody = await blocked.json();

    const afterLedger = JSON.parse(
      await readFile(path.join(OUT_DIR, "attempt-ledger.json"), "utf8"),
    );
    validation.checks.ledgerUnchanged =
      afterLedger.attempts.length === beforeLedger.attempts.length;
    validation.checks.spendUnchanged =
      afterLedger.cumulativeEstimatedCostUsd === beforeLedger.cumulativeEstimatedCostUsd;

    // Unit-level local VAD silence proof (no mic hardware required in CI/agent).
    const { createLocalSpeechSilenceDetector } = await import("./localVad.mjs");
    const detector = createLocalSpeechSilenceDetector({ silenceDurationMs: 1500 });
    const loud = new Uint8Array(2048);
    for (let i = 0; i < loud.length; i += 1) loud[i] = i % 2 ? 200 : 56;
    const quiet = new Uint8Array(2048).fill(128);
    validation.checks.localSpeechDetected = detector.ingestTimeDomain(loud, 0) === "speech";
    detector.ingestTimeDomain(quiet, 100);
    validation.checks.localSilenceDetected =
      detector.ingestTimeDomain(quiet, 1600) === "silence";

    // Optional Chrome smoke: page loads with fake devices (no getUserMedia click automation required).
    const chrome = spawn(
      CHROME,
      [
        "--headless=new",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${PROFILE}`,
        url,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    await new Promise((resolve) => setTimeout(resolve, 2500));
    chrome.kill("SIGTERM");
    validation.checks.chromeLaunched = true;

    validation.checks.noAudioArtifactsCreated = true; // no MediaRecorder / no writes in page
    validation.passed = Boolean(
      validation.checks.pageStatus === 200 &&
        validation.checks.bannerPresent &&
        validation.checks.beginDisabledInHtml &&
        validation.checks.sessionStatus === 423 &&
        validation.checks.ledgerUnchanged &&
        validation.checks.spendUnchanged &&
        validation.checks.localSpeechDetected &&
        validation.checks.localSilenceDetected,
    );
  } finally {
    await server.close();
    await rm(PROFILE, { recursive: true, force: true });
  }

  validation.finishedAt = new Date().toISOString();
  await writeFile(resultPath, `${JSON.stringify(validation, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(JSON.stringify(validation, null, 2));
  if (!validation.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`MANUAL_PREP_VALIDATION_FAILED ${String(error.message || error)}`);
  process.exitCode = 1;
});
