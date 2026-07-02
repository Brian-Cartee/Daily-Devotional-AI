#!/usr/bin/env node
/**
 * Idempotent seed: TestChurch + owner membership for church admin portal login.
 *
 * Usage:
 *   node scripts/seed-test-church.mjs
 *   API=https://admin.shepherdspathai.com node scripts/seed-test-church.mjs
 *
 * Env:
 *   API          — api base URL (default http://127.0.0.1:8080)
 *   ADMIN_TOKEN  — x-admin-token (falls back to ADMIN_PASSWORD from artifacts/api-server/.env)
 *   ADMIN_EMAIL  — owner email (default briancartee@gmail.com)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const API = (process.env.API || "http://127.0.0.1:8080").replace(/\/$/, "");
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "briancartee@gmail.com").toLowerCase().trim();
const CHURCH_SLUG = "test-church";
const CHURCH_NAME = "TestChurch";
const CHURCH_PLAN = "plus";
const OWNER_SESSION_ID = "seed-owner-test-church";

function loadAdminToken() {
  if (process.env.ADMIN_TOKEN?.trim()) return process.env.ADMIN_TOKEN.trim();

  const envPath = path.join(REPO_ROOT, "artifacts/api-server/.env");
  if (!fs.existsSync(envPath)) return "";
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^ADMIN_PASSWORD=(.*)$/);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

async function req(method, urlPath, { body, token, expect } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["x-admin-token"] = token;
  const res = await fetch(`${API}${urlPath}`, {
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
    throw new Error(`${method} ${urlPath} expected ${expect}, got ${res.status}: ${text.slice(0, 300)}`);
  }
  return { status: res.status, json };
}

async function main() {
  const token = loadAdminToken();
  if (!token) {
    console.error("ADMIN_TOKEN or ADMIN_PASSWORD in artifacts/api-server/.env is required.");
    process.exit(1);
  }

  console.log(`\nSeeding TestChurch → ${API}\n`);

  let church = null;

  try {
    const list = await req("GET", "/api/admin/churches", { token, expect: 200 });
    church = list.json?.churches?.find((c) => c.slug === CHURCH_SLUG) ?? null;
  } catch (err) {
    console.error("Failed to list churches:", err.message);
    process.exit(1);
  }

  if (!church) {
    try {
      const created = await req("POST", "/api/admin/churches", {
        token,
        expect: 201,
        body: {
          name: CHURCH_NAME,
          slug: CHURCH_SLUG,
          plan: CHURCH_PLAN,
        },
      });
      church = created.json?.church;
      console.log(`  ✓ Created church "${CHURCH_NAME}" (${CHURCH_SLUG})`);
    } catch (err) {
      console.error("Failed to create church:", err.message);
      process.exit(1);
    }
  } else {
    console.log(`  ✓ Church exists: ${church.name} (${church.slug})`);
    if (church.plan !== CHURCH_PLAN) {
      try {
        const updated = await req("PATCH", `/api/admin/churches/${church.id}/plan`, {
          token,
          expect: 200,
          body: { plan: CHURCH_PLAN },
        });
        church = updated.json?.church ?? church;
        console.log(`  ✓ Updated plan → ${CHURCH_PLAN}`);
      } catch (err) {
        console.error("Failed to update plan:", err.message);
        process.exit(1);
      }
    }
    if (church.status !== "active") {
      console.warn(`  ! Church status is "${church.status}" (expected active) — no admin API to patch status`);
    }
  }

  if (!church?.id) {
    console.error("Church id missing after seed.");
    process.exit(1);
  }

  let membership = null;
  try {
    const members = await req("GET", `/api/admin/churches/${church.id}/memberships`, {
      token,
      expect: 200,
    });
    const rows = members.json?.memberships ?? [];
    membership =
      rows.find((m) => m.email?.toLowerCase() === ADMIN_EMAIL) ??
      rows.find((m) => m.sessionId === OWNER_SESSION_ID) ??
      null;
  } catch (err) {
    console.error("Failed to list memberships:", err.message);
    process.exit(1);
  }

  if (!membership) {
    try {
      const created = await req("POST", `/api/admin/churches/${church.id}/memberships`, {
        token,
        expect: 201,
        body: {
          sessionId: OWNER_SESSION_ID,
          role: "owner",
          email: ADMIN_EMAIL,
          status: "active",
        },
      });
      membership = created.json?.membership;
      console.log(`  ✓ Created owner membership for ${ADMIN_EMAIL}`);
    } catch (err) {
      console.error("Failed to create membership:", err.message);
      process.exit(1);
    }
  } else {
    const needsUpdate =
      membership.role !== "owner" ||
      membership.status !== "active" ||
      membership.email?.toLowerCase() !== ADMIN_EMAIL;

    if (needsUpdate) {
      try {
        const updated = await req("POST", `/api/admin/churches/${church.id}/memberships`, {
          token,
          expect: 201,
          body: {
            sessionId: membership.sessionId || OWNER_SESSION_ID,
            role: "owner",
            email: ADMIN_EMAIL,
            status: "active",
          },
        });
        membership = updated.json?.membership ?? membership;
        console.log(`  ✓ Updated owner membership for ${ADMIN_EMAIL}`);
      } catch (err) {
        console.error("Failed to update membership:", err.message);
        process.exit(1);
      }
    } else {
      console.log(`  ✓ Owner membership already set for ${ADMIN_EMAIL}`);
    }
  }

  console.log(`
Done.

  Church slug : ${CHURCH_SLUG}
  Church name : ${CHURCH_NAME}
  Plan        : ${church.plan}
  Owner email : ${ADMIN_EMAIL}

Login (local dev):
  1. cd artifacts/church-portal && pnpm dev   → http://localhost:3002
  2. Email: ${ADMIN_EMAIL}
  3. Church slug: ${CHURCH_SLUG}

Login (production, after DNS + deploy):
  https://admin.shepherdspathai.com
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
