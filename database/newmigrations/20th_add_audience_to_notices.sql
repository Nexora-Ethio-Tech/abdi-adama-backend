-- Migration: Add audience column to notices table
-- This allows school admins to target notices to specific role groups.
-- Audience is stored as a comma-separated text of roles, e.g. 'teacher,driver'
-- or the special value 'all' to target everyone.

ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all';
