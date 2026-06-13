-- =============================================================================
-- Migration 31: Prepare employee_attendance for full ZKTeco biometric integration
--
-- Adds the four biometric punch columns used by:
--   • machine.controller.ts  (ZKTeco sync endpoint POST /machine/attendance)
--   • schoolAdmin.service.ts (manual admin entry)
--   • The attendance UI (Arrival, Lunch Out, Lunch In, Departure columns)
--
-- Also:
--   • Widens the status CHECK to include 'half-day' (used during partial-day
--     attendance when a staff member punches in but not all 4 times).
--   • Drops the FK on recorded_by so the literal string 'zk-machine'
--     can be stored (biometric machine has no user account).
--   • Adds the is_late_arrival flag needed for Ethiopian late-threshold logic.
-- =============================================================================

-- 1. Add punch-time columns (Ethiopian HH:MM AM/PM strings stored as VARCHAR)
ALTER TABLE public.employee_attendance
  ADD COLUMN IF NOT EXISTS sign_in_time    VARCHAR(12) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lunch_out_time  VARCHAR(12) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lunch_in_time   VARCHAR(12) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sign_out_time   VARCHAR(12) DEFAULT NULL;

-- 2. Add late-arrival flag (true when first punch is after 02:20 AM Ethiopian time)
ALTER TABLE public.employee_attendance
  ADD COLUMN IF NOT EXISTS is_late_arrival BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Widen the status CHECK constraint to accept 'half-day'
--    (staff who punched in but did not complete all 4 punches)
DO $$
BEGIN
  -- Drop old constraint only if it still exists in its original form
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employee_attendance_status_check'
      AND conrelid = 'public.employee_attendance'::regclass
  ) THEN
    ALTER TABLE public.employee_attendance
      DROP CONSTRAINT employee_attendance_status_check;
  END IF;

  -- Add the updated constraint that includes 'half-day'
  ALTER TABLE public.employee_attendance
    ADD CONSTRAINT employee_attendance_status_check CHECK (
      status::text = ANY (
        ARRAY['present','absent','late','half-day','excused','leave']::text[]
      )
    );
END;
$$;

-- 4. Convert recorded_by from FK UUID to free-text VARCHAR so 'zk-machine'
--    and 'admin-manual:<uuid>' and 'admin-bulk:<uuid>' can all be stored
--    without requiring a matching users row.
DO $$
BEGIN
  -- Drop the FK constraint if it still exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employee_attendance_recorded_by_fkey'
      AND conrelid = 'public.employee_attendance'::regclass
  ) THEN
    ALTER TABLE public.employee_attendance
      DROP CONSTRAINT employee_attendance_recorded_by_fkey;
  END IF;
END;
$$;

-- Change column type from UUID to TEXT so string identifiers fit
ALTER TABLE public.employee_attendance
  ALTER COLUMN recorded_by TYPE TEXT USING recorded_by::text;

-- 5. Index for fast lookups by date (already exists via btree on user_id, date)
--    Add an extra index on just the date column for dashboard aggregate queries
CREATE INDEX IF NOT EXISTS idx_employee_attendance_date
  ON public.employee_attendance (date);
