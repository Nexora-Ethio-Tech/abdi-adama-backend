-- Migration: 22nd_dept_plan_rating_weekly_constraint.sql
-- Purpose:
--   1. Add a unique constraint so a dept head can only rate a specific teacher ONCE per ISO week.
--   2. Add week_number column to teacher_ratings to track the ISO year-week of the rating.
-- This enforces the business rule: one dept-head rating per teacher per week.

-- Step 1: Add week_number column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'teacher_ratings'
          AND column_name  = 'week_year_key'
    ) THEN
        ALTER TABLE public.teacher_ratings
            ADD COLUMN week_year_key TEXT;

        -- Backfill existing rows with their ISO year-week key
        UPDATE public.teacher_ratings
            SET week_year_key = TO_CHAR(created_at, 'IYYY-IW');
    END IF;
END $$;

-- Step 2: Add unique constraint on (teacher_id, rated_by, week_year_key)
--         so a department head can only rate the same teacher once per calendar week.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_teacher_ratings_weekly'
    ) THEN
        ALTER TABLE public.teacher_ratings
            ADD CONSTRAINT uq_teacher_ratings_weekly
            UNIQUE (teacher_id, rated_by, week_year_key);
    END IF;
END $$;
