
-- Migration: Add published_at and deleted_at to silo_logistics_notices
ALTER TABLE silo_logistics_notices ADD COLUMN IF NOT EXISTS published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE silo_logistics_notices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Update existing notices to be 'published' (for backward compatibility during transition)
UPDATE silo_logistics_notices SET published_at = timestamp WHERE published_at IS NULL;
