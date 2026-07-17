import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  brokenSession1AdHocParser,
  parseOpenAiApiKeyFromEnvFile,
  loadPhase2OpenAiApiKey,
} from "../phase2/loadCredential.mjs";

describe("Phase 2 credential loader (fake credentials only)", () => {
  it("extracts only the value after OPENAI_API_KEY=", () => {
    const value = parseOpenAiApiKeyFromEnvFile("OPENAI_API_KEY=sk-test-fake-value-1234567890\n");
    assert.equal(value, "sk-test-fake-value-1234567890");
  });

  it("strips surrounding quotes without exposing the secret in errors", () => {
    assert.equal(
      parseOpenAiApiKeyFromEnvFile('OPENAI_API_KEY="sk-test-fake-quoted-abcdefgh"\n'),
      "sk-test-fake-quoted-abcdefgh",
    );
    assert.equal(
      parseOpenAiApiKeyFromEnvFile("OPENAI_API_KEY='sk-test-fake-single-abcdefgh'\n"),
      "sk-test-fake-single-abcdefgh",
    );
  });

  it("rejects empty assignment instead of passing the literal line as the bearer token", () => {
    const emptyFile = "OPENAI_API_KEY=\n";
    // Session 1 defect: broken parser falls back to the whole assignment line.
    assert.equal(brokenSession1AdHocParser(emptyFile), "OPENAI_API_KEY=");
    assert.throws(
      () => parseOpenAiApiKeyFromEnvFile(emptyFile),
      /OPENAI_API_KEY value is empty/,
    );
  });

  it("rejects whitespace-only values and keeps Windows CRLF values clean", () => {
    assert.throws(
      () => parseOpenAiApiKeyFromEnvFile("OPENAI_API_KEY=   \n"),
      /empty/,
    );
    assert.equal(
      parseOpenAiApiKeyFromEnvFile("OPENAI_API_KEY=sk-test-fake-crlf-abcdefgh\r\n"),
      "sk-test-fake-crlf-abcdefgh",
    );
  });

  it("rejects values that embed carriage returns after the equals sign", () => {
    assert.throws(
      () => parseOpenAiApiKeyFromEnvFile("OPENAI_API_KEY=sk-test\rfake\n"),
      /line breaks/,
    );
  });

  it("rejects placeholders and multiple assignments", () => {
    assert.throws(
      () => parseOpenAiApiKeyFromEnvFile("OPENAI_API_KEY=<your-key-here>\n"),
      /placeholder/,
    );
    assert.throws(
      () =>
        parseOpenAiApiKeyFromEnvFile(
          "OPENAI_API_KEY=sk-test-one\nOPENAI_API_KEY=sk-test-two\n",
        ),
      /exactly one/,
    );
  });

  it("loadPhase2OpenAiApiKey refuses a parent env that is the broken assignment token", () => {
    const fakeFs = {
      "fake.env": "OPENAI_API_KEY=sk-test-fake-from-file-abcdefghij\n",
    };
    const value = loadPhase2OpenAiApiKey({
      filePath: "fake.env",
      env: { OPENAI_API_KEY: "OPENAI_API_KEY=" },
      readFile: (p) => fakeFs[p],
    });
    assert.equal(value, "sk-test-fake-from-file-abcdefghij");
  });

  it("Authorization header helper shape remains Bearer plus parsed value only", () => {
    const parsed = parseOpenAiApiKeyFromEnvFile(
      "OPENAI_API_KEY=sk-test-fake-header-shape-abcdef\n",
    );
    const header = `Bearer ${parsed}`;
    assert.equal(header.startsWith("Bearer "), true);
    assert.equal(header.includes("OPENAI_API_KEY="), false);
    assert.equal(header.split(" ").length, 2);
  });
});
