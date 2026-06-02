-- Add columns to record when finance returns an application to school admin with a reason
ALTER TABLE pending_applications
  ADD COLUMN IF NOT EXISTS finance_removal_reason TEXT,
  ADD COLUMN IF NOT EXISTS finance_removed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS finance_removed_at TIMESTAMPTZ;
