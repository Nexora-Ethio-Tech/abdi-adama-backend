-- Assessment-scoped grade locking support.
-- A submitted component must never lock another component in the same course/period.

CREATE INDEX IF NOT EXISTS idx_grades_finalized_exact_assessment
  ON public.grades(course_id, academic_year, semester, type)
  WHERE is_finalized = true;

CREATE INDEX IF NOT EXISTS idx_grade_submissions_locked_exact_assessment
  ON public.grade_submissions(course_id, teacher_id, academic_year, semester, submission_type)
  WHERE is_locked = true;

