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
}
