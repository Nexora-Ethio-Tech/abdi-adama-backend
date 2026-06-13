-- =============================================================================
-- Migration 32: Create school_calendar table
--
-- This acts as the single source of truth for all calendar-related day types
-- (weekends, holidays, summer breaks, semester breaks, exam days, half-days).
--
-- It is designed to be branch-aware (branch_id = NULL means school-wide).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.school_calendar (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    day_type VARCHAR(50) NOT NULL, -- 'holiday', 'summer_break', 'semester_break', 'exam_day', 'half_day', 'event_day'
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE, -- NULL means system-wide (global)
    early_dismissal_time VARCHAR(20) DEFAULT NULL, -- e.g. '06:00 AM' Ethiopian
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_school_calendar_dates
  ON public.school_calendar (start_date, end_date);

-- Index for branch queries
CREATE INDEX IF NOT EXISTS idx_school_calendar_branch
  ON public.school_calendar (branch_id);
