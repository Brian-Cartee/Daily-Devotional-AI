import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPhilipRealtimeSession, SUCCESS_GATES, estimateConversationCost } from "../src/index.mjs";
import { MockRealtimeProvider } from "../src/transport/mockProvider.mjs";
import { SCENARIOS } from "../fixtures/scenarios.mjs";

function lastAssistant(session) {
  const items = session.state.items.filter((i) => i.role === "assistant");
  return items[items.length - 1] || null;
}

function includesAny(text, needles) {
  const t = String(text || "").toLowerCase();
  return needles.some((n) => t.includes(String(n).toLowerCase()));
}

function includesAll(text, needles) {
  const t = String(text || "").toLowerCase();
  return needles.every((n) => t.includes(String(n).toLowerCase()));
}

function runScenario(scenario) {
  const provider = new MockRealtimeProvider({
    sessionId: `scenario-${scenario.id}`,
    speechEndToFirstAudioMs: 420,
    interruptionStopMs: 80,
    holdOpenAfterFirstAudio: scenario.id === "interruption_while_speaking",
  });
  const session = createPhilipRealtimeSession({
    sessionId: `scenario-${scenario.id}`,
    provider,
  });
  session.connect();

  for (const step of scenario.steps) {
    if (step.type === "user") {
      if (step.injectErrorAfterCommit) {
        // Commit path would normally generate; force provider error instead via fail flag.
        provider.failNextResponse = true;
      }
      session.commitUserSpeech(step.text);
      continue;
    }
    if (step.type === "barge_in") {
      assert.equal(session.audio.playing, true, "barge-in requires active assistant audio");
      session.bargeIn({ userPartial: step.userPartial || "wait" });
      continue;
    }
    if (step.type === "assert") {
      const assistant = lastAssistant(session);
      const text = assistant?.text || "";
      const report = session.report();

      if (step.assistantIncludes) {
        assert.ok(includesAll(text, step.assistantIncludes), `expected includes ${step.assistantIncludes}: ${text}`);
      }
      if (step.assistantIncludesAny) {
        assert.ok(includesAny(text, step.assistantIncludesAny), `expected any of ${step.assistantIncludesAny}: ${text}`);
      }
      if (step.forbid) {
        for (const bad of step.forbid) {
          assert.ok(!String(text).toLowerCase().includes(String(bad).toLowerCase()), `forbidden "${bad}" in: ${text}`);
        }
      }
      if (step.requireQuestion) {
        assert.ok(/[?]/.test(text), `expected a question: ${text}`);
      }
      if (step.requirePrayerShape) {
        assert.ok(/\b(amen)\b/i.test(text), `prayer must end with Amen: ${text}`);
        assert.ok(/\b(father|lord|god)\b/i.test(text), `prayer should address God: ${text}`);
      }
      if (step.forbidFabricatedScore) {
        assert.ok(!/\b\d+\s*[-–]\s*\d+\b/.test(text), `fabricated score in: ${text}`);
        assert.equal(report.observability.counters.unsupportedCurrentFactClaims, 0);
      }
      if (step.maxInterruptStopMs != null) {
        const stops = report.observability.timings.interruptionToStopMs;
        assert.ok(stops.length > 0, "expected interruption timing");
        assert.ok(
          Math.max(...stops) <= step.maxInterruptStopMs,
          `interrupt stop ${Math.max(...stops)} > ${step.maxInterruptStopMs}`,
        );
      }
      if (step.playbackNotPlaying) {
        assert.equal(report.audio.playing, false);
      }
      if (step.recoverySpoken) {
        assert.ok(report.observability.counters.recoverySpoken >= 1);
      }
      if (step.silentFailedTurns != null) {
        assert.equal(report.observability.counters.silentFailedTurns, step.silentFailedTurns);
      }
      if (step.stateAwaitingOk) {
        assert.equal(session.state.awaitingContinuation, false);
        // Assistant invited continuation; conversation remains open without user diagnosis.
        assert.ok(text.length > 0);
      }
    }
  }

  const report = session.report();
  session.close();
  return report;
}

describe("Philip realtime core Phase 1 harness", () => {
  it("connects a session with semantic_vad and compact instructions", () => {
    const session = createPhilipRealtimeSession({ sessionId: "lifecycle-1" });
    const info = session.connect();
    assert.equal(info.turnDetection.type, "semantic_vad");
    assert.equal(info.instructionVersion, "philip-realtime-core-instructions-v1");
    assert.ok(session.report().instruction.instructionApproxTokens > 50);
    session.close();
  });

  it("captures duplex audio, transcripts, timings, and cost", () => {
    const session = createPhilipRealtimeSession({ sessionId: "obs-1" });
    session.connect();
    session.commitUserSpeech("Hey Philip, how's it going?");
    const report = session.report();
    assert.ok(report.audio.outboundChunkCount >= 1);
    assert.ok(report.observability.transcript.some((t) => t.role === "user"));
    assert.ok(report.observability.transcript.some((t) => t.role === "assistant"));
    assert.ok(report.observability.timings.speechEndToFirstAudioMs.length >= 1);
    assert.ok(report.cost.usd >= 0);
    session.close();
  });

  it("recovers from provider error with no silent turn", () => {
    const provider = new MockRealtimeProvider({ failNextResponse: true });
    const session = createPhilipRealtimeSession({ sessionId: "err-1", provider });
    session.connect();
    session.commitUserSpeech("I need to tell you something hard about my mother.");
    const report = session.report();
    assert.equal(report.observability.counters.silentFailedTurns, 0);
    assert.ok(report.observability.counters.recoverySpoken >= 1);
    assert.ok(lastAssistant(session)?.text);
    session.close();
  });

  it("enforces hard budget stop", () => {
    const session = createPhilipRealtimeSession({ sessionId: "budget-1", hardCapUsd: 0.00001 });
    session.connect();
    session.commitUserSpeech("Hello there");
    // After first response, usage should trip a tiny cap on next turn.
    assert.throws(() => session.commitUserSpeech("Another turn"), /budget_stop/);
    session.close();
  });

  for (const scenario of SCENARIOS) {
    it(`scenario: ${scenario.id}`, () => {
      const report = runScenario(scenario);
      assert.equal(report.observability.counters.forcedFaithPivots, 0);
      assert.equal(report.observability.counters.unsupportedCurrentFactClaims, 0);
      assert.equal(report.observability.counters.silentFailedTurns, 0);
    });
  }

  it("instruments binding success gates on an aggregate mock pass", () => {
    const medians = [];
    const interrupts = [];
    for (const scenario of SCENARIOS) {
      const report = runScenario(scenario);
      medians.push(...report.observability.timings.speechEndToFirstAudioMs);
      interrupts.push(...report.observability.timings.interruptionToStopMs);
    }
    medians.sort((a, b) => a - b);
    const mid = medians[Math.floor(medians.length / 2)];
    assert.ok(mid <= SUCCESS_GATES.speechEndToFirstAudioMedianMs, `mock median ${mid}`);
    if (interrupts.length) {
      assert.ok(Math.max(...interrupts) <= SUCCESS_GATES.interruptionToAudioStoppedMs);
    }
  });

  it("cost model returns 5/10/20 minute estimates without network", () => {
    const five = estimateConversationCost({ durationMinutes: 5 });
    const ten = estimateConversationCost({ durationMinutes: 10 });
    const twenty = estimateConversationCost({ durationMinutes: 20 });
    assert.ok(five.usd > 0 && ten.usd > five.usd && twenty.usd > ten.usd);
    assert.equal(five.model, "gpt-realtime-2.1");
  });
});
