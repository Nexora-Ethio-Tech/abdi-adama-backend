-- Migration: add audit workflow support to loans
ALTER TABLE loans
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE VARCHAR(20),
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS audited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add new allowed status values if using a strict constraint
ALTER TABLE loans
  DROP CONSTRAINT IF EXISTS loans_status_check;

ALTER TABLE loans
  ADD CONSTRAINT loans_status_check CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected', 'cancelled'));
