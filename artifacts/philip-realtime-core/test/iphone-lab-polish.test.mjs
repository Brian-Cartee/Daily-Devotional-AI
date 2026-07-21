import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  IPHONE_LAB_INSTRUCTIONS,
  IPHONE_LAB_LIMITS,
  IPHONE_LAB_REALTIME_SESSION,
} from "../iphone-lab/config.mjs";
import { PHILIP_REALTIME_QUALITY_INSTRUCTIONS } from "../phase2b/config.mjs";
import {
  buildClosingNoticeEvent,
  closingNoticeDelayMs,
} from "../../../mobile-build/lib/philipRealtimeClosingNotice.mjs";

// Deterministic conversation-polish fixtures. No provider calls: every check
// runs against the exact instructions and session config the iPhone build ships.

test("reciprocal greeting is answered from presence, not an AI disclaimer", () => {
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Answer reciprocal greetings warmly from presence/,
  );
  assert.match(IPHONE_LAB_INSTRUCTIONS, /I'm here, and glad we're talking\./);
  // The old disclaimer opening is now explicitly marked as the bad pattern.
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Bad: 'I don't really have a day or a personal state the way you do\.'/,
  );
});

test("'How about yourself?' fixture keeps warmth and returns attention", () => {
  assert.match(IPHONE_LAB_INSTRUCTIONS, /User: 'How about you—how was your day\?'/);
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Good: 'I'm glad to be in this conversation with you\. What's been filling your day\?'/,
  );
});

test("disclaimers are reserved for direct questions about Philip's nature", () => {
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Do not volunteer disclaimers like 'I don't have feelings,' 'I don't have a personal day,' 'I don't have a day like you do,' 'I don't have a day the way you do,' or 'I'm not a person' unless directly asked/,
  );
  // Direct question about feelings still gets an honest answer.
  assert.match(IPHONE_LAB_INSTRUCTIONS, /User: 'Do you actually have feelings\?'/);
  assert.match(IPHONE_LAB_INSTRUCTIONS, /Honestly, no—not the way you do\./);
});

test("prepared disclaimer correction forbids the Build-255 opening phrasing", () => {
  // Local-only preparation from session iphone-lab-1784588725583-1.
  // Not deployed until separately approved.
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Also bad: 'I'm glad we're talking\. I don't have a day like you do, but I'm present\.'/,
  );
});

test("truthfulness is preserved: no invented human experience", () => {
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Never invent a body, schedule, family, day, meal, workout, private life, emotions, memories, or human experiences\./,
  );
  assert.doesNotMatch(IPHONE_LAB_INSTRUCTIONS, /pretend to have a day|invent a routine/i);
});

test("ordinary response length and question discipline are bounded", () => {
  assert.match(IPHONE_LAB_INSTRUCTIONS, /roughly 20 to 35 spoken words/);
  assert.match(IPHONE_LAB_INSTRUCTIONS, /one or two short sentences/);
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Go longer only for explicit prayer, crisis, or a genuinely weighty explanation\./,
  );
  assert.match(IPHONE_LAB_INSTRUCTIONS, /Ask at most one question/);
});

test("caregiving recognition and user-led faith handling are unchanged", () => {
  for (const preserved of [
    "Caregiving is a relationship",
    "unless the person opens that door",
    "If explicitly asked to pray, pray immediately, naturally, and completely through 'Amen.'",
    "Never say 'God told me.'",
    "Scripture has been steadying me lately",
  ]) {
    assert.match(IPHONE_LAB_INSTRUCTIONS, new RegExp(preserved.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("calm pacing guidance exists without artificial multi-second silence", () => {
  assert.match(PHILIP_REALTIME_QUALITY_INSTRUCTIONS, /PACING/);
  assert.match(PHILIP_REALTIME_QUALITY_INSTRUCTIONS, /unhurried and calm/);
  assert.doesNotMatch(
    PHILIP_REALTIME_QUALITY_INSTRUCTIONS,
    /wait \d+ seconds|pause for \d|insert silence/i,
  );
});

test("officially supported output speed multiplier is configured within bounds", () => {
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.output.speed, 0.9);
  assert.equal(IPHONE_LAB_LIMITS.outputSpeed, 0.9);
  assert.ok(IPHONE_LAB_LIMITS.outputSpeed >= 0.25 && IPHONE_LAB_LIMITS.outputSpeed <= 1.5);
  // Voice and model remain exactly as authorized.
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.output.voice, "cedar");
  assert.equal(IPHONE_LAB_REALTIME_SESSION.model, "gpt-realtime-2.1");
});

test("near-limit closing notice is context-only and respects the hard stop", () => {
  const event = buildClosingNoticeEvent();
  assert.equal(event.type, "conversation.item.create");
  assert.equal(event.item.role, "system");
  assert.match(event.item.content[0].text, /close warmly in one sentence/);
  assert.doesNotMatch(JSON.stringify(event), /response\.create|response\.cancel|output_audio_buffer/);
  // With the genuine session limits: notice at 95s, hard stop still at 115s.
  assert.equal(closingNoticeDelayMs(115_000, 20_000), 95_000);
  assert.equal(closingNoticeDelayMs(10_000, 20_000), 0);
});

test("client wiring sends the closing notice without forcing or cancelling a response", async () => {
  const session = await readFile(
    new URL("../../../mobile-build/lib/philipRealtimeLabSession.ts", import.meta.url),
    "utf8",
  );
  assert.match(session, /closing_notice_sent/);
  assert.match(session, /buildClosingNoticeEvent/);
  assert.match(session, /closingNoticeDelayMs\(PHILIP_REALTIME_LAB_MAX_DURATION_MS, PHILIP_REALTIME_LAB_CLOSING_NOTICE_MS\)/);
  const noticeStart = session.indexOf("private sendClosingNotice()");
  const noticeBlock = session.slice(
    noticeStart,
    session.indexOf("private ", noticeStart + 1),
  );
  assert.doesNotMatch(noticeBlock, /response\.create|response\.cancel|this\.end\(/);
  // The hard stop remains the final boundary.
  assert.match(session, /two_minute_hard_stop/);
});

test("barge-in opens protected then client restores after first-audio grace", () => {
  // Server default is opening protection; client restores interrupt_response:true
  // after 1s of first audible playback (philipRealtimeOpeningGrace.mjs).
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.input.turn_detection.interrupt_response, false);
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.input.turn_detection.type, "semantic_vad");
});

test("replays the genuine session shape with expected before/after openings", () => {
  // Shape from sanitized evidence iphone-lab-1784331450803-1 (no provider call).
  const genuineTurn1 = {
    brian: "Hello, Philip, how are you?",
    before: "I don’t really have a day or a personal state the way you do. But I’m here with you in this moment,",
  };
  // Before: the shipped instructions steered a disclaimer-first reply.
  assert.match(genuineTurn1.before, /don’t really have a day/);
  // After: the active instructions demand a presence-first greeting instead,
  // and explicitly forbid the previous opening.
  assert.match(IPHONE_LAB_INSTRUCTIONS, /Good: 'I'm here, and glad we're talking\. How are you doing today\?'/);
  const disclaimersOnlyWhenAsked = IPHONE_LAB_INSTRUCTIONS.indexOf("unless directly asked");
  assert.ok(disclaimersOnlyWhenAsked > 0);
  // Turns 3-4 (caregiving + faith) relied on behavior that must survive:
  for (const preserved of ["central meaning across multiple topics", "opens that door"]) {
    assert.match(IPHONE_LAB_INSTRUCTIONS, new RegExp(preserved));
  }
});
