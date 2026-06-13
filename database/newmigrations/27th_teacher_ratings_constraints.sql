-- Migration: 27th_teacher_ratings_constraints.sql
-- Fixes missing constraints on teacher_ratings that were being applied in TS scripts

-- Add Foreign Keys
ALTER TABLE public.teacher_ratings
  DROP CONSTRAINT IF EXISTS fk_teacher_ratings_teacher_id;
ALTER TABLE public.teacher_ratings
  ADD CONSTRAINT fk_teacher_ratings_teacher_id FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

ALTER TABLE public.teacher_ratings
  DROP CONSTRAINT IF EXISTS fk_teacher_ratings_weekly_plan_id;
ALTER TABLE public.teacher_ratings
  ADD CONSTRAINT fk_teacher_ratings_weekly_plan_id FOREIGN KEY (weekly_plan_id) REFERENCES public.weekly_plans(id) ON DELETE CASCADE;

ALTER TABLE public.teacher_ratings
  DROP CONSTRAINT IF EXISTS fk_teacher_ratings_rated_by;
ALTER TABLE public.teacher_ratings
  ADD CONSTRAINT fk_teacher_ratings_rated_by FOREIGN KEY (rated_by) REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Add Check Constraint
ALTER TABLE public.teacher_ratings
  DROP CONSTRAINT IF EXISTS chk_teacher_ratings_value;
ALTER TABLE public.teacher_ratings
  ADD CONSTRAINT chk_teacher_ratings_value CHECK (rating_value IN (100, 200, 300));

-- Add Unique Constraint
ALTER TABLE public.teacher_ratings
  DROP CONSTRAINT IF EXISTS uq_weekly_plan_rating;
ALTER TABLE public.teacher_ratings
  ADD CONSTRAINT uq_weekly_plan_rating UNIQUE(weekly_plan_id);
