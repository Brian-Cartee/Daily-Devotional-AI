/**
 * Presence fixture runner — offline sample validation + optional live API check.
 *
 * Usage:
 *   cd eval && npx tsx run-presence-fixtures.ts              # offline (default)
 *   cd eval && npx tsx run-presence-fixtures.ts --fixture almost-said-it-01
 *   cd eval && npx tsx run-presence-fixtures.ts --local      # live API on first turn of each fixture
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  type PresenceFixture,
  evaluateTurnResponse,
  mergeFixtureState,
  runFixtureOffline,
  summarizeFixtureResults,
} from "../artifacts/api-server/src/lib/presenceFixtureValidator.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, "fixtures/presence");

const args = process.argv.slice(2);
const FILTER_ID = args.includes("--fixture") ? args[args.indexOf("--fixture") + 1] : null;
const USE_LOCAL = args.includes("--local");
const BASE_URL = USE_LOCAL ? "http://localhost:8080" : "https://www.shepherdspathai.com";

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

function loadFixtures(): PresenceFixture[] {
  const files = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((file) => JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8")) as PresenceFixture)
    .filter((f) => !FILTER_ID || f.id === FILTER_ID);
}

async function collectStream(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result.trim();
}

async function callPhilipLive(
  situation: string,
  sessionId: string,
): Promise<{ phase1: string; response: string }> {
  const phase1Res = await fetch(`${BASE_URL}/api/guidance/phase1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation,
      sessionId,
      companionMode: "philip",
      daysWithApp: 3,
      isPro: true,
    }),
  });
  if (!phase1Res.ok) throw new Error(`Phase1 HTTP ${phase1Res.status}: ${await phase1Res.text()}`);
  const phase1 = await collectStream(phase1Res);

  const responseRes = await fetch(`${BASE_URL}/api/guidance/response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation,
      messages: [{ role: "user", content: situation }],
      sessionId,
      companionMode: "philip",
      guidanceMode: "encouraging",
      daysWithApp: 3,
      isPro: true,
      phase1Response: phase1,
      phase1UserReply: situation,
    }),
  });
  if (!responseRes.ok) throw new Error(`Response HTTP ${responseRes.status}: ${await responseRes.text()}`);
  const response = await collectStream(responseRes);
  return { phase1, response };
}

async function runLiveChecks(fixtures: PresenceFixture[]): Promise<void> {
  console.log(bold(`\nLive API checks (${BASE_URL})`));

  for (const fixture of fixtures) {
    const turn = fixture.turns[0];
    if (!turn?.responseRules) continue;

    const sessionId = `presence-fixture-${fixture.id}-${Date.now()}`;
    console.log(dim(`\n  ${fixture.id} — ${turn.user.slice(0, 60)}...`));

    try {
      const { response } = await callPhilipLive(turn.user, sessionId);
      const verdict = evaluateTurnResponse(turn.responseRules, response);
      if (verdict.ok) {
        console.log(green(`  ✓ live response passed rules`));
        console.log(dim(`    ${response.slice(0, 120)}${response.length > 120 ? "…" : ""}`));
      } else {
        console.log(red(`  ✗ live response failed rules`));
        for (const err of verdict.errors) console.log(red(`    - ${err}`));
        console.log(dim(`    ${response}`));
        process.exitCode = 1;
      }
    } catch (err) {
      console.log(red(`  ✗ live call failed: ${String(err)}`));
      process.exitCode = 1;
    }
  }
}

async function main(): Promise<void> {
  const fixtures = loadFixtures();
  if (fixtures.length === 0) {
    console.error(red(`No fixtures found${FILTER_ID ? ` for id ${FILTER_ID}` : ""}`));
    process.exit(1);
  }

  console.log(bold("Presence fixtures — offline validation"));
  let totalPassed = 0;
  let totalFailed = 0;

  for (const fixture of fixtures) {
    console.log(`\n${bold(fixture.id)} ${dim(fixture.description)}`);
    const results = runFixtureOffline(fixture);
    const summary = summarizeFixtureResults(results);
    totalPassed += summary.passed;
    totalFailed += summary.failed;

    for (const result of results) {
      const mark = result.ok ? green("✓") : red("✗");
      console.log(`  ${mark} ${result.label}`);
      if (!result.ok) {
        for (const err of result.errors) console.log(red(`      ${err}`));
      }
    }

    const state = mergeFixtureState(fixture, fixture.turns[0]);
    console.log(dim(`  state: permission=${state.permission_level}, depth=${state.current_depth_layer}, almost=${state.almost_said_it_detected}, sacred=${state.sacred_pause_warranted}`));
  }

  console.log(`\n${bold("Summary")}: ${green(String(totalPassed))} passed, ${totalFailed ? red(String(totalFailed)) : "0"} failed`);

  if (totalFailed > 0) {
    process.exit(1);
  }

  if (USE_LOCAL || args.includes("--live")) {
    await runLiveChecks(fixtures);
  } else {
    console.log(dim("\nTip: add --local to validate first-turn live responses against rules."));
  }
}

main().catch((err) => {
  console.error(red(String(err)));
  process.exit(1);
});
