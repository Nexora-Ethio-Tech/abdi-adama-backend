-- Add missing columns to logistics_notices table for driver notifications
ALTER TABLE logistics_notices ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE logistics_notices ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE logistics_notices ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE logistics_notices ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;
ALTER TABLE logistics_notices ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_logistics_notices_branch_id ON logistics_notices(branch_id);
CREATE INDEX IF NOT EXISTS idx_logistics_notices_sender_id ON logistics_notices(sender_id);
CREATE INDEX IF NOT EXISTS idx_logistics_notices_deleted_at ON logistics_notices(deleted_at);
