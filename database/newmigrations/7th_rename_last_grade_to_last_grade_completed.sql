-- Migration: Rename last_grade to last_grade_completed in pending_applications
-- Created: 2026-06-04

ALTER TABLE pending_applications RENAME COLUMN last_grade TO last_grade_completed;
