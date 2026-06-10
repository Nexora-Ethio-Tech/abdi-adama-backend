-- Migration: Add category column to notices table
ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'Academic';
