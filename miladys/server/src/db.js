import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    '[db] DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.'
  );
}

// Neon needs SSL. A plain VPS Postgres instance usually doesn't (unless you
// set it up that way) — sslmode is controlled by the connection string itself
// (`?sslmode=require` for Neon), so we don't hardcode it here beyond
// tolerating self-signed certs, which is safe for both.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function query(text, params) {
  return pool.query(text, params);
}

// Runs schema.sql on boot. All statements are CREATE TABLE/INDEX IF NOT
// EXISTS, so this is safe to run every time the server starts — no separate
// migration step to remember.
export async function ensureSchema() {
  const { readFileSync } = await import('fs');
  const { fileURLToPath } = await import('url');
  const path = fileURLToPath(new URL('./schema.sql', import.meta.url));
  const sql = readFileSync(path, 'utf8');
  await pool.query(sql);
}
