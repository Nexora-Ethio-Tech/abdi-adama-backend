-- Migration: 12th_online_exams_schema.sql
-- Creates missing online_exams and online_exam_questions tables.

CREATE TABLE IF NOT EXISTS public.online_exams (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        UUID,
  subject_id       UUID         REFERENCES public.courses(id) ON DELETE SET NULL,
  section_id       UUID         REFERENCES public.classes(id) ON DELETE SET NULL,
  creator_id       UUID         NOT NULL REFERENCES public.users(id),
  title            VARCHAR(300) NOT NULL,
  start_window     TIMESTAMPTZ  NOT NULL,
  duration_minutes INTEGER      NOT NULL CHECK (duration_minutes > 0),
  is_published     BOOLEAN      DEFAULT FALSE,
  total_points     INTEGER      DEFAULT 100,
  created_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.online_exam_questions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID         NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
  question_text    TEXT         NOT NULL,
  question_type    VARCHAR(50)  DEFAULT 'multiple_choice',
  options_json     JSONB,       -- e.g., ["Option A", "Option B"]
  correct_answer   TEXT,        -- For auto-grading
  points           INTEGER      DEFAULT 1,
  sort_order       INTEGER      DEFAULT 0,
  created_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_online_exams_subject ON public.online_exams(subject_id);
