-- Run once on production Postgres (Lightsail) before deploying identity connect.
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS social_handle text;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS source text;

-- mobile_subscriptions should already exist from prior schema; create if missing.
CREATE TABLE IF NOT EXISTS mobile_subscriptions (
  session_id text PRIMARY KEY,
  is_pro boolean NOT NULL DEFAULT false,
  expires_at timestamp,
  updated_at timestamp NOT NULL DEFAULT now()
);
