-- Run once on production before deploying timezone-aware push scheduler:
-- psql $DATABASE_URL -f scripts/add-push-timezone.sql

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York';
