-- Migration: Add is_read tracking and child_id to silo_clinic_messages
-- Run this once against the production/dev PostgreSQL database.

-- 1. Track whether ClinicAdmin has read each message
ALTER TABLE silo_clinic_messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Link a message to the child (student) it concerns
--    (child_id may already exist if clinic_setup.sql was re-run with a newer version)
ALTER TABLE silo_clinic_messages
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES silo_identities(id) ON DELETE SET NULL;

-- 3. Index for fast unread-count queries per sender
CREATE INDEX IF NOT EXISTS idx_clinic_messages_is_read
  ON silo_clinic_messages(receiver_id, sender_id, is_read);

-- 4. Index for child-based lookups
CREATE INDEX IF NOT EXISTS idx_clinic_messages_child_id
  ON silo_clinic_messages(child_id);
