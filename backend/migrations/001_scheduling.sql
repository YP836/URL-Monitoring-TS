-- Phase 1: scheduling & locking foundations.
-- Idempotent. Safe to run on an existing database without data loss.
--
-- Adds a next_check_at-based scheduling model plus monitor state columns used
-- by false-down protection (Phase 2). Run with:
--   docker compose exec -T db psql -U postgres -d uptime_monitor -f - < backend/migrations/001_scheduling.sql
-- (or copy the file into the container and psql -f it).

ALTER TABLE urls
  ADD COLUMN IF NOT EXISTS next_check_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_successes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error_reason     TEXT;

-- Existing rows have no next_check_at yet: make them due now so the new
-- scheduler picks them up on its next tick. (last_pinged_at remains the
-- canonical "last checked at" timestamp.)
UPDATE urls SET next_check_at = NOW() WHERE next_check_at IS NULL;

-- The scheduler scans "WHERE next_check_at <= NOW()" every few seconds; this
-- btree keeps that sargable as the fleet grows toward 100k rows.
CREATE INDEX IF NOT EXISTS idx_urls_next_check_at ON urls (next_check_at);
