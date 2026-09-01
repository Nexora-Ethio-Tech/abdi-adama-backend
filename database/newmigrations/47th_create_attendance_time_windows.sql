-- =============================================================================
-- Migration 47: Create attendance_time_windows table
--
-- Allows school admin to configure the 4 attendance time intervals:
--   1. Morning Check-In (Default: 08:30 - 09:00)
--   2. Lunch Check-Out  (Default: 12:00 - 13:00)
--   3. Lunch Check-In   (Default: 13:00 - 14:00)
--   4. Leave / Sign-Out (Default: 17:00 - 18:00)
--
-- Can be configured per-date or as branch default (date IS NULL).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_time_windows (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id               UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  date                    DATE DEFAULT NULL, -- NULL means branch default
  morning_check_in_start  VARCHAR(10) NOT NULL DEFAULT '08:30',
  morning_check_in_end    VARCHAR(10) NOT NULL DEFAULT '09:00',
  lunch_check_out_start   VARCHAR(10) NOT NULL DEFAULT '12:00',
  lunch_check_out_end     VARCHAR(10) NOT NULL DEFAULT '13:00',
  lunch_check_in_start    VARCHAR(10) NOT NULL DEFAULT '13:00',
  lunch_check_in_end      VARCHAR(10) NOT NULL DEFAULT '14:00',
  leave_start             VARCHAR(10) NOT NULL DEFAULT '17:00',
  leave_end               VARCHAR(10) NOT NULL DEFAULT '18:00',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index for date-specific overrides per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_windows_branch_date
  ON public.attendance_time_windows(branch_id, date)
  WHERE date IS NOT NULL;

-- Unique index for branch default template (date IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_windows_branch_default
  ON public.attendance_time_windows(branch_id)
  WHERE date IS NULL;

-- General query index
CREATE INDEX IF NOT EXISTS idx_attendance_windows_query
  ON public.attendance_time_windows(branch_id, date);
