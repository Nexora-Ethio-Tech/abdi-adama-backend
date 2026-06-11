-- Migration: 22nd_add_overall_rating_score_to_teachers.sql
-- Add overall_rating_score column to teachers table if not exists

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS overall_rating_score integer DEFAULT 0;
