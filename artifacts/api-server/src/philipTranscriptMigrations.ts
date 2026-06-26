import { pool } from "./db";

/** Idempotent guidance transcript schema (safe on every boot). */
export async function ensurePhilipTranscriptSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS philip_conversation_turns (
      id serial PRIMARY KEY,
      conversation_id text NOT NULL,
      session_id text NOT NULL,
      turn_index integer NOT NULL,
      role text NOT NULL,
      content text NOT NULL,
      content_hash text NOT NULL,
      client_turn_id text,
      created_at timestamp NOT NULL DEFAULT now(),
      UNIQUE (conversation_id, turn_index)
    );
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS philip_conversation_turns_client_turn_idx
      ON philip_conversation_turns (conversation_id, client_turn_id)
      WHERE client_turn_id IS NOT NULL;
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS philip_conversation_turns_conversation_idx
      ON philip_conversation_turns (conversation_id);
  `);
}
