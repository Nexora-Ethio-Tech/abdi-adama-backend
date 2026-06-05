-- Migration: Fix grade_submissions uniqueness to include academic year and semester
-- Purpose: Preserve separate submission records across different academic periods
ALTER TABLE IF EXISTS public.grade_submissions DROP CONSTRAINT IF EXISTS grade_submissions_course_id_teacher_id_submission_type_key;
-- Also remove legacy unique index if it exists (created without the academic period)
DROP INDEX IF EXISTS grade_submissions_course_id_teacher_id_submission_type_key;
-- Create a unique index scoped to academic period if it doesn't already exist.
-- We prefer a UNIQUE INDEX rather than ALTER TABLE ADD CONSTRAINT to avoid name collisions
-- with previously created indexes/constraints. This is idempotent on repeated runs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_grade_submissions_unique_course_teacher_type_year_sem ON public.grade_submissions(
    course_id,
    teacher_id,
    submission_type,
    academic_year,
    semester
);
-- Non-unique index for fast lookups by period (kept for compatibility)
CREATE INDEX IF NOT EXISTS idx_grade_submissions_by_period ON public.grade_submissions(
    course_id,
    teacher_id,
    submission_type,
    academic_year,
    semester
);
CREATE INDEX IF NOT EXISTS idx_grade_submissions_by_period ON public.grade_submissions(
    course_id,
    teacher_id,
    submission_type,
    academic_year,
    semester
);