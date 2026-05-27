-- =============================================================================
-- Migration: email_smtp_migration.sql
-- Purpose  : Ensure the finance_settings table has SMTP configuration rows
--            so the email service can read them from the DB as a fallback,
--            AND clean up the two legacy credential columns that were made
--            redundant by the admission email refactor.
--
-- Safe to run multiple times (all statements are idempotent).
-- Automatically executed by server.ts on every startup.
-- =============================================================================

-- ─── 1. Ensure finance_settings table exists ─────────────────────────────────
-- (It is created by payroll_schema.sql, but we guard here just in case this
--  migration runs before that file in a fresh environment.)
CREATE TABLE IF NOT EXISTS finance_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT         NOT NULL DEFAULT '',
  updated_by UUID,
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── 2. Seed default SMTP settings (DO NOTHING if already present) ───────────
-- These are placeholder values. The real values must be set via the Super Admin
-- Finance Settings UI or directly in the .env file.
-- The application reads SMTP config from process.env first; these rows serve as
-- a visible record that SMTP needs to be configured.
INSERT INTO finance_settings (key, value, updated_at)
VALUES
  ('smtp_host',  'smtp.gmail.com', NOW()),
  ('smtp_port',  '587',            NOW()),
  ('smtp_user',  '',               NOW()),
  ('smtp_pass',  '',               NOW()),
  ('smtp_from',  '',               NOW())
ON CONFLICT (key) DO NOTHING;

-- ─── 3. Add smtp_from column guard to finance_settings_audit (if it exists) ──
-- Some deployments have an audit table; make sure it can record smtp_from changes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'finance_settings_audit'
  ) THEN
    -- Nothing structural to add; the audit table stores key/value pairs generically.
    -- This block is intentionally a no-op but documents the dependency.
    NULL;
  END IF;
END;
$$;

-- ─── 4. Clean up legacy admission credential columns ─────────────────────────
-- student_id_generated / student_password_temp / parent_id_generated /
-- parent_password_temp were populated by the old generateCredentials() call
-- which created a second, unused set of credentials alongside the real ones
-- created by userService.createUser(). The refactored financeApproveApplication
-- no longer writes to these columns, so we drop them to avoid confusion.
--
-- We use IF EXISTS guards so this is safe on databases that already had them
-- removed, or on fresh installs that never had them.

ALTER TABLE pending_applications
  DROP COLUMN IF EXISTS student_id_generated,
  DROP COLUMN IF EXISTS student_password_temp,
  DROP COLUMN IF EXISTS parent_id_generated,
  DROP COLUMN IF EXISTS parent_password_temp;

-- ─── 5. Ensure credentials_generated_at column still exists ──────────────────
-- This column is still written by financeApproveApplication to record when
-- the student/parent accounts were created.
ALTER TABLE pending_applications
  ADD COLUMN IF NOT EXISTS credentials_generated_at TIMESTAMPTZ;
