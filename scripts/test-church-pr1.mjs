#!/usr/bin/env node
/**
 * PR1 church admin route smoke test.
 * Usage: API=http://127.0.0.1:8080 ADMIN_TOKEN=... node scripts/test-church-pr1.mjs
 */
const API = (process.env.API || "http://127.0.0.1:8080").replace(/\/$/, "");
const TOKEN = process.env.ADMIN_TOKEN || "";
const OWNER_SESSION = process.env.OWNER_SESSION || "brian-pr1-test-owner-00000001";
const SLUG = process.env.CHURCH_SLUG || `pr1-test-${Date.now()}`;

let passed = 0;
let failed = 0;

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
  if (expect && res.status !== expect) {
    throw new Error(`${method} ${path} expected ${expect}, got ${res.status}: ${text.slice(0, 200)}`);
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`\nChurch PR1 tests → ${API}\n`);

  // 1. Health (API up)
  try {
    const h = await req("GET", "/api/health");
    if (h.status === 200) ok("API health 200");
    else fail("API health", String(h.status));
  } catch (e) {
    fail("API health", e.message);
  }

  // 2. Admin auth required
  try {
    const r = await req("GET", "/api/admin/churches", { expect: 401 });
    if (r.status === 401) ok("GET /api/admin/churches without token → 401");
    else fail("admin auth gate", `status ${r.status}`);
  } catch (e) {
    if (e.message.includes("404")) fail("admin auth gate", "route 404 — deploy may be missing");
    else fail("admin auth gate", e.message);
  }

  if (!TOKEN) {
    console.error("\nADMIN_TOKEN not set — skipping authenticated church tests.\n");
    process.exit(failed > 0 ? 1 : 0);
  }

  let churchId = null;
  let churchSlug = SLUG;

  // 3. Create church with owner
  try {
    const r = await req("POST", "/api/admin/churches", {
      token: TOKEN,
      expect: 201,
      body: {
        name: "PR1 Test Church",
        slug: SLUG,
        plan: "basic",
        ownerSessionId: OWNER_SESSION,
      },
    });
    churchId = r.json?.church?.id;
    churchSlug = r.json?.church?.slug || SLUG;
    if (churchId && r.json?.ownerMembership?.role === "owner") {
      ok("POST /api/admin/churches → 201 with owner membership");
    } else {
      fail("create church", JSON.stringify(r.json).slice(0, 200));
    }
  } catch (e) {
    fail("create church", e.message);
  }

  // 4. Plan assignment
  if (churchId) {
    try {
      const r = await req("PATCH", `/api/admin/churches/${churchId}/plan`, {
        token: TOKEN,
        expect: 200,
        body: { plan: "plus" },
      });
      if (r.json?.church?.plan === "plus") ok("PATCH plan → plus");
      else fail("PATCH plan", JSON.stringify(r.json));
    } catch (e) {
      fail("PATCH plan", e.message);
    }
  }

  // 5. access/resolve
  if (churchSlug) {
    try {
      const r = await req(
        "GET",
        `/api/admin/churches/access/resolve?sessionId=${encodeURIComponent(OWNER_SESSION)}&churchSlug=${encodeURIComponent(churchSlug)}`,
        { token: TOKEN, expect: 200 },
      );
      const role = r.json?.access?.church?.membership?.role;
      const plan = r.json?.access?.church?.plan;
      if (role === "owner" && plan === "plus") {
        ok("access/resolve → owner + plus plan");
      } else {
        fail("access/resolve", JSON.stringify(r.json?.access));
      }
    } catch (e) {
      fail("access/resolve", e.message);
    }
  }

  // 6. Regression smoke (skip on minimal local test server)
  if (!process.env.SKIP_REGRESSION) {
  const regressions = [
    ["GET", "/api/prayer-wall", null, 200],
    ["GET", "/api/guidance/weekly-allowance?sessionId=pr1-regression", null, 200],
    ["GET", "/api/verses/daily", null, 200],
    ["POST", "/api/stripe/create-checkout-session", {}, 400],
  ];
  for (const [method, path, body, expect] of regressions) {
    try {
      await req(method, path, { body, expect });
      ok(`regression ${method} ${path.split("?")[0]} → ${expect}`);
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
