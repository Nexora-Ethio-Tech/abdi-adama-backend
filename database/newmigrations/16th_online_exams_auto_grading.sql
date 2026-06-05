-- Migration: 16th_online_exams_auto_grading.sql
-- Adds settings for score visibility and auto-grading to online exams

ALTER TABLE public.online_exams
  ADD COLUMN IF NOT EXISTS show_score BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50);
