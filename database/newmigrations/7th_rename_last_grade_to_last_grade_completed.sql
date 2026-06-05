-- Migration: Rename last_grade to last_grade_completed in pending_applications
-- Created: 2026-06-04

ALTER TABLE IF EXISTS public.pending_applications RENAME COLUMN IF EXISTS last_grade TO last_grade_completed;
