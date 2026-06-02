-- =============================================================================
-- Migration: email_smtp_migration.sql
-- Purpose  : Create a separate email_config table for SMTP configuration
--            (finance_settings is numeric-only and shouldn't store SMTP)
--
-- Safe to run multiple times (idempotent).
-- Automatically executed by server.ts on every startup.
-- =============================================================================
-- ─── 1. Create email_config table (separate from finance_settings) ──────────────
-- This table stores string-based SMTP and email configuration
CREATE TABLE IF NOT EXISTS email_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES users(id) ON DELETE
  SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ─── 2. Seed default SMTP settings (DO NOTHING if already present) ───────────
-- These are placeholder values. The real values must be set via the Super Admin
-- Settings UI or directly in the .env file.
-- The application reads SMTP config from process.env first; these rows serve as
-- a visible record that SMTP needs to be configured.
INSERT INTO email_config (key, value, updated_at)
VALUES ('smtp_host', 'smtp.gmail.com', NOW()),
  ('smtp_port', '587', NOW()),
  ('smtp_user', '', NOW()),
  ('smtp_pass', '', NOW()),
  ('smtp_from', '', NOW()) ON CONFLICT (key) DO NOTHING;
-- ─── 3. Create email_config_audit table for change tracking ─────────────────
CREATE TABLE IF NOT EXISTS email_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE
  SET NULL,
    changed_by_name VARCHAR(255),
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- ─── 4. Drop legacy columns from finance_settings if they exist ──────────────
-- (These were made redundant by the admission email refactor)
ALTER TABLE IF EXISTS finance_settings DROP COLUMN IF EXISTS smtp_host CASCADE;
ALTER TABLE IF EXISTS finance_settings DROP COLUMN IF EXISTS smtp_port CASCADE;
-- ─── 4. Clean up legacy admission credential columns ─────────────────────────
-- student_id_generated / student_password_temp / parent_id_generated /
-- parent_password_temp were populated by the old generateCredentials() call
-- which created a second, unused set of credentials alongside the real ones
-- created by userService.createUser(). The refactored financeApproveApplication
-- no longer writes to these columns, so we drop them to avoid confusion.
--
-- We use IF EXISTS guards so this is safe on databases that already had them
-- removed, or on fresh installs that never had them.
ALTER TABLE pending_applications DROP COLUMN IF EXISTS student_id_generated,
  DROP COLUMN IF EXISTS student_password_temp,
  DROP COLUMN IF EXISTS parent_id_generated,
  DROP COLUMN IF EXISTS parent_password_temp;
-- ─── 5. Ensure credentials_generated_at column still exists ──────────────────
-- This column is still written by financeApproveApplication to record when
-- the student/parent accounts were created.
ALTER TABLE pending_applications
ADD COLUMN IF NOT EXISTS credentials_generated_at TIMESTAMPTZ;