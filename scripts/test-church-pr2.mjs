#!/usr/bin/env node
/**
 * PR2 church member/public route smoke test.
 * Usage: API=... ADMIN_TOKEN=... node scripts/test-church-pr2.mjs
 */
const API = (process.env.API || "http://127.0.0.1:18080").replace(/\/$/, "");
const TOKEN = process.env.ADMIN_TOKEN || "";
const SESSION = process.env.TEST_SESSION || `pr2-test-${Date.now()}`;
const SLUG = process.env.CHURCH_SLUG || `pr2-test-${Date.now()}`;

let passed = 0;
let failed = 0;
let churchId = null;
let inviteCode = null;

function ok(label) {
  passed++;
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  failed++;
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
}

async function req(method, path, { body, token, expect } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["x-admin-token"] = token;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (expect !== undefined && res.status !== expect) {
    throw new Error(`${method} ${path} expected ${expect}, got ${res.status}: ${text.slice(0, 200)}`);
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`\nChurch PR2 tests → ${API}\n`);

  if (!TOKEN) {
    fail("setup", "ADMIN_TOKEN required to seed test church");
    process.exit(1);
  }

  try {
    const r = await req("POST", "/api/admin/churches", {
      token: TOKEN,
      expect: 201,
      body: { name: "PR2 Test Church", slug: SLUG, plan: "basic" },
    });
    churchId = r.json?.church?.id;
    inviteCode = r.json?.church?.inviteCode;
    if (churchId && inviteCode) ok("seed church with basic plan");
    else fail("seed church", JSON.stringify(r.json));
  } catch (e) {
    fail("seed church", e.message);
    process.exit(1);
  }

  try {
    const r = await req("GET", `/api/churches/by-slug/${SLUG}`, { expect: 200 });
    if (r.json?.church?.slug === SLUG && !r.json?.church?.inviteCode) {
      ok("GET by-slug returns public profile (no inviteCode)");
    } else fail("by-slug", JSON.stringify(r.json?.church));
  } catch (e) {
    fail("by-slug", e.message);
  }

  try {
    const r = await req("GET", `/api/churches/invite/${inviteCode}`, { expect: 200 });
    if (r.json?.church?.slug === SLUG && !r.json?.church?.inviteCode) {
      ok("GET invite code returns preview");
    } else fail("invite lookup", JSON.stringify(r.json));
  } catch (e) {
    fail("invite lookup", e.message);
  }

  try {
    const r = await req("POST", "/api/churches/join", {
      expect: 201,
      body: { sessionId: SESSION, slug: SLUG },
    });
    if (r.json?.membership?.role === "member" && r.json?.membership?.status === "active") {
      ok("POST join via slug → member");
    } else fail("join slug", JSON.stringify(r.json?.membership));
  } catch (e) {
    fail("join slug", e.message);
  }

  try {
    const r = await req("POST", "/api/churches/join", {
      expect: 201,
      body: { sessionId: SESSION, slug: SLUG, role: "owner" },
    });
    if (r.json?.membership?.role === "member") {
      ok("join ignores client role (stays member)");
    } else fail("join role trust", JSON.stringify(r.json?.membership));
  } catch (e) {
    fail("join role trust", e.message);
  }

  try {
    const r = await req("GET", `/api/churches/mine?sessionId=${encodeURIComponent(SESSION)}`, {
      expect: 200,
    });
    if (r.json?.churches?.length === 1 && r.json.churches[0].church.slug === SLUG) {
      ok("GET mine returns membership + church");
    } else fail("mine", JSON.stringify(r.json));
  } catch (e) {
    fail("mine", e.message);
  }

  const session2 = `${SESSION}-invite`;
  try {
    const r = await req("POST", "/api/churches/join", {
      expect: 201,
      body: { sessionId: session2, inviteCode },
    });
    if (r.json?.membership?.role === "member") ok("POST join via inviteCode");
    else fail("join invite", JSON.stringify(r.json?.membership));
  } catch (e) {
    fail("join invite", e.message);
  }

  try {
    const r = await req("POST", `/api/churches/${churchId}/leave`, {
      expect: 200,
      body: { sessionId: SESSION },
    });
    if (r.json?.membership?.status === "left") ok("POST leave → left");
    else fail("leave", JSON.stringify(r.json?.membership));
  } catch (e) {
    fail("leave", e.message);
  }

  try {
    const r = await req("GET", `/api/churches/mine?sessionId=${encodeURIComponent(SESSION)}`, {
      expect: 200,
    });
    if (r.json?.churches?.length === 0) ok("mine empty after leave");
    else fail("mine after leave", JSON.stringify(r.json));
  } catch (e) {
    fail("mine after leave", e.message);
  }

  if (!process.env.SKIP_REGRESSION) {
    for (const [method, path, body, expect] of [
      ["GET", "/api/prayer-wall", null, 200],
      ["GET", "/api/guidance/weekly-allowance?sessionId=pr2-regression", null, 200],
      ["GET", "/api/verses/daily", null, 200],
    ]) {
      try {
        await req(method, path, { body, expect });
        ok(`regression ${path.split("?")[0]} → ${expect}`);
      } catch (e) {
        fail(`regression ${path}`, e.message);
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
