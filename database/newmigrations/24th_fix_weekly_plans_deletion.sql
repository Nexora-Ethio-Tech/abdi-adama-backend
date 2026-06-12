-- Fix weekly_plans foreign keys referencing teachers
ALTER TABLE public.weekly_plans DROP CONSTRAINT IF EXISTS weekly_plans_reviewed_by_fkey;
ALTER TABLE public.weekly_plans ADD CONSTRAINT weekly_plans_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE public.weekly_plans DROP CONSTRAINT IF EXISTS weekly_plans_teacher_id_fkey;
ALTER TABLE public.weekly_plans ADD CONSTRAINT weekly_plans_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

-- Fix grade_submission_locks foreign keys referencing users
ALTER TABLE public.grade_submission_locks DROP CONSTRAINT IF EXISTS grade_submission_locks_locked_by_fkey;
ALTER TABLE public.grade_submission_locks ADD CONSTRAINT grade_submission_locks_locked_by_fkey 
  FOREIGN KEY (locked_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Fix grade_submission_finalizations foreign keys referencing users
ALTER TABLE public.grade_submission_finalizations DROP CONSTRAINT IF EXISTS grade_submission_finalizations_finalized_by_fkey;
ALTER TABLE public.grade_submission_finalizations ADD CONSTRAINT grade_submission_finalizations_finalized_by_fkey 
  FOREIGN KEY (finalized_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Fix online_exams foreign keys referencing users
ALTER TABLE public.online_exams DROP CONSTRAINT IF EXISTS online_exams_creator_id_fkey;
ALTER TABLE public.online_exams ADD CONSTRAINT online_exams_creator_id_fkey 
  FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix teacher_ratings foreign keys if teacher_ratings exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teacher_ratings') THEN
    ALTER TABLE public.teacher_ratings DROP CONSTRAINT IF EXISTS teacher_ratings_teacher_id_fkey;
    ALTER TABLE public.teacher_ratings ADD CONSTRAINT teacher_ratings_teacher_id_fkey 
      FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

    ALTER TABLE public.teacher_ratings DROP CONSTRAINT IF EXISTS teacher_ratings_weekly_plan_id_fkey;
    ALTER TABLE public.teacher_ratings ADD CONSTRAINT teacher_ratings_weekly_plan_id_fkey 
      FOREIGN KEY (weekly_plan_id) REFERENCES public.weekly_plans(id) ON DELETE CASCADE;

    ALTER TABLE public.teacher_ratings DROP CONSTRAINT IF EXISTS teacher_ratings_rated_by_fkey;
    ALTER TABLE public.teacher_ratings ADD CONSTRAINT teacher_ratings_rated_by_fkey 
      FOREIGN KEY (rated_by) REFERENCES public.teachers(id) ON DELETE SET NULL;
  END IF;
END $$;
