-- Migration: 3rd_online_exams_and_ratings.sql
-- Optimized for idempotency: Primary keys moved into table definitions

CREATE TABLE IF NOT EXISTS public.teacher_ratings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id uuid NOT NULL,
    weekly_plan_id uuid NOT NULL,
    rating_value integer NOT NULL,
    rated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_ratings_teacher ON public.teacher_ratings USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_ratings_weekly_plan ON public.teacher_ratings USING btree (weekly_plan_id);

CREATE TABLE IF NOT EXISTS public.exam_variations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id uuid NOT NULL,
    student_id uuid,
    variation_code character varying(100),
    shuffled_questions jsonb,
    correct_map jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_variations_exam ON public.exam_variations USING btree (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_variations_student ON public.exam_variations USING btree (student_id);

CREATE TABLE IF NOT EXISTS public.exam_reset_pins (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    pin character varying(100) NOT NULL,
    created_by uuid,
    used boolean DEFAULT false NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_reset_pins_exam ON public.exam_reset_pins USING btree (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_reset_pins_student ON public.exam_reset_pins USING btree (student_id);

CREATE TABLE IF NOT EXISTS public.online_exam_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status character varying(50),
    start_time timestamp with time zone,
    terminated boolean DEFAULT false NOT NULL,
    termination_reason text,
    end_time timestamp with time zone,
    final_score numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_online_exam_sessions_exam ON public.online_exam_sessions USING btree (exam_id);
CREATE INDEX IF NOT EXISTS idx_online_exam_sessions_student ON public.online_exam_sessions USING btree (student_id);

CREATE TABLE IF NOT EXISTS public.online_exam_answers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid NOT NULL,
    question_id uuid NOT NULL,
    student_answer jsonb,
    saved_at timestamp with time zone DEFAULT now() NOT NULL,
    is_correct boolean,
    extra jsonb
);

CREATE INDEX IF NOT EXISTS idx_online_exam_answers_session ON public.online_exam_answers USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_online_exam_answers_question ON public.online_exam_answers USING btree (question_id);

-- Add the column if it's missing (Safe check)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='logistics_notices' AND column_name='branch_id') THEN
        ALTER TABLE public.logistics_notices ADD COLUMN branch_id UUID;
    END IF;
END $$;

-- Ensure logistics_notices has an index on branch_id
CREATE INDEX IF NOT EXISTS idx_logistics_notices_branch_id ON public.logistics_notices USING btree (branch_id);

