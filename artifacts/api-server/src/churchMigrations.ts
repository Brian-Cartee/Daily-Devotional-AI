import { pool } from "./db";

/** Idempotent church schema ensures (safe on every boot). */
export async function ensureChurchSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS churches (
      id text PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      logo_url text,
      primary_color text,
      plan text NOT NULL DEFAULT 'none',
      status text NOT NULL DEFAULT 'active',
      invite_code text NOT NULL UNIQUE,
      settings jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS church_memberships (
      id serial PRIMARY KEY,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      session_id text NOT NULL,
      email text,
      role text NOT NULL DEFAULT 'member',
      status text NOT NULL DEFAULT 'active',
      joined_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      UNIQUE (church_id, session_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS church_memberships_session_id_idx
      ON church_memberships (session_id);
  `);

  // Scope prayer wall to a church (nullable — existing rows stay global)
  await pool.query(`
    ALTER TABLE prayer_wall
      ADD COLUMN IF NOT EXISTS church_id text REFERENCES churches(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS prayer_wall_church_id_idx
      ON prayer_wall (church_id)
      WHERE church_id IS NOT NULL;
  `);

  // Church announcements — pastor broadcasts to members
  await pool.query(`
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS church_announcements_church_id_idx
      ON church_announcements (church_id, created_at DESC);
  `);

  // Visitor log — pastor records first-time visitors for follow-up
  await pool.query(`
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
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS church_visitors_church_id_idx
      ON church_visitors (church_id, visit_date DESC);
  `);

  // Magic link tokens for pastor/admin login (no passwords)
  await pool.query(`
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS church_magic_links_token_idx
      ON church_magic_links (token) WHERE used = false;
  `);

  // Persistent AI rate limits per church — survives server restarts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS church_ai_usage (
      id serial PRIMARY KEY,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      window_key text NOT NULL,
      call_count integer NOT NULL DEFAULT 0,
      window_start timestamp NOT NULL DEFAULT now(),
      UNIQUE (church_id, window_key)
    );
  `);

  // Urgency flags on prayer requests — set by AI on submission
  await pool.query(`
    ALTER TABLE prayer_wall
      ADD COLUMN IF NOT EXISTS urgency_flagged boolean NOT NULL DEFAULT false;
  `);

  await pool.query(`
    ALTER TABLE prayer_wall
      ADD COLUMN IF NOT EXISTS urgency_reason text;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS prayer_wall_urgency_idx
      ON prayer_wall (church_id, urgency_flagged)
      WHERE urgency_flagged = true;
  `);

  // Timeline events — every significant action on a person logged here
  await pool.query(`
    CREATE TABLE IF NOT EXISTS church_timeline_events (
      id serial PRIMARY KEY,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      visitor_id integer REFERENCES church_visitors(id) ON DELETE CASCADE,
      member_session_id text,
      event_type text NOT NULL,
      description text NOT NULL,
      source text NOT NULL DEFAULT 'manual',
      logged_by text,
      event_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS church_timeline_events_visitor_idx
      ON church_timeline_events (visitor_id, event_at DESC)
      WHERE visitor_id IS NOT NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS church_timeline_events_church_idx
      ON church_timeline_events (church_id, event_at DESC);
  `);

  // Visitor contact log — who called/texted/emailed and when
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitor_contacts (
      id serial PRIMARY KEY,
      visitor_id integer NOT NULL REFERENCES church_visitors(id) ON DELETE CASCADE,
      church_id text NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      contact_type text NOT NULL DEFAULT 'call',
      notes text,
      logged_by text,
      contacted_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS visitor_contacts_visitor_idx
      ON visitor_contacts (visitor_id, contacted_at DESC);
  `);

  // Care requests — hospital visits, meals, counseling, grief support
  await pool.query(`
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS church_care_requests_church_idx
      ON church_care_requests (church_id, status, created_at DESC);
  `);

  // Weekly briefings — generated Sunday night, delivered Monday morning
  await pool.query(`
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS church_briefings_church_idx
      ON church_briefings (church_id, generated_at DESC);
  `);
}
