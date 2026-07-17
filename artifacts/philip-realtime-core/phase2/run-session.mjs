import { spawn, spawnSync } from "node:child_process";
import { accessSync, constants as fsConstants } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startPhase2Server } from "./server.mjs";
import { allSyntheticUtterances, getPhase2Scenario } from "./scenarios.mjs";
import { sanitizedPreflightConfig } from "./config.mjs";
import { applyPhase2OpenAiApiKey } from "./loadCredential.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, "..");
const AUDIO_ROOT = path.join(PACKAGE_ROOT, "tmp", "phase2-audio");
const CHROME_ROOT = path.join(PACKAGE_ROOT, "tmp", "phase2-chrome");
const LEDGER_PATH = path.join(PACKAGE_ROOT, "evidence", "phase2", "attempt-ledger.json");
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function isExecutable(binaryPath) {
  try {
    accessSync(binaryPath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function assertRuntimePreflight() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not present");
  if (!isExecutable(CHROME)) {
    throw new Error("Google Chrome executable not found");
  }
  if (!isExecutable("/usr/bin/say")) {
    throw new Error("macOS say executable not found");
  }
  if (!isExecutable("/opt/homebrew/bin/ffmpeg")) {
    throw new Error("ffmpeg executable not found");
  }
}

async function generateFixtures(scenario) {
  await mkdir(AUDIO_ROOT, { recursive: true });
  for (const utterance of allSyntheticUtterances(scenario)) {
    const aiffPath = path.join(AUDIO_ROOT, `${utterance.id}.aiff`);
    const wavPath = path.join(AUDIO_ROOT, `${utterance.id}.wav`);
    const say = spawnSync(
      "/usr/bin/say",
      ["-v", "Samantha", "-r", "175", "-o", aiffPath, utterance.text],
      { stdio: "pipe" },
    );
    if (say.status !== 0) throw new Error(`say_failed:${utterance.id}`);
    const ffmpeg = spawnSync(
      "/opt/homebrew/bin/ffmpeg",
      ["-loglevel", "error", "-y", "-i", aiffPath, "-ac", "1", "-ar", "48000", wavPath],
      { stdio: "pipe" },
    );
    if (ffmpeg.status !== 0) throw new Error(`ffmpeg_failed:${utterance.id}`);
    await rm(aiffPath, { force: true });
  }
}

async function loadLedger() {
  try {
    return JSON.parse(await readFile(LEDGER_PATH, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { attempts: [] };
    throw error;
  }
}

async function waitForAttemptCompletion(previousCount, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ledger = await loadLedger();
    const attempt = ledger.attempts?.[previousCount];
    if (
      attempt &&
      [
        "completed",
        "duration_stop",
        "budget_stop",
        "failed",
        "provider_rejected",
        "transport_failed",
      ].includes(attempt.status)
    ) {
      return { ledger, attempt };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("session_runner_timeout");
}

async function main() {
  const sessionNumber = Number(process.argv[2]);
  if (!sessionNumber) {
    console.log(JSON.stringify(sanitizedPreflightConfig(), null, 2));
    return;
  }
  // Load gitignored .env.phase2.local inside the runtime. Do not rely on shell
  // command-substitution parsers that can turn an empty assignment into a
  // literal "OPENAI_API_KEY=" bearer token.
  applyPhase2OpenAiApiKey();
  const scenario = getPhase2Scenario(sessionNumber);
  assertRuntimePreflight();
  const before = await loadLedger();
  if ((before.attempts?.length || 0) >= 3) throw new Error("three_session_attempt_cap_reached");

  await generateFixtures(scenario);
  const server = await startPhase2Server();
  const profilePath = path.join(
    CHROME_ROOT,
    `session-${sessionNumber}-${Date.now()}`,
  );
  await mkdir(profilePath, { recursive: true });

  const url = `${server.origin}/?session=${sessionNumber}&autorun=1`;
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profilePath}`,
      url,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 10_000) stderr = stderr.slice(-10_000);
  });

  try {
    const result = await waitForAttemptCompletion(
      before.attempts?.length || 0,
      scenario.maxDurationMs + 45_000,
    );
    console.log(
      JSON.stringify(
        {
          attempt: result.attempt,
          cumulativeEstimatedCostUsd: result.ledger.cumulativeEstimatedCostUsd,
        },
        null,
        2,
      ),
    );
  } finally {
    chrome.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 2000);
      chrome.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    await server.close();
    await rm(AUDIO_ROOT, { recursive: true, force: true });
    await rm(profilePath, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`PHASE2_RUN_FAILED ${String(error.message || error)}`);
  process.exitCode = 1;
});
