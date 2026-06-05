-- Migration: Rename last_grade to last_grade_completed in pending_applications
-- Created: 2026-06-04

DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pending_applications' 
          AND column_name = 'last_grade'
    ) THEN 
        ALTER TABLE public.pending_applications 
        RENAME COLUMN last_grade TO last_grade_completed;
    END IF; 
END $$;
