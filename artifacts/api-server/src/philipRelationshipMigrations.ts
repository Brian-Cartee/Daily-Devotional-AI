import { pool } from "./db";

/** Idempotent relationship profile schema (safe on every boot). */
export async function ensurePhilipRelationshipSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS philip_relationship_profiles (
      session_id text PRIMARY KEY,
      trust_band text NOT NULL DEFAULT 'new',
      explored_across_sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
      themes_across_sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
      carry_forward text,
      last_meaningful_topic text,
      session_count integer NOT NULL DEFAULT 0,
      directness_ceiling integer NOT NULL DEFAULT 1,
      version integer NOT NULL DEFAULT 1,
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
}
