-- =============================================================================
-- Migration 39: Create teacher_proxy_assignments table
--
-- Stores temporary day-by-day teacher proxy coverage schedules for absent teachers.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_proxy_assignments (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    absent_teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    proxy_teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL, -- The specific Gregorian date of the coverage
    period_number INT NOT NULL, -- The period number (e.g. 1, 2, 3...)
    class_name VARCHAR(50) NOT NULL, -- E.g. 'Grade 10'
    section VARCHAR(20) NOT NULL, -- E.g. 'A'
    subject VARCHAR(50) NOT NULL, -- E.g. 'Math'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_proxy_slot UNIQUE (proxy_teacher_id, date, period_number)
);

-- Index for daily coverage queries
CREATE INDEX IF NOT EXISTS idx_teacher_proxy_assignments_date
  ON public.teacher_proxy_assignments (date);

-- Index for absent teacher coverage lookup
CREATE INDEX IF NOT EXISTS idx_teacher_proxy_assignments_absent
  ON public.teacher_proxy_assignments (absent_teacher_id);
