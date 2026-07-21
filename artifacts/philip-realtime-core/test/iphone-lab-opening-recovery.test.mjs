import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  IPHONE_LAB_INSTRUCTIONS,
  IPHONE_LAB_LIMITS,
  IPHONE_LAB_REALTIME_SESSION,
} from "../iphone-lab/config.mjs";
import { applyInputTranscriptEvent } from "../../../mobile-build/lib/philipRealtimeTranscript.mjs";

// Opening-and-recovery fixtures from genuine session iphone-lab-1784427478402-1.
// No provider calls: every check runs against the exact config, instructions,
// and client sources the iPhone build ships.

const sessionSource = await readFile(
  new URL("../../../mobile-build/lib/philipRealtimeLabSession.ts", import.meta.url),
  "utf8",
);
const screenSource = await readFile(
  new URL("../../../mobile-build/app/philip-realtime-lab.tsx", import.meta.url),
  "utf8",
);

test("transcription prompt is neutral: no identity, topic, or expected-answer vocabulary", () => {
  const prompt = IPHONE_LAB_REALTIME_SESSION.audio.input.transcription.prompt;
  // Genuine session iphone-lab-1784427478402-1 recorded the previous prompt
  // verbatim as Brian's speech on two short turns. Identity/topic words must
  // not be able to masquerade as user speech in evidence.
  assert.doesNotMatch(prompt, /Philip|Shepherd|Brian|caregiv|Scripture|prayer|faith/i);
  // Natural-wording preservation guidance stays.
  assert.match(prompt, /fillers|self-corrections|exactly/i);
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.input.transcription.model, "gpt-4o-mini-transcribe");
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.input.transcription.language, "en");
});

test("input transcripts remain observability-only: never sent back to the conversation", () => {
  // The transcription handler block must not send anything on the data channel.
  const handlerStart = sessionSource.indexOf(
    'if (type.startsWith("conversation.item.input_audio_transcription.")',
  );
  assert.ok(handlerStart > 0, "transcription handler exists");
  const handlerEnd = sessionSource.indexOf("if (type ===", handlerStart);
  const handlerBlock = sessionSource.slice(handlerStart, handlerEnd);
  assert.doesNotMatch(handlerBlock, /this\.send\(/);
  assert.match(handlerBlock, /applyInputTranscriptEvent/);
  // No code path composes a conversation item from a user transcript.
  assert.doesNotMatch(sessionSource, /conversation\.item\.create[\s\S]{0,600}inputTranscript/);
  // The only conversation.item.create senders are tool outputs and the closing notice.
  const senders = sessionSource.match(/type: "conversation\.item\.create"/g) || [];
  assert.equal(senders.length, 2);
});

test("duplicated STT completions update one turn without duplicating conversation state", () => {
  const turns = [{ turnNumber: 1, itemId: "item-a", speechStoppedAtMs: 1_000 }];
  applyInputTranscriptEvent(
    turns,
    {
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item-a",
      transcript: "Hi, Philip, how are you doing?",
    },
    1_400,
  );
  applyInputTranscriptEvent(
    turns,
    {
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item-a",
      transcript: "Hi, Philip, how are you doing? Hi, Philip, how are you doing?",
    },
    1_600,
  );
  assert.equal(turns.length, 1);
  // The later completion overwrites; nothing is concatenated or duplicated
  // into additional turns.
  assert.equal(
    turns[0].inputTranscript,
    "Hi, Philip, how are you doing? Hi, Philip, how are you doing?",
  );
  assert.equal(turns[0].inputTranscriptStatus, "completed");
});

test("a transcription event without any turn never invents user speech", () => {
  const turns = [];
  const result = applyInputTranscriptEvent(
    turns,
    {
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item-unknown",
      transcript: "Transcribe exactly what is spoken.",
    },
    2_000,
  );
  assert.equal(result.turn, null);
  assert.equal(turns.length, 0);
});

test("conversational readiness gates the speak invitation on transport + session + remote audio", () => {
  assert.match(sessionSource, /conversationallyReady/);
  assert.match(sessionSource, /conversation_ready/);
  assert.match(sessionSource, /dataChannelReady/);
  assert.match(sessionSource, /providerSessionCreated/);
  assert.match(sessionSource, /remoteAudioReady/);
  assert.match(sessionSource, /Philip is ready — speak whenever you like\./);
  // The answer-applied log no longer invites speech before readiness.
  assert.doesNotMatch(sessionSource, /Realtime connected\. Speak naturally\./);
  // Readiness adds no artificial conversational delay and no auto-greeting.
  const readyStart = sessionSource.indexOf("private maybeMarkConversationallyReady()");
  const readyBlock = sessionSource.slice(readyStart, sessionSource.indexOf("private ", readyStart + 10));
  assert.doesNotMatch(readyBlock, /setTimeout|response\.create|conversation\.item\.create/);
});

test("UI shows an unmistakable ready state and Start cannot re-fire mid-session", () => {
  assert.match(screenSource, /Philip is ready — speak whenever you like\./);
  assert.match(screenSource, /connectionState === "ready"/);
  assert.match(screenSource, /connectionState !== "ready"/);
  assert.match(screenSource, /connectionState !== "connected"/);
});

test("turn detection uses semantic VAD with opening protection (interrupt starts false)", () => {
  const td = IPHONE_LAB_REALTIME_SESSION.audio.input.turn_detection;
  assert.equal(td.type, "semantic_vad");
  assert.equal(td.eagerness, "auto");
  assert.equal(td.create_response, true);
  // Opening protection is the server default; client restores true after first-audio grace.
  assert.equal(td.interrupt_response, false);
  assert.equal("silence_duration_ms" in td, false);
});

test("hearing/repeat recovery is instructed: restate meaning, never unrelated coaching", () => {
  assert.match(IPHONE_LAB_INSTRUCTIONS, /HEARING AND REPETITION/);
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /couldn't hear you or ask you to repeat, restate the meaning of your last reply in fewer words/,
  );
  assert.match(IPHONE_LAB_INSTRUCTIONS, /I may have been cut off\. I was saying…/);
});

test("verbatim consecutive replies are forbidden unless exact words are requested", () => {
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Never deliver the same reply word-for-word twice in a row unless they explicitly ask for your exact words\./,
  );
});

test("fragments get a plain 'didn't catch it', not hesitation coaching", () => {
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /caught only a fragment or unclear audio, say plainly that you didn't catch it/,
  );
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Do not coach hesitation, analyze their pause, or tell them to take their time\./,
  );
  // The genuine failure is pinned as the bad example.
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Bad: 'Take your time\. If it helps, you can just say the next small piece\.'/,
  );
});

test("clean short greetings and the ordinary continuation remain fully supported", () => {
  // Presence-first greeting fixture survives.
  assert.match(IPHONE_LAB_INSTRUCTIONS, /User: 'Hello Philip, how are you\?'/);
  assert.match(IPHONE_LAB_INSTRUCTIONS, /I'm here, and glad we're talking\./);
  // Ordinary flow bounds unchanged.
  assert.match(IPHONE_LAB_INSTRUCTIONS, /roughly 20 to 35 spoken words/);
  assert.match(IPHONE_LAB_INSTRUCTIONS, /Ask at most one question/);
  // No new rule forces clarification questions into normal talk.
  assert.doesNotMatch(IPHONE_LAB_INSTRUCTIONS, /always ask what they said|confirm every/i);
});

test("no AI-disclaimer regression and proven polish settings are untouched", () => {
  assert.match(IPHONE_LAB_INSTRUCTIONS, /unless directly asked/);
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.output.voice, "cedar");
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.output.speed, 0.9);
  assert.equal(IPHONE_LAB_REALTIME_SESSION.model, "gpt-realtime-2.1");
  assert.equal(IPHONE_LAB_LIMITS.maximumDurationMs, 115_000);
  assert.equal(IPHONE_LAB_LIMITS.absoluteSpendUsd, 1);
});

test("sanitized observability is preserved: transcripts logged, no raw audio", () => {
  assert.match(sessionSource, /audioRecorded: false/);
  assert.match(sessionSource, /audioPersisted: false/);
  assert.match(sessionSource, /Brian: \$\{result\.turn\.inputTranscript/);
  assert.doesNotMatch(sessionSource, /MediaRecorder|audio\/wav/);
});
