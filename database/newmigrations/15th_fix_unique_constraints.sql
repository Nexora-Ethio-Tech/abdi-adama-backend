-- Migration: 15th_fix_unique_constraints.sql
-- Ensure unique indexes exist for ON CONFLICT queries, as constraint names may vary or be missing

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_exam_variation ON public.exam_variations(exam_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_exam_session ON public.online_exam_sessions(exam_id, student_id);
