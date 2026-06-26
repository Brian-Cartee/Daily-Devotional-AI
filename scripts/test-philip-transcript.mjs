#!/usr/bin/env node
/**
 * Server-authoritative transcript unit checks (PR-8).
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-philip-transcript.mjs
 */
import {
  hashTurnContent,
  isTranscriptAuthorityEnabled,
  createConversationId,
} from "../artifacts/api-server/src/philip-runtime/transcript/store.ts";

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

console.log("Philip transcript — helpers");

assert("enabled by default", isTranscriptAuthorityEnabled());
assert("hash is stable", hashTurnContent("hello") === hashTurnContent("hello "));
assert("hash differs for content", hashTurnContent("a") !== hashTurnContent("b"));
assert("conversation id is uuid-ish", /^[0-9a-f-]{36}$/i.test(createConversationId()));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
