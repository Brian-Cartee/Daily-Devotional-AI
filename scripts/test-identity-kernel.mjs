#!/usr/bin/env node
/**
 * Identity kernel unit checks (PR-9).
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-identity-kernel.mjs
 */
import {
  buildPhilipIdentityKernel,
  buildPhilipTurnLayer,
  buildPhilipWriterSystem,
  isIdentityKernelEnabled,
} from "../artifacts/api-server/src/philip-runtime/identity/kernel.ts";

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

console.log("Identity kernel — assembly");

assert("enabled by default", isIdentityKernelEnabled());

const kernel = buildPhilipIdentityKernel();
assert("kernel includes mission anchor", kernel.includes("Mission anchor"));
assert("kernel includes boundaries anchor", kernel.includes("Boundaries anchor"));
assert("kernel includes crisis protocol", kernel.includes("CRISIS PROTOCOL"));
assert("kernel includes character constitution", kernel.includes("RECOGNITION BEFORE INSTRUCTION"));
assert("kernel includes one-question rule", kernel.includes("ONE QUESTION"));
assert("kernel v2", kernel.includes("IMMUTABLE KERNEL (v2)"));

const followUp = buildPhilipTurnLayer({
  turnKind: "follow_up",
  isGuardedUser: false,
  tcpEnabled: true,
});
assert("follow-up layer present", followUp.includes("pastor"));

const system = buildPhilipWriterSystem({
  variantAddendum: "",
  turnKind: "first_response",
  isGuardedUser: false,
  tcpEnabled: true,
  dynamicContextBlock: "\n\n[TURN CONTEXT]\nTest",
  promptLayers: {
    scripturalAlignment: "",
    emotionalTone: "",
    voiceAuthenticity: "",
  },
});
assert("writer system includes scope", system.includes("RESPONSE SCOPE"));
assert("writer system includes TCP", system.includes("TURN CONTEXT"));
assert("kernel path avoids duplicate system prompt", !system.includes("TALK_IT_THROUGH_SYSTEM_PROMPT"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
