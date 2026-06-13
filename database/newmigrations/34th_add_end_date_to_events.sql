-- Migration: Add end_date to events table for date range support
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE;
UPDATE events SET end_date = date WHERE end_date IS NULL;
