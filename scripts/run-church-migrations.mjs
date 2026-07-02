#!/usr/bin/env node
/**
 * Runs all church-specific table migrations directly via pg.
 * Use this when ensureChurchSchema() fails silently on startup.
 *
 * Usage (from repo root on server):
 *   node scripts/run-church-migrations.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const { Pool } = require("pg");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = fs.readFileSync(path.join(__dirname, "../artifacts/api-server/.env"), "utf8");
    const match = env.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("DATABASE_URL not found");
}

const pool = new Pool({ connectionString: loadDatabaseUrl() });
const q = (sql) => pool.query(sql);

async function main() {
  console.log("🔧  Running church migrations...\n");

  await q(`
    CREATE TABLE IF NOT EXISTS church_announcements (
      id serial PRIMARY KEY,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      author_session_id text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      pinned boolean NOT NULL DEFAULT false,
      published_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log("✅  church_announcements");

  await q(`CREATE INDEX IF NOT EXISTS church_announcements_church_id_idx ON church_announcements (church_id, created_at DESC);`);

  await q(`
    CREATE TABLE IF NOT EXISTS church_visitors (
      id serial PRIMARY KEY,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      first_name text NOT NULL,
      last_name text,
      email text,
      phone text,
      visit_date date NOT NULL DEFAULT CURRENT_DATE,
      source text DEFAULT 'walk-in',
      notes text,
      follow_up_status text NOT NULL DEFAULT 'pending',
      assigned_to text,
      next_followup_date date,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log("✅  church_visitors");

  await q(`CREATE INDEX IF NOT EXISTS church_visitors_church_id_idx ON church_visitors (church_id, visit_date DESC);`);

  await q(`
    CREATE TABLE IF NOT EXISTS church_magic_links (
      id serial PRIMARY KEY,
      email text NOT NULL,
      token text NOT NULL UNIQUE,
      church_id text REFERENCES churches(id) ON DELETE CASCADE,
      used boolean NOT NULL DEFAULT false,
      expires_at timestamp NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log("✅  church_magic_links");

  await q(`
    CREATE TABLE IF NOT EXISTS church_ai_usage (
      id serial PRIMARY KEY,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      window_key text NOT NULL,
      tokens_used integer NOT NULL DEFAULT 0,
      window_start timestamp NOT NULL DEFAULT now(),
      UNIQUE (church_id, window_key)
    );
  `);
  console.log("✅  church_ai_usage");

  await q(`ALTER TABLE prayer_wall ADD COLUMN IF NOT EXISTS church_id text REFERENCES churches(id) ON DELETE SET NULL;`);
  await q(`CREATE INDEX IF NOT EXISTS prayer_wall_church_id_idx ON prayer_wall (church_id) WHERE church_id IS NOT NULL;`);
  await q(`ALTER TABLE prayer_wall ADD COLUMN IF NOT EXISTS urgency_flagged boolean NOT NULL DEFAULT false;`);
  await q(`ALTER TABLE prayer_wall ADD COLUMN IF NOT EXISTS urgency_reason text;`);
  console.log("✅  prayer_wall columns (church_id, urgency_flagged, urgency_reason)");

  await q(`
    CREATE TABLE IF NOT EXISTS church_timeline_events (
      id serial PRIMARY KEY,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      visitor_id integer REFERENCES church_visitors(id) ON DELETE CASCADE,
      member_session_id text,
      event_type text NOT NULL,
      description text,
      source text DEFAULT 'manual',
      logged_by text,
      event_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log("✅  church_timeline_events");

  await q(`
    CREATE TABLE IF NOT EXISTS visitor_contacts (
      id serial PRIMARY KEY,
      visitor_id integer NOT NULL REFERENCES church_visitors(id) ON DELETE CASCADE,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      contact_type text NOT NULL,
      notes text,
      logged_by text,
      contacted_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log("✅  visitor_contacts");

  await q(`
    CREATE TABLE IF NOT EXISTS church_care_requests (
      id serial PRIMARY KEY,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      visitor_id integer REFERENCES church_visitors(id) ON DELETE SET NULL,
      member_session_id text,
      person_name text NOT NULL,
      request_type text NOT NULL DEFAULT 'other',
      description text NOT NULL,
      assigned_to text,
      due_date date,
      status text NOT NULL DEFAULT 'open',
      private_notes text,
      created_by text,
      completed_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log("✅  church_care_requests");

  await q(`CREATE INDEX IF NOT EXISTS church_care_requests_church_idx ON church_care_requests (church_id, status, created_at DESC);`);

  await q(`
    CREATE TABLE IF NOT EXISTS church_briefings (
      id serial PRIMARY KEY,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      briefing_text text NOT NULL,
      visitors_flagged integer NOT NULL DEFAULT 0,
      prayers_flagged integer NOT NULL DEFAULT 0,
      members_flagged integer NOT NULL DEFAULT 0,
      generated_at timestamp NOT NULL DEFAULT now(),
      delivered_at timestamp,
      opened_at timestamp
    );
  `);
  console.log("✅  church_briefings");

  // Add new columns to existing tables (idempotent)
  await q(`ALTER TABLE church_visitors ADD COLUMN IF NOT EXISTS assigned_to text;`);
  await q(`ALTER TABLE church_visitors ADD COLUMN IF NOT EXISTS next_followup_date date;`);
  console.log("✅  church_visitors new columns (assigned_to, next_followup_date)");

  console.log("\n✅  All migrations complete.\n");
  await pool.end();
}

main().catch(async (err) => {
  console.error("❌  Migration failed:", err.message);
  await pool.end();
  process.exit(1);
});
