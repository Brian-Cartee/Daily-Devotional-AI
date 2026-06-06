import { pool } from "./db";

/** Idempotent column/table ensures for identity connect (safe on every boot). */
export async function ensureIdentitySchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS social_handle text;
    ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS source text;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mobile_subscriptions (
      session_id text PRIMARY KEY,
      is_pro boolean NOT NULL DEFAULT false,
      expires_at timestamp,
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
}
