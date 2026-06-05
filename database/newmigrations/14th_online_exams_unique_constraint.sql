-- Migration: 14th_online_exams_unique_constraint.sql
-- Adds unique constraint to online_exam_sessions for UPSERT operations

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_exam_student_session'
    ) THEN
        ALTER TABLE public.online_exam_sessions
        ADD CONSTRAINT unique_exam_student_session UNIQUE (exam_id, student_id);
    END IF;
END $$;
