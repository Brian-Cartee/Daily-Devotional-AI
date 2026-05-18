/**
 * Optional DB client for scripts/migrations. Requires DATABASE_URL in the environment.
 * The api-server uses its own pool in artifacts/api-server/src/db.ts.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  throw new Error(
    "DATABASE_URL must be set. Export it or use: DOTENV_CONFIG_PATH=path/to/.env",
  );
}

export const pool = new Pool({ connectionString: url });
export const db = drizzle(pool, { schema });
