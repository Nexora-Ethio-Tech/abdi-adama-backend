-- Migration: Add Draft/Submit/Finalize workflow to grades table
-- Purpose: Support separate draft saving and final submission with proper locking
-- Safety: Ensure grades table exists with required base structure
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,
  type VARCHAR(30) NOT NULL,
  weight VARCHAR(10),
  score NUMERIC(6, 2),
  total NUMERIC(6, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_submitted BOOLEAN DEFAULT false NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID,
  academic_year VARCHAR(20) DEFAULT '2025/2026',
  semester SMALLINT DEFAULT 2
);
-- 1. Add status column to track grade state
ALTER TABLE IF EXISTS public.grades
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'finalized'));
-- 2. Add is_finalized flag for VP Principal visibility
ALTER TABLE IF EXISTS public.grades
ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;
-- 3. Add granular locking: lock specific academic_year, semester, course, and grading component
CREATE TABLE IF NOT EXISTS public.grade_submission_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year VARCHAR(20) NOT NULL,
  semester SMALLINT NOT NULL,
  course_id UUID NOT NULL,
  grading_component VARCHAR(100) NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  locked_by UUID,
  branch_id UUID,
  UNIQUE(
    academic_year,
    semester,
    course_id,
    grading_component,
    branch_id
  ),
  FOREIGN KEY (locked_by) REFERENCES public.users(id),
  FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
-- 4. Add submission finalization table to track when submissions are approved by VP
CREATE TABLE IF NOT EXISTS public.grade_submission_finalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_submission_id UUID NOT NULL UNIQUE,
  finalized_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finalized_by UUID,
  academic_year VARCHAR(20),
  semester SMALLINT,
  course_id UUID,
  grading_component VARCHAR(100) NOT NULL,
  FOREIGN KEY (grade_submission_id) REFERENCES public.grade_submissions(id),
  FOREIGN KEY (finalized_by) REFERENCES public.users(id),
  FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
-- 5. Update grade_submissions table to track stage and period
ALTER TABLE IF EXISTS public.grade_submissions
ADD COLUMN IF NOT EXISTS submission_stage VARCHAR(20) DEFAULT 'saved' CHECK (
    submission_stage IN ('saved', 'submitted', 'finalized')
  );
ALTER TABLE IF EXISTS public.grade_submissions
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20) DEFAULT '2025/2026';
ALTER TABLE IF EXISTS public.grade_submissions
ADD COLUMN IF NOT EXISTS semester SMALLINT DEFAULT 2;
ALTER TABLE IF EXISTS public.grade_submissions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- 6. Create index for efficient VP queries (looking for finalized grades only)
CREATE INDEX IF NOT EXISTS idx_grades_finalized_by_period ON public.grades(
  academic_year,
  semester,
  course_id,
  status,
  is_finalized
)
WHERE is_finalized = true;
-- 7. Create index for draft/submitted grade queries
CREATE INDEX IF NOT EXISTS idx_grades_by_status_and_teacher ON public.grades(status, submitted_by, academic_year, semester);
-- 8. Ensure grade_submissions has proper indexes
CREATE INDEX IF NOT EXISTS idx_grade_submissions_by_status ON public.grade_submissions(submission_stage, course_id, teacher_id);