-- Migration: 13th_online_exams_anti_cheat.sql
-- Adds missing anti-cheat features to online exams.

-- 1. Per-student exam variations (shuffled question + option order)
CREATE TABLE IF NOT EXISTS public.exam_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  variation_code CHAR(1) NOT NULL,
  shuffled_questions JSONB NOT NULL,
  correct_map JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- 2. Teacher-issued re-entry PINs after termination
CREATE TABLE IF NOT EXISTS public.exam_reset_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  pin VARCHAR(10) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  UNIQUE(exam_id, student_id)
);

-- 3. Extend online_exam_sessions with termination + violation tracking
ALTER TABLE public.online_exam_sessions
  ADD COLUMN IF NOT EXISTS terminated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS violation_count INT DEFAULT 0;

-- 4. Add unique constraint for UPSERT ON CONFLICT statements
BEGIN;

ALTER TABLE public.online_exam_sessions
  DROP CONSTRAINT IF EXISTS unique_exam_student_session;

ALTER TABLE public.online_exam_sessions
  ADD CONSTRAINT unique_exam_student_session UNIQUE (exam_id, student_id);

COMMIT;